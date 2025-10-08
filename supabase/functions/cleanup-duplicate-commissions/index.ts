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
      throw new Error('Apenas administradores podem executar limpeza');
    }

    console.log('🧹 Iniciando limpeza de comissões duplicadas...');

    // Deletar comissões criadas por ajustes de admin (payment_id começa com 'admin_adjustment_')
    const { data: deletedComms, error: deleteError } = await supabase
      .from('commissions')
      .delete()
      .like('payment_id', 'admin_adjustment_%')
      .select();

    if (deleteError) {
      console.error('Erro ao deletar comissões:', deleteError);
      throw new Error('Erro ao limpar comissões duplicadas');
    }

    console.log(`✅ ${deletedComms?.length || 0} comissões duplicadas removidas`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${deletedComms?.length || 0} comissões duplicadas removidas`,
        deleted: deletedComms
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
