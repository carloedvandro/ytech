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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { whatsapp } = await req.json();

    if (!whatsapp) {
      return new Response(JSON.stringify({ error: 'WhatsApp não fornecido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Normalizar número
    let normalizedWhatsapp = whatsapp.replace(/\D/g, '');
    if (normalizedWhatsapp.length === 13 && normalizedWhatsapp.startsWith('55')) {
      normalizedWhatsapp = normalizedWhatsapp.substring(2);
    }

    console.log('Registrando WhatsApp para verificação:', normalizedWhatsapp);

    // Verificar se já está cadastrado
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('whatsapp', normalizedWhatsapp)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingProfile) {
      return new Response(JSON.stringify({ 
        error: 'Este WhatsApp já está cadastrado' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verificar bloqueio por fraude
    const { data: fraudCheck } = await supabase
      .from('fraud_attempts')
      .select('*')
      .eq('identifier', normalizedWhatsapp)
      .eq('attempt_type', 'whatsapp')
      .single();

    if (fraudCheck && fraudCheck.blocked_until) {
      const blockedUntil = new Date(fraudCheck.blocked_until);
      if (blockedUntil > new Date()) {
        const hoursLeft = Math.ceil((blockedUntil.getTime() - Date.now()) / (1000 * 60 * 60));
        return new Response(JSON.stringify({ 
          error: `WhatsApp bloqueado. Tente novamente em ${hoursLeft}h` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Limpar verificações antigas
    await supabase
      .from('whatsapp_verifications')
      .delete()
      .eq('whatsapp', normalizedWhatsapp)
      .eq('verified', false);

    // Criar verificação pendente (código vazio - será preenchido quando usuário enviar mensagem)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const { error: insertError } = await supabase
      .from('whatsapp_verifications')
      .insert({
        whatsapp: normalizedWhatsapp,
        code: '',
        expires_at: expiresAt.toISOString(),
        verified: false,
        attempts: 0
      });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Aguardando mensagem do usuário',
      expiresAt: expiresAt.toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erro:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
