/**
 * Configuração de Ambientes e Canais de Notificação
 * 
 * Para alternar entre SANDBOX e PRODUÇÃO:
 * 1. Mude a variável CURRENT_ENV abaixo
 * 2. Faça o deploy das funções
 * 
 * Para alternar entre WhatsApp e Email:
 * 1. Mude a variável NOTIFICATION_CHANNEL abaixo
 * 2. Faça o deploy das funções
 * 
 * IMPORTANTE: Sempre voltar para 'production' antes de fazer deploy final!
 */

type Environment = 'sandbox' | 'production';
type NotificationChannel = 'whatsapp' | 'email';

// 🔧 ALTERE AQUI PARA TROCAR O AMBIENTE
const CURRENT_ENV: Environment = 'production';

// 📱 ALTERE AQUI PARA TROCAR O CANAL DE NOTIFICAÇÃO
// 'whatsapp' = Envia via WhatsApp (Mega API)
// 'email' = Envia via Email (Resend)
const NOTIFICATION_CHANNEL: NotificationChannel = 'email';

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
      enabled: false, // Não enviar notificações em sandbox
      channel: NOTIFICATION_CHANNEL,
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
      enabled: true,
      channel: NOTIFICATION_CHANNEL,
    },
  },
} as const;

// Configuração atual
export const ENV_CONFIG = ENVIRONMENTS[CURRENT_ENV];

// Canal de notificação atual (exportado para uso em outras funções)
export const NOTIFICATION_CONFIG = {
  channel: NOTIFICATION_CHANNEL as NotificationChannel,
  isWhatsApp: (NOTIFICATION_CHANNEL as NotificationChannel) === 'whatsapp',
  isEmail: (NOTIFICATION_CHANNEL as NotificationChannel) === 'email',
};

// Helper para log do ambiente
export function logEnvironment() {
  console.log(`🌍 Ambiente: ${ENV_CONFIG.name}`);
  console.log(`🔑 Asaas URL: ${ENV_CONFIG.asaas.baseUrl}`);
  console.log(`📬 Canal de Notificação: ${NOTIFICATION_CHANNEL.toUpperCase()}`);
  console.log(`📱 Notificações: ${ENV_CONFIG.notifications.enabled ? 'ATIVADAS' : 'DESATIVADAS'}`);
}

// Validar configuração
export function validateConfig() {
  if (!ENV_CONFIG.asaas.apiKey) {
    throw new Error(`ASAAS_${CURRENT_ENV === 'sandbox' ? 'SANDBOX_' : ''}API_KEY não configurada`);
  }
  return true;
}

// Helper para enviar notificação pelo canal configurado
export async function sendNotification(params: {
  supabase: any;
  userId?: string;
  email?: string;
  whatsapp?: string;
  messageType: string;
  data: any;
}): Promise<{ success: boolean; message: string }> {
  const { supabase, userId, email, whatsapp, messageType, data } = params;
  
  // Se notificações desabilitadas, retornar silenciosamente
  if (!ENV_CONFIG.notifications.enabled) {
    console.log('📭 Notificações desabilitadas neste ambiente');
    return { success: true, message: 'Notificações desabilitadas' };
  }
  
  try {
    if (NOTIFICATION_CONFIG.isEmail) {
      // Enviar por email
      console.log(`📧 Enviando notificação por EMAIL: ${messageType}`);
      
      const { error } = await supabase.functions.invoke('send-email-notification', {
        body: { email, userId, messageType, data }
      });
      
      if (error) {
        console.error('❌ Erro ao enviar email:', error);
        return { success: false, message: error.message };
      }
      
      return { success: true, message: 'Email enviado' };
    } else {
      // Enviar por WhatsApp
      console.log(`📱 Enviando notificação por WHATSAPP: ${messageType}`);
      
      const { error } = await supabase.functions.invoke('send-whatsapp-notification', {
        body: { whatsapp, userId, messageType, data }
      });
      
      if (error) {
        console.error('❌ Erro ao enviar WhatsApp:', error);
        return { success: false, message: error.message };
      }
      
      return { success: true, message: 'WhatsApp enviado' };
    }
  } catch (error: any) {
    console.error('❌ Erro ao enviar notificação:', error);
    return { success: false, message: error.message || 'Erro desconhecido' };
  }
}
