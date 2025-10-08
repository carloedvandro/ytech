import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200 
    });
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
      throw new Error('Apenas administradores podem corrigir status de comissões');
    }

    const { userId } = await req.json();

    console.log('Corrigindo status de comissões para usuário:', userId);

    // Restaurar comissões marcadas incorretamente como withdrawn
    const { data: updatedCommissions, error: updateError } = await supabase
      .from('commissions')
      .update({ 
        status: 'available',
        withdrawn_at: null 
      })
      .eq('user_id', userId)
      .eq('status', 'withdrawn')
      .select();

    if (updateError) {
      console.error('Erro ao atualizar comissões:', updateError);
      throw new Error('Erro ao atualizar comissões');
    }

    console.log(`${updatedCommissions?.length || 0} comissões corrigidas`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${updatedCommissions?.length || 0} comissões restauradas para status disponível`,
        updated: updatedCommissions
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
