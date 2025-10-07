import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autorizado');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Não autorizado');
    }

    // Verificar se é admin
    const { data: isAdmin } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!isAdmin) {
      throw new Error('Apenas administradores podem alterar datas de renovação');
    }

    const { userId, newRenewalDate, subscriptionId } = await req.json();

    console.log('Atualizando data de renovação:', { userId, newRenewalDate, subscriptionId });

    // Atualizar data na tabela payments
    let query = supabase
      .from('payments')
      .update({ next_renewal_date: newRenewalDate })
      .eq('user_id', userId);
    
    // Se subscription_id for null, usar .is(), senão usar .eq()
    if (subscriptionId === null || subscriptionId === undefined) {
      query = query.is('subscription_id', null);
    } else {
      query = query.eq('subscription_id', subscriptionId);
    }

    const { error: updateError } = await query;

    if (updateError) {
      console.error('Erro ao atualizar no banco:', updateError);
      throw new Error('Erro ao atualizar data de renovação no banco');
    }

    console.log('Data atualizada no banco com sucesso');

    // Se tiver subscription_id, atualizar no Asaas
    if (subscriptionId) {
      const asaasApiKey = Deno.env.get('ASAAS_API_KEY') || Deno.env.get('ASAAS_SANDBOX_API_KEY');
      const asaasUrl = asaasApiKey?.includes('prod') 
        ? 'https://api.asaas.com/v3' 
        : 'https://sandbox.asaas.com/api/v3';

      try {
        // Buscar subscription no Asaas
        const asaasResponse = await fetch(`${asaasUrl}/subscriptions/${subscriptionId}`, {
          method: 'GET',
          headers: {
            'access_token': asaasApiKey!,
            'Content-Type': 'application/json',
          },
        });

        if (!asaasResponse.ok) {
          console.error('Erro ao buscar subscription no Asaas:', await asaasResponse.text());
          throw new Error('Subscription não encontrada no Asaas');
        }

        // Atualizar próximo vencimento no Asaas
        const updateAsaasResponse = await fetch(`${asaasUrl}/subscriptions/${subscriptionId}`, {
          method: 'POST',
          headers: {
            'access_token': asaasApiKey!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nextDueDate: newRenewalDate.split('T')[0], // Formato YYYY-MM-DD
          }),
        });

        if (!updateAsaasResponse.ok) {
          const errorText = await updateAsaasResponse.text();
          console.error('Erro ao atualizar no Asaas:', errorText);
          throw new Error('Erro ao atualizar data no Asaas');
        }

        console.log('Data atualizada no Asaas com sucesso');
      } catch (asaasError) {
        console.error('Erro ao atualizar no Asaas:', asaasError);
        // Não falhar a operação se o Asaas falhar, pois já atualizamos no banco
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Data atualizada no banco, mas falhou ao atualizar no Asaas',
            warning: asaasError instanceof Error ? asaasError.message : 'Erro desconhecido'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Data de renovação atualizada com sucesso'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
