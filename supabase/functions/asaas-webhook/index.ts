import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Asaas pode enviar dados como JSON ou form-urlencoded
    const contentType = req.headers.get('content-type') || '';
    let event;
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      // Parsear form data
      const formData = await req.text();
      const params = new URLSearchParams(formData);
      const dataParam = params.get('data');
      
      if (!dataParam) {
        throw new Error('No data parameter found in form data');
      }
      
      event = JSON.parse(dataParam);
    } else {
      // Parsear como JSON direto
      event = await req.json();
    }
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const eventId = event.id;
    const paymentId = event.payment?.externalReference;
    
    console.log('📥 Asaas webhook received:', {
      eventId,
      event: event.event,
      paymentId,
      asaasPaymentId: event.payment?.id,
      status: event.payment?.status,
      timestamp: new Date().toISOString()
    });

    // 🔒 IDEMPOTÊNCIA: Verificar se este evento já foi processado
    if (eventId) {
      const { data: existingEvent } = await supabaseClient
        .from('asaas_webhook_events')
        .select('id')
        .eq('event_id', eventId)
        .maybeSingle();

      if (existingEvent) {
        console.log('✓ Evento já processado (duplicado):', {
          eventId,
          event: event.event,
          message: 'Ignorando evento duplicado - retornando 200'
        });
        return new Response(
          JSON.stringify({ received: true, message: 'Event already processed' }), 
          { status: 200, headers: corsHeaders }
        );
      }

      // Registrar evento como processado ANTES de processar
      await supabaseClient
        .from('asaas_webhook_events')
        .insert({
          event_id: eventId,
          event_type: event.event,
          asaas_payment_id: event.payment?.id,
          payment_id: paymentId,
          metadata: event,
          response_message: 'Processing started'
        });
    }

    // PAYMENT_CREATED - Nova cobrança criada
    if (event.event === 'PAYMENT_CREATED') {
      console.log('✓ Payment created in Asaas:', {
        paymentId,
        asaasPaymentId: event.payment?.id,
        value: event.payment?.value,
        billingType: event.payment?.billingType
      });
      return new Response(
        JSON.stringify({ received: true, message: 'Payment created event logged' }), 
        { status: 200, headers: corsHeaders }
      );
    }

    // PAYMENT_UPDATED - Cobrança atualizada
    if (event.event === 'PAYMENT_UPDATED' && paymentId) {
      await supabaseClient
        .from('payments')
        .update({
          metadata: {
            asaas_status: event.payment.status,
            asaas_updated_at: new Date().toISOString(),
          },
        })
        .eq('id', paymentId);

      console.log('Payment updated:', paymentId);
      return new Response(
        JSON.stringify({ received: true, message: 'Payment updated' }), 
        { status: 200, headers: corsHeaders }
      );
    }

    // PAYMENT_AUTHORIZED - Pagamento autorizado (cartão)
    if (event.event === 'PAYMENT_AUTHORIZED' && paymentId) {
      await supabaseClient
        .from('payments')
        .update({
          metadata: {
            asaas_status: 'AUTHORIZED',
          },
        })
        .eq('id', paymentId);

      console.log('Payment authorized:', paymentId);
      return new Response(
        JSON.stringify({ received: true, message: 'Payment authorized' }), 
        { status: 200, headers: corsHeaders }
      );
    }

    // PAYMENT_CONFIRMED ou PAYMENT_RECEIVED - Pagamento confirmado
    if ((event.event === 'PAYMENT_CONFIRMED' || event.event === 'PAYMENT_RECEIVED') && paymentId) {
      // Buscar pagamento
      const { data: payment, error: paymentError } = await supabaseClient
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (paymentError || !payment) {
        console.log('⚠️ Payment not found in database:', {
          paymentId,
          event: event.event,
          asaasPaymentId: event.payment?.id,
          reason: paymentError ? 'Database error' : 'Payment deleted or never created',
          error: paymentError?.message
        });
        return new Response(
          JSON.stringify({ 
            received: true, 
            message: 'Payment not found - possibly deleted or not yet created in system' 
          }), 
          { status: 200, headers: corsHeaders }
        );
      }

      // Buscar plano
      const { data: plan, error: planError } = await supabaseClient
        .from('plans')
        .select('*')
        .eq('id', payment.plan_id)
        .single();

      if (planError || !plan) {
        console.log('⚠️ Plan not found for payment:', {
          paymentId,
          planId: payment.plan_id,
          error: planError?.message
        });
        return new Response(
          JSON.stringify({ received: true, message: 'Plan not found' }), 
          { status: 200, headers: corsHeaders }
        );
      }

      // Atualizar pagamento para concluído
      await supabaseClient
        .from('payments')
        .update({
          status: 'completed',
          paid_at: new Date().toISOString(),
        })
        .eq('id', paymentId);

      // Se for um pagamento de assinatura, atualizar data de renovação
      if (payment.subscription_id) {
        const currentDate = new Date(event.payment.dueDate);
        const nextRenewalDate = new Date(currentDate);
        nextRenewalDate.setDate(nextRenewalDate.getDate() + 30);
        
        await supabaseClient
          .from('payments')
          .update({
            next_renewal_date: nextRenewalDate.toISOString(),
          })
          .eq('id', paymentId);
          
        console.log('Updated renewal date for subscription payment:', nextRenewalDate.toISOString());
      }

      // Atualizar status do usuário para ativo
      await supabaseClient
        .from('users')
        .update({ status: 'active' })
        .eq('id', payment.user_id);

      // Processar comissões MLM
      const { data: network } = await supabaseClient
        .from('user_network')
        .select('path')
        .eq('user_id', payment.user_id)
        .single();

      console.log('Network data for user:', payment.user_id, network);

      // Verificar se já existem comissões para este pagamento
      const { data: existingCommissions } = await supabaseClient
        .from('commissions')
        .select('id')
        .eq('payment_id', paymentId)
        .limit(1);

      if (existingCommissions && existingCommissions.length > 0) {
        console.log('✓ Commissions already exist for payment (duplicate webhook event):', {
          paymentId,
          event: event.event,
          commissionsCount: existingCommissions.length,
          message: 'This is a duplicate webhook - payment was already processed'
        });
        return new Response(
          JSON.stringify({ received: true, message: 'Payment already processed, commissions exist' }), 
          { status: 200, headers: corsHeaders }
        );
      }

      if (network && network.path && network.path.length > 1) {
        const commissions = [];
        const path = network.path;

        // Nível 1 (indicador direto)
        if (path.length >= 2) {
          commissions.push({
            user_id: path[path.length - 2],
            referred_user_id: payment.user_id,
            payment_id: paymentId,
            amount: plan.commission_l1,
            level: 1,
            status: 'available',
            released_at: new Date().toISOString(),
          });
        }

        // Níveis 2-4
        for (let i = 2; i <= 4 && path.length > i; i++) {
          commissions.push({
            user_id: path[path.length - (i + 1)],
            referred_user_id: payment.user_id,
            payment_id: paymentId,
            amount: plan.commission_l2_l4,
            level: i,
            status: 'available',
            released_at: new Date().toISOString(),
          });
        }

        if (commissions.length > 0) {
          console.log('Creating commissions:', JSON.stringify(commissions, null, 2));
          
          const { data: insertedCommissions, error: commError } = await supabaseClient
            .from('commissions')
            .insert(commissions)
            .select();

          if (commError) {
            console.error('Error inserting commissions:', commError);
          } else {
            console.log('Commissions successfully created:', insertedCommissions);
          }
        } else {
          console.log('No commissions to create - network path too short');
        }
      }

      console.log('✅ Payment confirmed and commissions created successfully:', {
        paymentId,
        userId: payment.user_id,
        planId: payment.plan_id,
        amount: payment.amount
      });
      return new Response(
        JSON.stringify({ received: true, message: 'Payment confirmed and commissions created' }), 
        { status: 200, headers: corsHeaders }
      );
    }

    // PAYMENT_OVERDUE - Cobrança vencida
    if (event.event === 'PAYMENT_OVERDUE' && paymentId) {
      await supabaseClient
        .from('payments')
        .update({
          status: 'expired',
          metadata: {
            asaas_status: 'OVERDUE',
          },
        })
        .eq('id', paymentId);

      console.log('Payment overdue:', paymentId);
      return new Response(
        JSON.stringify({ received: true, message: 'Payment overdue' }), 
        { status: 200, headers: corsHeaders }
      );
    }

    // PAYMENT_DELETED - Cobrança removida
    if (event.event === 'PAYMENT_DELETED' && paymentId) {
      await supabaseClient
        .from('payments')
        .update({
          status: 'cancelled',
          metadata: {
            asaas_status: 'DELETED',
          },
        })
        .eq('id', paymentId);

      console.log('Payment deleted:', paymentId);
      return new Response(
        JSON.stringify({ received: true, message: 'Payment deleted' }), 
        { status: 200, headers: corsHeaders }
      );
    }

    // Processar evento de transferência
    if (event.event === 'TRANSFER_CONFIRMED' || event.event === 'TRANSFER_DONE') {
      const transferId = event.transfer.id;

      // Buscar transação pelo ID da transferência Asaas
      const { data: transaction, error: txError } = await supabaseClient
        .from('transactions')
        .select('*')
        .eq('metadata->>asaas_transfer_id', transferId)
        .single();

      if (!txError && transaction) {
        await supabaseClient
          .from('transactions')
          .update({
            status: 'completed',
            processed_at: new Date().toISOString(),
          })
          .eq('id', transaction.id);

        console.log('Transfer confirmed');
        return new Response(
          JSON.stringify({ received: true, message: 'Transfer confirmed' }), 
          { status: 200, headers: corsHeaders }
        );
      }
    }

    // Evento não tratado - retornar sucesso mesmo assim
    console.log('ℹ️ Unhandled event type:', {
      event: event.event,
      paymentId: event.payment?.externalReference,
      transferId: event.transfer?.id,
      message: 'Event type not implemented in webhook handler'
    });
    return new Response(
      JSON.stringify({ received: true, message: 'Event received but not processed' }), 
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ Webhook error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        received: true 
      }), 
      { status: 200, headers: corsHeaders }
    );
  }
});
