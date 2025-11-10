import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ENV_CONFIG, logEnvironment, validateConfig } from "../_shared/config.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logEnvironment();
    validateConfig();

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verificar se é admin
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: adminRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole) {
      throw new Error('Não autorizado: apenas admins podem executar esta ação');
    }

    const { asaasPaymentId } = await req.json();

    if (!asaasPaymentId) {
      throw new Error('asaasPaymentId é obrigatório');
    }

    console.log('🔄 Cancelando pagamento no Asaas:', asaasPaymentId);

    const cancelResponse = await fetch(`${ENV_CONFIG.asaas.baseUrl}/payments/${asaasPaymentId}`, {
      method: 'DELETE',
      headers: {
        'access_token': ENV_CONFIG.asaas.apiKey,
      },
    });

    const responseText = await cancelResponse.text();

    if (!cancelResponse.ok) {
      console.error('❌ Erro ao cancelar no Asaas:', responseText);
      throw new Error(`Falha ao cancelar fatura no Asaas: ${responseText}`);
    }

    console.log('✅ Pagamento cancelado no Asaas com sucesso');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Fatura ${asaasPaymentId} cancelada com sucesso no Asaas`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
