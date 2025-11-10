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
    console.log('[DAILY-RENEWAL-CHECK] Starting daily renewal check...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar todos os usuários ativos
    const { data: activeProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, cpf, whatsapp')
      .eq('status', 'active')
      .is('deleted_at', null);

    if (profilesError) {
      console.error('[DAILY-RENEWAL-CHECK] Error fetching profiles:', profilesError);
      throw profilesError;
    }

    console.log(`[DAILY-RENEWAL-CHECK] Found ${activeProfiles?.length || 0} active users`);

    let createdCount = 0;
    let errorCount = 0;

    // Para cada usuário ativo, verificar se precisa criar fatura
    for (const profile of activeProfiles || []) {
      try {
        console.log(`[DAILY-RENEWAL-CHECK] Checking user ${profile.id}...`);

        // Verificar se já tem pagamento pendente
        const { data: pendingPayments, error: pendingError } = await supabase
          .from('payments')
          .select('id, subscription_id')
          .eq('user_id', profile.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1);

        if (pendingError) {
          console.error(`[DAILY-RENEWAL-CHECK] Error checking pending payments for user ${profile.id}:`, pendingError);
          errorCount++;
          continue;
        }

        if (pendingPayments && pendingPayments.length > 0) {
          console.log(`[DAILY-RENEWAL-CHECK] User ${profile.id} already has pending payment, skipping...`);
          continue;
        }

        // Buscar último pagamento confirmado para determinar o plano
        const { data: lastPayment, error: lastPaymentError } = await supabase
          .from('payments')
          .select('plan_id, amount')
          .eq('user_id', profile.id)
          .eq('status', 'confirmed')
          .order('paid_at', { ascending: false })
          .limit(1)
          .single();

        if (lastPaymentError || !lastPayment) {
          console.log(`[DAILY-RENEWAL-CHECK] No confirmed payment found for user ${profile.id}, skipping...`);
          continue;
        }

        // Criar ou buscar cliente no Asaas
        const customersResponse = await fetch(
          `https://api.asaas.com/v3/customers?cpfCnpj=${profile.cpf}`,
          {
            headers: {
              'access_token': asaasApiKey,
              'Content-Type': 'application/json',
            },
          }
        );

        let customerId: string;
        const customersData = await customersResponse.json();

        if (customersData.data && customersData.data.length > 0) {
          customerId = customersData.data[0].id;
          console.log(`[DAILY-RENEWAL-CHECK] Found existing customer ${customerId}`);
        } else {
          const createCustomerResponse = await fetch('https://api.asaas.com/v3/customers', {
            method: 'POST',
            headers: {
              'access_token': asaasApiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: profile.full_name,
              cpfCnpj: profile.cpf,
              mobilePhone: profile.whatsapp,
            }),
          });

          const newCustomer = await createCustomerResponse.json();
          customerId = newCustomer.id;
          console.log(`[DAILY-RENEWAL-CHECK] Created new customer ${customerId}`);
        }

        // Criar pagamento PIX no Asaas
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 1);

        const paymentResponse = await fetch('https://api.asaas.com/v3/payments', {
          method: 'POST',
          headers: {
            'access_token': asaasApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customer: customerId,
            billingType: 'PIX',
            value: Number(lastPayment.amount),
            dueDate: dueDate.toISOString().split('T')[0],
            description: 'Renovação de Plano',
          }),
        });

        const paymentData = await paymentResponse.json();

        if (!paymentResponse.ok) {
          console.error(`[DAILY-RENEWAL-CHECK] Error creating payment for user ${profile.id}:`, paymentData);
          errorCount++;
          continue;
        }

        // Buscar QR Code PIX
        const pixResponse = await fetch(
          `https://api.asaas.com/v3/payments/${paymentData.id}/pixQrCode`,
          {
            headers: {
              'access_token': asaasApiKey,
            },
          }
        );

        const pixData = await pixResponse.json();

        // Inserir pagamento no banco
        const { error: insertError } = await supabase
          .from('payments')
          .insert({
            user_id: profile.id,
            plan_id: lastPayment.plan_id,
            amount: lastPayment.amount,
            status: 'pending',
            subscription_id: paymentData.id,
            pix_code: pixData.payload,
            pix_qr_code: pixData.encodedImage,
            expires_at: new Date(paymentData.dueDate).toISOString(),
          });

        if (insertError) {
          console.error(`[DAILY-RENEWAL-CHECK] Error inserting payment for user ${profile.id}:`, insertError);
          errorCount++;
          continue;
        }

        console.log(`[DAILY-RENEWAL-CHECK] Successfully created payment for user ${profile.id}`);
        createdCount++;

        // Enviar notificação WhatsApp
        try {
          await supabase.functions.invoke('send-whatsapp-notification', {
            body: {
              whatsapp: profile.whatsapp,
              type: 'renewal_invoice_created',
              data: {
                amount: lastPayment.amount,
                dueDate: dueDate.toLocaleDateString('pt-BR'),
              },
            },
          });
        } catch (notificationError) {
          console.error(`[DAILY-RENEWAL-CHECK] Error sending WhatsApp notification for user ${profile.id}:`, notificationError);
        }

      } catch (userError) {
        console.error(`[DAILY-RENEWAL-CHECK] Error processing user ${profile.id}:`, userError);
        errorCount++;
      }
    }

    console.log(`[DAILY-RENEWAL-CHECK] Completed. Created: ${createdCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        created: createdCount,
        errors: errorCount,
        total: activeProfiles?.length || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[DAILY-RENEWAL-CHECK] Fatal error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
