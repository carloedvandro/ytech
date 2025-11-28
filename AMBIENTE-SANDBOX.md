# 🧪 Guia de Ambiente Sandbox

## Como Alternar Entre Sandbox e Produção

### 1️⃣ Configurar Secrets do Sandbox

Antes de usar o sandbox, você precisa adicionar as chaves de API:

```bash
# No Lovable Cloud, adicione estes secrets:
ASAAS_SANDBOX_API_KEY=sua_chave_sandbox_asaas
MEGA_API_KEY=sua_chave_mega_producao

# Nota: A Mega API não tem ambiente sandbox separado.
# Use a mesma chave de produção (as notificações ficam desativadas no sandbox).
```

### 2️⃣ Alternar para Sandbox

Edite o arquivo `supabase/functions/_shared/config.ts`:

```typescript
// Linha 10 - MUDE AQUI:
const CURRENT_ENV: Environment = 'sandbox'; // ← Trocar para 'sandbox'
```

### 3️⃣ Alternar para Produção

Quando terminar os testes, volte para produção:

```typescript
// Linha 10 - MUDE AQUI:
const CURRENT_ENV: Environment = 'production'; // ← Trocar para 'production'
```

### 4️⃣ Deploy Automático

As edge functions são deployadas automaticamente quando você salva as mudanças. Basta:
1. Alterar o `CURRENT_ENV` no arquivo `config.ts`
2. Salvar
3. Aguardar o deploy

---

## 🎯 Diferenças Entre Ambientes

### Sandbox
- ✅ Usa API keys de sandbox
- ✅ Não cobra valores reais
- ✅ Não envia WhatsApp (notificações desativadas)
- ✅ Dados isolados
- ⚠️ Use para testes de fluxo completo

### Produção
- 💰 Usa API keys reais
- 💰 Cobra valores reais
- 📱 Envia WhatsApp
- 🚀 Dados de produção

---

## 📊 O Que É Testado em Sandbox

### Fluxo Completo de Pagamento
1. ✅ Criar cliente no Asaas (sandbox)
2. ✅ Criar assinatura recorrente
3. ✅ Gerar QR Code PIX (fake)
4. ✅ Simular confirmação de pagamento
5. ✅ Ativar usuário
6. ✅ Criar comissões

### Rede MMN
1. ✅ Cadastro de usuários com referral
2. ✅ Cálculo de path na rede
3. ✅ Distribuição de comissões 4 níveis

### Notificações
- ⚠️ WhatsApp **não é enviado** em sandbox (evita custos e spam)

---

## 🧪 Como Simular Pagamento em Sandbox

### Opção 1: Webhook Manual (Recomendado)

Use a função de teste que já existe:

```typescript
// Chamar a edge function simulate-payment-confirmation
await supabase.functions.invoke('simulate-payment-confirmation', {
  body: { paymentId: 'uuid-do-pagamento' }
});
```

### Opção 2: Dashboard Asaas Sandbox

1. Acesse https://sandbox.asaas.com
2. Vá em "Cobranças"
3. Encontre o pagamento
4. Clique em "Confirmar Pagamento"

---

## ⚠️ Checklist Antes de Ir para Produção

- [ ] Testar cadastro completo em sandbox
- [ ] Testar pagamento e ativação
- [ ] Verificar comissões criadas
- [ ] Confirmar path da rede correto
- [ ] **IMPORTANTE**: Voltar `CURRENT_ENV` para `'production'`
- [ ] Verificar que está usando as chaves de produção
- [ ] Fazer um pagamento real de teste (R$ 0,01)

---

## 🚨 IMPORTANTE

**NUNCA ESQUEÇA de voltar para produção antes de fazer o deploy final!**

```typescript
// ✅ Antes de deploy final
const CURRENT_ENV: Environment = 'production';
```

---

## 📝 Logs de Ambiente

Toda edge function agora mostra o ambiente ativo nos logs:

```
🌍 Ambiente: SANDBOX
🔑 Asaas URL: https://sandbox.asaas.com/api/v3
📱 Notificações: DESATIVADAS
```

Confira sempre os logs para ter certeza do ambiente ativo!
