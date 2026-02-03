import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Esta função retorna o canal de notificação configurado no banco
// É chamada pelas outras Edge Functions para decidir se enviam via Email ou WhatsApp
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('system_settings')
      .select('notification_channel')
      .eq('id', 'main')
      .single();

    if (error) {
      console.error('Erro ao buscar configuração:', error);
      // Fallback para email se houver erro
      return new Response(JSON.stringify({ 
        channel: 'email',
        isWhatsApp: false,
        isEmail: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const channel = data?.notification_channel || 'email';

    return new Response(JSON.stringify({
      channel,
      isWhatsApp: channel === 'whatsapp',
      isEmail: channel === 'email'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erro:', error);
    // Fallback para email
    return new Response(JSON.stringify({ 
      channel: 'email',
      isWhatsApp: false,
      isEmail: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
