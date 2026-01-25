import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY não configurada');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { email, whatsapp, checkDuplicate = false } = await req.json();

    if (!email) {
      throw new Error('Email é obrigatório');
    }

    console.log(`📧 Enviando código de verificação para: ${email}`);

    // Verificar duplicidade de WhatsApp se solicitado
    if (checkDuplicate && whatsapp) {
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('whatsapp', whatsapp)
        .maybeSingle();

      if (checkError && !checkError.message.includes('not found')) {
        throw checkError;
      }

      if (existingProfile) {
        throw new Error('WhatsApp já cadastrado');
      }
    }

    // Gerar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    // Salvar código no banco (usando whatsapp como identificador)
    const { error: insertError } = await supabase
      .from('verification_codes')
      .insert({
        whatsapp: whatsapp || email.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20),
        code,
        expires_at: expiresAt.toISOString(),
        verified: false
      });

    if (insertError) {
      console.error('Erro ao salvar código:', insertError);
      throw new Error('Erro ao gerar código');
    }

    // Enviar email via Resend usando fetch
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <tr>
            <td style="background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                Y-TECH Internet 5G
              </h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; opacity: 0.9;">
                Verificação de Cadastro
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 22px;">
                🔐 Seu Código de Verificação
              </h2>
              <p style="color: #4b5563; line-height: 1.6; margin: 0 0 30px 0;">
                Use o código abaixo para verificar seu cadastro na Y-TECH Internet 5G:
              </p>
              <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 30px; text-align: center; border: 2px dashed #22c55e;">
                <span style="font-size: 42px; font-weight: bold; letter-spacing: 8px; color: #166534; font-family: monospace;">
                  ${code}
                </span>
              </div>
              <p style="color: #9ca3af; font-size: 14px; text-align: center; margin: 20px 0 0 0;">
                ⏱️ Este código é válido por <strong>10 minutos</strong>
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 0;">
                <strong>⚠️ Atenção:</strong> Se você não solicitou este código, por favor ignore este email.
                Nunca compartilhe este código com outras pessoas.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1f2937; padding: 20px 30px; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Y-TECH Internet 5G © 2025<br>
                Yrwen Technology - CNPJ: 30.266.458/0001-58
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Y-TECH Internet 5G <onboarding@resend.dev>',
        to: [email],
        subject: '🔐 Código de Verificação - Y-TECH Internet 5G',
        html: emailHtml,
      }),
    });

    const resendData = await resendResponse.json();
    
    if (!resendResponse.ok) {
      console.error('❌ Erro do Resend:', resendData);
      throw new Error(`Erro ao enviar email: ${resendData.message || 'Erro desconhecido'}`);
    }

    console.log('✅ Email enviado:', resendData);

    // Salvar log do email enviado
    await supabase
      .from('whatsapp_messages')
      .insert({
        whatsapp: email,
        message_type: 'verification_code_email',
        message_content: `Código de verificação enviado por email: ${code.substring(0, 2)}****`,
        status: 'sent',
        mega_message_id: resendData.id || null,
        metadata: { 
          code, 
          expiresAt: expiresAt.toISOString(),
          channel: 'email',
          email: email
        }
      });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Código enviado por email',
        expiresAt: expiresAt.toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Erro ao enviar email de verificação:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
