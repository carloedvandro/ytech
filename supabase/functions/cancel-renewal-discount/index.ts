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

    // Verificar usuário autenticado
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Pegar userId do body (para casos de admin personificando)
    const body = await req.json().catch(() => ({}));
    const targetUserId = body.userId || user.id;

    // Se userId diferente do autenticado, verificar se é admin
    if (targetUserId !== user.id) {
      const { data: roles } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (!roles || roles.role !== 'admin') {
        throw new Error('Unauthorized: Only admins can cancel discount for other users');
      }
      console.log('✅ Admin confirmado, processando para usuário:', targetUserId);
    }

    const userId = targetUserId;

    // Buscar pagamento pendente PRIMEIRO
    const { data: pendingPayment, error: paymentError } = await supabaseClient
      .from('payments')
      .select('*, plans!payments_plan_id_fkey(*)')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .maybeSingle();

    const metadata = (pendingPayment?.metadata || {}) as any;
    const discountApplied = metadata?.discount_applied ? Number(metadata.discount_applied) : 0;

    // Buscar preferência de renovação
    const { data: currentPref } = await supabaseClient
      .from('user_renewal_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    console.log('📋 STATUS INICIAL:', {
      user_id: userId,
      auth_user_id: user.id,
      user_email: user.email,
      has_pending_payment: !!pendingPayment,
      payment_id: pendingPayment?.id,
      payment_amount: pendingPayment?.amount,
      discount_applied: discountApplied,
      use_balance_for_renewal: currentPref?.use_balance_for_renewal
    });

    // Se NÃO há pagamento pendente com desconto E a preferência já está desabilitada, não há nada a fazer
    if (discountApplied === 0 && !currentPref?.use_balance_for_renewal) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'A preferência de usar saldo já está desabilitada e não há desconto aplicado.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se há pagamento pendente COM desconto, processar cancelamento completo
    if (pendingPayment && discountApplied > 0) {
      console.log('📋 Cancelando fatura com desconto:', {
        payment_id: pendingPayment.id,
        discount: discountApplied,
        current_amount: pendingPayment.amount
      });

      // Cancelar pagamento no Asaas se tiver ID
      const asaasPaymentId = metadata?.asaas_payment_id;
      if (asaasPaymentId) {
        console.log('🔄 PASSO 1: Cancelando pagamento no Asaas:', asaasPaymentId);
        console.log('   URL:', `${ENV_CONFIG.asaas.baseUrl}/payments/${asaasPaymentId}`);
        
        const cancelResponse = await fetch(`${ENV_CONFIG.asaas.baseUrl}/payments/${asaasPaymentId}`, {
          method: 'DELETE',
          headers: {
            'access_token': ENV_CONFIG.asaas.apiKey,
          },
        });

        if (!cancelResponse.ok) {
          const errorText = await cancelResponse.text();
          console.error('❌ Erro ao cancelar no Asaas:', errorText);
          throw new Error(`Falha ao cancelar fatura no Asaas: ${errorText}`);
        }
        
        console.log('✅ PASSO 1 CONCLUÍDO: Pagamento cancelado no Asaas com sucesso');
      } else {
        console.error('❌ ERRO PASSO 1: Pagamento não tem ID do Asaas');
        throw new Error('Pagamento não tem ID do Asaas para cancelamento');
      }

      // Atualizar status do pagamento para cancelled
      console.log('🔄 PASSO 2: Marcando pagamento como cancelado no banco');
      const { error: updateError } = await supabaseClient
        .from('payments')
        .update({ 
          status: 'cancelled',
          metadata: {
            ...metadata,
            cancelled_reason: 'user_cancelled_discount',
            cancelled_at: new Date().toISOString()
          }
        })
        .eq('id', pendingPayment.id);

      if (updateError) {
        console.error('❌ ERRO PASSO 2:', updateError);
        throw updateError;
      }
      console.log('✅ PASSO 2 CONCLUÍDO: Status atualizado para cancelled');

      // Restaurar comissões que foram marcadas como withdrawn
      console.log('🔄 PASSO 3: Restaurando comissões withdrawn');
      console.log('   Valor a restaurar: R$', discountApplied);
      const { data: withdrawnCommissions } = await supabaseClient
        .from('commissions')
        .select('id, amount')
        .eq('user_id', userId)
        .eq('status', 'withdrawn')
        .order('withdrawn_at', { ascending: false })
        .limit(10);

      if (withdrawnCommissions && withdrawnCommissions.length > 0) {
        console.log(`   Encontradas ${withdrawnCommissions.length} comissões withdrawn`);
        let remainingToRestore = discountApplied;
        const commsToRestore = [];

        for (const comm of withdrawnCommissions) {
          if (remainingToRestore <= 0) break;
          const amountToRestore = Math.min(Number(comm.amount), remainingToRestore);
          console.log(`   - Restaurando comissão ${comm.id}: R$ ${amountToRestore}`);
          commsToRestore.push(comm.id);
          remainingToRestore -= amountToRestore;
        }

        if (commsToRestore.length > 0) {
          await supabaseClient
            .from('commissions')
            .update({
              status: 'available',
              withdrawn_at: null
            })
            .in('id', commsToRestore);

          console.log(`✅ PASSO 3A: ${commsToRestore.length} comissão(ões) restaurada(s)`);
        }

        // Se ainda sobrou valor, remover do ajuste negativo
        if (remainingToRestore > 0.01) {
          console.log(`🔄 PASSO 3B: Criando ajuste positivo de R$ ${remainingToRestore.toFixed(2)}`);
          await supabaseClient
            .from('admin_balance_adjustments')
            .insert({
              user_id: userId,
              admin_id: user.id,
              type: 'add',
              amount: remainingToRestore,
              reason: 'Devolução de desconto cancelado',
              balance_before: 0,
              balance_after: remainingToRestore
            });

          console.log(`✅ PASSO 3B CONCLUÍDO: Ajuste criado`);
        }
      }
      console.log('✅ PASSO 3 CONCLUÍDO: Saldo restaurado');
    }

    // Desabilitar preferência de usar saldo
    console.log('🔄 PASSO 4: Desabilitando preferência de renovação');
    const { error: prefError } = await supabaseClient
      .from('user_renewal_preferences')
      .update({
        use_balance_for_renewal: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (prefError) {
      console.error('❌ ERRO PASSO 4:', prefError);
      throw prefError;
    }

    console.log('✅ PASSO 4 CONCLUÍDO: Preferência desabilitada');

    // Se não havia fatura com desconto, apenas desabilitar e retornar
    if (!pendingPayment || discountApplied === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Preferência de usar saldo desabilitada com sucesso.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar perfil do usuário
    console.log('🔄 PASSO 5: Buscando perfil do usuário');
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    const plan = pendingPayment.plans;
    const originalAmount = Number(plan.price);
    console.log('   Plano:', plan.name, '- Valor integral: R$', originalAmount);

    // Buscar ou criar cliente no Asaas
    console.log('🔄 PASSO 6: Buscando/criando cliente no Asaas');
    const customerData = {
      name: profile.full_name,
      cpfCnpj: profile.cpf.replace(/\D/g, ''),
      email: profile.email,
      phone: profile.whatsapp.replace(/\D/g, ''),
      externalReference: profile.id,
    };

    const customerResponse = await fetch(`${ENV_CONFIG.asaas.baseUrl}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ENV_CONFIG.asaas.apiKey,
      },
      body: JSON.stringify(customerData),
    });

    let asaasCustomer;
    if (!customerResponse.ok) {
      const errorText = await customerResponse.text();
      if (errorText.includes('cpfCnpj already exists')) {
        const searchResponse = await fetch(`${ENV_CONFIG.asaas.baseUrl}/customers?cpfCnpj=${profile.cpf.replace(/\D/g, '')}`, {
          headers: {
            'access_token': ENV_CONFIG.asaas.apiKey,
          },
        });
        const searchData = await searchResponse.json();
        asaasCustomer = searchData.data[0];
      } else {
        throw new Error(`Erro ao criar cliente Asaas: ${errorText}`);
      }
    } else {
      asaasCustomer = await customerResponse.json();
    }
    console.log('✅ PASSO 6 CONCLUÍDO: Customer ID:', asaasCustomer.id);

    // PRESERVAR a data de vencimento original da fatura que será cancelada
    const originalExpiresAt = pendingPayment.expires_at; // Data completa com hora
    const dueDateString = originalExpiresAt.split('T')[0]; // Apenas data (YYYY-MM-DD) para o Asaas
    const dueDate = new Date(originalExpiresAt); // Objeto Date para o banco

    console.log('🔄 PASSO 7: Criando nova cobrança no Asaas');
    console.log('   Valor: R$', originalAmount);
    console.log('   Data de vencimento PRESERVADA:', dueDateString);
    console.log('   (Mesma data da fatura anterior)');

    const newPaymentResponse = await fetch(`${ENV_CONFIG.asaas.baseUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ENV_CONFIG.asaas.apiKey,
      },
      body: JSON.stringify({
        customer: asaasCustomer.id,
        billingType: 'PIX',
        dueDate: dueDateString,
        value: originalAmount,
        description: `${plan.name} - Sem desconto`,
      }),
    });

    if (!newPaymentResponse.ok) {
      const errorText = await newPaymentResponse.text();
      console.error('❌ ERRO PASSO 7:', errorText);
      throw new Error(`Erro ao criar nova cobrança Asaas: ${errorText}`);
    }

    const newAsaasPayment = await newPaymentResponse.json();
    console.log('✅ PASSO 7 CONCLUÍDO: Cobrança criada:', newAsaasPayment.id);

    // Buscar QR Code PIX
    console.log('🔄 PASSO 8: Buscando QR Code PIX');
    const pixResponse = await fetch(`${ENV_CONFIG.asaas.baseUrl}/payments/${newAsaasPayment.id}/pixQrCode`, {
      headers: {
        'access_token': ENV_CONFIG.asaas.apiKey,
      },
    });

    const pixData = await pixResponse.json();
    console.log('✅ PASSO 8 CONCLUÍDO: QR Code obtido');

    // Criar novo registro de pagamento no banco
    console.log('🔄 PASSO 9: Inserindo novo pagamento no banco');
    
    // Calcular próxima renovação (30 dias após o vencimento)
    const nextRenewalDate = new Date(dueDate);
    nextRenewalDate.setDate(nextRenewalDate.getDate() + 30);
    
    const { data: newPayment, error: insertError } = await supabaseClient
      .from('payments')
      .insert({
        user_id: userId,
        plan_id: plan.id,
        amount: originalAmount,
        status: 'pending',
        pix_code: pixData.payload,
        pix_qr_code: pixData.encodedImage,
        expires_at: dueDate.toISOString(),
        next_renewal_date: nextRenewalDate.toISOString(),
        metadata: {
          asaas_payment_id: newAsaasPayment.id,
          asaas_invoice_url: newAsaasPayment.invoiceUrl,
          discount_cancelled: true,
          previous_payment_id: pendingPayment.id,
          cancelled_discount: discountApplied,
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ ERRO PASSO 9:', insertError);
      throw insertError;
    }

    console.log('✅ PASSO 9 CONCLUÍDO: Nova fatura criada no banco');
    console.log('');
    console.log('🎉 PROCESSO COMPLETO!');
    console.log('═══════════════════════════════════════');
    console.log('📋 RESUMO:');
    console.log('   • Fatura antiga cancelada (R$', pendingPayment.amount, ')');
    console.log('   • Nova fatura criada (R$', originalAmount, ')');
    console.log('   • Desconto devolvido: R$', discountApplied);
    console.log('   • ID nova fatura:', newPayment.id);
    console.log('   • Vencimento calculado:', dueDateString);
    console.log('═══════════════════════════════════════');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Desconto de R$ ${discountApplied.toFixed(2)} cancelado. Nova fatura criada com valor integral.`,
        payment: {
          id: newPayment.id,
          amount: originalAmount,
          discount_returned: discountApplied,
          expires_at: dueDate.toISOString(),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error cancelling discount:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});