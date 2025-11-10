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
      .select('id, subscription_id, plan_id, user_id')
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

    // Usar o subscription_id do registro encontrado
    const actualSubscriptionId = latestPayment.subscription_id;

    // Se tiver subscription_id, recriar cobrança no Asaas
    if (actualSubscriptionId) {
      const asaasApiKey = Deno.env.get('ASAAS_API_KEY') || Deno.env.get('ASAAS_SANDBOX_API_KEY');
      const asaasUrl = asaasApiKey?.includes('prod') 
        ? 'https://api.asaas.com/v3' 
        : 'https://sandbox.asaas.com/api/v3';

      try {
        console.log('🔍 Iniciando processo de recriação de cobrança...');

        // 1️⃣ PRIMEIRO: REVERTER TODAS as comissões withdrawn deste usuário
        console.log('🔄 Revertendo TODAS as comissões withdrawn do usuário...');
        
        const { data: withdrawnComms } = await supabase
          .from('commissions')
          .select('id, amount')
          .eq('user_id', userId)
          .eq('status', 'withdrawn');

        if (withdrawnComms && withdrawnComms.length > 0) {
          for (const comm of withdrawnComms) {
            await supabase
              .from('commissions')
              .update({ 
                status: 'available',
                withdrawn_at: null
              })
              .eq('id', comm.id);
            
            console.log(`✅ Revertida comissão ${comm.id}: R$ ${comm.amount}`);
          }
          
          const totalReverted = withdrawnComms.reduce((sum, c) => sum + Number(c.amount), 0);
          console.log(`✅ Total de ${withdrawnComms.length} comissão(ões) revertida(s): R$ ${totalReverted}`);
        } else {
          console.log('ℹ️ Nenhuma comissão withdrawn encontrada para reverter');
        }

        // 2️⃣ SEGUNDO: Buscar dados do usuário e plano
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        const { data: plan } = await supabase
          .from('plans')
          .select('*')
          .eq('id', latestPayment.plan_id)
          .single();

        console.log(`📋 Plano: ${plan.name} - R$ ${plan.price}`);

        // 3️⃣ TERCEIRO: Calcular saldo disponível (agora com todas as comissões revertidas)
        console.log('💰 Calculando saldo disponível...');
        const { data: commissionsData } = await supabase
          .from('commissions')
          .select('amount')
          .eq('user_id', userId)
          .eq('status', 'available');

        const commissionsAvailable = commissionsData?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;

        const { data: adjustmentsData } = await supabase
          .from('admin_balance_adjustments')
          .select('amount, type')
          .eq('user_id', userId);

        const additionsTotal = adjustmentsData?.filter(a => a.type === 'add').reduce((sum, a) => sum + Number(a.amount), 0) || 0;
        const deductionsTotal = adjustmentsData?.filter(a => a.type === 'remove').reduce((sum, a) => sum + Number(a.amount), 0) || 0;
        const availableBalance = commissionsAvailable + additionsTotal - deductionsTotal;

        console.log(`💰 Saldo disponível: R$ ${availableBalance}`);

        // Verificar preferências de renovação
        const { data: preferences } = await supabase
          .from('user_renewal_preferences')
          .select('use_balance_for_renewal, minimum_balance_to_keep')
          .eq('user_id', userId)
          .maybeSingle();

        const useBalance = preferences?.use_balance_for_renewal || false;
        const minBalanceToKeep = Number(preferences?.minimum_balance_to_keep) || 0;

        // Calcular valor final
        let finalAmount = Number(plan.price);
        let discountApplied = 0;

        if (useBalance && availableBalance > minBalanceToKeep) {
          const usableBalance = availableBalance - minBalanceToKeep;
          discountApplied = Math.min(usableBalance, finalAmount);
          finalAmount = Math.max(0, finalAmount - discountApplied);
        }

        console.log(`💰 Cálculo: Plano R$ ${plan.price} - Desconto R$ ${discountApplied} = R$ ${finalAmount}`);

        // Buscar e deletar TODAS as cobranças da assinatura (com paginação)
        const statuses = ['PENDING', 'CONFIRMED', 'OVERDUE'];
        const deletedPayments = [];
        let totalPaymentsFound = 0;

        console.log(`🔍 Buscando cobranças da assinatura ${actualSubscriptionId}...`);

        // 4️⃣ QUARTO: Buscar e deletar TODAS as cobranças vinculadas à assinatura
        const allStatuses = ['PENDING', 'CONFIRMED', 'OVERDUE', 'RECEIVED', 'RECEIVED_IN_CASH'];
        
        for (const status of allStatuses) {
          let offset = 0;
          let hasMore = true;
          
          while (hasMore) {
            const paymentsResponse = await fetch(
              `${asaasUrl}/payments?subscription=${actualSubscriptionId}&status=${status}&offset=${offset}&limit=100`,
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
              
              console.log(`📋 Status ${status}: ${paymentsData.data?.length || 0} cobrança(s) encontrada(s)`);
              
              if (paymentsData.data && paymentsData.data.length > 0) {
                totalPaymentsFound += paymentsData.data.length;
                
                for (const asaasPayment of paymentsData.data) {
                  console.log(`🔍 Encontrada: ${asaasPayment.id} - R$ ${asaasPayment.value} - Venc: ${asaasPayment.dueDate}`);
                  
                  // Deletar cobrança antiga
                  const deleteResponse = await fetch(
                    `${asaasUrl}/payments/${asaasPayment.id}`,
                    {
                      method: 'DELETE',
                      headers: {
                        'access_token': asaasApiKey!,
                        'Content-Type': 'application/json',
                      },
                    }
                  );

                  if (deleteResponse.ok) {
                    console.log(`✅ Cobrança ${asaasPayment.id} (${status}) DELETADA - R$ ${asaasPayment.value}`);
                    deletedPayments.push(asaasPayment.id);
                  } else {
                    const errorText = await deleteResponse.text();
                    console.error(`❌ ERRO ao deletar ${asaasPayment.id}:`, errorText);
                  }
                }
                
                // Verificar se tem mais páginas
                hasMore = paymentsData.hasMore || false;
                offset += 100;
              } else {
                hasMore = false;
              }
            } else {
              const errorText = await paymentsResponse.text();
              console.error(`❌ Erro ao buscar cobranças (${status}):`, errorText);
              hasMore = false;
            }
          }
        }

        console.log(`📊 RESUMO: ${totalPaymentsFound} cobrança(s) encontrada(s), ${deletedPayments.length} deletada(s)`);

        // 5️⃣ QUINTO: Buscar customer_id da assinatura
        const subscriptionResponse = await fetch(
          `${asaasUrl}/subscriptions/${actualSubscriptionId}`,
          {
            method: 'GET',
            headers: {
              'access_token': asaasApiKey!,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!subscriptionResponse.ok) {
          throw new Error('Erro ao buscar assinatura');
        }

        const subscriptionData = await subscriptionResponse.json();
        
        // Criar nova cobrança com o valor correto
        const newPaymentResponse = await fetch(
          `${asaasUrl}/payments`,
          {
            method: 'POST',
            headers: {
              'access_token': asaasApiKey!,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              customer: subscriptionData.customer,
              billingType: 'PIX',
              value: finalAmount,
              dueDate: newRenewalDate,
              description: `${plan.name} - MegaChip ${plan.type === 'premium' ? 'Rural' : 'Smartphone'}`,
              externalReference: latestPayment.id,
              subscription: actualSubscriptionId,
            }),
          }
        );

        if (!newPaymentResponse.ok) {
          const errorText = await newPaymentResponse.text();
          console.error('❌ Erro ao criar nova cobrança:', errorText);
          throw new Error('Erro ao criar nova cobrança no Asaas');
        }

        const newPaymentData = await newPaymentResponse.json();
        console.log(`✅ Nova cobrança criada: ${newPaymentData.id} - R$ ${finalAmount} - Vencimento: ${newRenewalDate}`);

        // 6️⃣ SEXTO: Se teve desconto, deduzir do saldo
        if (discountApplied > 0) {
          // Marcar comissões como usadas
          const { data: commsToUse } = await supabase
            .from('commissions')
            .select('id, amount')
            .eq('user_id', userId)
            .eq('status', 'available')
            .order('created_at', { ascending: true });

          let remainingDiscount = discountApplied;
          
          for (const comm of commsToUse || []) {
            if (remainingDiscount <= 0) break;
            
            const amountToUse = Math.min(Number(comm.amount), remainingDiscount);
            
            await supabase
              .from('commissions')
              .update({ 
                status: 'withdrawn',
                withdrawn_at: new Date().toISOString()
              })
              .eq('id', comm.id);
            
            remainingDiscount -= amountToUse;
          }

          console.log(`💸 Desconto de R$ ${discountApplied} aplicado e deduzido do saldo`);
        }

        // 7️⃣ SÉTIMO: Atualizar o payment no banco com os novos dados
        await supabase
          .from('payments')
          .update({
            pix_code: newPaymentData.invoiceUrl,
            pix_qr_code: newPaymentData.bankSlipUrl,
            asaas_payment_id: newPaymentData.id,
            metadata: {
              discount_applied: discountApplied,
              final_amount: finalAmount,
              original_amount: Number(plan.price),
              asaas_payment_id: newPaymentData.id,
              asaas_status: 'PENDING'
            }
          })
          .eq('id', latestPayment.id);

        console.log('✅ Payment atualizado no banco com metadata completo');

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
          console.log('✅ Assinatura atualizada para próximas cobranças');
        } else {
          const errorText = await updateSubscriptionResponse.text();
          console.log('ℹ️ Info da assinatura:', errorText);
        }

        console.log('✅ Processo completo: cobrança recriada no Asaas com sucesso!');
      } catch (asaasError) {
        console.error('Erro ao processar no Asaas:', asaasError);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Data atualizada no banco, mas falhou ao recriar cobrança no Asaas',
            warning: asaasError instanceof Error ? asaasError.message : 'Erro ao atualizar no Asaas'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Data de renovação atualizada e cobrança recriada com sucesso'
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
