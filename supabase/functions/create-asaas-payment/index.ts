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
    // Log e validar ambiente
    logEnvironment();
    validateConfig();

    const { paymentId } = await req.json();

    if (!paymentId) {
      throw new Error("Payment ID is required");
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar dados do pagamento
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .select('*, profiles!payments_user_id_fkey(*), plans!payments_plan_id_fkey(*)')
      .eq('id', paymentId)
      .single();

    if (paymentError) throw paymentError;

    // Primeiro, criar ou buscar o cliente no Asaas
    const customerData = {
      name: payment.profiles.full_name,
      cpfCnpj: payment.profiles.cpf.replace(/\D/g, ''),
      email: payment.profiles.email,
      phone: payment.profiles.whatsapp.replace(/\D/g, ''),
      externalReference: payment.profiles.id,
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
      // Se o cliente já existe, tentar buscar pelo CPF
      if (errorText.includes('cpfCnpj already exists')) {
        const searchResponse = await fetch(`${ENV_CONFIG.asaas.baseUrl}/customers?cpfCnpj=${payment.profiles.cpf.replace(/\D/g, '')}`, {
          headers: {
            'access_token': ENV_CONFIG.asaas.apiKey,
          },
        });
        const searchData = await searchResponse.json();
        asaasCustomer = searchData.data[0];
      } else {
        console.error('Asaas customer error:', errorText);
        throw new Error(`Asaas customer API error: ${errorText}`);
      }
    } else {
      asaasCustomer = await customerResponse.json();
    }

    console.log('Asaas customer:', asaasCustomer);

    // Criar assinatura recorrente mensal no Asaas
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 1); // Primeiro vencimento amanhã
    
    const subscriptionResponse = await fetch(`${ENV_CONFIG.asaas.baseUrl}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ENV_CONFIG.asaas.apiKey,
      },
      body: JSON.stringify({
        customer: asaasCustomer.id,
        billingType: 'PIX',
        nextDueDate: nextDueDate.toISOString().split('T')[0],
        value: Number(payment.amount),
        cycle: 'MONTHLY',
        description: `Plano ${payment.plans.name} - MegaChip Rural`,
        externalReference: paymentId,
      }),
    });

    if (!subscriptionResponse.ok) {
      const errorText = await subscriptionResponse.text();
      console.error('Asaas subscription error:', errorText);
      throw new Error(`Asaas subscription API error: ${errorText}`);
    }

    const asaasSubscription = await subscriptionResponse.json();
    console.log('Asaas subscription created:', asaasSubscription);

    // Buscar a primeira cobrança gerada pela assinatura
    const paymentsResponse = await fetch(`${ENV_CONFIG.asaas.baseUrl}/payments?subscription=${asaasSubscription.id}`, {
      headers: {
        'access_token': ENV_CONFIG.asaas.apiKey,
      },
    });

    const paymentsData = await paymentsResponse.json();
    const firstPayment = paymentsData.data[0];

    console.log('First payment from subscription:', firstPayment);

    // Buscar QR Code PIX da primeira cobrança
    const pixResponse = await fetch(`${ENV_CONFIG.asaas.baseUrl}/payments/${firstPayment.id}/pixQrCode`, {
      headers: {
        'access_token': ENV_CONFIG.asaas.apiKey,
      },
    });

    const pixData = await pixResponse.json();
    
    // Calcular próxima data de renovação (30 dias após o primeiro vencimento)
    const nextRenewalDate = new Date(firstPayment.dueDate);
    nextRenewalDate.setDate(nextRenewalDate.getDate() + 30);

    // Atualizar pagamento com dados da assinatura e primeira cobrança
    const { error: updateError } = await supabaseClient
      .from('payments')
      .update({
        pix_code: pixData.payload,
        pix_qr_code: pixData.encodedImage,
        subscription_id: asaasSubscription.id,
        next_renewal_date: nextRenewalDate.toISOString(),
        metadata: {
          ...payment.metadata,
          asaas_subscription_id: asaasSubscription.id,
          asaas_payment_id: firstPayment.id,
          asaas_invoice_url: firstPayment.invoiceUrl,
          cycle: 'MONTHLY',
        },
      })
      .eq('id', paymentId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        payment: {
          id: paymentId,
          pix_code: pixData.payload,
          pix_qr_code: pixData.encodedImage,
          invoice_url: firstPayment.invoiceUrl,
          subscription_id: asaasSubscription.id,
          next_renewal_date: nextRenewalDate.toISOString(),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating Asaas payment:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
