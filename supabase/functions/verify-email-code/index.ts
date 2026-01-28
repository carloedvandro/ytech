import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { email, code, whatsapp } = await req.json();

    if (!email || !code) {
      throw new Error('Email e código são obrigatórios');
    }

    // Usar o mesmo identificador que foi usado no envio
    const identifier = whatsapp || email.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);

    console.log(`🔍 Verificando código para: ${email} (identifier: ${identifier})`);

    // Buscar verificação mais recente e não verificada
    const { data: verification, error: fetchError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('whatsapp', identifier)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('❌ Erro ao buscar verificação:', fetchError);
      throw fetchError;
    }

    if (!verification) {
      console.log('❌ Nenhuma verificação pendente encontrada');
      return new Response(
        JSON.stringify({ 
          success: false,
          verified: false,
          error: 'Nenhum código pendente. Solicite um novo código.'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Verificar expiração
    if (new Date(verification.expires_at) < new Date()) {
      console.log('❌ Código expirado');
      return new Response(
        JSON.stringify({ 
          success: false,
          verified: false,
          error: 'Código expirado. Solicite um novo código.'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Verificar código
    if (verification.code !== code) {
      console.log('❌ Código incorreto');
      return new Response(
        JSON.stringify({ 
          success: false,
          verified: false,
          error: 'Código incorreto. Tente novamente.'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Marcar como verificado
    const { error: updateError } = await supabase
      .from('verification_codes')
      .update({ 
        verified: true,
        verified_at: new Date().toISOString()
      })
      .eq('id', verification.id);

    if (updateError) {
      console.error('❌ Erro ao atualizar verificação:', updateError);
      throw updateError;
    }

    console.log('✅ Código verificado com sucesso!');

    return new Response(
      JSON.stringify({ 
        success: true,
        verified: true,
        message: 'Email verificado com sucesso!'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Erro ao verificar código:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        verified: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
