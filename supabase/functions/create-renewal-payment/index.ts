import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ENV_CONFIG, logEnvironment, validateConfig } from "../_shared/config.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logEnvironment();
    validateConfig();

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verificar usuário autenticado
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Buscar perfil e plano atual do usuário
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*, payments!payments_user_id_fkey(*)')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    if (profile.status !== 'active') {
      throw new Error('Usuário não está ativo');
    }

    // Buscar último pagamento completo do usuário
    const { data: lastPayment, error: paymentError } = await supabaseClient
      .from('payments')
      .select('*, plans!payments_plan_id_fkey(*)')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (paymentError || !lastPayment) {
      console.error('Payment error:', paymentError);
      throw new Error('Nenhum pagamento completo encontrado para criar renovação');
    }

    console.log('✅ Último pagamento encontrado:', {
      id: lastPayment.id,
      subscription_id: lastPayment.subscription_id,
      next_renewal_date: lastPayment.next_renewal_date
    });

    // Verificar se já existe qualquer pagamento pendente
    const { data: existingPending } = await supabaseClient
      .from('payments')
      .select('id, amount, metadata, created_at')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (existingPending) {
      const metadata = existingPending.metadata as any;
      const hasDiscount = metadata?.discount_applied && Number(metadata.discount_applied) > 0;
      
      if (hasDiscount) {
        throw new Error(
          `Você já possui uma fatura pendente com desconto de R$ ${Number(metadata.discount_applied).toFixed(2)} aplicado. ` +
          `Aguarde o processamento desta fatura antes de criar uma nova renovação.`
        );
      } else {
        throw new Error('Você já possui uma fatura pendente. Aguarde o processamento antes de criar uma nova renovação.');
      }
    }

    const plan = lastPayment.plans;

    // Buscar preferências de renovação
    const { data: preferences } = await supabaseClient
      .from('user_renewal_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // Calcular desconto disponível se a preferência estiver ativada
    let discountAmount = 0;
    let finalAmount = Number(plan.price);

    if (preferences?.use_balance_for_renewal) {
      console.log('🔄 Usuário tem preferência de usar saldo ativada');
      
      // Buscar comissões disponíveis
      const { data: commissions } = await supabaseClient
        .from('commissions')
        .select('amount, status')
        .eq('user_id', user.id);

      // Buscar ajustes de saldo
      const { data: adjustments } = await supabaseClient
        .from('admin_balance_adjustments')
        .select('amount, type')
        .eq('user_id', user.id);

      const totalCommissions = commissions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
      const additionsTotal = adjustments?.filter(a => a.type === 'add').reduce((sum, a) => sum + Number(a.amount), 0) || 0;
      const deductionsTotal = adjustments?.filter(a => a.type === 'remove').reduce((sum, a) => sum + Number(a.amount), 0) || 0;

      const netBalance = totalCommissions + additionsTotal - deductionsTotal;
      const minBalance = Number(preferences.minimum_balance_to_keep || 0);
      const availableForDiscount = Math.max(0, netBalance - minBalance);

      console.log('💰 Cálculo de desconto:', {
        totalCommissions,
        additionsTotal,
        deductionsTotal,
        netBalance,
        minBalance,
        availableForDiscount
      });

      if (availableForDiscount >= 5) {
        // Aplicar desconto (máximo R$ 124,99 devido à limitação do Asaas)
        discountAmount = Math.min(availableForDiscount, Math.min(124.99, Number(plan.price) - 5));
        finalAmount = Number(plan.price) - discountAmount;
        
        console.log('✅ Desconto aplicado:', {
          discountAmount,
          finalAmount
        });
      }
    }

    // Buscar ou criar cliente no Asaas
    const customerData = {
      name: profile.full_name,
      cpfCnpj: profile.cpf.replace(/\D/g, ''),
      email: profile.email,
      phone: profile.whatsapp.replace(/\D/g, ''),
      externalReference: profile.id,
    };

    const customerResponse = await fetch(`${ENV_CONFIG.asaas.baseUrl}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ENV_CONFIG.asaas.apiKey,
      },
      body: JSON.stringify(customerData),
    });

    let asaasCustomer;
    if (!customerResponse.ok) {
      const errorText = await customerResponse.text();
      if (errorText.includes('cpfCnpj already exists')) {
        const searchResponse = await fetch(`${ENV_CONFIG.asaas.baseUrl}/customers?cpfCnpj=${profile.cpf.replace(/\D/g, '')}`, {
          headers: {
            'access_token': ENV_CONFIG.asaas.apiKey,
          },
        });
        const searchData = await searchResponse.json();
        asaasCustomer = searchData.data[0];
      } else {
        throw new Error(`Erro ao criar cliente Asaas: ${errorText}`);
      }
    } else {
      asaasCustomer = await customerResponse.json();
    }

    // Criar cobrança avulsa PIX (não vinculada à assinatura)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1); // Vence amanhã

    const paymentResponse = await fetch(`${ENV_CONFIG.asaas.baseUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ENV_CONFIG.asaas.apiKey,
      },
      body: JSON.stringify({
        customer: asaasCustomer.id,
        billingType: 'PIX',
        dueDate: dueDate.toISOString().split('T')[0],
        value: finalAmount,
        description: discountAmount > 0 
          ? `Renovação Antecipada - ${plan.name} (Desconto: R$ ${discountAmount.toFixed(2)})`
          : `Renovação Antecipada - ${plan.name}`,
      }),
    });

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      throw new Error(`Erro ao criar cobrança Asaas: ${errorText}`);
    }

    const asaasPayment = await paymentResponse.json();

    // Buscar QR Code PIX
    const pixResponse = await fetch(`${ENV_CONFIG.asaas.baseUrl}/payments/${asaasPayment.id}/pixQrCode`, {
      headers: {
        'access_token': ENV_CONFIG.asaas.apiKey,
      },
    });

    const pixData = await pixResponse.json();

    // Criar registro de pagamento no banco
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);

    const { data: newPayment, error: insertError } = await supabaseClient
      .from('payments')
      .insert({
        user_id: user.id,
        plan_id: plan.id,
        amount: finalAmount,
        status: 'pending',
        pix_code: pixData.payload,
        pix_qr_code: pixData.encodedImage,
        expires_at: expiresAt.toISOString(),
        metadata: {
          renewal_type: 'early',
          asaas_payment_id: asaasPayment.id,
          asaas_invoice_url: asaasPayment.invoiceUrl,
          original_subscription_id: lastPayment.subscription_id,
          current_renewal_date: lastPayment.next_renewal_date,
          discount_applied: discountAmount,
          original_amount: Number(plan.price),
        },
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({
        success: true,
        payment: {
          id: newPayment.id,
          amount: finalAmount,
          original_amount: Number(plan.price),
          discount_applied: discountAmount,
          pix_code: pixData.payload,
          pix_qr_code: pixData.encodedImage,
          expires_at: expiresAt.toISOString(),
          current_renewal_date: lastPayment.next_renewal_date,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating renewal payment:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
