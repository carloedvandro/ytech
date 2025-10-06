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
    `Complete o pagamento para manter seus benefícios ativos!`
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const megaApiHost = Deno.env.get('MEGA_API_HOST') || 'apinocode01.megaapi.com.br';
    const megaInstanceKey = Deno.env.get('MEGA_INSTANCE_KEY') || 'megacode-MOylIChpYA5';
    const megaToken = Deno.env.get('MEGA_API_KEY') || 'MOylIChpYA5';

    const { whatsapp, messageType, data, userId } = await req.json();

    if (!whatsapp || !messageType) {
      throw new Error('WhatsApp e tipo de mensagem são obrigatórios');
    }

    // Gerar mensagem a partir do template
    const templateFn = messageTemplates[messageType as keyof typeof messageTemplates];
    if (!templateFn) {
      throw new Error(`Template não encontrado: ${messageType}`);
    }

    const message = templateFn(data);

    // Formatar número
    const formattedNumber = whatsapp.replace(/\D/g, '');

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
        message_type: messageType,
        message_content: message,
        status: 'sent',
        mega_message_id: megaData.key?.id || null,
        metadata: data
      });

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Notificação enviada com sucesso'
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