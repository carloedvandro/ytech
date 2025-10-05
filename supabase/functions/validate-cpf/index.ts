import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para validar dígitos verificadores do CPF
function validateCPF(cpf: string): boolean {
  // Remove formatação
  cpf = cpf.replace(/\D/g, '');

  // Verifica se tem 11 dígitos
  if (cpf.length !== 11) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  // Valida primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cpf.charAt(9))) return false;

  // Valida segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cpf.charAt(10))) return false;

  return true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { cpf } = await req.json();

    if (!cpf) {
      throw new Error('CPF não fornecido');
    }

    // Remove formatação
    const cleanCPF = cpf.replace(/\D/g, '');

    // Verificar tentativas de fraude
    const { data: fraudCheck } = await supabase
      .from('fraud_attempts')
      .select('*')
      .eq('identifier', cleanCPF)
      .eq('attempt_type', 'cpf')
      .single();

    if (fraudCheck && fraudCheck.blocked_until) {
      const blockedUntil = new Date(fraudCheck.blocked_until);
      if (blockedUntil > new Date()) {
        const hoursLeft = Math.ceil((blockedUntil.getTime() - Date.now()) / (1000 * 60 * 60));
        throw new Error(`CPF bloqueado. Tente novamente em ${hoursLeft}h`);
      }
    }

    // Validar formato e dígitos verificadores
    if (!validateCPF(cleanCPF)) {
      // Incrementar tentativas
      const newAttempts = (fraudCheck?.attempts || 0) + 1;
      const isBlocked = newAttempts >= 3;

      await supabase
        .from('fraud_attempts')
        .upsert({
          identifier: cleanCPF,
          attempt_type: 'cpf',
          attempts: newAttempts,
          blocked_until: isBlocked ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
          last_attempt: new Date().toISOString()
        }, {
          onConflict: 'identifier,attempt_type'
        });

      if (isBlocked) {
        throw new Error('CPF inválido. Número de tentativas excedido. Bloqueado por 24 horas.');
      }

      const remainingAttempts = 3 - newAttempts;
      throw new Error(`CPF inválido. ${remainingAttempts} tentativas restantes.`);
    }

    // Verificar se CPF já existe no banco
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('cpf', cleanCPF)
      .single();

    if (existingUser) {
      throw new Error('CPF já cadastrado no sistema');
    }

    console.log(`✅ CPF ${cleanCPF} validado com sucesso`);

    return new Response(JSON.stringify({ 
      valid: true,
      cpf: cleanCPF,
      message: 'CPF válido!'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ 
      valid: false,
      error: errorMessage 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});