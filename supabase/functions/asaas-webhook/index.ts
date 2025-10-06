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
    // Parse event data
    const contentType = req.headers.get('content-type') || '';
    let event;
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.text();
      const params = new URLSearchParams(formData);
      const dataParam = params.get('data');
      
      if (!dataParam) {
        throw new Error('No data parameter found in form data');
      }
      
      event = JSON.parse(dataParam);
    } else {
      event = await req.json();
    }
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const eventId = event.id;
    const paymentId = event.payment?.externalReference;
    
    console.log('📥 Webhook:', { eventId, event: event.event, paymentId });

    // ⚡ RETORNAR 200 INSTANTANEAMENTE (sem nenhuma operação de banco)
    const response = new Response(
      JSON.stringify({ received: true }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

    // 🔄 Processar de forma assíncrona (sem bloquear resposta)
    const processAsync = async () => {
      try {
        // Registrar evento no banco com ON CONFLICT para idempotência
        if (eventId) {
          const { error: insertError } = await supabaseClient
            .from('asaas_webhook_events')
            .insert({
              event_id: eventId,
              event_type: event.event,
              asaas_payment_id: event.payment?.id,
              payment_id: paymentId,
              metadata: event,
              response_message: 'Processing'
            });
          
          // Se deu erro de constraint (duplicata), ignorar
          if (insertError) {
            if (insertError.code === '23505') {
              console.log('✓ Duplicado:', eventId);
              return;
            }
            throw insertError;
          }
        }

        console.log('🔄 Processing:', event.event);

        // PAYMENT_CREATED
        if (event.event === 'PAYMENT_CREATED') {
          console.log('✓ Payment created:', paymentId);
          await supabaseClient
            .from('asaas_webhook_events')
            .update({ response_message: 'Completed' })
            .eq('event_id', eventId);
          return;
        }

        // PAYMENT_UPDATED
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

          console.log('✓ Payment updated:', paymentId);
          await supabaseClient
            .from('asaas_webhook_events')
            .update({ response_message: 'Completed' })
            .eq('event_id', eventId);
          return;
        }

        // PAYMENT_AUTHORIZED
        if (event.event === 'PAYMENT_AUTHORIZED' && paymentId) {
          await supabaseClient
            .from('payments')
            .update({ metadata: { asaas_status: 'AUTHORIZED' } })
            .eq('id', paymentId);

          console.log('✓ Payment authorized:', paymentId);
          await supabaseClient
            .from('asaas_webhook_events')
            .update({ response_message: 'Completed' })
            .eq('event_id', eventId);
          return;
        }

        // PAYMENT_CONFIRMED ou PAYMENT_RECEIVED
        if (event.event === 'PAYMENT_CONFIRMED' || event.event === 'PAYMENT_RECEIVED') {
          console.log('💰 Processing payment confirmation');

          let payment;
          let userId;
          let planId;
          
          // Buscar por ID
          if (paymentId) {
            const { data: paymentData } = await supabaseClient
              .from('payments')
              .select('*')
              .eq('id', paymentId)
              .maybeSingle();
            
            if (paymentData) {
              payment = paymentData;
              userId = payment.user_id;
              planId = payment.plan_id;
              console.log('✓ Payment found by ID');
            }
          }
          
          // Buscar por subscription
          if (!payment && event.payment?.subscription) {
            const { data: subscriptionPayment } = await supabaseClient
              .from('payments')
              .select('*')
              .eq('subscription_id', event.payment.subscription)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            
            if (subscriptionPayment) {
              payment = subscriptionPayment;
              userId = subscriptionPayment.user_id;
              planId = subscriptionPayment.plan_id;
              console.log('✓ Subscription payment found');
            }
          }

          if (!payment || !userId) {
            console.error('❌ Payment not found');
            await supabaseClient
              .from('asaas_webhook_events')
              .update({ response_message: 'Failed: Payment not found' })
              .eq('event_id', eventId);
            return;
          }

          // Buscar plano
          const { data: plan } = await supabaseClient
            .from('plans')
            .select('*')
            .eq('id', planId)
            .single();

          if (!plan) {
            console.error('❌ Plan not found');
            await supabaseClient
              .from('asaas_webhook_events')
              .update({ response_message: 'Failed: Plan not found' })
              .eq('event_id', eventId);
            return;
          }

          // Atualizar payment
          if (paymentId && payment.id === paymentId) {
            await supabaseClient
              .from('payments')
              .update({
                status: 'completed',
                paid_at: new Date().toISOString(),
              })
              .eq('id', paymentId);
            console.log('✓ Payment completed');
          }

          // Atualizar renovação
          if (payment.subscription_id) {
            const currentDate = new Date(event.payment.dueDate);
            const nextRenewalDate = new Date(currentDate);
            nextRenewalDate.setDate(nextRenewalDate.getDate() + 30);
            
            await supabaseClient
              .from('payments')
              .update({ next_renewal_date: nextRenewalDate.toISOString() })
              .eq('subscription_id', payment.subscription_id);
            console.log('✓ Renewal updated');
          }

          // Ativar usuário
          await supabaseClient
            .from('users')
            .update({ status: 'active' })
            .eq('id', userId);
          console.log('✓ User activated');

          // Processar comissões
          console.log('💰 Processing commissions');

          const { data: network } = await supabaseClient
            .from('user_network')
            .select('path')
            .eq('user_id', userId)
            .single();

          const commissionReference = event.payment?.subscription 
            ? `${event.payment.subscription}_${event.payment.id}` 
            : paymentId;

          // Verificar comissões existentes
          const { data: existingCommissions } = await supabaseClient
            .from('commissions')
            .select('id')
            .eq('payment_id', commissionReference);

          if (existingCommissions && existingCommissions.length > 0) {
            console.log('✓ Commissions already exist');
            await supabaseClient
              .from('asaas_webhook_events')
              .update({ response_message: 'Completed (commissions exist)' })
              .eq('event_id', eventId);
            return;
          }

          if (!network || !network.path || network.path.length <= 1) {
            console.log('⚠️ No upline');
            await supabaseClient
              .from('asaas_webhook_events')
              .update({ response_message: 'Completed (no upline)' })
              .eq('event_id', eventId);
            return;
          }

          // Criar comissões
          const commissions = [];
          const path = network.path;

          // Nível 1
          if (path.length >= 2) {
            const level1UserId = path[path.length - 2];
            commissions.push({
              user_id: level1UserId,
              referred_user_id: userId,
              payment_id: commissionReference,
              amount: plan.commission_l1,
              level: 1,
              status: 'available',
              released_at: new Date().toISOString(),
            });
          }

          // Níveis 2-4
          for (let i = 2; i <= 4 && path.length > i; i++) {
            const levelUserId = path[path.length - (i + 1)];
            commissions.push({
              user_id: levelUserId,
              referred_user_id: userId,
              payment_id: commissionReference,
              amount: plan.commission_l2_l4,
              level: i,
              status: 'available',
              released_at: new Date().toISOString(),
            });
          }

          if (commissions.length === 0) {
            console.log('⚠️ No commissions');
            await supabaseClient
              .from('asaas_webhook_events')
              .update({ response_message: 'Completed (no commissions)' })
              .eq('event_id', eventId);
            return;
          }

          const { error: commError } = await supabaseClient
            .from('commissions')
            .insert(commissions);

          if (commError) {
            console.error('❌ Commission error:', commError.message);
            await supabaseClient
              .from('asaas_webhook_events')
              .update({ response_message: `Failed: ${commError.message}` })
              .eq('event_id', eventId);
            return;
          }

          console.log('✅ Commissions created:', commissions.length);
          await supabaseClient
            .from('asaas_webhook_events')
            .update({ response_message: 'Completed' })
            .eq('event_id', eventId);
          return;
        }

        // PAYMENT_OVERDUE
        if (event.event === 'PAYMENT_OVERDUE' && paymentId) {
          await supabaseClient
            .from('payments')
            .update({ status: 'expired', metadata: { asaas_status: 'OVERDUE' } })
            .eq('id', paymentId);

          console.log('✓ Payment overdue');
          await supabaseClient
            .from('asaas_webhook_events')
            .update({ response_message: 'Completed' })
            .eq('event_id', eventId);
          return;
        }

        // PAYMENT_DELETED
        if (event.event === 'PAYMENT_DELETED' && paymentId) {
          await supabaseClient
            .from('payments')
            .update({ status: 'cancelled', metadata: { asaas_status: 'DELETED' } })
            .eq('id', paymentId);

          console.log('✓ Payment deleted');
          await supabaseClient
            .from('asaas_webhook_events')
            .update({ response_message: 'Completed' })
            .eq('event_id', eventId);
          return;
        }

        // TRANSFER
        if (event.event === 'TRANSFER_CONFIRMED' || event.event === 'TRANSFER_DONE') {
          const transferId = event.transfer.id;

          const { data: transaction } = await supabaseClient
            .from('transactions')
            .select('*')
            .eq('metadata->>asaas_transfer_id', transferId)
            .single();

          if (transaction) {
            await supabaseClient
              .from('transactions')
              .update({
                status: 'completed',
                processed_at: new Date().toISOString(),
              })
              .eq('id', transaction.id);

            console.log('✓ Transfer confirmed');
            await supabaseClient
              .from('asaas_webhook_events')
              .update({ response_message: 'Completed' })
              .eq('event_id', eventId);
          }
          return;
        }

        // Evento não tratado
        console.log('ℹ️ Unhandled:', event.event);
        await supabaseClient
          .from('asaas_webhook_events')
          .update({ response_message: 'Unhandled' })
          .eq('event_id', eventId);

      } catch (error) {
        console.error('❌ Async error:', error instanceof Error ? error.message : 'Unknown');
        if (eventId) {
          await supabaseClient
            .from('asaas_webhook_events')
            .update({ response_message: `Failed: ${error instanceof Error ? error.message : 'Unknown'}` })
            .eq('event_id', eventId);
        }
      }
    };

    // Iniciar processamento assíncrono (não aguardar) e retornar resposta
    processAsync().catch(err => console.error('Background error:', err));
    return response;

  } catch (error) {
    console.error('❌ Webhook error:', error instanceof Error ? error.message : 'Unknown');
    return new Response(
      JSON.stringify({ received: true, error: error instanceof Error ? error.message : 'Unknown' }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
