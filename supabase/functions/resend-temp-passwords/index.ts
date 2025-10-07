import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

Deno.serve(async (req) => {
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

    console.log('🔄 Reenviando senhas temporárias...');

    // Buscar todos os usuários do auth que foram criados recentemente (últimas 24h)
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      throw new Error(`Erro ao buscar usuários: ${authError.message}`);
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[]
    };

    for (const authUser of authUsers.users) {
      try {
        // Buscar profile do usuário
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('full_name, whatsapp')
          .eq('id', authUser.id)
          .single();

        if (profileError || !profile) {
          console.error(`❌ Profile não encontrado para ${authUser.email}`);
          results.failed++;
          results.errors.push({
            email: authUser.email,
            error: 'Profile não encontrado'
          });
          continue;
        }

        // Gerar nova senha temporária
        const tempPassword = generateTempPassword();
        
        console.log(`🔑 Resetando senha para ${authUser.email}`);
        
        // Atualizar senha no Auth
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          authUser.id,
          { password: tempPassword }
        );

        if (updateError) {
          throw new Error(`Erro ao atualizar senha: ${updateError.message}`);
        }

        // Enviar WhatsApp com a senha
        console.log(`📱 Enviando WhatsApp para ${profile.whatsapp}`);
        
        const { error: whatsappError } = await supabaseAdmin.functions.invoke(
          'send-whatsapp-notification',
          {
            body: {
              whatsapp: profile.whatsapp,
              messageType: 'password_reset',
              userId: authUser.id,
              data: {
                name: profile.full_name,
                email: authUser.email,
                temporaryPassword: tempPassword,
                loginUrl: 'https://ytech.lovable.app/login'
              }
            }
          }
        );

        if (whatsappError) {
          console.error(`❌ Erro ao enviar WhatsApp: ${whatsappError.message}`);
          results.failed++;
          results.errors.push({
            email: authUser.email,
            error: `Senha resetada mas WhatsApp falhou: ${whatsappError.message}`
          });
        } else {
          console.log(`✅ Senha enviada para ${authUser.email}`);
          results.success++;
        }

      } catch (error: any) {
        console.error(`❌ Erro ao processar ${authUser.email}:`, error);
        results.failed++;
        results.errors.push({
          email: authUser.email,
          error: error.message
        });
      }
    }

    console.log(`\n🎉 Processamento completo:`, results);

    return new Response(JSON.stringify({
      success: true,
      results,
      message: `Processado ${results.success + results.failed} usuários. ${results.success} sucesso, ${results.failed} falhas.`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Erro geral:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
