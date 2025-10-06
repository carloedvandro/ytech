import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const event = await req.json();
    console.log('Asaas webhook received:', event);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const paymentId = event.payment?.externalReference;

    // PAYMENT_CREATED - Nova cobrança criada
    if (event.event === 'PAYMENT_CREATED') {
      console.log('Payment created:', paymentId);
      // Apenas log, já criamos o pagamento antes
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
        console.error('Payment not found:', paymentError);
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      // Buscar plano
      const { data: plan, error: planError } = await supabaseClient
        .from('plans')
        .select('*')
        .eq('id', payment.plan_id)
        .single();

      if (planError || !plan) {
        console.error('Plan not found:', planError);
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      // Atualizar pagamento para concluído
      await supabaseClient
        .from('payments')
        .update({
          status: 'completed',
          paid_at: new Date().toISOString(),
        })
        .eq('id', paymentId);

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

      console.log('Payment confirmed and commissions created');
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
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), 
      { status: 400 }
    );
  }
});
