import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // SEGURANÇA: Credenciais devem estar nos secrets do Supabase
    const megaApiHost = Deno.env.get('MEGA_API_HOST');
    const megaInstanceKey = Deno.env.get('MEGA_INSTANCE_KEY');
    const megaToken = Deno.env.get('MEGA_API_KEY');

    if (!megaApiHost || !megaInstanceKey || !megaToken) {
      throw new Error('Credenciais Mega API não configuradas. Configure os secrets: MEGA_API_HOST, MEGA_INSTANCE_KEY, MEGA_API_KEY');
    }

    const { whatsapp, checkDuplicate = false } = await req.json();

    if (!whatsapp) {
      return new Response(JSON.stringify({ 
        error: 'WhatsApp não fornecido' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verificar se o WhatsApp já está cadastrado (APENAS NO SIGNUP)
    if (checkDuplicate) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('whatsapp', whatsapp)
        .is('deleted_at', null)
        .maybeSingle();

      if (existingProfile) {
        return new Response(JSON.stringify({ 
          error: 'Este número de WhatsApp já está cadastrado. Use outro número.' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('whatsapp', whatsapp)
        .is('deleted_at', null)
        .maybeSingle();

      if (existingUser) {
        return new Response(JSON.stringify({ 
          error: 'Este número de WhatsApp já está cadastrado. Use outro número.' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Verificar se há tentativas de fraude bloqueadas
    const { data: fraudCheck } = await supabase
      .from('fraud_attempts')
      .select('*')
      .eq('identifier', whatsapp)
      .eq('attempt_type', 'whatsapp')
      .single();

    if (fraudCheck && fraudCheck.blocked_until) {
      const blockedUntil = new Date(fraudCheck.blocked_until);
      if (blockedUntil > new Date()) {
        const hoursLeft = Math.ceil((blockedUntil.getTime() - Date.now()) / (1000 * 60 * 60));
        return new Response(JSON.stringify({ 
          error: `WhatsApp bloqueado. Tente novamente em ${hoursLeft}h` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Gerar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    // Salvar código no banco
    const { error: insertError } = await supabase
      .from('whatsapp_verifications')
      .insert({
        whatsapp,
        code,
        expires_at: expiresAt.toISOString(),
        verified: false,
        attempts: 0
      });

    if (insertError) {
      console.error('Erro ao salvar verificação:', insertError);
      throw insertError;
    }

    // Formatar número para o Mega API (adicionar 55 se não tiver)
    let formattedNumber = whatsapp.replace(/\D/g, '');
    
    // Se o número tem 11 dígitos (DDD + número), adicionar código do país
    if (formattedNumber.length === 11 && !formattedNumber.startsWith('55')) {
      formattedNumber = '55' + formattedNumber;
    }

    // Mensagem formatada
    const message = `🔐 *Y-TECH Internet 5G*\n\nSeu código de verificação:\n\n*${code}*\n\nVálido por 10 minutos.\n\n_Não compartilhe este código._`;

    console.log(`📱 Enviando código ${code} para ${formattedNumber}`);

    // Enviar via Mega API (endpoint correto)
    const megaUrl = `https://${megaApiHost}/rest/sendMessage/${megaInstanceKey}/text`;
    console.log('Mega API URL:', megaUrl);

    const megaResponse = await fetch(megaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${megaToken}`
      },
      body: JSON.stringify({
        messageData: {
          to: formattedNumber,
          text: message
        }
      })
    });

    const megaData = await megaResponse.json();
    console.log('Resposta Mega API:', JSON.stringify(megaData, null, 2));

    if (!megaResponse.ok) {
      console.error('Erro do Mega API:', megaData);
      throw new Error(`Erro ao enviar mensagem: ${megaData.error || 'Erro desconhecido'}`);
    }

    // Salvar mensagem enviada
    await supabase
      .from('whatsapp_messages')
      .insert({
        whatsapp: formattedNumber,
        message_type: 'verification_code',
        message_content: message,
        status: 'sent',
        mega_message_id: megaData.key?.id || null,
        metadata: { code, expiresAt: expiresAt.toISOString() }
      });

    return new Response(JSON.stringify({ 
      success: true,
      expiresAt: expiresAt.toISOString(),
      message: 'Código enviado com sucesso'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});