import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autorizado');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Não autorizado');
    }

    // Verificar se é admin
    const { data: isAdmin } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!isAdmin) {
      throw new Error('Apenas administradores podem ativar usuários');
    }

    const { userId, planId } = await req.json();

    console.log('Admin ativando usuário:', { adminId: user.id, userId, planId });

    // Buscar plano
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      throw new Error('Plano não encontrado');
    }

    // Buscar usuário
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !userProfile) {
      throw new Error('Usuário não encontrado');
    }

    // Criar pagamento simulado (ativação manual por admin)
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        plan_id: planId,
        amount: plan.price,
        status: 'confirmed',
        paid_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 ano
        metadata: {
          activated_by_admin: user.id,
          admin_name: (await supabase.from('profiles').select('full_name').eq('id', user.id).single()).data?.full_name,
          activation_type: 'manual'
        }
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Erro ao criar pagamento:', paymentError);
      throw new Error('Erro ao criar pagamento');
    }

    console.log('Pagamento criado:', payment.id);

    // Atualizar status do usuário para active
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        status: 'active',
        metadata: {
          ...userProfile.metadata,
          activated_by_admin: user.id,
          activation_date: new Date().toISOString()
        }
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Erro ao atualizar status:', updateError);
      throw new Error('Erro ao atualizar status do usuário');
    }

    console.log('Status do usuário atualizado para active');

    // Buscar a rede do usuário para calcular comissões
    const { data: networkData, error: networkError } = await supabase
      .from('user_network')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (networkError || !networkData) {
      console.log('Usuário não tem rede (sem indicador), sem comissões a gerar');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Usuário ativado com sucesso (sem comissões - sem indicador)',
          payment_id: payment.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Rede do usuário:', networkData);

    // Calcular comissões para os 4 níveis acima
    const commissionsToCreate = [];
    const path = networkData.path || [];
    const userLevel = networkData.level;

    // Remover o próprio usuário do path
    const uplinePath = path.filter((id: string) => id !== userId);

    console.log('Path de uplines:', uplinePath);

    // Percorrer os uplines (no máximo 4 níveis acima)
    for (let i = 0; i < Math.min(4, uplinePath.length); i++) {
      const uplineId = uplinePath[uplinePath.length - 1 - i]; // Começar do mais próximo
      const levelDiff = i + 1; // Nível relativo (1, 2, 3, 4)

      // Determinar valor da comissão
      let commissionAmount = 0;
      if (levelDiff === 1) {
        commissionAmount = Number(plan.commission_l1);
      } else {
        commissionAmount = Number(plan.commission_l2_l4);
      }

      console.log(`Preparando comissão para upline ${uplineId} no nível ${levelDiff}: R$ ${commissionAmount}`);

      commissionsToCreate.push({
        user_id: uplineId,
        referred_user_id: userId,
        level: levelDiff,
        amount: commissionAmount,
        status: 'available',
        payment_id: payment.id,
        released_at: new Date().toISOString()
      });
    }

    // Inserir todas as comissões
    if (commissionsToCreate.length > 0) {
      const { error: commissionError } = await supabase
        .from('commissions')
        .insert(commissionsToCreate);

      if (commissionError) {
        console.error('Erro ao criar comissões:', commissionError);
        throw new Error('Erro ao gerar comissões');
      }

      console.log(`${commissionsToCreate.length} comissões criadas com sucesso`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Usuário ativado e comissões geradas com sucesso',
        payment_id: payment.id,
        commissions_created: commissionsToCreate.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na ativação:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
