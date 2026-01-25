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

    // SEGURANÇA: Credenciais devem estar nos secrets do Supabase
    const megaApiHost = Deno.env.get('MEGA_API_HOST');
    const megaInstanceKey = Deno.env.get('MEGA_INSTANCE_KEY');
    const megaToken = Deno.env.get('MEGA_API_KEY');

    if (!megaApiHost || !megaInstanceKey || !megaToken) {
      throw new Error('Credenciais Mega API não configuradas. Configure os secrets: MEGA_API_HOST, MEGA_INSTANCE_KEY, MEGA_API_KEY');
    }

    const { whatsapp, checkDuplicate = false } = await req.json();

    if (!whatsapp) {
      return new Response(JSON.stringify({ 
        error: 'WhatsApp não fornecido' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verificar se o WhatsApp já está cadastrado (APENAS NO SIGNUP)
    if (checkDuplicate) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('whatsapp', whatsapp)
        .is('deleted_at', null)
        .maybeSingle();

      if (existingProfile) {
        return new Response(JSON.stringify({ 
          error: 'Este número de WhatsApp já está cadastrado. Use outro número.' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('whatsapp', whatsapp)
        .is('deleted_at', null)
        .maybeSingle();

      if (existingUser) {
        return new Response(JSON.stringify({ 
          error: 'Este número de WhatsApp já está cadastrado. Use outro número.' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Verificar se há tentativas de fraude bloqueadas
    const { data: fraudCheck } = await supabase
      .from('fraud_attempts')
      .select('*')
      .eq('identifier', whatsapp)
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

    // DDDs que NÃO usam o nono dígito (regiões do Norte do Brasil)
    // Amazonas: 92, 97 | Roraima: 95 | Amapá: 96 | Acre: 68
    // Esses DDDs mantêm números com 8 dígitos
    const dddsWithout9thDigit = ['92', '97', '95', '96', '68'];

    // Normalizar número ANTES de qualquer operação
    let cleanNumber = whatsapp.replace(/\D/g, '');
    
    console.log(`📞 Número original: ${whatsapp}, após limpeza: ${cleanNumber} (${cleanNumber.length} dígitos)`);
    
    // Normalizar para formato padrão
    let normalizedWhatsapp = cleanNumber;
    
    if (cleanNumber.length === 13 && cleanNumber.startsWith('55')) {
      // 55 + DDD (2) + número (9) -> remover 55 para salvar
      normalizedWhatsapp = cleanNumber.substring(2);
      console.log(`✅ Removido 55 para normalização: ${normalizedWhatsapp}`);
    } else if (cleanNumber.length === 12 && cleanNumber.startsWith('55')) {
      // 55 + DDD (2) + número antigo (8) -> remover 55
      normalizedWhatsapp = cleanNumber.substring(2);
      console.log(`⚠️ Número antigo, removido 55: ${normalizedWhatsapp}`);
    } else if (cleanNumber.length === 11) {
      // Já está no formato correto: DDD (2) + número (9)
      normalizedWhatsapp = cleanNumber;
      console.log(`✅ Número já normalizado: ${normalizedWhatsapp}`);
    } else if (cleanNumber.length === 10) {
      // Número com 10 dígitos - verificar se DDD exige nono dígito ou não
      const ddd = cleanNumber.substring(0, 2);
      
      if (dddsWithout9thDigit.includes(ddd)) {
        // DDDs do Norte: NÃO adicionar o nono dígito
        normalizedWhatsapp = cleanNumber;
        console.log(`📱 DDD ${ddd} não usa nono dígito, mantendo: ${normalizedWhatsapp}`);
      } else {
        // Demais DDDs: adicionar o nono dígito (9)
        const numberPart = cleanNumber.substring(2);
        normalizedWhatsapp = ddd + '9' + numberPart;
        console.log(`📱 Número antigo corrigido: ${cleanNumber} -> ${normalizedWhatsapp} (adicionado nono dígito)`);
      }
    } else {
      console.log(`⚠️ Formato inesperado: ${cleanNumber} (${cleanNumber.length} dígitos)`);
      normalizedWhatsapp = cleanNumber;
    }

    // Gerar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    // Salvar código no banco com número NORMALIZADO (sem 55)
    const { error: insertError } = await supabase
      .from('whatsapp_verifications')
      .insert({
        whatsapp: normalizedWhatsapp,
        code,
        expires_at: expiresAt.toISOString(),
        verified: false,
        attempts: 0
      });

    if (insertError) {
      console.error('Erro ao salvar verificação:', insertError);
      throw insertError;
    }

    // Formatar número para o Mega API - adicionar 55 para envio
    let formattedNumber = normalizedWhatsapp;
    if (formattedNumber.length === 11 || formattedNumber.length === 10) {
      formattedNumber = '55' + formattedNumber;
    }
    
    console.log(`📱 Número para envio Mega API: ${formattedNumber}`);

    // Mensagem formatada
    const message = `🔐 *Y-TECH Internet 5G*\n\nSeu código de verificação:\n\n*${code}*\n\nVálido por 10 minutos.\n\n_Não compartilhe este código._`;

    console.log(`📱 Enviando código ${code} para ${formattedNumber}`);

    // Enviar via Mega API (endpoint correto)
    const megaUrl = `https://${megaApiHost}/rest/sendMessage/${megaInstanceKey}/text`;
    console.log('Mega API URL:', megaUrl);

    const megaResponse = await fetch(megaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${megaToken}`
      },
      body: JSON.stringify({
        messageData: {
          to: formattedNumber,
          text: message
        }
      })
    });

    const megaData = await megaResponse.json();
    console.log('Resposta Mega API:', JSON.stringify(megaData, null, 2));

    // Verificar erro HTTP ou erro na resposta
    if (!megaResponse.ok || megaData.error === true) {
      console.error('❌ Erro do Mega API:', megaData);
      
      // Salvar mensagem como falha
      await supabase
        .from('whatsapp_messages')
        .insert({
          whatsapp: formattedNumber,
          message_type: 'verification_code',
          message_content: message,
          status: 'failed',
          mega_message_id: null,
          metadata: { 
            code, 
            expiresAt: expiresAt.toISOString(),
            error: megaData.message || megaData.error || 'Erro desconhecido'
          }
        });
      
      throw new Error(`Erro ao enviar mensagem: ${megaData.message || megaData.error || 'Erro desconhecido'}`);
    }

    // Extrair message ID corretamente (pode estar em messageData.key.id ou key.id)
    const messageId = megaData.messageData?.key?.id || megaData.key?.id || null;
    console.log('✅ Mensagem enviada com sucesso. ID:', messageId);

    // Salvar mensagem enviada
    await supabase
      .from('whatsapp_messages')
      .insert({
        whatsapp: formattedNumber,
        message_type: 'verification_code',
        message_content: message,
        status: 'sent',
        mega_message_id: messageId,
        metadata: { code, expiresAt: expiresAt.toISOString() }
      });

    return new Response(JSON.stringify({ 
      success: true,
      expiresAt: expiresAt.toISOString(),
      message: 'Código enviado com sucesso'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});