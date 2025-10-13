import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { asaasPaymentId } = await req.json();

    if (!asaasPaymentId) {
      throw new Error('asaasPaymentId é obrigatório');
    }

    const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
    if (!asaasApiKey) {
      throw new Error('ASAAS_API_KEY não configurada');
    }

    console.log(`🗑️ Cancelando fatura Asaas: ${asaasPaymentId}`);

    // Cancelar pagamento no Asaas
    const response = await fetch(
      `https://api.asaas.com/v3/payments/${asaasPaymentId}`,
      {
        method: 'DELETE',
        headers: {
          'access_token': asaasApiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro ao cancelar no Asaas:', errorText);
      throw new Error(`Falha ao cancelar pagamento no Asaas: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Fatura cancelada no Asaas:', result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Fatura cancelada com sucesso',
        data: result 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
