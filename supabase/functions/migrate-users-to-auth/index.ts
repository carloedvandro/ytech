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

    // 2. Migrar cada usuário
    for (const oldUser of oldUsers || []) {
      try {
        console.log(`Migrating user: ${oldUser.email} (${oldUser.id})`);

        // 2.1. Gerar senha temporária
        const tempPassword = `Temp${Math.random().toString(36).slice(2, 10)}!`;

        // 2.2. Criar usuário no auth.users
        const { data: authUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
          email: oldUser.email,
          password: tempPassword,
          email_confirm: true, // Auto-confirmar email
          user_metadata: {
            full_name: oldUser.full_name,
            cpf: oldUser.cpf,
            whatsapp: oldUser.whatsapp,
            referred_by: oldUser.referred_by,
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

        // 2.3. Criar profile (o trigger deve fazer isso automaticamente, mas vamos garantir)
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: authUser.user.id,
            full_name: oldUser.full_name,
            cpf: oldUser.cpf,
            whatsapp: oldUser.whatsapp,
            username: oldUser.username,
            referred_by: oldUser.referred_by,
            status: oldUser.status,
            metadata: oldUser.metadata,
            created_at: oldUser.created_at,
            updated_at: oldUser.updated_at,
            last_login: oldUser.last_login,
          });

        if (profileError) {
          console.error(`Error creating profile for ${oldUser.email}:`, profileError);
          // Não falha a migração por causa do profile
        }

        // 2.4. Atualizar referências em outras tabelas
        const updates = [
          // Atualizar commissions
          supabaseAdmin.from('commissions')
            .update({ user_id: authUser.user.id })
            .eq('user_id', oldUser.id),
          
          supabaseAdmin.from('commissions')
            .update({ referred_user_id: authUser.user.id })
            .eq('referred_user_id', oldUser.id),

          // Atualizar payments
          supabaseAdmin.from('payments')
            .update({ user_id: authUser.user.id })
            .eq('user_id', oldUser.id),

          // Atualizar transactions
          supabaseAdmin.from('transactions')
            .update({ user_id: authUser.user.id })
            .eq('user_id', oldUser.id),

          // Atualizar user_network
          supabaseAdmin.from('user_network')
            .update({ user_id: authUser.user.id })
            .eq('user_id', oldUser.id),
          
          supabaseAdmin.from('user_network')
            .update({ parent_id: authUser.user.id })
            .eq('parent_id', oldUser.id),

          // Atualizar whatsapp_messages
          supabaseAdmin.from('whatsapp_messages')
            .update({ user_id: authUser.user.id })
            .eq('user_id', oldUser.id),

          // Atualizar profiles referred_by
          supabaseAdmin.from('profiles')
            .update({ referred_by: authUser.user.id })
            .eq('referred_by', oldUser.id),
        ];

        await Promise.all(updates);

        // 2.5. Marcar usuário antigo como migrado
        await supabaseAdmin
          .from('users')
          .update({
            migrated_to_auth: true,
            auth_user_id: authUser.user.id
          })
          .eq('id', oldUser.id);

        // 2.6. Enviar senha temporária por WhatsApp
        try {
          await supabaseAdmin.functions.invoke('send-whatsapp-notification', {
            body: {
              whatsapp: oldUser.whatsapp,
              messageType: 'password_reset',
              data: {
                name: oldUser.full_name,
                tempPassword: tempPassword,
                loginUrl: `${supabaseUrl.replace('.supabase.co', '')}/login`,
              },
              userId: authUser.user.id,
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
