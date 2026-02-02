import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { ENV_CONFIG, NOTIFICATION_CONFIG, logEnvironment, sendNotification } from '../_shared/config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ActivationRequest {
  activationType: 'chip' | 'esim';
  barcode?: string;
  imei?: string;
  eid?: string;
  screenshotUrl?: string;
  deviceType?: 'iOS' | 'Android';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logEnvironment();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Criar client admin para notificações
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Usuário não autenticado');
    }

    const { activationType, barcode, imei, eid, screenshotUrl, deviceType }: ActivationRequest = await req.json();

    console.log('📱 Processando ativação:', { activationType, user: user.id });

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('full_name, whatsapp, email')
      .eq('id', user.id)
      .single();

    if (profileError) {
      throw new Error('Erro ao buscar perfil do usuário');
    }

    // Save activation to database
    const { data: activation, error: insertError } = await supabaseClient
      .from('sim_activations')
      .insert({
        user_id: user.id,
        activation_type: activationType,
        barcode: activationType === 'chip' ? barcode : null,
        imei: activationType === 'esim' ? imei : null,
        eid: activationType === 'esim' ? eid : null,
        screenshot_url: screenshotUrl || null,
        device_type: activationType === 'esim' ? deviceType : null,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Erro ao salvar ativação:', insertError);
      throw new Error('Erro ao salvar dados de ativação');
    }

    console.log('✅ Ativação salva:', activation.id);

    // Enviar notificação para admins usando o sistema configurado (email ou whatsapp)
    if (ENV_CONFIG.notifications.enabled) {
      try {
        // Preparar dados para o template
        const notificationData = {
          fullName: profile.full_name,
          whatsapp: profile.whatsapp,
          activationType,
          barcode,
          imei,
          eid,
          deviceType,
          screenshotUrl,
          activationId: activation.id,
          date: new Date().toLocaleString('pt-BR')
        };

        // Notificar admins - o sistema escolhe automaticamente email ou whatsapp
        // Para notificações de admin, usamos messageType específico
        console.log(`📬 Enviando notificação para admins via ${NOTIFICATION_CONFIG.channel.toUpperCase()}`);
        
        // Buscar admins
        const { data: adminRoles } = await supabaseAdmin
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin');
        
        const adminIds = adminRoles?.map(r => r.user_id) || [];
        
        if (adminIds.length > 0) {
          const { data: adminProfiles } = await supabaseAdmin
            .from('profiles')
            .select('email, whatsapp')
            .in('id', adminIds);

          // Enviar notificação para cada admin
          for (const admin of adminProfiles || []) {
            await sendNotification({
              supabase: supabaseAdmin,
              email: admin.email,
              whatsapp: admin.whatsapp,
              messageType: 'chip_activated_by_user', // Reutilizando template similar
              data: notificationData
            });
          }
        }
      } catch (notificationError) {
        console.error('⚠️ Erro ao enviar notificação (não bloqueia ativação):', notificationError);
      }
    } else {
      console.log('📭 Notificações desabilitadas no ambiente');
    }

    return new Response(
      JSON.stringify({
        success: true,
        activation_id: activation.id,
        message: 'Solicitação de ativação enviada com sucesso!',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Erro ao processar ativação:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
