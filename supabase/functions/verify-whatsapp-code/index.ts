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

    const { whatsapp, code } = await req.json();

    if (!whatsapp || !code) {
      throw new Error('WhatsApp e código são obrigatórios');
    }

    // Normalizar número para busca (remover 55 se tiver)
    let cleanNumber = whatsapp.replace(/\D/g, '');
    let normalizedWhatsapp = cleanNumber;
    
    if (cleanNumber.length === 13 && cleanNumber.startsWith('55')) {
      normalizedWhatsapp = cleanNumber.substring(2);
    } else if (cleanNumber.length === 12 && cleanNumber.startsWith('55')) {
      normalizedWhatsapp = cleanNumber.substring(2);
    }
    
    console.log(`🔍 Buscando verificação para: ${normalizedWhatsapp} (original: ${whatsapp})`);

    // Buscar verificação mais recente e não verificada
    const { data: verification, error: fetchError } = await supabase
      .from('whatsapp_verifications')
      .select('*')
      .eq('whatsapp', normalizedWhatsapp)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !verification) {
      throw new Error('Código não encontrado ou já utilizado');
    }

    // Verificar se expirou
    const expiresAt = new Date(verification.expires_at);
    if (expiresAt < new Date()) {
      throw new Error('Código expirado. Solicite um novo código.');
    }

    // Verificar tentativas
    if (verification.attempts >= 5) {
      // Bloquear por 24 horas
      const blockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      await supabase
        .from('fraud_attempts')
        .upsert({
          identifier: whatsapp,
          attempt_type: 'whatsapp',
          attempts: 5,
          blocked_until: blockedUntil.toISOString(),
          last_attempt: new Date().toISOString()
        }, {
          onConflict: 'identifier,attempt_type'
        });

      throw new Error('Número de tentativas excedido. Bloqueado por 24 horas.');
    }

    // Verificar código
    if (verification.code !== code) {
      // Incrementar tentativas
      await supabase
        .from('whatsapp_verifications')
        .update({ attempts: verification.attempts + 1 })
        .eq('id', verification.id);

      const remainingAttempts = 5 - (verification.attempts + 1);
      throw new Error(`Código incorreto. ${remainingAttempts} tentativas restantes.`);
    }

    // Código correto! Marcar como verificado
    await supabase
      .from('whatsapp_verifications')
      .update({ 
        verified: true,
        verified_at: new Date().toISOString()
      })
      .eq('id', verification.id);

    console.log(`✅ WhatsApp ${whatsapp} verificado com sucesso`);

    return new Response(JSON.stringify({ 
      success: true,
      verified: true,
      message: 'WhatsApp verificado com sucesso!'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      verified: false
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});