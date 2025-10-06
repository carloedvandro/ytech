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
    const { transactionId } = await req.json();

    if (!transactionId) {
      throw new Error("Transaction ID is required");
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar dados da transação
    const { data: transaction, error: transactionError } = await supabaseClient
      .from('transactions')
      .select('*, users!transactions_user_id_fkey(*)')
      .eq('id', transactionId)
      .eq('type', 'withdrawal')
      .single();

    if (transactionError) throw transactionError;

    if (transaction.status !== 'pending') {
      throw new Error('Transaction is not pending');
    }

    // Criar transferência PIX no Asaas
    const asaasResponse = await fetch('https://api.asaas.com/v3/transfers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': Deno.env.get('ASAAS_API_KEY') ?? '',
      },
      body: JSON.stringify({
        value: Number(transaction.net_amount),
        pixAddressKey: transaction.pix_key,
        description: `Saque de comissões - ${transaction.users.full_name}`,
        operationType: 'PIX',
      }),
    });

    if (!asaasResponse.ok) {
      const errorText = await asaasResponse.text();
      console.error('Asaas transfer error:', errorText);
      throw new Error(`Asaas API error: ${errorText}`);
    }

    const asaasTransfer = await asaasResponse.json();

    console.log('Asaas transfer created:', asaasTransfer);

    // Atualizar transação com dados do Asaas
    const { error: updateError } = await supabaseClient
      .from('transactions')
      .update({
        status: 'processing',
        metadata: {
          ...transaction.metadata,
          asaas_transfer_id: asaasTransfer.id,
          asaas_status: asaasTransfer.status,
        },
      })
      .eq('id', transactionId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        transfer: {
          id: transactionId,
          asaas_transfer_id: asaasTransfer.id,
          status: asaasTransfer.status,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating Asaas transfer:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
