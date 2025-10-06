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

    const { userId, reason } = await req.json();

    if (!userId) {
      throw new Error('Missing required field: userId');
    }

    // Buscar usuário deletado (soft delete)
    const { data: targetUser, error: userError } = await supabaseClient
      .from('users')
      .select('*')
      .eq('id', userId)
      .not('deleted_at', 'is', null)
      .single();

    if (userError || !targetUser) {
      throw new Error('Soft deleted user not found');
    }

    // Restaurar usuário
    const originalStatus = targetUser.metadata?.original_status || 'active';
    
    const { error } = await supabaseClient
      .from('users')
      .update({ 
        status: originalStatus,
        deleted_at: null 
      })
      .eq('id', userId);

    if (error) throw error;

    // Log da ação
    await supabaseClient.from('user_deletion_logs').insert({
      deleted_user_id: userId,
      deleted_by_admin_id: user.id,
      action_type: 'reactivate',
      reason: reason || 'User restored from soft delete',
      deleted_data: { previous_status: targetUser.status, restored: true }
    });

    console.log(`Admin ${user.id} restored user ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User restored successfully',
        user: {
          id: userId,
          status: originalStatus
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

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
