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

    // Pegar userId do body (para suportar impersonation) ou usar o user autenticado
    const { userId: targetUserId } = await req.json();
    const userId = targetUserId || user.id;

    console.log(`🔄 Aplicando desconto de renovação para usuário ${userId}`);

    // 1️⃣ Buscar payment pendente do usuário (com ou sem next_renewal_date)
    console.log('🔍 Buscando fatura pendente...');
    console.log(`   - user_id: ${userId}`);
    console.log(`   - status: pending`);

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*, plan_id')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (paymentError) {
      console.error('❌ Erro ao buscar fatura:', paymentError);
      throw new Error(`Erro ao buscar fatura: ${paymentError.message}`);
    }

    if (!payment) {
      console.log('ℹ️ Nenhuma fatura pendente encontrada');
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhuma fatura pendente para aplicar desconto.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se já tem desconto aplicado
    const currentDiscount = payment.metadata?.discount_applied ? Number(payment.metadata.discount_applied) : 0;
    if (currentDiscount > 0) {
      console.log(`ℹ️ Fatura já possui desconto aplicado: R$ ${currentDiscount}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Esta fatura já possui um desconto de R$ ${currentDiscount.toFixed(2)} aplicado.` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📄 Fatura encontrada: ${payment.id} - R$ ${payment.amount}`);

    // Verificar se faltam pelo menos 5 dias para o vencimento
    if (payment.next_renewal_date) {
      const renewalDate = new Date(payment.next_renewal_date);
      const today = new Date();
      const diffInMs = renewalDate.getTime() - today.getTime();
      const daysUntilExpiration = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

      console.log('📅 Verificando prazo de renovação:', {
        renewalDate: payment.next_renewal_date,
        today: today.toISOString(),
        daysUntilExpiration
      });

      if (daysUntilExpiration < 5) {
        console.log(`⚠️ Desconto bloqueado: faltam apenas ${daysUntilExpiration} dias`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `O desconto só pode ser aplicado com 5 ou mais dias antes do vencimento. Faltam ${daysUntilExpiration} dia(s).` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    }

    // 2️⃣ Buscar dados do usuário e plano
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const { data: plan } = await supabase
      .from('plans')
      .select('*')
      .eq('id', payment.plan_id)
      .single();

    if (!profile || !plan) {
      throw new Error('Usuário ou plano não encontrado');
    }

    console.log(`📋 Plano: ${plan.name} - R$ ${plan.price}`);

    // 3️⃣ Calcular saldo disponível
    console.log('💰 Calculando saldo disponível...');
    const { data: commissionsData } = await supabase
      .from('commissions')
      .select('amount')
      .eq('user_id', userId)
      .eq('status', 'available');

    const { data: adjustments } = await supabase
      .from('admin_balance_adjustments')
      .select('amount, type')
      .eq('user_id', userId);

    const commissionsTotal = commissionsData?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
    const adjustmentsTotal = adjustments?.reduce((sum, adj) => {
      return sum + (adj.type === 'add' ? Number(adj.amount) : -Number(adj.amount));
    }, 0) || 0;

    const totalAvailable = commissionsTotal + adjustmentsTotal;
    console.log(`💰 Saldo disponível: R$ ${totalAvailable} (Comissões: R$ ${commissionsTotal} + Ajustes: R$ ${adjustmentsTotal})`);

    // 4️⃣ Buscar preferências do usuário
    const { data: preferences } = await supabase
      .from('user_renewal_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    const minimumToKeep = Number(preferences?.minimum_balance_to_keep || 0);
    const availableForDiscount = Math.max(0, totalAvailable - minimumToKeep);
    const discountApplied = Math.min(availableForDiscount, Number(plan.price));
    const finalAmount = Number(plan.price) - discountApplied;

    console.log(`💰 Cálculo: Plano R$ ${plan.price} - Desconto R$ ${discountApplied} = R$ ${finalAmount}`);

    if (discountApplied === 0) {
      console.log('ℹ️ Nenhum desconto a aplicar');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Sem saldo disponível para desconto' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5️⃣ Buscar configuração do Asaas
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
    const asaasEnvironment = Deno.env.get('ASAAS_ENVIRONMENT') || 'production';
    const asaasUrl = asaasEnvironment === 'sandbox' 
      ? 'https://sandbox.asaas.com/api/v3'
      : 'https://api.asaas.com/v3';

    console.log(`🔧 Usando ambiente Asaas: ${asaasEnvironment}`);

    // 6️⃣ Buscar customer ID
    let customerId;
    
    if (payment.subscription_id) {
      console.log('🔍 Buscando customer pela subscription...');
      const subResponse = await fetch(`${asaasUrl}/subscriptions/${payment.subscription_id}`, {
        headers: { 'access_token': asaasApiKey! }
      });
      if (subResponse.ok) {
        const subData = await subResponse.json();
        customerId = subData.customer;
        console.log(`✅ Customer ID encontrado na subscription: ${customerId}`);
      }
    }

    if (!customerId && payment.metadata?.asaas_payment_id) {
      console.log('🔍 Buscando customer pelo payment...');
      const payResponse = await fetch(`${asaasUrl}/payments/${payment.metadata.asaas_payment_id}`, {
        headers: { 'access_token': asaasApiKey! }
      });
      if (payResponse.ok) {
        const payData = await payResponse.json();
        customerId = payData.customer;
        console.log(`✅ Customer ID encontrado no payment: ${customerId}`);
      }
    }

    if (!customerId) {
      console.log('🔍 Buscando customer pelo CPF...');
      const searchResponse = await fetch(
        `${asaasUrl}/customers?cpfCnpj=${profile.cpf.replace(/\D/g, '')}`,
        { headers: { 'access_token': asaasApiKey! } }
      );
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.data && searchData.data.length > 0) {
          customerId = searchData.data[0].id;
          console.log(`✅ Customer ID encontrado pelo CPF: ${customerId}`);
        }
      }
    }

    if (!customerId) {
      throw new Error('Não foi possível encontrar o customer ID no Asaas');
    }

    // 7️⃣ Deletar cobrança antiga no Asaas
    if (payment.metadata?.asaas_payment_id) {
      console.log(`🗑️ Deletando cobrança antiga: ${payment.metadata.asaas_payment_id}`);
      const deleteResponse = await fetch(
        `${asaasUrl}/payments/${payment.metadata.asaas_payment_id}`,
        {
          method: 'DELETE',
          headers: { 'access_token': asaasApiKey! }
        }
      );
      
      if (deleteResponse.ok) {
        console.log('✅ Cobrança antiga deletada');
      } else {
        console.log('⚠️ Não foi possível deletar a cobrança antiga, continuando...');
      }
    }

    // 8️⃣ Criar nova cobrança com desconto
    console.log('📝 Criando nova cobrança com desconto...');
    
    // Determinar data de vencimento
    let dueDate;
    if (payment.next_renewal_date) {
      dueDate = payment.next_renewal_date.split('T')[0];
    } else if (payment.expires_at) {
      dueDate = payment.expires_at.split('T')[0];
    } else {
      // Se não tem data, usar amanhã
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      dueDate = tomorrow.toISOString().split('T')[0];
    }
    
    const newPaymentData = {
      customer: customerId,
      billingType: 'PIX',
      value: finalAmount.toFixed(2),
      dueDate: dueDate,
      description: `${plan.name} - Com desconto de R$ ${discountApplied.toFixed(2)}`,
      externalReference: payment.id,
      postalService: false
    };

    const createResponse = await fetch(`${asaasUrl}/payments`, {
      method: 'POST',
      headers: {
        'access_token': asaasApiKey!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newPaymentData)
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      throw new Error(`Erro ao criar cobrança: ${JSON.stringify(errorData)}`);
    }

    const newAsaasPayment = await createResponse.json();
    console.log(`✅ Nova cobrança criada: ${newAsaasPayment.id} - R$ ${finalAmount}`);

    // 9️⃣ Buscar QR Code PIX
    const pixResponse = await fetch(
      `${asaasUrl}/payments/${newAsaasPayment.id}/pixQrCode`,
      { headers: { 'access_token': asaasApiKey! } }
    );

    let pixData = null;
    if (pixResponse.ok) {
      pixData = await pixResponse.json();
      console.log('✅ QR Code PIX obtido');
    }

    // 🔟 Atualizar payment no Supabase
    await supabase
      .from('payments')
      .update({
        amount: finalAmount,
        pix_code: pixData?.payload || null,
        pix_qr_code: pixData?.encodedImage || null,
        metadata: {
          ...payment.metadata,
          asaas_payment_id: newAsaasPayment.id,
          discount_applied: discountApplied,
          original_amount: plan.price
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.id);

    // 1️⃣1️⃣ Marcar comissões como withdrawn se houver desconto
    if (discountApplied > 0) {
      const { data: commsToUse } = await supabase
        .from('commissions')
        .select('id, amount')
        .eq('user_id', userId)
        .eq('status', 'available')
        .order('created_at', { ascending: true });

      let remainingDiscount = discountApplied;
      const commsToWithdraw = [];

      for (const comm of commsToUse || []) {
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
      if (remainingDiscount > 0) {
        const { data: currentBalance } = await supabase
          .from('commissions')
          .select('amount')
          .eq('user_id', userId)
          .eq('status', 'available');

        const currentBalanceTotal = currentBalance?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;

        await supabase
          .from('admin_balance_adjustments')
          .insert({
            user_id: userId,
            admin_id: userId,
            type: 'remove',
            amount: remainingDiscount,
            reason: 'Desconto na renovação',
            balance_before: currentBalanceTotal,
            balance_after: currentBalanceTotal
          });

        console.log(`✅ Ajuste de saldo criado: -R$ ${remainingDiscount}`);
      }
    }

    console.log('✅ Desconto aplicado com sucesso!');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Desconto de R$ ${discountApplied.toFixed(2)} aplicado com sucesso! Nova fatura: R$ ${finalAmount.toFixed(2)}`,
        data: {
          discount_applied: discountApplied,
          new_amount: finalAmount,
          original_amount: plan.price
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

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
