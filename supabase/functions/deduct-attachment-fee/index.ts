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

    const ATTACHMENT_FEE = 3.00;

    console.log('💰 Verificando saldo para desconto de anexo extra:', { userId: user.id, fee: ATTACHMENT_FEE });

    // Buscar saldo atual (comissões disponíveis - descontos já aplicados)
    const { data: commissionsData } = await supabase
      .from('commissions')
      .select('amount, status, id, created_at')
      .eq('user_id', user.id)
      .eq('status', 'available')
      .order('created_at', { ascending: true });

    const commissionsTotal = commissionsData
      ?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;

    // Buscar descontos já aplicados
    const { data: adjustmentsData } = await supabase
      .from('admin_balance_adjustments')
      .select('amount, type')
      .eq('user_id', user.id);

    const deductionsTotal = adjustmentsData
      ?.filter(a => a.type === 'remove')
      .reduce((sum, a) => sum + Number(a.amount), 0) || 0;

    const currentBalance = commissionsTotal - deductionsTotal;

    console.log('📊 Saldo atual:', {
      commissionsTotal,
      deductionsTotal,
      currentBalance
    });

    // Verificar se tem saldo suficiente
    if (currentBalance < ATTACHMENT_FEE) {
      console.log('❌ Saldo insuficiente');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'insufficient_balance',
          message: 'Saldo insuficiente para enviar anexo extra',
          current_balance: currentBalance,
          required: ATTACHMENT_FEE
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const balanceAfter = currentBalance - ATTACHMENT_FEE;

    // Registrar o desconto
    const { error: adjustmentError } = await supabase
      .from('admin_balance_adjustments')
      .insert({
        user_id: user.id,
        admin_id: user.id, // Sistema auto-desconta
        amount: ATTACHMENT_FEE,
        type: 'remove',
        reason: 'Desconto automático: anexo extra de eSIM',
        balance_before: currentBalance,
        balance_after: balanceAfter,
      });

    if (adjustmentError) {
      console.error('❌ Erro ao registrar ajuste:', adjustmentError);
      throw new Error('Erro ao registrar desconto');
    }

    console.log('✅ Desconto registrado em admin_balance_adjustments');
    console.log('✅ Desconto de anexo processado com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Desconto processado com sucesso',
        amount_deducted: ATTACHMENT_FEE,
        balance_before: currentBalance,
        balance_after: balanceAfter
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
