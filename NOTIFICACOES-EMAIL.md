# 📧 Sistema de Notificações por Email

## Status Atual: ✅ EMAIL ATIVADO

O sistema está configurado para enviar todas as notificações via **EMAIL** ao invés de WhatsApp.

## Como Alternar Entre Email e WhatsApp

### Editar o arquivo `supabase/functions/_shared/config.ts`:

```typescript
// Linha 23 - MUDE AQUI:
const NOTIFICATION_CHANNEL: NotificationChannel = 'email';  // ou 'whatsapp'
```

**Opções:**
- `'email'` = Envia todas as notificações por email (Resend)
- `'whatsapp'` = Envia todas as notificações por WhatsApp (Mega API)

## O Que Foi Alterado

### 1. Verificação 2FA no Login/Cadastro
- ✅ Código de verificação agora é enviado por **EMAIL por padrão**
- ✅ Usuário pode ainda solicitar envio por WhatsApp como fallback (se reativado)

### 2. Notificações do Sistema
Todas as seguintes notificações agora são enviadas por email:
- ✅ Boas-vindas (welcome)
- ✅ Ativação de chip/eSIM (sim_activated)
- ✅ Pagamento pendente (payment_pending)
- ✅ Comissão recebida (commission_earned)
- ✅ Comissão liberada (commission_released)
- ✅ Saque solicitado (withdrawal_confirmed)
- ✅ Saque processado (withdrawal_processed)
- ✅ Lembrete de pagamento (charge_reminder)
- ✅ Reset de senha (password_reset)
- ✅ Novo indicado (new_referral)
- ✅ Renovação antecipada (renewal_early_payment)
- ✅ Fatura de renovação (renewal_invoice_created)
- ✅ Renovação com saldo (renewal_paid_with_balance)
- ✅ Renovação com desconto (renewal_with_discount)
- ✅ Confirmação de chip (chip_activated_by_user - notifica admins)

### 3. Edge Functions Atualizadas
- `send-email-notification` - Nova função para enviar notificações por email
- `send-email-verification` - Envia códigos de verificação por email
- `asaas-webhook` - Usa canal configurável (email/whatsapp)
- `process-sim-activation` - Usa canal configurável (email/whatsapp)
- `_shared/config.ts` - Configuração centralizada do canal

### 4. Frontend Atualizado
- `src/pages/Login.tsx` - Envia código por email por padrão
- `src/pages/Signup.tsx` - Envia código por email por padrão

## Requisitos

### Para Email Funcionar:
- ✅ Secret `RESEND_API_KEY` configurada
- ✅ Domínio `ychat-ia.com.br` verificado no Resend
- ✅ Usuários devem ter email cadastrado no perfil

### Para WhatsApp Funcionar (quando reativado):
- Secret `MEGA_API_KEY` configurada
- Secret `MEGA_API_HOST` configurada
- Secret `MEGA_INSTANCE_KEY` configurada
- Conta Mega API ativa e sem bloqueios

## Reativar WhatsApp no Futuro

Quando o WhatsApp estiver desbloqueado:

1. Edite `supabase/functions/_shared/config.ts`:
```typescript
const NOTIFICATION_CHANNEL: NotificationChannel = 'whatsapp';
```

2. Faça o deploy das funções (automático ao salvar)

3. Para o Login/Signup usar WhatsApp novamente, edite:
- `src/pages/Login.tsx` linha 32: `useState<'whatsapp' | 'email'>('whatsapp')`
- `src/pages/Signup.tsx` linha 51: `useState<'whatsapp' | 'email'>('whatsapp')`

## Logs

Todas as notificações são registradas na tabela `whatsapp_messages`:
- Campo `message_type` terá prefixo `email_` para emails
- Campo `metadata.channel` indica se foi enviado por `email` ou `whatsapp`

```sql
-- Ver últimas notificações enviadas
SELECT * FROM whatsapp_messages 
WHERE message_type LIKE 'email_%'
ORDER BY sent_at DESC
LIMIT 20;
```

---

**Última atualização:** Fevereiro 2026
**Motivo:** WhatsApp (Mega API) bloqueado temporariamente
