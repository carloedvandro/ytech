import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sistema de prompt do chatbot
// Base de conhecimento completa em: KNOWLEDGE-BASE-CHATBOT.md
const SYSTEM_PROMPT = `Você é um assistente de suporte inteligente da Y-TECH Internet 5G, uma empresa brasileira líder em internet 5G via chip/eSIM.

**📱 PLANOS DISPONÍVEIS:**

1. **Plano Básico - R$ 49,90/mês**
   - Velocidade: até 100 Mbps
   - Dados: ilimitados
   - Cobertura: nacional
   - Chip/eSIM incluído

2. **Plano Intermediário - R$ 79,90/mês**
   - Velocidade: até 200 Mbps
   - Dados: ilimitados
   - Cobertura: nacional
   - Chip/eSIM incluído
   - Suporte prioritário

3. **Plano Premium - R$ 109,90/mês**
   - Velocidade: até 300 Mbps
   - Dados: ilimitados
   - Cobertura: nacional
   - Chip/eSIM incluído
   - Suporte prioritário
   - Bônus no sistema de indicações

**🎯 SISTEMA DE INDICAÇÕES (MLM):**
- Cada cliente pode indicar outras pessoas
- Ganha comissão recorrente por cada indicação ativa
- Sistema de níveis: quanto mais indica, maior a comissão
- Comissões pagas mensalmente
- Plano Premium tem bônus especiais para indicadores

**🔧 SUPORTE TÉCNICO - SOLUÇÕES RÁPIDAS:**

Internet Lenta:
1. Reinicie o roteador/modem
2. Verifique quantos dispositivos estão conectados
3. Teste em outro dispositivo

Não Conecta:
1. Verifique se chip/eSIM está ativo
2. Confirme sinal 5G na região
3. Reinicie o dispositivo

**💳 FORMAS DE PAGAMENTO:**
- Cartão de crédito (todas bandeiras)
- PIX
- Boleto bancário
- Débito automático

**⏱️ PRAZOS DE ATIVAÇÃO:**
- Chip físico: 2-5 dias úteis + ativação imediata
- eSIM: até 24h após confirmação de pagamento

**📞 CONTATOS:**
- WhatsApp: +55 11 99486-9948
- Site: ytech.lovable.app
- Horário: Segunda a sexta, 8h às 18h

**🎯 SEU PAPEL COMO ASSISTENTE:**
1. ✅ Responder dúvidas sobre planos, preços e cobertura
2. ✅ Resolver problemas técnicos simples
3. ✅ Explicar sistema de indicações/comissões
4. ✅ Orientar sobre pagamentos e renovações
5. ✅ Verificar disponibilidade de cobertura
6. ⚠️ Encaminhar casos complexos para atendimento humano

**📋 DIRETRIZES DE ATENDIMENTO:**
- ✅ Seja cordial, profissional e objetivo
- ✅ Mensagens curtas e claras (máximo 3-4 linhas)
- ✅ Use emojis moderadamente para deixar amigável
- ✅ Sempre confirme se resolveu a dúvida do cliente
- ✅ Ofereça próximos passos claros
- ⚠️ Se não souber, seja honesto: "Vou consultar a equipe e retorno"
- ❌ NUNCA invente informações
- ❌ NUNCA prometa o que não pode cumprir

**IMPORTANTE:** Para dúvidas muito específicas sobre cobertura em regiões, problemas técnicos complexos ou questões financeiras, sempre ofereça contato direto com a equipe pelo WhatsApp: +55 11 99486-9948

Responda SEMPRE em português brasileiro, de forma natural e humanizada.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { whatsapp, message, userName } = await req.json();

    if (!whatsapp || !message) {
      throw new Error('WhatsApp e mensagem são obrigatórios');
    }

    console.log(`📱 Processando mensagem de ${whatsapp}: "${message}"`);

    // Buscar ou criar conversa
    const { data: existingConversation } = await supabase
      .from('chatbot_conversations')
      .select('*')
      .eq('whatsapp', whatsapp)
      .eq('status', 'active')
      .single();

    let conversationHistory = existingConversation?.conversation_history || [];
    const conversationId = existingConversation?.id;

    // Adicionar mensagem do usuário ao histórico
    conversationHistory.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });

    // Manter apenas últimas 20 mensagens para não estourar contexto
    if (conversationHistory.length > 20) {
      conversationHistory = conversationHistory.slice(-20);
    }

    // Preparar mensagens para a IA
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    console.log('🤖 Enviando para IA...');

    // Chamar Lovable AI (OpenAI via gateway)
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ Erro na IA:', aiResponse.status, errorText);
      throw new Error(`Erro na IA: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices[0].message.content;

    console.log('✅ Resposta da IA:', assistantMessage);

    // Adicionar resposta ao histórico
    conversationHistory.push({
      role: 'assistant',
      content: assistantMessage,
      timestamp: new Date().toISOString()
    });

    // Buscar user_id se existir um perfil com esse WhatsApp
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('whatsapp', whatsapp)
      .single();

    // Salvar/atualizar conversa
    if (conversationId) {
      await supabase
        .from('chatbot_conversations')
        .update({
          conversation_history: conversationHistory,
          last_message_at: new Date().toISOString(),
          user_id: profile?.id || null
        })
        .eq('id', conversationId);
    } else {
      await supabase
        .from('chatbot_conversations')
        .insert({
          whatsapp,
          user_id: profile?.id || null,
          conversation_history: conversationHistory,
          last_message_at: new Date().toISOString(),
          metadata: { userName }
        });
    }

    // Enviar resposta via WhatsApp
    console.log('📤 Enviando resposta via WhatsApp...');

    const { error: sendError } = await supabase.functions.invoke('send-whatsapp-notification', {
      body: {
        to: whatsapp,
        message: assistantMessage,
        userId: profile?.id
      }
    });

    if (sendError) {
      console.error('❌ Erro ao enviar WhatsApp:', sendError);
      throw sendError;
    }

    console.log('✅ Resposta enviada com sucesso!');

    return new Response(JSON.stringify({
      success: true,
      message: assistantMessage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro no chatbot:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    return new Response(JSON.stringify({
      error: errorMessage,
      details: error instanceof Error ? error.stack : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});