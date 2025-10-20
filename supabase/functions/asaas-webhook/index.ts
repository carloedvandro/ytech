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
    // 🔒 VALIDAÇÃO DE SEGURANÇA - IPs oficiais da Asaas
    const officialAsaasIPs = [
      '52.67.12.206',
      '18.230.8.159',
      '54.94.136.112',
      '54.94.183.101'
    ];

    // Obter IP do cliente (considerando proxies)
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    // DEBUG: Logar headers relevantes
    console.log('📥 Headers recebidos:', {
      'x-test-webhook': req.headers.get('x-test-webhook'),
      'x-forwarded-for': req.headers.get('x-forwarded-for'),
      'content-type': req.headers.get('content-type')
    });

    // Verificar se é um teste (header especial) - verificar ANTES do IP
    const isTestWebhook = req.headers.get('x-test-webhook') === 'true';
    
    console.log('📍 Webhook IP:', clientIP);
    console.log('🔍 isTestWebhook:', isTestWebhook);
    
    if (isTestWebhook) {
      console.log('🧪 Processando webhook de TESTE - IP validation bypassed');
    }

    // Validar IP (apenas em produção, pular para testes)
    if (!isTestWebhook && clientIP !== 'unknown' && !officialAsaasIPs.includes(clientIP)) {
      console.error('🚫 IP não autorizado:', clientIP);
      return new Response(
        JSON.stringify({ error: 'Unauthorized IP address' }), 
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validação adicional: Token secreto (se configurado)
    const webhookToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN');
    if (webhookToken) {
      const authHeader = req.headers.get('authorization');
      const receivedToken = authHeader?.replace('Bearer ', '');
      
      if (receivedToken !== webhookToken) {
        console.error('🚫 Token inválido');
        return new Response(
          JSON.stringify({ error: 'Invalid webhook token' }), 
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

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
    const asaasPaymentId = event.payment?.id;
    const hasSubscription = !!event.payment?.subscription;
    
    console.log('📥 Webhook Asaas (v3 compatible):', { 
      eventId, 
      event: event.event, 
      paymentId,
      asaasPaymentId,
      hasSubscription,
      hasExternalRef: !!paymentId,
      description: event.payment?.description?.substring(0, 50)
    });

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
              console.log('✓ Evento duplicado (já processado):', eventId);
              return;
            }
            throw insertError;
          }
        }

        // ⚠️ FILTRAR EVENTOS QUE NÃO SÃO DO SISTEMA
        // Eventos sem externalReference são pagamentos criados diretamente no Asaas
        // ou PIX recebidos automaticamente - não devem ser processados
        if (!paymentId && !hasSubscription) {
          console.log('⚠️ Evento ignorado - Pagamento não é do sistema (sem externalReference e sem subscription)');
          console.log('   Descrição:', event.payment?.description);
          console.log('   Asaas ID:', asaasPaymentId);
          
          await supabaseClient
            .from('asaas_webhook_events')
            .update({ 
              response_message: 'Ignored: External payment (not from system)' 
            })
            .eq('event_id', eventId);
          
          return;
        }

        console.log('🔄 Processing event:', event.event);

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
          let isEarlyRenewal = false;
          
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
              isEarlyRenewal = payment.metadata?.renewal_type === 'early';
              console.log('✓ Payment found by ID', isEarlyRenewal ? '(early renewal)' : '');
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
            console.error('❌ Payment not found in database');
            console.error('   External Reference:', paymentId);
            console.error('   Asaas Payment ID:', asaasPaymentId);
            console.error('   Subscription ID:', event.payment?.subscription);
            console.error('   Description:', event.payment?.description);
            
            await supabaseClient
              .from('asaas_webhook_events')
              .update({ 
                response_message: `Failed: Payment not found (ref: ${paymentId || 'none'}, sub: ${event.payment?.subscription || 'none'})` 
              })
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

          // RENOVAÇÃO ANTECIPADA
          if (isEarlyRenewal) {
            console.log('🔄 Processing early renewal payment');

            // Atualizar status do pagamento de renovação antecipada
            await supabaseClient
              .from('payments')
              .update({ 
                status: 'completed',
                paid_at: new Date().toISOString(),
              })
              .eq('id', paymentId);

            // Buscar perfil do usuário
            const { data: userProfile } = await supabaseClient
              .from('profiles')
              .select('whatsapp')
              .eq('id', userId)
              .single();

            // Buscar pagamento principal (assinatura)
            const { data: subscriptionPayment } = await supabaseClient
              .from('payments')
              .select('next_renewal_date, subscription_id')
              .eq('subscription_id', payment.metadata.original_subscription_id)
              .eq('user_id', userId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (subscriptionPayment) {
              // Adicionar 30 dias à data atual de renovação
              const currentRenewal = new Date(subscriptionPayment.next_renewal_date);
              const newRenewal = new Date(currentRenewal);
              newRenewal.setDate(newRenewal.getDate() + 30);
              newRenewal.setHours(0, 0, 0, 0);

              // Atualizar próxima data de renovação
              await supabaseClient
                .from('payments')
                .update({ next_renewal_date: newRenewal.toISOString() })
                .eq('subscription_id', payment.metadata.original_subscription_id);

              // Atualizar metadata do perfil
              const { data: currentProfile } = await supabaseClient
                .from('profiles')
                .select('metadata')
                .eq('id', userId)
                .single();

              await supabaseClient
                .from('profiles')
                .update({
                  metadata: {
                    ...(currentProfile?.metadata || {}),
                    plan_end_date: newRenewal.toISOString(),
                  }
                })
                .eq('id', userId);

              console.log('✓ Renewal date extended to:', newRenewal.toISOString());

              // Enviar WhatsApp de confirmação
              if (userProfile?.whatsapp) {
                try {
                  await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-whatsapp-notification`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                    },
                    body: JSON.stringify({
                      whatsapp: userProfile.whatsapp,
                      messageType: 'renewal_early_payment',
                      data: {
                        nextRenewalDate: newRenewal.toISOString(),
                        amount: payment.amount,
                      },
                      userId: userId,
                    }),
                  });
                } catch (error) {
                  console.error('WhatsApp notification error:', error);
                }
              }
            }

            await supabaseClient
              .from('asaas_webhook_events')
              .update({ response_message: 'Completed (early renewal)' })
              .eq('event_id', eventId);
            return;
          }

          // 🎯 VERIFICAR SALDO E APLICAR DESCONTO/PAGAMENTO TOTAL
          const planPrice = Number(plan.price);
          let discountApplied = 0;
          let paidWithBalance = false;

          // Verificar se é renovação (subscription exists)
          if (payment.subscription_id) {
            console.log('📊 Verificando preferências de renovação...');

            // 1. Buscar preferências do usuário
            const { data: preferences } = await supabaseClient
              .from('user_renewal_preferences')
              .select('*')
              .eq('user_id', userId)
              .maybeSingle();

            if (preferences?.use_balance_for_renewal) {
              console.log('✅ Usuário quer usar saldo nas renovações');

              // 2. Calcular saldo disponível
              const { data: commissionsData } = await supabaseClient
                .from('commissions')
                .select('amount')
                .eq('user_id', userId)
                .eq('status', 'available');

              const { data: adjustments } = await supabaseClient
                .from('admin_balance_adjustments')
                .select('amount, type')
                .eq('user_id', userId);

              let totalBalance = 0;
              if (commissionsData) {
                totalBalance = commissionsData.reduce((sum: number, c: any) => sum + Number(c.amount), 0);
              }
              if (adjustments) {
                adjustments.forEach((adj: any) => {
                  totalBalance += adj.type === 'add' ? Number(adj.amount) : -Number(adj.amount);
                });
              }

              const minimumBalance = Number(preferences.minimum_balance_to_keep) || 0;
              const availableBalance = Math.max(0, totalBalance - minimumBalance);

              console.log(`💰 Saldo total: R$ ${totalBalance.toFixed(2)}`);
              console.log(`🔒 Saldo mínimo: R$ ${minimumBalance.toFixed(2)}`);
              console.log(`✅ Saldo disponível: R$ ${availableBalance.toFixed(2)}`);

              // 3. CASO 1: Saldo TOTAL (≥ preço do plano) - ZERAR FATURA
              if (availableBalance >= planPrice) {
                console.log(`✅ Pagamento TOTAL com saldo! Cancelando fatura ${event.payment.id}`);

                try {
                  // Cancelar fatura no Asaas
                  const { data: cancelResult, error: cancelError } = await supabaseClient.functions.invoke(
                    'cancel-asaas-payment',
                    { body: { asaasPaymentId: event.payment.id } }
                  );

                  if (cancelError) {
                    console.error('❌ Erro ao cancelar fatura:', cancelError);
                  } else {
                    console.log('✅ Fatura cancelada:', cancelResult);
                  }
                } catch (cancelErr) {
                  console.error('❌ Erro ao chamar função de cancelamento:', cancelErr);
                }

                // Descontar valor total do saldo
                await supabaseClient.from('admin_balance_adjustments').insert({
                  user_id: userId,
                  admin_id: userId,
                  type: 'remove',
                  amount: planPrice,
                  reason: `Pagamento da renovação com saldo - Ref: ${event.payment.id}`,
                  balance_before: totalBalance,
                  balance_after: totalBalance - planPrice,
                });

                console.log(`✅ Descontado R$ ${planPrice.toFixed(2)} do saldo`);

                // Marcar como pago com saldo
                paidWithBalance = true;
                discountApplied = planPrice;

                // Enviar WhatsApp customizado
                const now = new Date();
                const saoPauloOffset = -3 * 60;
                const localOffset = now.getTimezoneOffset();
                const adjustedNow = new Date(now.getTime() + (localOffset - saoPauloOffset) * 60000);
                const nextRenewalDate = new Date(adjustedNow);
                nextRenewalDate.setDate(nextRenewalDate.getDate() + 30);

                await supabaseClient.functions.invoke('send-whatsapp-notification', {
                  body: {
                    messageType: 'renewal_paid_with_balance',
                    userId,
                    data: {
                      amountDeducted: planPrice,
                      remainingBalance: totalBalance - planPrice,
                      nextRenewalDate: nextRenewalDate.toISOString(),
                    }
                  }
                });

                console.log('📱 WhatsApp enviado: Renovação paga com saldo');
              }

              // 4. CASO 2: Saldo PARCIAL (R$ 5-124,99) - DESCONTO
              else if (availableBalance >= 5.00) {
                const maxDiscount = Math.min(availableBalance, planPrice - 5.00); // Máx R$ 124,99
                console.log(`💰 Aplicando desconto parcial de R$ ${maxDiscount.toFixed(2)}`);

                await supabaseClient.from('admin_balance_adjustments').insert({
                  user_id: userId,
                  admin_id: userId,
                  type: 'remove',
                  amount: maxDiscount,
                  reason: `Desconto na renovação - Ref: ${event.payment.id}`,
                  balance_before: totalBalance,
                  balance_after: totalBalance - maxDiscount,
                });

                discountApplied = maxDiscount;

                // WhatsApp com desconto
                await supabaseClient.functions.invoke('send-whatsapp-notification', {
                  body: {
                    messageType: 'renewal_with_discount',
                    userId,
                    data: {
                      discountAmount: maxDiscount,
                      paidAmount: planPrice - maxDiscount,
                      remainingBalance: totalBalance - maxDiscount,
                    }
                  }
                });

                console.log('📱 WhatsApp enviado: Renovação com desconto');
              } else {
                console.log('⚠️ Saldo insuficiente para desconto (< R$ 5,00)');
              }
            }
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

          // Atualizar renovação (timezone São Paulo)
          if (payment.subscription_id) {
            // Criar data atual no timezone de São Paulo
            const now = new Date();
            const saoPauloOffset = -3 * 60; // UTC-3 em minutos
            const localOffset = now.getTimezoneOffset();
            const adjustedNow = new Date(now.getTime() + (localOffset - saoPauloOffset) * 60000);
            
            // Adicionar 30 dias
            const nextRenewalDate = new Date(adjustedNow);
            nextRenewalDate.setDate(nextRenewalDate.getDate() + 30);
            nextRenewalDate.setHours(0, 0, 0, 0); // Meia-noite
            
            await supabaseClient
              .from('payments')
              .update({ next_renewal_date: nextRenewalDate.toISOString() })
              .eq('subscription_id', payment.subscription_id);
            console.log('✓ Renewal updated to (SP):', nextRenewalDate.toISOString());
          }

          // Ativar usuário
          await supabaseClient
            .from('profiles')
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

          // Criar comissões (apenas para usuários ativos e com pagamento em dia)
          const commissions = [];
          const path = network.path;

          // Função para verificar se usuário pode receber comissão
          const canReceiveCommission = async (uid: string) => {
            // Buscar perfil do usuário
            const { data: profile } = await supabaseClient
              .from('profiles')
              .select('status')
              .eq('id', uid)
              .maybeSingle();

            // Se não está ativo, não pode receber
            if (!profile || profile.status !== 'active') {
              console.log(`⚠️ User ${uid} is not active, skipping commission`);
              return false;
            }

            // Buscar última data de renovação
            const { data: lastPayment } = await supabaseClient
              .from('payments')
              .select('next_renewal_date')
              .eq('user_id', uid)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            // Se não tem pagamento ou está vencido, não pode receber
            if (lastPayment?.next_renewal_date) {
              const renewalDate = new Date(lastPayment.next_renewal_date);
              const now = new Date();
              now.setHours(0, 0, 0, 0);
              renewalDate.setHours(0, 0, 0, 0);

              if (renewalDate < now) {
                console.log(`⚠️ User ${uid} payment is overdue, skipping commission`);
                return false;
              }
            }

            return true;
          };

          // Nível 1
          if (path.length >= 2) {
            const level1UserId = path[path.length - 2];
            if (await canReceiveCommission(level1UserId)) {
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
          }

          // Níveis 2-4
          for (let i = 2; i <= 4 && path.length > i; i++) {
            const levelUserId = path[path.length - (i + 1)];
            if (await canReceiveCommission(levelUserId)) {
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
