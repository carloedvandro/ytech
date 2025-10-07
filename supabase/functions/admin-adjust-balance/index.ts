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

    // Buscar saldo atual
    const { data: commissionsData } = await supabase
      .from('commissions')
      .select('amount, status')
      .eq('user_id', userId);

    const balanceBefore = commissionsData
      ?.filter(c => c.status === 'available')
      .reduce((sum, c) => sum + Number(c.amount), 0) || 0;

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

    // Se for adicionar saldo, criar uma comissão fictícia
    if (type === 'add') {
      const { error: commError } = await supabase
        .from('commissions')
        .insert({
          user_id: userId,
          referred_user_id: userId,
          payment_id: `admin_adjustment_${Date.now()}`,
          amount,
          level: 0,
          status: 'available',
          released_at: new Date().toISOString(),
        });

      if (commError) {
        console.error('Erro ao criar comissão:', commError);
        throw new Error('Erro ao adicionar saldo');
      }

      console.log('Saldo adicionado com sucesso');
    }

    // Se for remover, atualizar comissões disponíveis
    if (type === 'remove') {
      // Buscar comissões disponíveis ordenadas por data
      const { data: availableComms, error: fetchError } = await supabase
        .from('commissions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'available')
        .order('created_at', { ascending: true });

      if (fetchError) {
        console.error('Erro ao buscar comissões:', fetchError);
        throw new Error('Erro ao buscar comissões');
      }

      let remaining = amount;
      for (const comm of availableComms || []) {
        if (remaining <= 0) break;

        const commAmount = Number(comm.amount);
        if (commAmount <= remaining) {
          // Marcar como retirada
          await supabase
            .from('commissions')
            .update({ 
              status: 'withdrawn',
              withdrawn_at: new Date().toISOString() 
            })
            .eq('id', comm.id);
          remaining -= commAmount;
        }
      }

      console.log('Saldo removido com sucesso');
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
