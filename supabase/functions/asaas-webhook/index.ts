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
        .select('*, plans!payments_plan_id_fkey(*)')
        .eq('id', paymentId)
        .single();

      if (paymentError) {
        console.error('Payment not found:', paymentError);
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
      const { data: userNetwork } = await supabaseClient
        .from('user_network')
        .select('user_id, level')
        .eq('user_id', payment.user_id)
        .single();

      if (userNetwork && userNetwork.user_id) {
        // Buscar hierarquia de referidos
        const { data: parents } = await supabaseClient
          .from('user_network')
          .select('parent_id, level')
          .eq('user_id', payment.user_id);

        if (parents && parents.length > 0) {
          const commissions = [];
          
          // Criar comissões para cada nível
          for (let level = 1; level <= 4; level++) {
            const parent = parents.find(p => p.level === level);
            if (!parent || !parent.parent_id) continue;

            const commissionAmount = level === 1 
              ? Number(payment.plans.commission_l1)
              : Number(payment.plans.commission_l2_l4);

            commissions.push({
              user_id: parent.parent_id,
              referred_user_id: payment.user_id,
              payment_id: paymentId,
              level: level,
              amount: commissionAmount,
              status: 'pending',
              released_at: null,
            });
          }

          if (commissions.length > 0) {
            await supabaseClient
              .from('commissions')
              .insert(commissions);

            console.log(`Created ${commissions.length} commissions`);
          }
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
