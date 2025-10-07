import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error('Não autenticado');
    }

    const { materialType, username, fullName, planPreference } = await req.json();

    // Verificar limite diário de 5 gerações
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: todayGenerations, error: countError } = await supabase
      .from('marketing_material_generations')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .gte('created_at', today.toISOString());

    if (countError) throw countError;

    if (todayGenerations && todayGenerations.length >= 5) {
      return new Response(
        JSON.stringify({ 
          error: 'Limite diário atingido. Você pode gerar até 5 materiais por dia.' 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se for material padrão, retornar template fixo
    if (materialType === 'standard') {
      const standardContent = `🚀 *Transforme sua Conexão com Y-TECH 5G!*

Olá! Sou ${fullName} e quero te apresentar uma oportunidade incrível: internet 5G de verdade, com planos que cabem no seu bolso e ainda te dão a chance de ganhar dinheiro!

📱 *Nossos Planos:*
• *Plano Smartphone*: R$ 129,99 - 160 GB 5G
• *Plano Rural*: R$ 129,99 - 250 GB acumulativos

💰 *Ganhe Indicando:*
• R$ 26 por cada pessoa que você indicar
• R$ 5 por indicações indiretas (até 4 níveis)

🔗 Conheça todos os detalhes no meu site:
https://ytech.yrwentechnology.com.br/site/${username}

Fale comigo para mais informações! 📲

#InternetRural #5G #RendaExtra #YTECH`;

      // Salvar geração no banco
      await supabase
        .from('marketing_material_generations')
        .insert({
          user_id: user.id,
          material_type: materialType,
          generated_content: standardContent
        });

      return new Response(
        JSON.stringify({ content: standardContent }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar informações dos planos
    const { data: plans } = await supabase
      .from('plans')
      .select('*')
      .eq('active', true);

    let planInfo = '';
    if (plans && plans.length > 0) {
      planInfo = plans.map(p => 
        `- ${p.name}: R$ ${p.price} - ${p.description || 'Internet 5G'}`
      ).join('\n');
    }

    // Preparar prompt baseado no tipo de material
    let promptType = '';
    switch (materialType) {
      case 'whatsapp':
        promptType = 'um post curto e direto para WhatsApp (máximo 15 linhas)';
        break;
      case 'social':
        promptType = 'um post para Instagram/Facebook (com emojis e hashtags)';
        break;
      case 'presentation':
        promptType = 'uma apresentação completa e detalhada';
        break;
    }

    const prompt = `Você é um especialista em marketing de afiliados para internet 5G.
Crie ${promptType} para ${fullName} divulgar os planos Y-TECH 5G.

Planos disponíveis:
${planInfo}

Comissões para indicadores:
- R$ 26 por indicação direta
- R$ 5 por indicações indiretas (até 4 níveis)

Link do mini site: https://ytech.yrwentechnology.com.br/site/${username}

Crie um texto persuasivo, profissional e que destaque:
1. Benefícios da internet 5G
2. Flexibilidade dos planos
3. Oportunidade de renda extra com indicações
4. Facilidade de assinar através do mini site

Use emojis moderadamente e seja direto.
IMPORTANTE: Sempre inclua o link do mini site no texto.`;

    // Chamar Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Você é um especialista em marketing digital e copywriting.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Error:', errorText);
      throw new Error('Erro ao gerar conteúdo com IA');
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices[0].message.content;

    // Salvar geração no banco
    await supabase
      .from('marketing_material_generations')
      .insert({
        user_id: user.id,
        material_type: materialType,
        generated_content: generatedContent
      });

    return new Response(
      JSON.stringify({ content: generatedContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});