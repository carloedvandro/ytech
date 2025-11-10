import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Não autenticado');
    }

    const { paymentId } = await req.json();

    console.log(`🔄 Sincronizando fatura ${paymentId} com Asaas`);

    // Buscar fatura no banco
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*, plan:plans(*)')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      throw new Error('Fatura não encontrada');
    }

    const asaasPaymentId = payment.metadata?.asaas_payment_id;
    if (!asaasPaymentId) {
      throw new Error('Fatura não tem asaas_payment_id');
    }

    // Buscar configuração do Asaas
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
    const asaasEnvironment = Deno.env.get('ASAAS_ENVIRONMENT') || 'production';
    const asaasUrl = asaasEnvironment === 'sandbox' 
      ? 'https://sandbox.asaas.com/api/v3'
      : 'https://api.asaas.com/v3';

    console.log(`🔍 Buscando cobrança no Asaas: ${asaasPaymentId}`);

    // Buscar cobrança no Asaas
    const asaasResponse = await fetch(`${asaasUrl}/payments/${asaasPaymentId}`, {
      headers: { 'access_token': asaasApiKey! }
    });

    if (!asaasResponse.ok) {
      throw new Error(`Erro ao buscar cobrança no Asaas: ${asaasResponse.statusText}`);
    }

    const asaasPayment = await asaasResponse.json();
    const asaasValue = Number(asaasPayment.value);
    const planPrice = Number(payment.plan.price);
    const discountApplied = planPrice - asaasValue;

    console.log(`💰 Valores:`, {
      asaasValue,
      planPrice,
      discountApplied,
      currentAmount: payment.amount
    });

    // Se há diferença entre o valor no Asaas e o valor do plano, há desconto
    if (discountApplied > 0) {
      console.log(`✅ Desconto de R$ ${discountApplied} detectado`);

      // Atualizar fatura no banco
      await supabase
        .from('payments')
        .update({
          amount: asaasValue,
          metadata: {
            ...payment.metadata,
            discount_applied: discountApplied,
            original_amount: planPrice,
            synced_at: new Date().toISOString()
          }
        })
        .eq('id', paymentId);

      // Buscar comissões available do usuário
      const { data: commissions } = await supabase
        .from('commissions')
        .select('id, amount')
        .eq('user_id', payment.user_id)
        .eq('status', 'available')
        .order('created_at', { ascending: true });

      // Marcar comissões como withdrawn
      let remainingDiscount = discountApplied;
      const commsToWithdraw = [];

      for (const comm of commissions || []) {
        if (remainingDiscount <= 0) break;
        const amountToUse = Math.min(Number(comm.amount), remainingDiscount);
        commsToWithdraw.push(comm.id);
        remainingDiscount -= amountToUse;
      }

      if (commsToWithdraw.length > 0) {
        await supabase
          .from('commissions')
          .update({
            status: 'withdrawn',
            withdrawn_at: new Date().toISOString()
          })
          .in('id', commsToWithdraw);

        console.log(`✅ ${commsToWithdraw.length} comissão(ões) marcada(s) como withdrawn`);
      }

      // Se ainda sobrou desconto, criar ajuste negativo
      if (remainingDiscount > 0.01) {
        const { data: adjustments } = await supabase
          .from('admin_balance_adjustments')
          .select('amount, type')
          .eq('user_id', payment.user_id);

        const adjustmentsTotal = adjustments?.reduce((sum, adj) => {
          return sum + (adj.type === 'add' ? Number(adj.amount) : -Number(adj.amount));
        }, 0) || 0;

        await supabase
          .from('admin_balance_adjustments')
          .insert({
            user_id: payment.user_id,
            admin_id: user.id,
            type: 'remove',
            amount: remainingDiscount,
            reason: 'Sincronização de desconto aplicado no Asaas',
            balance_before: adjustmentsTotal,
            balance_after: adjustmentsTotal - remainingDiscount
          });

        console.log(`✅ Ajuste de saldo criado: -R$ ${remainingDiscount.toFixed(2)}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Fatura sincronizada! Desconto de R$ ${discountApplied.toFixed(2)} aplicado.`,
          data: {
            asaas_value: asaasValue,
            discount_applied: discountApplied,
            original_amount: planPrice
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Fatura já está sincronizada, sem desconto aplicado.',
          data: {
            asaas_value: asaasValue,
            plan_price: planPrice
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
