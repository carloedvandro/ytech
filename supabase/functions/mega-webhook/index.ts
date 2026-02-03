import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { decodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts';
import { NOTIFICATION_CONFIG } from '../_shared/config.ts';

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

    // Detectar mensagem RECEBIDA (Mega API pode enviar em formatos diferentes)
    const getRemoteJid = (p: any): string | undefined =>
      p?.key?.remoteJid || p?.data?.key?.remoteJid || p?.jid || p?.data?.jid;

    const remoteJid = getRemoteJid(payload);
    const fromMe = payload?.key?.fromMe ?? payload?.data?.key?.fromMe;

    // Alguns eventos (ex: profilePicture_updated) não são mensagens e não devem acionar o chatbot
    const hasMessagePayload = Boolean(
      payload?.message ||
      payload?.data?.message ||
      payload?.messageData?.message ||
      payload?.messageData
    );

    const isGroup = Boolean(payload?.isGroup ?? payload?.data?.isGroup ?? payload?.data?.key?.participant);
    const isStatusBroadcast = remoteJid === 'status@broadcast';

    const isIncomingMessage = fromMe === false && hasMessagePayload && !isGroup && !isStatusBroadcast;

    if (isIncomingMessage) {
      // IMPORTANT: WhatsApp pode enviar o identificador como número (@s.whatsapp.net)
      // ou como LID (@lid). NUNCA remova o @lid, pois isso quebra o roteamento.
      const parseSender = (jid: string) => {
        const cleanJid = (jid || '').replace('@g.us', '');
        if (!cleanJid) return { kind: 'unknown' as const, id: '' };
        if (cleanJid.endsWith('@lid')) return { kind: 'lid' as const, id: cleanJid };
        if (cleanJid.endsWith('@s.whatsapp.net')) {
          return { kind: 'phone' as const, id: cleanJid.replace('@s.whatsapp.net', '') };
        }
        // fallback: pode vir sem sufixo em alguns eventos
        return { kind: 'unknown' as const, id: cleanJid };
      };

      const sender = parseSender(remoteJid || '');
      const fromId = sender.id;

      // Se WhatsApp está desativado (canal = email), não processar chatbot/auto-respostas.
      // Mantemos apenas o tracking de status (parte de baixo do arquivo).
      if (NOTIFICATION_CONFIG.isEmail) {
        console.log('📭 WhatsApp desativado (canal=email). Ignorando mensagem recebida via WhatsApp.');
        return new Response(JSON.stringify({
          success: true,
          message: 'WhatsApp desativado (canal=email)'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const senderName = payload.pushName || payload.data?.pushName || 'Cliente';
      
      // Processar mensagens de texto (cobrindo variações do payload)
      const msg = payload.message || payload.data?.message || payload.messageData?.message || payload.messageData;
      const messageText =
        msg?.conversation ||
        msg?.extendedTextMessage?.text ||
        msg?.textMessage?.text ||
        msg?.message?.conversation ||
        msg?.message?.extendedTextMessage?.text ||
        payload?.text ||
        payload?.data?.text ||
        '';
      
      // Processar mensagens de áudio
      const audioMessage = msg?.audioMessage || msg?.message?.audioMessage;
      
      if (messageText && fromId) {
        console.log(`📨 Mensagem de texto recebida de ${fromId} (${senderName}): "${messageText}"`);
        
        // Normalizar número para busca (somente quando é telefone)
        let normalizedFromNumber = fromId;
        if (sender.kind === 'phone') {
          if (fromId.length === 13 && fromId.startsWith('55')) {
            normalizedFromNumber = fromId.substring(2);
          }
        }
        
        // Verificar se este número está aguardando verificação de cadastro
        // Verificação por WhatsApp depende de telefone (não funciona com @lid, pois não temos o número).
        const pendingVerificationQuery = sender.kind === 'phone'
          ? supabase
              .from('whatsapp_verifications')
              .select('*')
              .eq('whatsapp', normalizedFromNumber)
              .eq('verified', false)
              .eq('code', '')
              .gte('expires_at', new Date().toISOString())
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null as any });

        const { data: pendingVerification } = await pendingVerificationQuery;

        if (pendingVerification) {
          console.log(`🔐 Número ${normalizedFromNumber} está aguardando verificação de cadastro`);
          
          // Gerar código de 6 dígitos
          const code = Math.floor(100000 + Math.random() * 900000).toString();
          
          // Atualizar registro com o código
          const { error: updateError } = await supabase
            .from('whatsapp_verifications')
            .update({ code })
            .eq('id', pendingVerification.id);

          if (updateError) {
            console.error('❌ Erro ao atualizar código:', updateError);
          } else {
            console.log(`✅ Código ${code} gerado para ${normalizedFromNumber}`);
            
            // Enviar código de verificação via WhatsApp
            // IMPORTANTE: Responder na mesma conversa que o usuário iniciou
            const megaApiHost = Deno.env.get('MEGA_API_HOST');
            const megaInstanceKey = Deno.env.get('MEGA_INSTANCE_KEY');
            const megaToken = Deno.env.get('MEGA_API_KEY');

            if (megaApiHost && megaInstanceKey && megaToken) {
              const message = `🔐 *Y-TECH Internet 5G*\n\nSeu código de verificação:\n\n*${code}*\n\nVálido por 10 minutos.\n\n_Não compartilhe este código._`;
              
              // Usar o remoteJid original para responder na mesma conversa
              const replyTo = remoteJid || `${fromId}@s.whatsapp.net`;
              const to = replyTo.endsWith('@s.whatsapp.net')
                ? replyTo.replace('@s.whatsapp.net', '')
                : replyTo; // mantém @lid
              
              const megaUrl = `https://${megaApiHost}/rest/sendMessage/${megaInstanceKey}/text`;
              
              try {
                const megaResponse = await fetch(megaUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${megaToken}`
                  },
                  body: JSON.stringify({
                    messageData: {
                      to,
                      text: message
                    }
                  })
                });

                const megaData = await megaResponse.json();
                console.log('📤 Resposta do envio do código:', JSON.stringify(megaData, null, 2));

                // Salvar mensagem enviada
                await supabase
                  .from('whatsapp_messages')
                  .insert({
                    whatsapp: sender.kind === 'phone' ? fromId : replyTo,
                    message_type: 'verification_code_reply',
                    message_content: message,
                    status: 'sent',
                    mega_message_id: megaData.key?.id || megaData.messageData?.key?.id || null,
                    metadata: { code, replyTo, pendingVerificationId: pendingVerification.id }
                  });

              } catch (sendError) {
                console.error('❌ Erro ao enviar código:', sendError);
              }
            }
          }

          return new Response(JSON.stringify({ 
            success: true,
            message: 'Código de verificação enviado' 
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // Se não está aguardando verificação, processar com chatbot IA
        supabase.functions.invoke('chatbot-handler', {
          body: {
            whatsapp: sender.kind === 'phone' ? fromId : (remoteJid || fromId),
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
      
      if (audioMessage && fromId) {
        console.log(`🎙️ Áudio recebido de ${fromId} (${senderName})`);
        
        try {
          // Notificar usuário que está processando
          supabase.functions.invoke('send-whatsapp-notification', {
            body: {
              whatsapp: sender.kind === 'phone' ? fromId : (remoteJid || fromId),
              message: '🎤 Recebi seu áudio! Estou processando...'
            }
          }).catch(err => console.error('Erro ao enviar notificação:', err));

          const megaApiHost = Deno.env.get('MEGA_API_HOST');
          const megaInstanceKey = payload.instance_key; // Usar a instance_key do payload
          const megaApiToken = Deno.env.get('MEGA_API_KEY');

          console.log('🔐 Token disponível:', megaApiToken ? 'Sim' : 'Não');
          console.log('🌐 Host:', megaApiHost);

          if (!megaInstanceKey) {
            throw new Error('Instance key não encontrada no payload');
          }

          if (!megaApiToken) {
            throw new Error('MEGA_API_KEY não configurado');
          }

          // Fazer download do áudio usando o endpoint correto da documentação
          const downloadUrl = `https://${megaApiHost}/rest/instance/downloadMediaMessage/${megaInstanceKey}`;
          console.log('📥 Fazendo download do áudio...');
          console.log('🔑 Instance key:', megaInstanceKey);

          const downloadResponse = await fetch(downloadUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${megaApiToken}`
            },
            body: JSON.stringify({
              messageKeys: {
                mediaKey: audioMessage.mediaKey,
                directPath: audioMessage.directPath,
                url: audioMessage.url,
                mimetype: audioMessage.mimetype,
                messageType: 'audio'
              }
            })
          });

          if (!downloadResponse.ok) {
            const errorText = await downloadResponse.text();
            console.error('❌ Erro ao baixar áudio:', downloadResponse.status, errorText);
            throw new Error(`Erro ao baixar áudio: ${downloadResponse.status}`);
          }

          const downloadData = await downloadResponse.json();
          console.log('✅ Áudio baixado com sucesso');
          console.log('📦 Estrutura da resposta:', JSON.stringify(downloadData, null, 2));

          // Tentar extrair o base64 de diferentes possíveis localizações
          let audioBase64 = downloadData.base64 || 
                           downloadData.media || 
                           downloadData.data ||
                           downloadData.message?.base64 ||
                           downloadData.message?.media ||
                           downloadData.message?.data;
          
          // Se não encontrou diretamente, tentar buscar recursivamente
          if (!audioBase64 && typeof downloadData === 'object') {
            const findBase64 = (obj: any): string | null => {
              for (const key in obj) {
                if (typeof obj[key] === 'string' && obj[key].length > 1000) {
                  return obj[key];
                }
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                  const result = findBase64(obj[key]);
                  if (result) return result;
                }
              }
              return null;
            };
            audioBase64 = findBase64(downloadData);
          }
          
          if (!audioBase64) {
            console.error('❌ Base64 do áudio não encontrado na resposta');
            console.error('📦 Chaves disponíveis:', Object.keys(downloadData));
            throw new Error('Base64 do áudio não encontrado');
          }
          
          console.log('✅ Base64 encontrado, tamanho:', audioBase64.length);

          // Se for um data URL, extrair apenas a parte base64
          if (audioBase64.startsWith('data:')) {
            const base64Match = audioBase64.match(/base64,(.+)/);
            if (base64Match) {
              audioBase64 = base64Match[1];
              console.log('✅ Extraído base64 do data URL, novo tamanho:', audioBase64.length);
            }
          }

          // Transcrever com OpenAI Whisper
          const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
          if (!OPENAI_API_KEY) {
            console.error('❌ OPENAI_API_KEY não configurada');
            throw new Error('OPENAI_API_KEY não configurada');
          }

          console.log('🎯 Transcrevendo áudio com Whisper...');
          
          // Converter base64 para Uint8Array
          const audioBuffer = decodeBase64(audioBase64);
          
          // Criar um novo Uint8Array para evitar problemas de tipo
          const audioData = new Uint8Array(audioBuffer);
          
          // Criar Blob do áudio
          const audioBlob = new Blob([audioData], { 
            type: audioMessage.mimetype || 'audio/ogg; codecs=opus' 
          });
          
          // Criar FormData para enviar ao Whisper
          const formData = new FormData();
          formData.append('file', audioBlob, 'audio.ogg');
          formData.append('model', 'whisper-1');
          formData.append('language', 'pt');

          const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: formData
          });

          if (!whisperResponse.ok) {
            const errorText = await whisperResponse.text();
            console.error('❌ Erro no Whisper:', whisperResponse.status, errorText);
            throw new Error(`Erro na transcrição: ${whisperResponse.status}`);
          }

          const transcription = await whisperResponse.json();
          const transcribedText = transcription.text;
          
          console.log(`📝 Áudio transcrito: "${transcribedText}"`);

          // Processar com chatbot IA
          supabase.functions.invoke('chatbot-handler', {
            body: {
              whatsapp: sender.kind === 'phone' ? fromId : (remoteJid || fromId),
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
          
          // Notificar usuário sobre o erro
          supabase.functions.invoke('send-whatsapp-notification', {
            body: {
              whatsapp: sender.kind === 'phone' ? fromId : (remoteJid || fromId),
              message: 'Desculpe, tive um problema ao processar seu áudio. 😔\n\nPor favor, tente enviar sua mensagem por texto!'
            }
          }).catch(err => console.error('Erro ao enviar notificação:', err));

          return new Response(JSON.stringify({ 
            success: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          }), {
            status: 200, // Retornar 200 para não reenviar webhook
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