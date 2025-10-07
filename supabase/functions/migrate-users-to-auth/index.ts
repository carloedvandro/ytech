import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('🔄 Starting user migration to Supabase Auth...');

    // 1. Buscar todos os usuários não migrados da tabela users antiga
    const { data: oldUsers, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .is('migrated_to_auth', false)
      .is('deleted_at', null);

    if (fetchError) {
      console.error('Error fetching users:', fetchError);
      throw fetchError;
    }

    console.log(`📊 Found ${oldUsers?.length || 0} users to migrate`);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[]
    };

    // 2. Migrar usuários em duas etapas para evitar problemas de foreign key
    const userMapping = new Map<string, string>(); // old_id -> new_id

    // ETAPA 1: Criar todos os auth users SEM referred_by
    for (const oldUser of oldUsers || []) {
      try {
        console.log(`[Step 1] Creating auth user: ${oldUser.email} (${oldUser.id})`);

        const tempPassword = `Temp${Math.random().toString(36).slice(2, 10)}!`;

        // Criar usuário no auth.users SEM referred_by no metadata
        const { data: authUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
          email: oldUser.email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: oldUser.full_name,
            cpf: oldUser.cpf,
            whatsapp: oldUser.whatsapp,
            // NÃO incluir referred_by aqui para evitar erro de FK
          }
        });

        if (createAuthError) {
          console.error(`Error creating auth user for ${oldUser.email}:`, createAuthError);
          results.errors.push({ user: oldUser.email, error: createAuthError.message });
          results.failed++;
          continue;
        }

        if (!authUser.user) {
          console.error(`No auth user created for ${oldUser.email}`);
          results.errors.push({ user: oldUser.email, error: 'No user returned from auth' });
          results.failed++;
          continue;
        }

        console.log(`✓ Auth user created: ${authUser.user.id}`);

        // Mapear old ID -> new ID
        userMapping.set(oldUser.id, authUser.user.id);

        // O trigger handle_new_auth_user vai criar o profile e user_network automaticamente
        // mas SEM referred_by ainda

        // Marcar como migrado
        await supabaseAdmin
          .from('users')
          .update({
            migrated_to_auth: true,
            auth_user_id: authUser.user.id
          })
          .eq('id', oldUser.id);

        // Guardar senha temporária para enviar depois
        oldUser.tempPassword = tempPassword;
        oldUser.newAuthId = authUser.user.id;

      } catch (userError: any) {
        console.error(`Error in step 1 for ${oldUser.email}:`, userError);
        results.errors.push({ user: oldUser.email, error: userError.message });
        results.failed++;
      }
    }

    console.log(`✓ Step 1 complete. Created ${userMapping.size} auth users`);

    // ETAPA 2: Atualizar referred_by e outras referências
    for (const oldUser of oldUsers || []) {
      if (!oldUser.newAuthId) continue; // Pular usuários que falharam na etapa 1

      try {
        console.log(`[Step 2] Updating references for: ${oldUser.email}`);

        const newAuthId = oldUser.newAuthId;

        // Atualizar profile com referred_by correto
        if (oldUser.referred_by) {
          const newReferredBy = userMapping.get(oldUser.referred_by);
          if (newReferredBy) {
            await supabaseAdmin
              .from('profiles')
              .update({ 
                referred_by: newReferredBy,
                username: oldUser.username,
                status: oldUser.status,
                metadata: oldUser.metadata,
                created_at: oldUser.created_at,
                updated_at: oldUser.updated_at,
                last_login: oldUser.last_login,
              })
              .eq('id', newAuthId);
            
            console.log(`  ✓ Updated profile with referred_by: ${newReferredBy}`);
          }
        } else {
          // Atualizar outros campos mesmo sem referred_by
          await supabaseAdmin
            .from('profiles')
            .update({ 
              username: oldUser.username,
              status: oldUser.status,
              metadata: oldUser.metadata,
              created_at: oldUser.created_at,
              updated_at: oldUser.updated_at,
              last_login: oldUser.last_login,
            })
            .eq('id', newAuthId);
        }

        // Atualizar user_network se tiver referred_by
        if (oldUser.referred_by) {
          const newReferredBy = userMapping.get(oldUser.referred_by);
          if (newReferredBy) {
            // Buscar path e level do parent
            const { data: parentNetwork } = await supabaseAdmin
              .from('user_network')
              .select('path, level')
              .eq('user_id', newReferredBy)
              .single();

            if (parentNetwork) {
              // Atualizar user_network com parent correto
              await supabaseAdmin
                .from('user_network')
                .update({
                  parent_id: newReferredBy,
                  level: parentNetwork.level + 1,
                  path: [...parentNetwork.path, newAuthId]
                })
                .eq('user_id', newAuthId);
              
              console.log(`  ✓ Updated user_network with parent`);
            }
          }
        }

        // Atualizar referências em outras tabelas
        const updates = [
          // Atualizar commissions
          supabaseAdmin.from('commissions')
            .update({ user_id: newAuthId })
            .eq('user_id', oldUser.id),
          
          supabaseAdmin.from('commissions')
            .update({ referred_user_id: newAuthId })
            .eq('referred_user_id', oldUser.id),

          // Atualizar payments
          supabaseAdmin.from('payments')
            .update({ user_id: newAuthId })
            .eq('user_id', oldUser.id),

          // Atualizar transactions
          supabaseAdmin.from('transactions')
            .update({ user_id: newAuthId })
            .eq('user_id', oldUser.id),

          // Atualizar user_network
          supabaseAdmin.from('user_network')
            .update({ user_id: newAuthId })
            .eq('user_id', oldUser.id),
          
          supabaseAdmin.from('user_network')
            .update({ parent_id: newAuthId })
            .eq('parent_id', oldUser.id),

          // Atualizar whatsapp_messages
          supabaseAdmin.from('whatsapp_messages')
            .update({ user_id: newAuthId })
            .eq('user_id', oldUser.id),

          // Atualizar profiles referred_by
          supabaseAdmin.from('profiles')
            .update({ referred_by: newAuthId })
            .eq('referred_by', oldUser.id),
        ];

        await Promise.all(updates);

        console.log(`  ✓ Updated all table references`);

        // Enviar senha temporária por WhatsApp
        try {
          await supabaseAdmin.functions.invoke('send-whatsapp-notification', {
            body: {
              whatsapp: oldUser.whatsapp,
              messageType: 'password_reset',
              data: {
                name: oldUser.full_name,
                tempPassword: oldUser.tempPassword,
                loginUrl: `${supabaseUrl.replace('.supabase.co', '')}/login`,
              },
              userId: newAuthId,
            }
          });
        } catch (whatsappError) {
          console.error('Error sending WhatsApp:', whatsappError);
          // Não falha a migração por causa do WhatsApp
        }

        console.log(`✅ User ${oldUser.email} migrated successfully`);
        results.success++;

      } catch (userError: any) {
        console.error(`Error migrating user ${oldUser.email}:`, userError);
        results.errors.push({ user: oldUser.email, error: userError.message });
        results.failed++;
      }
    }

    console.log('🎉 Migration complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `Migrated ${results.success} users, ${results.failed} failed`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
