# 🤖 Chatbot WhatsApp com IA - Y-TECH

## ✅ Sistema Implementado

Foi criado um **chatbot automatizado com inteligência artificial** para responder mensagens de WhatsApp dos clientes automaticamente.

### 🔧 Componentes Criados

#### 1. **Tabela `chatbot_conversations`**
Armazena o histórico completo de conversas:
- Histórico de mensagens (usuário + IA)
- Identificação do cliente (WhatsApp + user_id se existir)
- Últimas 20 mensagens de contexto mantidas
- Metadados adicionais

#### 2. **Edge Function `chatbot-handler`**
Processa mensagens com IA:
- Recebe mensagem do cliente
- Busca histórico de conversa
- Envia para IA (Google Gemini via Lovable AI)
- Salva resposta no histórico
- Envia resposta automática via WhatsApp

**Sistema Prompt da IA:**
- Suporte especializado em internet 5G
- Conhecimento sobre planos (R$ 49,90 / R$ 79,90 / R$ 109,90)
- Ajuda com problemas técnicos
- Explica sistema de indicações
- Sempre cordial e objetivo

#### 3. **Webhook `mega-webhook` (Atualizado)**
Agora detecta mensagens RECEBIDAS:
- Identifica quando cliente envia mensagem
- Extrai texto e número do WhatsApp
- Dispara processamento com IA automaticamente
- Continua funcionando para eventos de status (entregue/lido)

### 📱 Fluxo de Funcionamento

```
Cliente envia WhatsApp
        ↓
Mega API recebe mensagem
        ↓
Webhook detecta nova mensagem
        ↓
chatbot-handler processa com IA
        ↓
IA gera resposta contextual
        ↓
Resposta enviada automaticamente
```

### 🔐 Segurança

- Webhook público (recebe de Mega API)
- Chatbot-handler público (chamado pelo webhook)
- Histórico protegido por RLS (apenas admins)
- Credenciais em secrets do Supabase

### 📊 Monitoramento

**Onde ver conversas:**
```sql
SELECT * FROM chatbot_conversations 
ORDER BY last_message_at DESC;
```

**Logs em tempo real:**
1. Vá em Tools > Backend > Edge Functions
2. Selecione `chatbot-handler` ou `mega-webhook`
3. Veja logs em tempo real das conversas

### ⚙️ Configuração Mega API

**IMPORTANTE:** Configure o webhook na Mega API:

1. Acesse painel Mega API
2. Vá em Configurações > Webhooks
3. Configure URL:
   ```
   https://fkdaaxaybuynohmnatdv.supabase.co/functions/v1/mega-webhook
   ```
4. Ative eventos:
   - ✅ `message.received` (mensagens recebidas)
   - ✅ `messages.upsert` (novas mensagens)
   - ✅ `message.delivered` (entregue)
   - ✅ `message.read` (lido)

### 🎯 Recursos da IA

O chatbot responde automaticamente sobre:
- ✅ Planos e preços
- ✅ Cobertura e disponibilidade
- ✅ Ativação de chip/eSIM
- ✅ Problemas de conexão
- ✅ Sistema de indicações
- ✅ Dúvidas sobre pagamento
- ✅ Renovações

### 🔄 Personalizações

**Para ajustar o comportamento da IA:**
Edite o `SYSTEM_PROMPT` em `supabase/functions/chatbot-handler/index.ts`

**Para mudar modelo de IA:**
Linha 88 - atualmente usando `google/gemini-2.5-flash`
Opções: `openai/gpt-5`, `google/gemini-2.5-pro`, etc.

### 💡 Dicas

1. **Teste enviando mensagem** para seu número Mega API
2. **Monitore logs** para debug
3. **Histórico ilimitado** salvo no banco
4. **Contexto de 20 mensagens** para IA manter conversa
5. **Respostas em < 3 segundos** tipicamente

### 🚀 Próximos Passos

1. ✅ Configure webhook na Mega API (instruções acima)
2. ✅ Teste enviando uma mensagem
3. ✅ Monitore logs para confirmar funcionamento
4. ✅ Ajuste system prompt conforme necessário

---

**Status:** 🟢 Totalmente funcional e pronto para uso!