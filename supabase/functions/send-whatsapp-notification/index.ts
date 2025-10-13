import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Templates de mensagens
const messageTemplates = {
  welcome: (data: any) => 
    `🎉 *Bem-vindo à Y-TECH Internet 5G!*\n\n` +
    `Olá ${data.name}! 🚀\n\n` +
    `É um prazer enorme ter você conosco! Seu cadastro foi realizado com sucesso e você agora faz parte da nossa família Y-TECH.\n\n` +
    `📋 *Seus Dados de Cadastro:*\n` +
    `• Nome: ${data.name}\n` +
    `• Email: ${data.email}\n` +
    `• WhatsApp: ${data.whatsapp}\n` +
    `• CPF: ${data.cpf}\n\n` +
    `🔐 *Próximos Passos:*\n\n` +
    `1️⃣ Faça login na plataforma:\n${data.loginUrl}\n\n` +
    `2️⃣ Escolha seu plano e realize o pagamento para ativar sua conta\n\n` +
    `3️⃣ Após a confirmação do pagamento, você receberá seu link de indicação exclusivo para começar a ganhar comissões!\n\n` +
    `💰 *Sistema de Comissões:*\n` +
    `Com seu link de indicação ativo, você poderá convidar outras pessoas e ganhar comissões em até 4 níveis!\n\n` +
    `📱 *Importante:*\n` +
    `Guarde este link de login para fácil acesso:\n${data.loginUrl}\n\n` +
    `Estamos muito felizes em tê-lo(a) conosco! Se tiver qualquer dúvida, estamos à disposição.\n\n` +
    `Seja bem-vindo(a) e bons negócios! 🎯`,

  sim_activated: (data: any) =>
    `🎉 *Seu ${data.productType} foi ATIVADO!*\n\n` +
    `Olá ${data.name}! 🚀\n\n` +
    `✅ Ótimas notícias! Seu ${data.productType} já está ativo e pronto para uso.\n\n` +
    `📱 *O que fazer agora:*\n` +
    `${data.instructions}\n\n` +
    `🌐 *Teste sua conexão:*\n` +
    `• Abra o navegador\n` +
    `• Acesse qualquer site\n` +
    `• Faça uma chamada de teste\n\n` +
    `💡 Se tiver qualquer dúvida, estamos à disposição!\n\n` +
    `_Y-TECH Internet 5G_`,

  payment_pending: (data: any) =>
    `💰 *Y-TECH Internet 5G*\n\n` +
    `Seu pagamento está pendente.\n\n` +
    `Plano: ${data.planName}\n` +
    `Valor: R$ ${data.amount.toFixed(2)}\n\n` +
    `Complete o pagamento para ativar sua conta!`,

  commission_earned: (data: any) =>
    `💸 *Nova Comissão Recebida!*\n\n` +
    `Você ganhou R$ ${data.amount.toFixed(2)}\n` +
    `Nível: ${data.level}\n` +
    `Indicado: ${data.referredName}\n\n` +
    `_Comissão será liberada após confirmação do pagamento._`,

  commission_released: (data: any) =>
    `✅ *Comissão Liberada!*\n\n` +
    `R$ ${data.amount.toFixed(2)} disponível para saque!\n` +
    `Indicado: ${data.referredName}\n` +
    `Nível: ${data.level}\n\n` +
    `Saques disponíveis às sextas-feiras a partir das 00h.`,

  withdrawal_confirmed: (data: any) =>
    `🏦 *Solicitação de Saque Recebida*\n\n` +
    `Valor solicitado: R$ ${data.amount.toFixed(2)}\n` +
    `Taxa (3%): R$ ${data.fee.toFixed(2)}\n` +
    `Valor líquido: R$ ${data.netAmount.toFixed(2)}\n\n` +
    `Processamento em até 48h úteis.`,

  withdrawal_processed: (data: any) =>
    `✅ *Saque Processado!*\n\n` +
    `R$ ${data.netAmount.toFixed(2)} foram transferidos para sua chave PIX.\n\n` +
    `Obrigado por fazer parte da Y-TECH! 🚀`,

  charge_reminder: (data: any) =>
    `⏰ *Lembrete de Pagamento*\n\n` +
    `Olá ${data.name}!\n\n` +
    `Seu pagamento está pendente há ${data.daysPending} dias.\n\n` +
    `Plano: ${data.planName}\n` +
    `Valor: R$ ${data.amount.toFixed(2)}\n\n` +
    `Complete o pagamento para manter seus benefícios ativos!`,

  password_reset: (data: any) =>
    `🔐 *Sua Nova Senha Temporária*\n\n` +
    `Olá ${data.name}!\n\n` +
    `Sua conta foi migrada com sucesso para nosso novo sistema.\n\n` +
    `📧 *Email:* ${data.email}\n` +
    `🔑 *Senha Temporária:* ${data.temporaryPassword}\n\n` +
    `⚠️ *IMPORTANTE:* Por segurança, altere sua senha após o primeiro login.\n\n` +
    `🔗 *Acesse a plataforma:*\n${data.loginUrl || 'https://ytech.lovable.app/login'}\n\n` +
    `Bem-vindo(a) de volta! 🚀`,

  chip_activated_by_user: (data: any) =>
    `✅ *Cliente Confirmou Ativação do Chip*\n\n` +
    `👤 *Cliente:* ${data.fullName}\n` +
    `📱 *WhatsApp:* ${data.whatsapp}\n` +
    `📡 *Tipo:* ${data.activationType === 'esim' ? 'eSIM' : 'Chip Físico'}\n\n` +
    `✅ *O cliente confirmou que:*\n` +
    `• Leu o QR Code\n` +
    `• Configurou o ${data.activationType === 'esim' ? 'eSIM' : 'chip'}\n` +
    `• Fez testes de conexão\n` +
    `• O chip está funcionando normalmente\n\n` +
    `_Y-TECH Internet 5G_`,

  renewal_paid_with_balance: (data: any) =>
    `🎉 *Renovação Confirmada!*\n\n` +
    `✅ *Pagamento realizado com seu saldo!*\n\n` +
    `💰 Valor descontado: R$ ${data.amountDeducted.toFixed(2)}\n` +
    `📊 Saldo restante: R$ ${data.remainingBalance.toFixed(2)}\n\n` +
    `🗓️ *Seu plano está ativo até:*\n` +
    `${new Date(data.nextRenewalDate).toLocaleDateString('pt-BR')}\n\n` +
    `_A próxima cobrança será gerada automaticamente._`,

  renewal_with_discount: (data: any) =>
    `🎉 *Renovação Confirmada!*\n\n` +
    `💰 Desconto aplicado: R$ ${data.discountAmount.toFixed(2)}\n` +
    `💳 Valor pago: R$ ${data.paidAmount.toFixed(2)}\n` +
    `📊 Saldo restante: R$ ${data.remainingBalance.toFixed(2)}\n\n` +
    `✅ Seu plano foi renovado com sucesso!`,

  new_referral: (data: any) =>
    `🎉 *Novo Indicado Cadastrado!*\n\n` +
    `Olá ${data.referrerName}! 👋\n\n` +
    `✅ Você acabou de receber um novo indicado:\n\n` +
    `👤 *Nome:* ${data.newUserName}\n` +
    `📧 *Email:* ${data.newUserEmail}\n` +
    `📱 *WhatsApp:* ${data.newUserWhatsapp}\n\n` +
    `💰 *Próximos passos:*\n` +
    `Quando seu indicado realizar o pagamento do primeiro plano, você receberá sua comissão!\n\n` +
    `Continue compartilhando seu link e ampliando sua rede! 🚀\n\n` +
    `_Y-TECH Internet 5G_`,
  
  renewal_early_payment: (data: any) =>
    `✅ *Renovação Antecipada Confirmada!*\n\n` +
    `🎉 Seu plano foi renovado com sucesso!\n\n` +
    `📅 *Nova data de vencimento:*\n` +
    `${new Date(data.nextRenewalDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}\n\n` +
    `💰 *Valor pago:* R$ ${data.amount.toFixed(2)}\n\n` +
    `✅ *Seu plano está ativo e renovado!*\n` +
    `Sua próxima cobrança será gerada automaticamente 30 dias antes do vencimento.\n\n` +
    `Obrigado por estar com a Y-TECH! 🚀\n\n` +
    `_Y-TECH Internet 5G_`
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

    const { whatsapp, messageType, data, userId, to, message, imageUrl } = await req.json();

    // Permitir envio direto de mensagem (sem template) OU uso de template
    if (message && to) {
      // Envio direto - usado pela ativação de SIM
      const formattedNumber = to.replace(/\D/g, '');
      
      console.log(`📱 Enviando mensagem direta para ${formattedNumber}`);

      // Se houver imageUrl, enviar como imagem + legenda
      if (imageUrl) {
        console.log('📸 Tentando enviar imagem com legenda');
        const megaImageUrl = `https://${megaApiHost}/rest/sendMessage/${megaInstanceKey}/image`;
        
        try {
          const megaResponse = await fetch(megaImageUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${megaToken}`
            },
            body: JSON.stringify({
              messageData: {
                to: formattedNumber,
                url: imageUrl,
                caption: message
              }
            })
          });

          const megaData = await megaResponse.json();
          console.log('Resposta Mega API (imagem):', JSON.stringify(megaData, null, 2));

          // Mega API retorna 200 mesmo com erro, verificar campo error no body
          if (megaResponse.ok && !megaData.error) {
            // Salvar mensagem enviada
            await supabase
              .from('whatsapp_messages')
              .insert({
                user_id: userId || null,
                whatsapp: formattedNumber,
                message_type: 'esim_qrcode',
                message_content: message,
                status: 'sent',
                mega_message_id: megaData.key?.id || null,
                metadata: { ...data, imageUrl }
              });

            return new Response(JSON.stringify({ 
              success: true,
              message: 'Imagem do QR Code enviada com sucesso'
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } else {
            // Erro ao enviar imagem - fazer fallback para texto com link
            console.warn('⚠️ Erro ao enviar imagem, usando fallback para texto:', megaData);
          }
        } catch (error) {
          console.error('❌ Falha ao enviar imagem, usando fallback:', error);
        }

        // FALLBACK: Enviar mensagem de texto com link do QR code
        console.log('📝 Enviando mensagem de texto com link da imagem');
        const messageWithLink = `${message}\n\n🔗 *Link do QR Code:*\n${imageUrl}\n\n_Clique no link acima para visualizar e salvar o QR Code_`;
        
        const megaUrl = `https://${megaApiHost}/rest/sendMessage/${megaInstanceKey}/text`;
        
        const textResponse = await fetch(megaUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${megaToken}`
          },
          body: JSON.stringify({
            messageData: {
              to: formattedNumber,
              text: messageWithLink
            }
          })
        });

        const textData = await textResponse.json();
        console.log('Resposta Mega API (texto):', JSON.stringify(textData, null, 2));

        if (!textResponse.ok) {
          console.error('Erro do Mega API ao enviar texto:', textData);
          throw new Error(`Erro ao enviar mensagem: ${textData.error || 'Erro desconhecido'}`);
        }

        // Salvar mensagem enviada (fallback)
        await supabase
          .from('whatsapp_messages')
          .insert({
            user_id: userId || null,
            whatsapp: formattedNumber,
            message_type: 'esim_qrcode_fallback',
            message_content: messageWithLink,
            status: 'sent',
            mega_message_id: textData.key?.id || null,
            metadata: { ...data, imageUrl, fallback: true }
          });

        return new Response(JSON.stringify({ 
          success: true,
          message: 'Mensagem com link do QR Code enviada com sucesso (fallback)'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Enviar apenas texto
      const megaUrl = `https://${megaApiHost}/rest/sendMessage/${megaInstanceKey}/text`;
      
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
          user_id: userId || null,
          whatsapp: formattedNumber,
          message_type: 'custom',
          message_content: message,
          status: 'sent',
          mega_message_id: megaData.key?.id || null,
          metadata: data || {}
        });

      return new Response(JSON.stringify({ 
        success: true,
        message: 'Notificação enviada com sucesso'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Modo template (código original)
    if (!messageType) {
      throw new Error('Tipo de mensagem é obrigatório');
    }

    // Para notificações de chip ativado por usuário, buscar admins
    let recipients: string[] = [];
    if (messageType === 'chip_activated_by_user') {
      console.log('🔍 Buscando admins para notificação...');
      
      const { data: adminRoles, error: adminError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');
      
      if (adminError) {
        console.error('Erro ao buscar admins:', adminError);
        throw adminError;
      }

      const adminIds = adminRoles?.map(r => r.user_id) || [];
      
      if (adminIds.length === 0) {
        throw new Error('Nenhum admin encontrado');
      }

      const { data: adminProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('whatsapp')
        .in('id', adminIds);
      
      if (profileError) {
        console.error('Erro ao buscar perfis dos admins:', profileError);
        throw profileError;
      }

      recipients = adminProfiles?.map(p => p.whatsapp).filter(Boolean) || [];
      console.log(`📱 ${recipients.length} admin(s) serão notificados`);
    } else {
      // Para outros tipos de mensagem, usar o whatsapp fornecido
      if (!whatsapp) {
        throw new Error('WhatsApp é obrigatório para este tipo de mensagem');
      }
      recipients = [whatsapp];
    }

    // Gerar mensagem a partir do template
    const templateFn = messageTemplates[messageType as keyof typeof messageTemplates];
    if (!templateFn) {
      throw new Error(`Template não encontrado: ${messageType}`);
    }

    const templateMessage = templateFn(data);

    // Enviar para todos os destinatários
    const results = [];
    for (const recipientWhatsapp of recipients) {
      const formattedNumber = recipientWhatsapp.replace(/\D/g, '');

      console.log(`📱 Enviando ${messageType} para ${formattedNumber}`);

      // Enviar via Mega API
      const megaUrl = `https://${megaApiHost}/rest/sendMessage/${megaInstanceKey}/text`;
      
      const megaResponse = await fetch(megaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${megaToken}`
        },
        body: JSON.stringify({
          messageData: {
            to: formattedNumber,
            text: templateMessage
          }
        })
      });

      const megaData = await megaResponse.json();
      console.log('Resposta Mega API:', JSON.stringify(megaData, null, 2));

      if (!megaResponse.ok) {
        console.error('Erro do Mega API:', megaData);
        results.push({ success: false, whatsapp: recipientWhatsapp, error: megaData.error });
        continue;
      }

      // Salvar mensagem enviada
      await supabase
        .from('whatsapp_messages')
        .insert({
          user_id: userId || null,
          whatsapp: formattedNumber,
          message_type: messageType,
          message_content: templateMessage,
          status: 'sent',
          mega_message_id: megaData.key?.id || null,
          metadata: data
        });

      results.push({ success: true, whatsapp: recipientWhatsapp });
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Notificações enviadas com sucesso',
      results
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