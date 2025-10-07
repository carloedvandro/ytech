-- Remover constraints antigas das comissões
ALTER TABLE commissions DROP CONSTRAINT IF EXISTS commissions_user_id_fkey;
ALTER TABLE commissions DROP CONSTRAINT IF EXISTS commissions_referred_user_id_fkey;

-- Atualizar IDs nas comissões
UPDATE commissions
SET user_id = u.auth_user_id
FROM users u
WHERE commissions.user_id = u.id
  AND u.auth_user_id IS NOT NULL;

UPDATE commissions
SET referred_user_id = u.auth_user_id
FROM users u
WHERE commissions.referred_user_id = u.id
  AND u.auth_user_id IS NOT NULL;

-- Adicionar constraints novas apontando para profiles
ALTER TABLE commissions 
  ADD CONSTRAINT commissions_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE;

ALTER TABLE commissions 
  ADD CONSTRAINT commissions_referred_user_id_fkey 
  FOREIGN KEY (referred_user_id) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE;

-- Remover constraints antigas dos pagamentos
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_user_id_fkey;

-- Atualizar IDs nos pagamentos
UPDATE payments
SET user_id = u.auth_user_id
FROM users u
WHERE payments.user_id = u.id
  AND u.auth_user_id IS NOT NULL;

-- Adicionar constraint nova
ALTER TABLE payments 
  ADD CONSTRAINT payments_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE;

-- Remover constraints antigas das transações
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;

-- Atualizar IDs nas transações
UPDATE transactions
SET user_id = u.auth_user_id
FROM users u
WHERE transactions.user_id = u.id
  AND u.auth_user_id IS NOT NULL;

-- Adicionar constraint nova
ALTER TABLE transactions 
  ADD CONSTRAINT transactions_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE;

-- Remover constraints antigas das mensagens WhatsApp
ALTER TABLE whatsapp_messages DROP CONSTRAINT IF EXISTS whatsapp_messages_user_id_fkey;

-- Atualizar IDs nas mensagens
UPDATE whatsapp_messages
SET user_id = u.auth_user_id
FROM users u
WHERE whatsapp_messages.user_id = u.id
  AND u.auth_user_id IS NOT NULL;

-- Adicionar constraint nova
ALTER TABLE whatsapp_messages 
  ADD CONSTRAINT whatsapp_messages_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE;