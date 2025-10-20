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
    const { paymentId, eventType = 'PAYMENT_CONFIRMED' } = await req.json();

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
      .select('*')
      .eq('id', paymentId)
      .single();

    if (paymentError) throw paymentError;

    // Buscar dados do plano
    const { data: plan } = await supabaseClient
      .from('plans')
      .select('name')
      .eq('id', payment.plan_id)
      .single();

    console.log('🧪 Simulando evento webhook:', { 
      eventType, 
      paymentId, 
      userId: payment.user_id 
    });

    // Criar evento simulado igual ao que o Asaas enviaria
    const mockEvent = {
      id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      event: eventType,
      dateCreated: new Date().toISOString(),
      payment: {
        object: "payment",
        id: `pay_test_${Math.random().toString(36).substr(2, 9)}`,
        dateCreated: new Date().toISOString().split('T')[0],
        customer: "cus_test_000000000001",
        subscription: payment.subscription_id || null,
        value: Number(payment.amount),
        netValue: Number(payment.amount) - 1.99,
        description: plan?.name || "Teste",
        billingType: "PIX",
        status: eventType === 'PAYMENT_CONFIRMED' ? 'CONFIRMED' : 'PENDING',
        dueDate: new Date(payment.expires_at).toISOString().split('T')[0],
        originalDueDate: new Date(payment.expires_at).toISOString().split('T')[0],
        externalReference: paymentId,
        deleted: false,
        invoiceUrl: `https://www.asaas.com/i/test_${paymentId}`,
      }
    };

    // Chamar o webhook com o evento simulado
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/asaas-webhook`;
    
    console.log('📤 Enviando para webhook:', webhookUrl);
    
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '54.94.183.101', // IP do Asaas
      },
      body: JSON.stringify(mockEvent)
    });

    const webhookResult = await webhookResponse.text();
    
    console.log('✅ Resposta do webhook:', {
      status: webhookResponse.status,
      body: webhookResult
    });

    // Aguardar processamento (webhook é assíncrono)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verificar se o evento foi registrado
    const { data: webhookEvent } = await supabaseClient
      .from('asaas_webhook_events')
      .select('*')
      .eq('event_id', mockEvent.id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Evento de teste enviado com sucesso',
        mockEvent,
        webhookResponse: {
          status: webhookResponse.status,
          body: webhookResult
        },
        webhookEvent
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Erro ao simular evento:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
