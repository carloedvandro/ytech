/**
 * Configuração de Ambientes e Canais de Notificação
 * 
 * O canal de notificação agora é lido do BANCO DE DADOS (tabela system_settings)
 * e pode ser alterado via painel do Admin sem precisar editar código.
 * 
 * Para alternar entre SANDBOX e PRODUÇÃO:
 * 1. Mude a variável CURRENT_ENV abaixo
 * 2. Faça o deploy das funções
 * 
 * IMPORTANTE: Sempre voltar para 'production' antes de fazer deploy final!
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

type Environment = 'sandbox' | 'production';
type NotificationChannel = 'whatsapp' | 'email';

// 🔧 ALTERE AQUI PARA TROCAR O AMBIENTE
const CURRENT_ENV: Environment = 'production';

// Fallback caso não consiga ler do banco (default: email)
const DEFAULT_NOTIFICATION_CHANNEL: NotificationChannel = 'email';

// Configurações por ambiente
const ENVIRONMENTS = {
  sandbox: {
    name: 'SANDBOX',
    asaas: {
      apiKey: Deno.env.get('ASAAS_SANDBOX_API_KEY') || '',
      baseUrl: 'https://sandbox.asaas.com/api/v3',
    },
    mega: {
      apiKey: Deno.env.get('MEGA_API_KEY') || '',
      baseUrl: 'https://api.megaapi.com.br',
    },
    notifications: {
      enabled: false,
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
    },
  },
} as const;

// Configuração atual
export const ENV_CONFIG = ENVIRONMENTS[CURRENT_ENV];

// Função para obter o canal de notificação do banco de dados
export async function getNotificationChannel(): Promise<{
  channel: NotificationChannel;
  isWhatsApp: boolean;
  isEmail: boolean;
}> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('⚠️ Credenciais Supabase não encontradas, usando fallback email');
      return {
        channel: DEFAULT_NOTIFICATION_CHANNEL,
        isWhatsApp: false,
        isEmail: true
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .from('system_settings')
      .select('notification_channel')
      .eq('id', 'main')
      .single();

    if (error || !data) {
      console.warn('⚠️ Erro ao buscar configuração do banco:', error?.message);
      return {
        channel: DEFAULT_NOTIFICATION_CHANNEL,
        isWhatsApp: false,
        isEmail: true
      };
    }

    const channel = (data.notification_channel as NotificationChannel) || DEFAULT_NOTIFICATION_CHANNEL;
    
    return {
      channel,
      isWhatsApp: channel === 'whatsapp',
      isEmail: channel === 'email'
    };
  } catch (err) {
    console.error('❌ Erro ao obter canal de notificação:', err);
    return {
      channel: DEFAULT_NOTIFICATION_CHANNEL,
      isWhatsApp: false,
      isEmail: true
    };
  }
}

// DEPRECATED: Use getNotificationChannel() ao invés disso
// Mantido para compatibilidade com código existente que usa de forma síncrona
// NOTA: Este valor estático pode estar desatualizado. Prefira usar getNotificationChannel().
export const NOTIFICATION_CONFIG = {
  channel: DEFAULT_NOTIFICATION_CHANNEL as NotificationChannel,
  isWhatsApp: false,
  isEmail: true,
};

// Helper para log do ambiente
export function logEnvironment() {
  console.log(`🌍 Ambiente: ${ENV_CONFIG.name}`);
  console.log(`🔑 Asaas URL: ${ENV_CONFIG.asaas.baseUrl}`);
  console.log(`📱 Notificações: ${ENV_CONFIG.notifications.enabled ? 'ATIVADAS' : 'DESATIVADAS'}`);
  console.log(`📬 Canal padrão: ${DEFAULT_NOTIFICATION_CHANNEL.toUpperCase()} (verificar banco para valor real)`);
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
    // Buscar canal configurado do banco
    const notificationConfig = await getNotificationChannel();
    
    if (notificationConfig.isEmail) {
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
