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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    console.log('📩 Webhook recebido do Mega API:', JSON.stringify(payload, null, 2));

    // Detectar mensagem RECEBIDA baseado na estrutura real do Mega API
    const isIncomingMessage = payload.key?.fromMe === false && 
                              payload.message && 
                              !payload.isGroup &&
                              payload.key?.remoteJid !== 'status@broadcast';

    if (isIncomingMessage) {
      const messageText = payload.message?.conversation || 
                         payload.message?.extendedTextMessage?.text || 
                         '';
      const fromNumber = payload.key?.remoteJid?.replace('@s.whatsapp.net', '').replace('@lid', '') || '';
      const senderName = payload.pushName || 'Cliente';
      
      if (messageText && fromNumber) {
        console.log(`📨 Mensagem recebida de ${fromNumber} (${senderName}): "${messageText}"`);
        
        // Processar com chatbot IA (não aguardar resposta para não bloquear webhook)
        supabase.functions.invoke('chatbot-handler', {
          body: {
            whatsapp: fromNumber,
            message: messageText,
            userName: senderName
          }
        }).catch(err => {
          console.error('❌ Erro ao processar com chatbot:', err);
        });

        return new Response(JSON.stringify({ 
          success: true,
          message: 'Mensagem recebida e processando com IA' 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Extrair dados do evento (para atualizações de status)
    const {
      event,
      data,
      timestamp
    } = payload;

    // Mapear eventos do Mega API para nosso status
    let status = 'sent';
    let deliveredAt = null;
    let readAt = null;
    let failedAt = null;
    let failedReason = null;

    switch (event) {
      case 'message.sent':
      case 'messages.upsert':
        status = 'sent';
        break;
      case 'message.delivered':
        status = 'delivered';
        deliveredAt = new Date().toISOString();
        break;
      case 'message.read':
        status = 'read';
        readAt = new Date().toISOString();
        break;
      case 'message.failed':
        status = 'failed';
        failedAt = new Date().toISOString();
        failedReason = data?.error || 'Erro desconhecido';
        break;
      default:
        console.log(`⚠️ Evento não tratado: ${event}`);
        return new Response(JSON.stringify({ message: 'Evento não tratado' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    // Extrair o número do destinatário
    const recipientNumber = data?.key?.remoteJid?.replace('@s.whatsapp.net', '') || 
                           data?.to || 
                           data?.number;

    if (!recipientNumber) {
      console.error('❌ Número do destinatário não encontrado no payload');
      return new Response(JSON.stringify({ error: 'Número não encontrado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Buscar a mensagem correspondente no banco
    const { data: messages, error: fetchError } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('whatsapp', recipientNumber)
      .order('sent_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('❌ Erro ao buscar mensagem:', fetchError);
      throw fetchError;
    }

    if (!messages || messages.length === 0) {
      console.log('⚠️ Nenhuma mensagem encontrada para este número');
      // Ainda retornamos 200 para o Mega API não reenviar
      return new Response(JSON.stringify({ message: 'Mensagem não encontrada' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const message = messages[0];

    // Atualizar status da mensagem
    const updateData: any = { status };
    if (deliveredAt) updateData.delivered_at = deliveredAt;
    if (readAt) updateData.read_at = readAt;
    if (failedAt) updateData.failed_at = failedAt;
    if (failedReason) updateData.failed_reason = failedReason;

    const { error: updateError } = await supabase
      .from('whatsapp_messages')
      .update(updateData)
      .eq('id', message.id);

    if (updateError) {
      console.error('❌ Erro ao atualizar mensagem:', updateError);
      throw updateError;
    }

    console.log(`✅ Mensagem ${message.id} atualizada para status: ${status}`);

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: message.id,
      status 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: errorDetails
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});