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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar se é admin
    const { data: isAdmin } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin',
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Acesso negado. Apenas administradores.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, userId, reason } = await req.json();

    console.log(`Admin ${user.id} executing ${action} on user ${userId}`);

    // Buscar dados do usuário alvo
    const { data: targetUser, error: userError } = await supabaseClient
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !targetUser) {
      return new Response(JSON.stringify({ error: 'Usuário não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let result;

    switch (action) {
      case 'suspend':
        // Suspender usuário (reversível)
        result = await supabaseClient
          .from('users')
          .update({ status: 'suspended' })
          .eq('id', userId);

        await supabaseClient.from('user_deletion_logs').insert({
          deleted_user_id: userId,
          deleted_by_admin_id: user.id,
          action_type: 'suspend',
          reason: reason || 'Suspensão administrativa',
          deleted_data: { previous_status: targetUser.status },
        });

        console.log(`User ${userId} suspended by admin ${user.id}`);
        break;

      case 'reactivate':
        // Reativar usuário suspenso
        result = await supabaseClient
          .from('users')
          .update({ 
            status: 'active',
            deleted_at: null 
          })
          .eq('id', userId);

        await supabaseClient.from('user_deletion_logs').insert({
          deleted_user_id: userId,
          deleted_by_admin_id: user.id,
          action_type: 'reactivate',
          reason: reason || 'Reativação administrativa',
          deleted_data: { previous_status: targetUser.status },
        });

        console.log(`User ${userId} reactivated by admin ${user.id}`);
        break;

      case 'soft_delete':
        // Exclusão lógica (reversível)
        result = await supabaseClient
          .from('users')
          .update({ 
            status: 'deleted',
            deleted_at: new Date().toISOString()
          })
          .eq('id', userId);

        await supabaseClient.from('user_deletion_logs').insert({
          deleted_user_id: userId,
          deleted_by_admin_id: user.id,
          action_type: 'soft_delete',
          reason: reason || 'Exclusão lógica administrativa',
          deleted_data: targetUser,
        });

        console.log(`User ${userId} soft deleted by admin ${user.id}`);
        break;

      case 'hard_delete':
        // Verificar se o usuário tem indicados
        const { data: referrals } = await supabaseClient
          .from('user_network')
          .select('id')
          .eq('parent_id', userId);

        if (referrals && referrals.length > 0) {
          return new Response(
            JSON.stringify({ 
              error: 'Não é possível deletar usuário com indicados na rede. Suspenda ou faça exclusão lógica.' 
            }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        // Verificar se é o último admin
        const { data: adminCount } = await supabaseClient
          .from('user_roles')
          .select('id')
          .eq('role', 'admin');

        const { data: targetIsAdmin } = await supabaseClient
          .from('user_roles')
          .select('id')
          .eq('user_id', userId)
          .eq('role', 'admin')
          .single();

        if (targetIsAdmin && adminCount && adminCount.length === 1) {
          return new Response(
            JSON.stringify({ error: 'Não é possível deletar o último administrador do sistema.' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        // Salvar log antes de deletar
        await supabaseClient.from('user_deletion_logs').insert({
          deleted_user_id: userId,
          deleted_by_admin_id: user.id,
          action_type: 'hard_delete',
          reason: reason || 'Exclusão permanente administrativa',
          deleted_data: targetUser,
        });

        // Deletar em ordem
        await supabaseClient.from('whatsapp_messages').delete().eq('user_id', userId);
        await supabaseClient.from('whatsapp_verifications').delete().eq('whatsapp', targetUser.whatsapp);
        await supabaseClient.from('commissions').delete().eq('referred_user_id', userId);
        await supabaseClient.from('transactions').delete().eq('user_id', userId);
        await supabaseClient.from('payments').delete().eq('user_id', userId);
        await supabaseClient.from('user_network').delete().eq('user_id', userId);
        result = await supabaseClient.from('users').delete().eq('id', userId);

        console.log(`User ${userId} hard deleted by admin ${user.id}`);
        break;

      default:
        return new Response(JSON.stringify({ error: 'Ação inválida' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    if (result.error) {
      console.error('Error executing action:', result.error);
      return new Response(JSON.stringify({ error: result.error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: `Ação ${action} executada com sucesso` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in admin-manage-user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});