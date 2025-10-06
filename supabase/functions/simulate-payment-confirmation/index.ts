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

    // Buscar dados do pagamento
    const { data: payment, error: paymentError } = await supabaseClient
      .from('payments')
      .select('*, users!payments_user_id_fkey(*), plans!payments_plan_id_fkey(*)')
      .eq('id', paymentId)
      .single();

    if (paymentError) throw paymentError;

    console.log('Simulating payment confirmation for:', paymentId);

    // Atualizar pagamento para completed
    const { error: updateError } = await supabaseClient
      .from('payments')
      .update({
        status: 'completed',
        paid_at: new Date().toISOString(),
      })
      .eq('id', paymentId);

    if (updateError) throw updateError;

    // Ativar usuário
    const { error: userError } = await supabaseClient
      .from('users')
      .update({
        status: 'active',
      })
      .eq('id', payment.user_id);

    if (userError) throw userError;

    // Buscar rede do usuário para calcular comissões
    const { data: network, error: networkError } = await supabaseClient
      .from('user_network')
      .select('path')
      .eq('user_id', payment.user_id)
      .single();

    console.log('Network data for user:', payment.user_id, network);
    
    if (networkError) {
      console.error('Error fetching network:', networkError);
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
          amount: payment.plans.commission_l1,
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
          amount: payment.plans.commission_l2_l4,
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
          throw commError;
        } else {
          console.log('Commissions successfully created:', insertedCommissions);
        }
      } else {
        console.log('No commissions to create - network path too short');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment confirmed successfully (simulated)',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error simulating payment confirmation:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
