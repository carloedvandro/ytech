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
        .select('id, response_message')
        .eq('event_id', eventId)
        .maybeSingle();

      if (existingEvent) {
        console.log('✓ Evento já processado (duplicado):', {
          eventId,
          event: event.event,
          status: existingEvent.response_message,
          message: 'Ignorando evento duplicado'
        });
        // ⚡ RESPONDER IMEDIATAMENTE para evitar reenvios
        return new Response(
          JSON.stringify({ received: true, message: 'Event already processed' }), 
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Registrar evento como processado IMEDIATAMENTE
      await supabaseClient
        .from('asaas_webhook_events')
        .insert({
          event_id: eventId,
          event_type: event.event,
          asaas_payment_id: event.payment?.id,
          payment_id: paymentId,
          metadata: event,
          response_message: 'Processing'
        });
    }

    // 🔄 PROCESSAMENTO PRINCIPAL (síncrono para garantir conclusão)
    try {
      console.log('🔄 Starting event processing:', {
        eventId,
        event: event.event,
        paymentId
      });

      // PAYMENT_CREATED - Nova cobrança criada
      if (event.event === 'PAYMENT_CREATED') {
        console.log('✓ Payment created in Asaas:', {
          paymentId,
          asaasPaymentId: event.payment?.id,
          value: event.payment?.value,
          billingType: event.payment?.billingType
        });
        
        if (eventId) {
          await supabaseClient
            .from('asaas_webhook_events')
            .update({ response_message: 'Completed' })
            .eq('event_id', eventId);
        }
        
        return new Response(
          JSON.stringify({ received: true, message: 'Payment created' }), 
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        
        if (eventId) {
          await supabaseClient
            .from('asaas_webhook_events')
            .update({ response_message: 'Completed' })
            .eq('event_id', eventId);
        }
        
        return new Response(
          JSON.stringify({ received: true, message: 'Payment updated' }), 
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        
        if (eventId) {
          await supabaseClient
            .from('asaas_webhook_events')
            .update({ response_message: 'Completed' })
            .eq('event_id', eventId);
        }
        
        return new Response(
          JSON.stringify({ received: true, message: 'Payment authorized' }), 
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // PAYMENT_CONFIRMED ou PAYMENT_RECEIVED - Pagamento confirmado
      if (event.event === 'PAYMENT_CONFIRMED' || event.event === 'PAYMENT_RECEIVED') {
        let payment;
        let userId;
        let planId;
        
        // Tentar buscar pelo externalReference primeiro
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
          }
        }
        
        // Se não encontrou, pode ser um pagamento recorrente - buscar pela subscription
        if (!payment && event.payment?.subscription) {
          const { data: subscriptionPayment } = await supabaseClient
            .from('payments')
            .select('*')
            .eq('subscription_id', event.payment.subscription)
            .maybeSingle();
          
          if (subscriptionPayment) {
            payment = subscriptionPayment;
            userId = subscriptionPayment.user_id;
            planId = subscriptionPayment.plan_id;
            
            console.log('🔄 Recurrent payment detected:', {
              subscriptionId: event.payment.subscription,
              asaasPaymentId: event.payment?.id,
              userId,
              planId
            });
          }
        }

        if (!payment || !userId) {
          console.log('⚠️ Payment not found in database:', {
            paymentId,
            subscriptionId: event.payment?.subscription,
            event: event.event,
            asaasPaymentId: event.payment?.id
          });
          
          if (eventId) {
            await supabaseClient
              .from('asaas_webhook_events')
              .update({ response_message: 'Failed: Payment not found' })
              .eq('event_id', eventId);
          }
          
          return new Response(
            JSON.stringify({ received: true, message: 'Payment not found' }), 
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Buscar plano
        const { data: plan, error: planError } = await supabaseClient
          .from('plans')
          .select('*')
          .eq('id', planId)
          .single();

        if (planError || !plan) {
          console.log('⚠️ Plan not found for payment:', {
            paymentId,
            planId,
            error: planError?.message
          });
          
          if (eventId) {
            await supabaseClient
              .from('asaas_webhook_events')
              .update({ response_message: 'Failed: Plan not found' })
              .eq('event_id', eventId);
          }
          
          return new Response(
            JSON.stringify({ received: true, message: 'Plan not found' }), 
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Se for o primeiro pagamento (tem paymentId), atualizar status
        if (paymentId && payment.id === paymentId) {
          await supabaseClient
            .from('payments')
            .update({
              status: 'completed',
              paid_at: new Date().toISOString(),
            })
            .eq('id', paymentId);
          
          console.log('✓ Payment status updated to completed:', paymentId);
        }

        // Atualizar data de renovação
        if (payment.subscription_id) {
          const currentDate = new Date(event.payment.dueDate);
          const nextRenewalDate = new Date(currentDate);
          nextRenewalDate.setDate(nextRenewalDate.getDate() + 30);
          
          await supabaseClient
            .from('payments')
            .update({
              next_renewal_date: nextRenewalDate.toISOString(),
            })
            .eq('subscription_id', payment.subscription_id);
            
          console.log('✓ Updated renewal date for subscription:', nextRenewalDate.toISOString());
        }

        // Atualizar status do usuário para ativo
        await supabaseClient
          .from('users')
          .update({ status: 'active' })
          .eq('id', userId);
        
        console.log('✓ User status updated to active:', userId);

        // Processar comissões MLM
        const { data: network, error: networkError } = await supabaseClient
          .from('user_network')
          .select('path')
          .eq('user_id', userId)
          .single();

        console.log('📊 Network data for user:', {
          userId,
          path: network?.path,
          pathLength: network?.path?.length,
          error: networkError?.message
        });

        // Para pagamentos recorrentes, gerar um identificador único baseado no ID do pagamento do Asaas
        const commissionReference = event.payment?.subscription 
          ? `${event.payment.subscription}_${event.payment.id}` 
          : paymentId;

        console.log('💰 Commission reference:', commissionReference);

        // Verificar se já existem comissões para este pagamento específico
        const { data: existingCommissions } = await supabaseClient
          .from('commissions')
          .select('id')
          .eq('payment_id', commissionReference)
          .limit(1);

        if (existingCommissions && existingCommissions.length > 0) {
          console.log('✓ Commissions already exist for this payment:', {
            commissionReference,
            event: event.event,
            commissionsCount: existingCommissions.length,
            message: 'This payment was already processed'
          });
          
          if (eventId) {
            await supabaseClient
              .from('asaas_webhook_events')
              .update({ response_message: 'Completed (commissions already exist)' })
              .eq('event_id', eventId);
          }
          
          return new Response(
            JSON.stringify({ received: true, message: 'Commissions already processed' }), 
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (network && network.path && network.path.length > 1) {
          const commissions = [];
          const path = network.path;

          console.log('🔄 Building commissions for path:', path);

          // Nível 1 (indicador direto)
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
            console.log(`  ✓ Level 1 commission for user ${level1UserId}: R$ ${plan.commission_l1}`);
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
            console.log(`  ✓ Level ${i} commission for user ${levelUserId}: R$ ${plan.commission_l2_l4}`);
          }

          if (commissions.length > 0) {
            console.log(`💰 Creating ${commissions.length} commissions:`, JSON.stringify(commissions, null, 2));
            
            const { data: insertedCommissions, error: commError } = await supabaseClient
              .from('commissions')
              .insert(commissions)
              .select();

            if (commError) {
              console.error('❌ Error inserting commissions:', {
                error: commError.message,
                details: commError.details,
                hint: commError.hint
              });
              
              if (eventId) {
                await supabaseClient
                  .from('asaas_webhook_events')
                  .update({ response_message: 'Failed: ' + commError.message })
                  .eq('event_id', eventId);
              }
              
              return new Response(
                JSON.stringify({ received: true, message: 'Commission creation failed', error: commError.message }), 
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            } else {
              console.log('✅ Commissions successfully created:', {
                count: insertedCommissions?.length,
                commissions: insertedCommissions
              });
            }
          } else {
            console.log('⚠️ No commissions to create - network path too short');
          }
        } else {
          console.log('⚠️ No network path found or path too short:', {
            hasNetwork: !!network,
            pathLength: network?.path?.length
          });
        }

        // Atualizar status do webhook para "Completed"
        if (eventId) {
          await supabaseClient
            .from('asaas_webhook_events')
            .update({ response_message: 'Completed' })
            .eq('event_id', eventId);
        }

        console.log('✅ Payment confirmed and processed successfully:', {
          paymentId,
          commissionReference,
          userId,
          planId,
          isRecurrent: !!event.payment?.subscription,
          subscriptionId: event.payment?.subscription
        });
        
        return new Response(
          JSON.stringify({ received: true, message: 'Payment confirmed and processed' }), 
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        
        if (eventId) {
          await supabaseClient
            .from('asaas_webhook_events')
            .update({ response_message: 'Completed' })
            .eq('event_id', eventId);
        }
        
        return new Response(
          JSON.stringify({ received: true, message: 'Payment overdue' }), 
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        
        if (eventId) {
          await supabaseClient
            .from('asaas_webhook_events')
            .update({ response_message: 'Completed' })
            .eq('event_id', eventId);
        }
        
        return new Response(
          JSON.stringify({ received: true, message: 'Payment deleted' }), 
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Processar evento de transferência
      if (event.event === 'TRANSFER_CONFIRMED' || event.event === 'TRANSFER_DONE') {
        const transferId = event.transfer.id;

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
          
          if (eventId) {
            await supabaseClient
              .from('asaas_webhook_events')
              .update({ response_message: 'Completed' })
              .eq('event_id', eventId);
          }
          
          return new Response(
            JSON.stringify({ received: true, message: 'Transfer confirmed' }), 
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Evento não tratado
      console.log('ℹ️ Unhandled event type:', {
        event: event.event,
        paymentId: event.payment?.externalReference,
        transferId: event.transfer?.id,
        message: 'Event type not implemented in webhook handler'
      });
      
      if (eventId) {
        await supabaseClient
          .from('asaas_webhook_events')
          .update({ response_message: 'Unhandled event type' })
          .eq('event_id', eventId);
      }
      
      return new Response(
        JSON.stringify({ received: true, message: 'Unhandled event type' }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (processingError) {
      console.error('❌ Processing error:', {
        error: processingError instanceof Error ? processingError.message : 'Unknown error',
        stack: processingError instanceof Error ? processingError.stack : undefined,
        timestamp: new Date().toISOString()
      });
      
      if (eventId) {
        await supabaseClient
          .from('asaas_webhook_events')
          .update({ 
            response_message: 'Failed: ' + (processingError instanceof Error ? processingError.message : 'Unknown error')
          })
          .eq('event_id', eventId);
      }
      
      // Ainda assim retornar 200 para evitar reenvios do Asaas
      return new Response(
        JSON.stringify({ 
          received: true, 
          error: processingError instanceof Error ? processingError.message : 'Unknown error'
        }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
