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

    // Buscar pagamento pendente com desconto
    const { data: pendingPayment, error: paymentError } = await supabaseClient
      .from('payments')
      .select('*, plans!payments_plan_id_fkey(*)')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (paymentError || !pendingPayment) {
      throw new Error('Nenhum pagamento pendente encontrado');
    }

    const metadata = pendingPayment.metadata as any;
    const discountApplied = metadata?.discount_applied ? Number(metadata.discount_applied) : 0;

    if (discountApplied === 0) {
      throw new Error('Este pagamento não possui desconto aplicado');
    }

    console.log('📋 Cancelando fatura com desconto:', {
      payment_id: pendingPayment.id,
      discount: discountApplied,
      current_amount: pendingPayment.amount
    });

    // Cancelar pagamento no Asaas se tiver ID
    const asaasPaymentId = metadata?.asaas_payment_id;
    if (asaasPaymentId) {
      try {
        const cancelResponse = await fetch(`${ENV_CONFIG.asaas.baseUrl}/payments/${asaasPaymentId}`, {
          method: 'DELETE',
          headers: {
            'access_token': ENV_CONFIG.asaas.apiKey,
          },
        });

        if (!cancelResponse.ok) {
          console.error('Erro ao cancelar no Asaas:', await cancelResponse.text());
        } else {
          console.log('✅ Pagamento cancelado no Asaas');
        }
      } catch (error) {
        console.error('Erro ao cancelar no Asaas:', error);
      }
    }

    // Atualizar status do pagamento para cancelled
    const { error: updateError } = await supabaseClient
      .from('payments')
      .update({ 
        status: 'cancelled',
        metadata: {
          ...metadata,
          cancelled_reason: 'user_cancelled_discount',
          cancelled_at: new Date().toISOString()
        }
      })
      .eq('id', pendingPayment.id);

    if (updateError) {
      console.error('Erro ao cancelar pagamento:', updateError);
      throw updateError;
    }

    // Desabilitar preferência de usar saldo
    const { error: prefError } = await supabaseClient
      .from('user_renewal_preferences')
      .update({
        use_balance_for_renewal: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (prefError) {
      console.error('Erro ao atualizar preferências:', prefError);
      throw prefError;
    }

    console.log('✅ Preferência de renovação desabilitada');

    // Buscar perfil do usuário
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    const plan = pendingPayment.plans;
    const originalAmount = Number(plan.price);

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

    // Criar nova cobrança com valor cheio, mantendo a mesma data
    const dueDate = new Date(pendingPayment.expires_at);

    const newPaymentResponse = await fetch(`${ENV_CONFIG.asaas.baseUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ENV_CONFIG.asaas.apiKey,
      },
      body: JSON.stringify({
        customer: asaasCustomer.id,
        billingType: 'PIX',
        dueDate: dueDate.toISOString().split('T')[0],
        value: originalAmount,
        description: `${plan.name} - Sem desconto`,
      }),
    });

    if (!newPaymentResponse.ok) {
      const errorText = await newPaymentResponse.text();
      throw new Error(`Erro ao criar nova cobrança Asaas: ${errorText}`);
    }

    const newAsaasPayment = await newPaymentResponse.json();

    // Buscar QR Code PIX
    const pixResponse = await fetch(`${ENV_CONFIG.asaas.baseUrl}/payments/${newAsaasPayment.id}/pixQrCode`, {
      headers: {
        'access_token': ENV_CONFIG.asaas.apiKey,
      },
    });

    const pixData = await pixResponse.json();

    // Criar novo registro de pagamento no banco
    const { data: newPayment, error: insertError } = await supabaseClient
      .from('payments')
      .insert({
        user_id: user.id,
        plan_id: plan.id,
        amount: originalAmount,
        status: 'pending',
        pix_code: pixData.payload,
        pix_qr_code: pixData.encodedImage,
        expires_at: pendingPayment.expires_at,
        metadata: {
          asaas_payment_id: newAsaasPayment.id,
          asaas_invoice_url: newAsaasPayment.invoiceUrl,
          discount_cancelled: true,
          previous_payment_id: pendingPayment.id,
          cancelled_discount: discountApplied,
        },
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log('✅ Nova fatura criada:', {
      payment_id: newPayment.id,
      amount: originalAmount,
      discount_returned: discountApplied
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Desconto de R$ ${discountApplied.toFixed(2)} cancelado. Nova fatura criada com valor integral.`,
        payment: {
          id: newPayment.id,
          amount: originalAmount,
          discount_returned: discountApplied,
          expires_at: pendingPayment.expires_at,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error cancelling discount:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});