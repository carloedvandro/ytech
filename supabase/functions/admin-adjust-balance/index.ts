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
      throw new Error('Apenas administradores podem ajustar saldos');
    }

    const { userId, amount, type, reason } = await req.json();

    console.log('Ajustando saldo:', { userId, amount, type, reason });

    // Buscar saldo atual (comissões + adições - descontos)
    const { data: commissionsData } = await supabase
      .from('commissions')
      .select('amount, status')
      .eq('user_id', userId);

    const commissionsTotal = commissionsData
      ?.filter(c => c.status === 'available')
      .reduce((sum, c) => sum + Number(c.amount), 0) || 0;

    // Buscar ajustes
    const { data: adjustmentsData } = await supabase
      .from('admin_balance_adjustments')
      .select('amount, type')
      .eq('user_id', userId);

    const additionsTotal = adjustmentsData
      ?.filter(a => a.type === 'add')
      .reduce((sum, a) => sum + Number(a.amount), 0) || 0;

    const deductionsTotal = adjustmentsData
      ?.filter(a => a.type === 'remove')
      .reduce((sum, a) => sum + Number(a.amount), 0) || 0;

    const balanceBefore = commissionsTotal + additionsTotal - deductionsTotal;

    const balanceAfter = type === 'add' 
      ? balanceBefore + amount 
      : balanceBefore - amount;

    if (type === 'remove' && balanceAfter < 0) {
      throw new Error('Saldo insuficiente para remoção');
    }

    // Registrar ajuste
    const { error: adjustmentError } = await supabase
      .from('admin_balance_adjustments')
      .insert({
        user_id: userId,
        admin_id: user.id,
        amount,
        type,
        reason,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
      });

    if (adjustmentError) {
      console.error('Erro ao registrar ajuste:', adjustmentError);
      throw new Error('Erro ao registrar ajuste');
    }

    console.log('Ajuste registrado com sucesso');

    // Ajustes manuais NUNCA geram comissões
    // Comissões devem ser geradas apenas por:
    // 1. Pagamentos reais de mensalidade (webhook Asaas)
    // 2. Ativações manuais de usuários (admin-activate-user)
    
    if (type === 'add') {
      console.log('Saldo adicionado com sucesso (ajuste manual - sem comissões)');
    }
    
    if (type === 'remove') {
      console.log('Saldo removido com sucesso (ajuste manual)');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Saldo ajustado com sucesso',
        balance_after: balanceAfter
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
