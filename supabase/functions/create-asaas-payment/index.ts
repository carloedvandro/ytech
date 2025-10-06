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
    const { paymentId } = await req.json();

    if (!paymentId) {
      throw new Error("Payment ID is required");
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Log da chave API (apenas os primeiros e últimos caracteres para segurança)
    const apiKey = Deno.env.get('ASAAS_API_KEY') ?? '';
    console.log('Asaas API Key (masked):', apiKey.substring(0, 20) + '...' + apiKey.substring(apiKey.length - 10));
    console.log('Asaas API Key starts with $aact_prod:', apiKey.startsWith('$aact_prod'));

    // Buscar dados do pagamento
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .select('*, users!payments_user_id_fkey(*), plans!payments_plan_id_fkey(*)')
      .eq('id', paymentId)
      .single();

    if (paymentError) throw paymentError;

    // Primeiro, criar ou buscar o cliente no Asaas
    const customerData = {
      name: payment.users.full_name,
      cpfCnpj: payment.users.cpf.replace(/\D/g, ''),
      email: payment.users.email,
      phone: payment.users.whatsapp.replace(/\D/g, ''),
      externalReference: payment.users.id,
    };

    const customerResponse = await fetch('https://api.asaas.com/api/v3/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': Deno.env.get('ASAAS_API_KEY') ?? '',
      },
      body: JSON.stringify(customerData),
    });

    let asaasCustomer;
    if (!customerResponse.ok) {
      const errorText = await customerResponse.text();
      // Se o cliente já existe, tentar buscar pelo CPF
      if (errorText.includes('cpfCnpj already exists')) {
        const searchResponse = await fetch(`https://api.asaas.com/api/v3/customers?cpfCnpj=${payment.users.cpf.replace(/\D/g, '')}`, {
          headers: {
            'access_token': Deno.env.get('ASAAS_API_KEY') ?? '',
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

    // Agora criar cobrança no Asaas
    const asaasResponse = await fetch('https://api.asaas.com/api/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': Deno.env.get('ASAAS_API_KEY') ?? '',
      },
      body: JSON.stringify({
        customer: asaasCustomer.id,
        billingType: 'PIX',
        value: Number(payment.amount),
        dueDate: new Date(Date.now() + 30 * 60 * 1000).toISOString().split('T')[0],
        description: `Plano ${payment.plans.name} - MegaChip Rural`,
        externalReference: paymentId,
        postalService: false,
      }),
    });

    if (!asaasResponse.ok) {
      const errorText = await asaasResponse.text();
      console.error('Asaas error:', errorText);
      throw new Error(`Asaas API error: ${errorText}`);
    }

    const asaasPayment = await asaasResponse.json();

    console.log('Asaas payment created:', asaasPayment);

    // Buscar QR Code PIX
    const pixResponse = await fetch(`https://api.asaas.com/api/v3/payments/${asaasPayment.id}/pixQrCode`, {
      headers: {
        'access_token': Deno.env.get('ASAAS_API_KEY') ?? '',
      },
    });

    const pixData = await pixResponse.json();

    // Atualizar pagamento com dados do Asaas
    const { error: updateError } = await supabaseClient
      .from('payments')
      .update({
        pix_code: pixData.payload,
        pix_qr_code: pixData.encodedImage,
        metadata: {
          ...payment.metadata,
          asaas_payment_id: asaasPayment.id,
          asaas_invoice_url: asaasPayment.invoiceUrl,
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
          invoice_url: asaasPayment.invoiceUrl,
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
