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

    // Buscar o payment mais recente do usuário
    const { data: latestPayment, error: fetchError } = await supabase
      .from('payments')
      .select('id, subscription_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('Erro ao buscar payment:', fetchError);
      throw new Error('Erro ao buscar registro de pagamento');
    }

    if (!latestPayment) {
      console.error('Nenhum payment encontrado para o usuário');
      throw new Error('Nenhum registro de pagamento encontrado para este usuário');
    }

    console.log('Payment encontrado:', latestPayment);

    // Atualizar o payment específico por ID com data no formato correto
    const { error: updateError } = await supabase
      .from('payments')
      .update({ next_renewal_date: `${newRenewalDate}T00:00:00+00:00` })
      .eq('id', latestPayment.id);

    if (updateError) {
      console.error('Erro ao atualizar no banco:', updateError);
      throw new Error('Erro ao atualizar data de renovação no banco');
    }

    console.log('Data atualizada no banco com sucesso');

    // Usar o subscription_id do registro encontrado (não do parâmetro)
    const actualSubscriptionId = latestPayment.subscription_id;

    // Se tiver subscription_id, atualizar no Asaas
    if (actualSubscriptionId) {
      const asaasApiKey = Deno.env.get('ASAAS_API_KEY') || Deno.env.get('ASAAS_SANDBOX_API_KEY');
      const asaasUrl = asaasApiKey?.includes('prod') 
        ? 'https://api.asaas.com/v3' 
        : 'https://sandbox.asaas.com/api/v3';

      try {
        // Buscar todas as cobranças da assinatura (PENDING, CONFIRMED, OVERDUE)
        const statuses = ['PENDING', 'CONFIRMED', 'OVERDUE'];
        let totalPaymentsUpdated = 0;

        for (const status of statuses) {
          const paymentsResponse = await fetch(
            `${asaasUrl}/payments?subscription=${actualSubscriptionId}&status=${status}`,
            {
              method: 'GET',
              headers: {
                'access_token': asaasApiKey!,
                'Content-Type': 'application/json',
              },
            }
          );

          if (paymentsResponse.ok) {
            const paymentsData = await paymentsResponse.json();
            console.log(`Cobranças ${status} encontradas:`, paymentsData.data?.length || 0);

            // Atualizar cada cobrança com a nova data
            if (paymentsData.data && paymentsData.data.length > 0) {
              for (const payment of paymentsData.data) {
                const updatePaymentResponse = await fetch(
                  `${asaasUrl}/payments/${payment.id}`,
                  {
                    method: 'PUT',
                    headers: {
                      'access_token': asaasApiKey!,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      dueDate: newRenewalDate,
                    }),
                  }
                );

                if (updatePaymentResponse.ok) {
                  console.log(`Cobrança ${payment.id} (${status}) atualizada com sucesso`);
                  totalPaymentsUpdated++;
                } else {
                  const errorText = await updatePaymentResponse.text();
                  console.error(`Erro ao atualizar cobrança ${payment.id}:`, errorText);
                }
              }
            }
          }
        }

        console.log(`Total de cobranças atualizadas: ${totalPaymentsUpdated}`);

        // Atualizar a assinatura para próximas cobranças
        const updateSubscriptionResponse = await fetch(
          `${asaasUrl}/subscriptions/${actualSubscriptionId}`,
          {
            method: 'PUT',
            headers: {
              'access_token': asaasApiKey!,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              nextDueDate: newRenewalDate,
            }),
          }
        );

        if (updateSubscriptionResponse.ok) {
          console.log('Assinatura atualizada com sucesso');
        } else {
          const errorText = await updateSubscriptionResponse.text();
          console.log('Info da atualização da assinatura:', errorText);
          // Não falhar aqui pois o importante é atualizar as cobranças pendentes
        }

        console.log('Datas atualizadas no Asaas com sucesso');
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
