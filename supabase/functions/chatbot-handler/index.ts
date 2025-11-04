import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sistema de prompt do chatbot
const SYSTEM_PROMPT = `Você é um assistente de suporte da Y-TECH Internet 5G, uma empresa brasileira que oferece internet 5G via chip/eSIM.

**Informações importantes:**
- Planos disponíveis:
  • Plano Smartphone: R$ 129,99/mês - 160 GB de internet 5G com cobertura nacional
  • Plano Rural: R$ 129,99/mês - 250 GB acumulativos, ideal para área rural com internet estável no campo
- Ambos os planos incluem: Velocidade ultra rápida, Suporte 24/7, Sem fidelidade
- Tecnologia: Internet 5G via chip físico ou eSIM
- Cobertura: Nacional (consulte disponibilidade por região)
- Sistema de indicação: Ganhe até R$ 26 por indicação em até 4 níveis de comissão
- Suporte WhatsApp: +55 11 99486-9948
- Site: ytech.lovable.app

**Seu papel:**
1. Responder dúvidas sobre planos, preços e cobertura
2. Ajudar com problemas técnicos (ativação de chip/eSIM, conectividade)
3. Explicar o sistema de comissões por indicação
4. Orientar sobre pagamentos e renovações
5. Ser cordial, objetivo e usar linguagem clara
6. Sempre que possível, direcionar para o WhatsApp de suporte para questões complexas

**Diretrizes:**
- Mensagens curtas e diretas
- Use emojis moderadamente
- Se não souber algo, diga que vai consultar a equipe
- Nunca invente informações
- Sempre termine oferecendo ajuda adicional

Responda sempre em português brasileiro.`;

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