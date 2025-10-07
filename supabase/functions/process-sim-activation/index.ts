import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { ENV_CONFIG, logEnvironment } from '../_shared/config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ActivationRequest {
  activationType: 'chip' | 'esim';
  barcode?: string;
  imei?: string;
  eid?: string;
  screenshotUrl?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logEnvironment();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Usuário não autenticado');
    }

    const { activationType, barcode, imei, eid, screenshotUrl }: ActivationRequest = await req.json();

    console.log('📱 Processando ativação:', { activationType, user: user.id });

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('full_name, whatsapp')
      .eq('id', user.id)
      .single();

    if (profileError) {
      throw new Error('Erro ao buscar perfil do usuário');
    }

    // Save activation to database
    const { data: activation, error: insertError } = await supabaseClient
      .from('sim_activations')
      .insert({
        user_id: user.id,
        activation_type: activationType,
        barcode: activationType === 'chip' ? barcode : null,
        imei: activationType === 'esim' ? imei : null,
        eid: activationType === 'esim' ? eid : null,
        screenshot_url: screenshotUrl || null,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Erro ao salvar ativação:', insertError);
      throw new Error('Erro ao salvar dados de ativação');
    }

    console.log('✅ Ativação salva:', activation.id);

    // Prepare WhatsApp message
    const adminWhatsapp = '5511970492228';
    
    let message = `🆕 *NOVA SOLICITAÇÃO DE ATIVAÇÃO*\n\n`;
    message += `👤 *Cliente:* ${profile.full_name}\n`;
    message += `📱 *WhatsApp:* ${profile.whatsapp}\n`;
    message += `📋 *Tipo:* ${activationType === 'chip' ? 'Chip SIM' : 'eSIM'}\n\n`;
    
    if (activationType === 'chip') {
      message += `📊 *Código de Barras:*\n${barcode}\n\n`;
    } else {
      message += `📱 *IMEI:* ${imei}\n`;
      message += `🔑 *EID:* ${eid}\n`;
      if (screenshotUrl) {
        message += `📸 *Print:* ${screenshotUrl}\n`;
      }
      message += `\n`;
    }
    
    message += `⏰ *Data:* ${new Date().toLocaleString('pt-BR')}\n`;
    message += `🆔 *ID Ativação:* ${activation.id}`;

    // Send WhatsApp notification (only if enabled in environment)
    if (ENV_CONFIG.notifications.enabled) {
      try {
        const megaApiHost = Deno.env.get('MEGA_API_HOST');
        const megaInstanceKey = Deno.env.get('MEGA_INSTANCE_KEY');
        
        if (!megaApiHost || !megaInstanceKey) {
          console.error('⚠️ MEGA_API_HOST ou MEGA_INSTANCE_KEY não configurado');
          throw new Error('Credenciais Mega API não configuradas');
        }

        // Format WhatsApp number (remove formatting)
        const formattedNumber = adminWhatsapp.replace(/\D/g, '');
        
        // Use correct Mega API endpoint format (same as send-whatsapp-verification)
        const megaUrl = `https://${megaApiHost}/rest/sendMessage/${megaInstanceKey}/text`;
        
        console.log('📤 Enviando WhatsApp para:', formattedNumber);
        console.log('📤 URL Mega API:', megaUrl);
        
        const megaResponse = await fetch(megaUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ENV_CONFIG.mega.apiKey}`,
          },
          body: JSON.stringify({
            messageData: {
              to: formattedNumber,
              text: message
            }
          }),
        });

        const megaResult = await megaResponse.json();
        console.log('📤 WhatsApp enviado:', megaResult);

        // Log WhatsApp message
        await supabaseClient.from('whatsapp_messages').insert({
          user_id: user.id,
          whatsapp: adminWhatsapp,
          message_type: 'sim_activation_notification',
          message_content: message,
          status: megaResponse.ok ? 'sent' : 'failed',
          failed_reason: megaResponse.ok ? null : JSON.stringify(megaResult),
          metadata: { activation_id: activation.id },
        });
      } catch (whatsappError) {
        console.error('⚠️ Erro ao enviar WhatsApp (não bloqueia ativação):', whatsappError);
      }
    } else {
      console.log('📱 WhatsApp desabilitado no ambiente SANDBOX');
    }

    return new Response(
      JSON.stringify({
        success: true,
        activation_id: activation.id,
        message: 'Solicitação de ativação enviada com sucesso!',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Erro ao processar ativação:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
