/**
 * Configuração de Ambientes
 * 
 * Para alternar entre SANDBOX e PRODUÇÃO:
 * 1. Mude a variável CURRENT_ENV abaixo
 * 2. Faça o deploy das funções
 * 
 * IMPORTANTE: Sempre voltar para 'production' antes de fazer deploy final!
 */

type Environment = 'sandbox' | 'production';

// 🔧 ALTERE AQUI PARA TROCAR O AMBIENTE
const CURRENT_ENV: Environment = 'production';

// Configurações por ambiente
const ENVIRONMENTS = {
  sandbox: {
    name: 'SANDBOX',
    asaas: {
      apiKey: Deno.env.get('ASAAS_SANDBOX_API_KEY') || '',
      baseUrl: 'https://sandbox.asaas.com/api/v3',
    },
    mega: {
      apiKey: Deno.env.get('MEGA_API_KEY') || '', // Mega não tem sandbox separado, usa a mesma chave
      baseUrl: 'https://api.megaapi.com.br',
    },
    notifications: {
      enabled: false, // Não enviar WhatsApp em sandbox
    },
  },
  production: {
    name: 'PRODUÇÃO',
    asaas: {
      apiKey: Deno.env.get('ASAAS_API_KEY') || '',
      baseUrl: 'https://api.asaas.com/v3',
    },
    mega: {
      apiKey: Deno.env.get('MEGA_API_KEY') || '',
      baseUrl: 'https://api.megaapi.com.br',
    },
    notifications: {
      enabled: true, // Enviar WhatsApp em produção
    },
  },
} as const;

// Configuração atual
export const ENV_CONFIG = ENVIRONMENTS[CURRENT_ENV];

// Helper para log do ambiente
export function logEnvironment() {
  console.log(`🌍 Ambiente: ${ENV_CONFIG.name}`);
  console.log(`🔑 Asaas URL: ${ENV_CONFIG.asaas.baseUrl}`);
  console.log(`📱 Notificações: ${ENV_CONFIG.notifications.enabled ? 'ATIVADAS' : 'DESATIVADAS'}`);
}

// Validar configuração
export function validateConfig() {
  if (!ENV_CONFIG.asaas.apiKey) {
    throw new Error(`ASAAS_${CURRENT_ENV === 'sandbox' ? 'SANDBOX_' : ''}API_KEY não configurada`);
  }
  return true;
}
