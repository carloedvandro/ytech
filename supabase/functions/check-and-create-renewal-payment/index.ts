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

    console.log('🔍 Verificando pagamentos do usuário:', user.id);

    // Buscar pagamento pendente
    const { data: pendingPayments } = await supabaseClient
      .from('payments')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (pendingPayments && pendingPayments.length > 0) {
      console.log('✅ Usuário já tem pagamento pendente');
      return new Response(
        JSON.stringify({
          success: true,
          has_pending: true,
          payment: pendingPayments[0],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar perfil do usuário
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    // Verificar se usuário está ativo
    if (profile.status !== 'active') {
      console.log('⚠️ Usuário não está ativo, não criar fatura');
      return new Response(
        JSON.stringify({
          success: true,
          has_pending: false,
          message: 'Usuário não está ativo',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar último pagamento completo para obter o plano
    const { data: lastPayment, error: lastPaymentError } = await supabaseClient
      .from('payments')
      .select('*, plans!payments_plan_id_fkey(*)')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('paid_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastPaymentError) throw lastPaymentError;

    if (!lastPayment) {
      console.log('⚠️ Usuário não tem pagamento anterior, não criar fatura');
      return new Response(
        JSON.stringify({
          success: true,
          has_pending: false,
          message: 'Usuário não tem pagamento anterior',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📋 Criando nova fatura para o plano:', lastPayment.plans.name);

    const plan = lastPayment.plans;
    const amount = Number(plan.price);

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

    // Criar nova cobrança no Asaas
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);

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
        value: amount,
        description: `${plan.name} - Renovação`,
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
    const { data: newPayment, error: insertError } = await supabaseClient
      .from('payments')
      .insert({
        user_id: user.id,
        plan_id: plan.id,
        amount: amount,
        status: 'pending',
        pix_code: pixData.payload,
        pix_qr_code: pixData.encodedImage,
        expires_at: dueDate.toISOString(),
        metadata: {
          asaas_payment_id: asaasPayment.id,
          asaas_invoice_url: asaasPayment.invoiceUrl,
          auto_created: true,
        },
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log('✅ Nova fatura criada automaticamente:', {
      payment_id: newPayment.id,
      amount: amount,
    });

    return new Response(
      JSON.stringify({
        success: true,
        has_pending: true,
        created_new: true,
        payment: newPayment,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error checking and creating payment:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
