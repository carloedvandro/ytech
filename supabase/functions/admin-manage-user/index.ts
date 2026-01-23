import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    // Verificar se o usuário é admin
    const { data: isAdmin } = await supabaseClient
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    if (!isAdmin) {
      throw new Error('Unauthorized: Admin role required');
    }

    const { action, userId, reason } = await req.json();

    if (!action || !userId) {
      throw new Error('Missing required fields: action, userId');
    }

    // Buscar dados do usuário alvo
    const { data: targetUser, error: userError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !targetUser) {
      throw new Error('User not found');
    }

    let result;

    switch (action) {
      case 'suspend': {
        // Suspender usuário
        const { error } = await supabaseClient
          .from('profiles')
          .update({ status: 'suspended' })
          .eq('id', userId);

        if (error) throw error;

        // Log da ação
        await supabaseClient.from('user_deletion_logs').insert({
          deleted_user_id: userId,
          deleted_by_admin_id: user.id,
          action_type: 'suspend',
          reason: reason || null,
          deleted_data: { previous_status: targetUser.status }
        });

        result = { success: true, message: 'User suspended successfully' };
        break;
      }

      case 'reactivate': {
        // Reativar usuário
        const newStatus = targetUser.metadata?.original_status || 'active';
        
        const { error } = await supabaseClient
          .from('profiles')
          .update({ 
            status: newStatus,
            deleted_at: null 
          })
          .eq('id', userId);

        if (error) throw error;

        // Log da ação
        await supabaseClient.from('user_deletion_logs').insert({
          deleted_user_id: userId,
          deleted_by_admin_id: user.id,
          action_type: 'reactivate',
          reason: reason || null,
          deleted_data: { previous_status: targetUser.status }
        });

        result = { success: true, message: 'User reactivated successfully' };
        break;
      }

      case 'soft_delete': {
        // Soft delete (exclusão lógica)
        const { error } = await supabaseClient
          .from('profiles')
          .update({ 
            status: 'deleted',
            deleted_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (error) throw error;

        // Log da ação
        await supabaseClient.from('user_deletion_logs').insert({
          deleted_user_id: userId,
          deleted_by_admin_id: user.id,
          action_type: 'soft_delete',
          reason: reason || null,
          deleted_data: targetUser
        });

        result = { success: true, message: 'User soft deleted successfully' };
        break;
      }

      case 'hard_delete': {
        // Verificar se o usuário tem indicados diretos
        const { data: referrals, error: refError } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('referred_by', userId)
          .is('deleted_at', null);

        if (refError) throw refError;

        if (referrals && referrals.length > 0) {
          throw new Error('Cannot delete user with direct referrals');
        }

        // Verificar se não é o último admin
        const { data: userRoles } = await supabaseClient
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);

        if (userRoles?.some((r: any) => r.role === 'admin')) {
          const { count } = await supabaseClient
            .from('user_roles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'admin');

          if (count && count <= 1) {
            throw new Error('Cannot delete the last admin');
          }
        }

        // Log antes de deletar
        await supabaseClient.from('user_deletion_logs').insert({
          deleted_user_id: userId,
          deleted_by_admin_id: user.id,
          action_type: 'hard_delete',
          reason: reason || null,
          deleted_data: targetUser
        });

        // Deletar em ordem (cascade vai lidar com algumas coisas)
        await supabaseClient.from('whatsapp_messages').delete().eq('user_id', userId);
        await supabaseClient.from('whatsapp_verifications').delete().eq('whatsapp', targetUser.whatsapp);
        await supabaseClient.from('commissions').delete().eq('referred_user_id', userId);
        await supabaseClient.from('commissions').delete().eq('user_id', userId);
        await supabaseClient.from('transactions').delete().eq('user_id', userId);
        await supabaseClient.from('payments').delete().eq('user_id', userId);
        await supabaseClient.from('user_network').delete().eq('user_id', userId);
        await supabaseClient.from('user_roles').delete().eq('user_id', userId);
        await supabaseClient.from('marketing_material_generations').delete().eq('user_id', userId);
        await supabaseClient.from('admin_balance_adjustments').delete().eq('user_id', userId);
        await supabaseClient.from('sim_activations').delete().eq('user_id', userId);
        
        const { error: deleteError } = await supabaseClient
          .from('profiles')
          .delete()
          .eq('id', userId);

        if (deleteError) throw deleteError;

        // IMPORTANTE: Deletar também do auth.users para permitir novo cadastro com mesmo email
        const { error: authDeleteError } = await supabaseClient.auth.admin.deleteUser(userId);
        
        if (authDeleteError) {
          console.error('Erro ao deletar do auth.users:', authDeleteError);
          // Não lançar erro aqui pois o profile já foi deletado
          // Mas logar para investigação
        }

        result = { success: true, message: 'User permanently deleted' };
        break;
      }

      default:
        throw new Error('Invalid action');
    }

    console.log(`Admin ${user.id} performed ${action} on user ${userId}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error:', error);
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
