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
      const fromNumber = payload.key?.remoteJid?.replace('@s.whatsapp.net', '').replace('@lid', '') || '';
      const senderName = payload.pushName || 'Cliente';
      
      // Processar mensagens de texto
      const messageText = payload.message?.conversation || 
                         payload.message?.extendedTextMessage?.text || 
                         '';
      
      // Processar mensagens de áudio
      const audioMessage = payload.message?.audioMessage;
      
      if (messageText && fromNumber) {
        console.log(`📨 Mensagem de texto recebida de ${fromNumber} (${senderName}): "${messageText}"`);
        
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
      
      if (audioMessage && fromNumber) {
        console.log(`🎙️ Áudio recebido de ${fromNumber} (${senderName})`);
        
        // Informar usuário que estamos processando
        supabase.functions.invoke('send-whatsapp-notification', {
          body: {
            whatsapp: fromNumber,
            message: '🎤 Recebi seu áudio! Estou processando...'
          }
        }).catch(err => console.error('Erro ao enviar notificação:', err));
        
        try {
          const megaApiHost = Deno.env.get('MEGA_API_HOST');
          const megaApiKey = Deno.env.get('MEGA_API_KEY');
          const megaInstanceKey = Deno.env.get('MEGA_INSTANCE_KEY');
          
          if (!megaApiHost || !megaApiKey || !megaInstanceKey) {
            throw new Error('Configurações do Mega API não encontradas');
          }
          
          console.log(`📥 Tentando baixar áudio via Mega API...`);
          
          // Tentar baixar mídia descriptografada via Mega API
          const downloadResponse = await fetch(`https://${megaApiHost}/message/downloadMedia`, {
            method: 'POST',
            headers: {
              'x-api-key': megaApiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              instance_key: megaInstanceKey,
              message_id: payload.key.id
            })
          });
          
          if (!downloadResponse.ok) {
            const errorText = await downloadResponse.text();
            console.error(`❌ Erro na API Mega: ${errorText}`);
            throw new Error(`Erro ao baixar mídia: ${downloadResponse.statusText}`);
          }
          
          const mediaData = await downloadResponse.json();
          console.log(`✅ Mídia baixada:`, mediaData);
          
          // Extrair base64 do áudio
          let audioBase64 = mediaData.media || mediaData.base64 || mediaData.data;
          
          if (!audioBase64) {
            throw new Error('Mídia não encontrada na resposta');
          }
          
          // Remover prefixo data:audio se existir
          if (audioBase64.includes('base64,')) {
            audioBase64 = audioBase64.split('base64,')[1];
          }
          
          console.log(`🔄 Transcrevendo áudio (${audioBase64.length} caracteres base64)...`);
          
          const openAIKey = Deno.env.get('OPENAI_API_KEY');
          if (!openAIKey) {
            throw new Error('OPENAI_API_KEY não configurada');
          }
          
          // Converter base64 para buffer
          const audioBuffer = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
          
          // Criar FormData com o áudio
          const formData = new FormData();
          const audioBlob = new Blob([audioBuffer], { type: 'audio/ogg' });
          formData.append('file', audioBlob, 'audio.ogg');
          formData.append('model', 'whisper-1');
          formData.append('language', 'pt');
          
          const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAIKey}`
            },
            body: formData
          });
          
          if (!transcriptionResponse.ok) {
            const errorText = await transcriptionResponse.text();
            throw new Error(`Erro na transcrição: ${errorText}`);
          }
          
          const transcription = await transcriptionResponse.json();
          const transcribedText = transcription.text;
          
          console.log(`✅ Áudio transcrito: "${transcribedText}"`);
          
          // Processar com chatbot IA
          supabase.functions.invoke('chatbot-handler', {
            body: {
              whatsapp: fromNumber,
              message: transcribedText,
              userName: senderName
            }
          }).catch(err => {
            console.error('❌ Erro ao processar com chatbot:', err);
          });
          
          return new Response(JSON.stringify({ 
            success: true,
            message: 'Áudio transcrito e processando com IA',
            transcription: transcribedText
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
          
        } catch (error) {
          console.error('❌ Erro ao processar áudio:', error);
          
          // Enviar mensagem de erro ao usuário
          supabase.functions.invoke('send-whatsapp-notification', {
            body: {
              whatsapp: fromNumber,
              message: 'Desculpe, tive um problema ao processar seu áudio. Por favor, tente enviar uma mensagem de texto. 😊'
            }
          }).catch(err => {
            console.error('❌ Erro ao enviar notificação de erro:', err);
          });
          
          return new Response(JSON.stringify({ 
            success: false,
            error: error instanceof Error ? error.message : 'Erro ao processar áudio'
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
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