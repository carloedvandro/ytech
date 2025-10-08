import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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
      throw new Error('Apenas administradores podem ajustar saldos');
    }

    const { userId, amount, type, reason, shouldGenerateCommissions } = await req.json();

    console.log('Ajustando saldo:', { userId, amount, type, reason, shouldGenerateCommissions });

    // Buscar saldo atual (comissões + adições - descontos)
    const { data: commissionsData } = await supabase
      .from('commissions')
      .select('amount, status')
      .eq('user_id', userId);

    const commissionsTotal = commissionsData
      ?.filter(c => c.status === 'available')
      .reduce((sum, c) => sum + Number(c.amount), 0) || 0;

    // Buscar ajustes
    const { data: adjustmentsData } = await supabase
      .from('admin_balance_adjustments')
      .select('amount, type')
      .eq('user_id', userId);

    const additionsTotal = adjustmentsData
      ?.filter(a => a.type === 'add')
      .reduce((sum, a) => sum + Number(a.amount), 0) || 0;

    const deductionsTotal = adjustmentsData
      ?.filter(a => a.type === 'remove')
      .reduce((sum, a) => sum + Number(a.amount), 0) || 0;

    const balanceBefore = commissionsTotal + additionsTotal - deductionsTotal;

    const balanceAfter = type === 'add' 
      ? balanceBefore + amount 
      : balanceBefore - amount;

    if (type === 'remove' && balanceAfter < 0) {
      throw new Error('Saldo insuficiente para remoção');
    }

    // Registrar ajuste
    const { error: adjustmentError } = await supabase
      .from('admin_balance_adjustments')
      .insert({
        user_id: userId,
        admin_id: user.id,
        amount,
        type,
        reason,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
      });

    if (adjustmentError) {
      console.error('Erro ao registrar ajuste:', adjustmentError);
      throw new Error('Erro ao registrar ajuste');
    }

    console.log('Ajuste registrado com sucesso');

    // Se for adicionar saldo
    if (type === 'add') {
      if (shouldGenerateCommissions) {
        // Buscar plano do usuário para calcular comissões
        const { data: lastPayment } = await supabase
          .from('payments')
          .select('plan_id, plans(commission_l1, commission_l2_l4)')
          .eq('user_id', userId)
          .eq('status', 'confirmed')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!lastPayment) {
          throw new Error('Usuário não possui plano ativo');
        }

        const plan = lastPayment.plans as any;
        
        // Buscar caminho da rede do usuário
        const { data: networkData } = await supabase
          .from('user_network')
          .select('path')
          .eq('user_id', userId)
          .single();

        if (!networkData?.path) {
          throw new Error('Caminho da rede não encontrado');
        }

        // Função para verificar se usuário pode receber comissão
        const canReceiveCommission = async (levelUserId: string) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('status')
            .eq('id', levelUserId)
            .single();

          if (!profile || profile.status !== 'active') {
            return false;
          }

          const { data: payment } = await supabase
            .from('payments')
            .select('next_renewal_date')
            .eq('user_id', levelUserId)
            .eq('status', 'confirmed')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (!payment?.next_renewal_date) {
            return false;
          }

          const renewalDate = new Date(payment.next_renewal_date);
          const now = new Date();
          return renewalDate > now;
        };

        // Gerar comissões para a rede
        const commissionsToCreate = [];
        const paymentId = `admin_adjustment_${Date.now()}`;

        for (let i = 1; i < networkData.path.length; i++) {
          const levelUserId = networkData.path[networkData.path.length - 1 - i];
          const level = i;

          // Verificar se pode receber comissão
          const canReceive = await canReceiveCommission(levelUserId);
          if (!canReceive) {
            console.log(`Usuário ${levelUserId} no nível ${level} não pode receber comissão`);
            continue;
          }

          let commissionAmount = 0;
          if (level === 1) {
            commissionAmount = (amount * plan.commission_l1) / 100;
          } else if (level >= 2 && level <= 4) {
            commissionAmount = (amount * plan.commission_l2_l4) / 100;
          }

          if (commissionAmount > 0) {
            commissionsToCreate.push({
              user_id: levelUserId,
              referred_user_id: userId,
              payment_id: paymentId,
              amount: commissionAmount,
              level: level,
              status: 'available',
              released_at: new Date().toISOString(),
            });
          }
        }

        if (commissionsToCreate.length > 0) {
          const { error: commError } = await supabase
            .from('commissions')
            .insert(commissionsToCreate);

          if (commError) {
            console.error('Erro ao criar comissões:', commError);
            throw new Error('Erro ao gerar comissões');
          }

          console.log(`${commissionsToCreate.length} comissões geradas com sucesso`);
        }
      } else {
        // Apenas adicionar crédito direto SEM criar comissões
        // O registro já foi feito em admin_balance_adjustments
        console.log('Saldo adicionado com sucesso (sem comissões)');
      }
    }

    // Ajuste manual não marca comissões como withdrawn
    // Isso deve ser feito apenas em saques reais via transações
    if (type === 'remove') {
      console.log('Saldo removido com sucesso (ajuste manual)');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Saldo ajustado com sucesso',
        balance_after: balanceAfter
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
