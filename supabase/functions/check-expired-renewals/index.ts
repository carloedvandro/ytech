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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔍 Verificando usuários com renovação vencida...');

    // Buscar todos os usuários ativos
    const { data: activeUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name, email, whatsapp, status')
      .eq('status', 'active')
      .is('deleted_at', null);

    if (usersError) throw usersError;

    if (!activeUsers || activeUsers.length === 0) {
      console.log('ℹ️ Nenhum usuário ativo encontrado.');
      return new Response(JSON.stringify({ success: true, suspended: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    let suspendedCount = 0;
    const suspendedUsers: string[] = [];

    for (const user of activeUsers) {
      // Buscar o pagamento mais recente com next_renewal_date
      const { data: payment } = await supabase
        .from('payments')
        .select('next_renewal_date')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .not('next_renewal_date', 'is', null)
        .order('next_renewal_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!payment?.next_renewal_date) continue;

      const renewalDate = new Date(payment.next_renewal_date);

      // Se a data de renovação já passou, suspender o usuário
      if (renewalDate < now) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ status: 'suspended' })
          .eq('id', user.id);

        if (updateError) {
          console.error(`❌ Erro ao suspender ${user.full_name}:`, updateError);
          continue;
        }

        console.log(`⚠️ Usuário suspenso: ${user.full_name} (vencimento: ${renewalDate.toISOString().split('T')[0]})`);
        suspendedUsers.push(`${user.full_name} (${renewalDate.toISOString().split('T')[0]})`);
        suspendedCount++;
      }
    }

    console.log(`✅ Verificação concluída. ${suspendedCount} usuário(s) suspenso(s).`);

    return new Response(
      JSON.stringify({
        success: true,
        suspended: suspendedCount,
        suspendedUsers,
        totalChecked: activeUsers.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Erro na verificação:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
