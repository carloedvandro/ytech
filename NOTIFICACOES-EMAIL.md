# 📧 Sistema de Notificações por Email/WhatsApp

## Status Atual: ✅ CONTROLÁVEL VIA ADMIN

O sistema agora permite **alternar entre Email e WhatsApp** diretamente no painel do Administrador, sem precisar editar código!

## Como Alternar Entre Email e WhatsApp

### Via Painel Admin (Recomendado)

1. Faça login como administrador
2. Acesse **Admin** no menu lateral
3. No card **"Canal de Notificações"**, use o toggle para alternar entre:
   - 📧 **Email** - Envia via Resend
   - 📱 **WhatsApp** - Envia via Mega API

4. A alteração é **instantânea** e fica registrada no histórico

### Via Banco de Dados (Alternativo)

```sql
-- Para ativar EMAIL:
UPDATE system_settings SET notification_channel = 'email' WHERE id = 'main';

-- Para ativar WHATSAPP:
UPDATE system_settings SET notification_channel = 'whatsapp' WHERE id = 'main';
```

## O Que É Controlado

### Verificação 2FA no Login/Cadastro
- O canal padrão no frontend é `email`
- Usuário pode alternar para WhatsApp no formulário (se disponível)

### Notificações do Sistema
Todas as seguintes notificações seguem o canal configurado:
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

### Chatbot WhatsApp
- Quando o canal está em **email**, o chatbot **não responde** via WhatsApp
- Mensagens recebidas são ignoradas (não processadas)
- Quando o canal está em **whatsapp**, o chatbot funciona normalmente

## Requisitos

### Para Email Funcionar:
- ✅ Secret `RESEND_API_KEY` configurada
- ✅ Domínio `ychat-ia.com.br` verificado no Resend
- ✅ Usuários devem ter email cadastrado no perfil

### Para WhatsApp Funcionar:
- ✅ Secret `MEGA_API_KEY` configurada
- ✅ Secret `MEGA_API_HOST` configurada
- ✅ Secret `MEGA_INSTANCE_KEY` configurada
- ✅ Conta Mega API ativa e sem bloqueios

## Histórico de Alterações

Todas as alterações de canal são registradas na tabela `settings_audit_log`:

```sql
SELECT * FROM settings_audit_log 
WHERE setting_key = 'notification_channel'
ORDER BY changed_at DESC
LIMIT 20;
```

## Arquitetura

### Tabela: `system_settings`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | TEXT | 'main' (único registro) |
| notification_channel | TEXT | 'email' ou 'whatsapp' |
| updated_at | TIMESTAMP | Última atualização |
| updated_by | UUID | Admin que alterou |

### Edge Functions Afetadas:
- `_shared/config.ts` - Lê configuração do banco via `getNotificationChannel()`
- `mega-webhook` - Ignora mensagens se canal = email
- `chatbot-handler` - Não responde se canal = email
- `send-email-notification` - Envia quando canal = email
- `send-whatsapp-notification` - Envia quando canal = whatsapp

---

**Última atualização:** Fevereiro 2026
**Funcionalidade:** Toggle via Admin + Banco de Dados
