-- Fase 1: Deletar comissões duplicadas da Jacqueline
DELETE FROM commissions 
WHERE id IN (
  'c0403915-cef8-433a-ad3d-4b8676a8878d',
  '7c8ded6b-4899-4fa8-b4c4-a21c5f7c26f6',
  'ca2ec70d-9009-471e-b303-00cb76871f91'
);

-- Fase 1: Deletar completamente a usuária Jacqueline (1c386d87-0814-48c0-866f-9632587414d9)
DELETE FROM whatsapp_messages WHERE user_id = '1c386d87-0814-48c0-866f-9632587414d9';
DELETE FROM whatsapp_verifications WHERE whatsapp = '5585991447009';
DELETE FROM commissions WHERE referred_user_id = '1c386d87-0814-48c0-866f-9632587414d9';
DELETE FROM payments WHERE user_id = '1c386d87-0814-48c0-866f-9632587414d9';
DELETE FROM user_network WHERE user_id = '1c386d87-0814-48c0-866f-9632587414d9';
DELETE FROM users WHERE id = '1c386d87-0814-48c0-866f-9632587414d9';

-- Fase 2: Adicionar coluna deleted_at na tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITHOUT TIME ZONE;

-- Fase 2: Atualizar enum user_status para incluir 'suspended' e 'deleted'
ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'suspended';
ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'deleted';

-- Fase 2: Criar tabela user_deletion_logs para auditoria
CREATE TABLE IF NOT EXISTS user_deletion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deleted_user_id UUID NOT NULL,
  deleted_by_admin_id UUID NOT NULL REFERENCES users(id),
  action_type TEXT NOT NULL CHECK (action_type IN ('suspend', 'soft_delete', 'hard_delete', 'reactivate')),
  reason TEXT,
  deleted_data JSONB,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Fase 2: Habilitar RLS na tabela user_deletion_logs
ALTER TABLE user_deletion_logs ENABLE ROW LEVEL SECURITY;

-- Fase 2: Policy para admins acessarem logs
CREATE POLICY "Admins can view deletion logs"
ON user_deletion_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Fase 2: Atualizar policies de users para respeitar deleted_at
DROP POLICY IF EXISTS "Users can view own data" ON users;
CREATE POLICY "Users can view own data"
ON users
FOR SELECT
USING (auth.uid() = id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Allow public login access" ON users;
CREATE POLICY "Allow public login access"
ON users
FOR SELECT
USING (deleted_at IS NULL);

-- Fase 2: Policy para admins visualizarem todos os usuários (incluindo deletados)
CREATE POLICY "Admins can view all users"
ON users
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Fase 2: Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_user_deletion_logs_deleted_user ON user_deletion_logs(deleted_user_id);
CREATE INDEX IF NOT EXISTS idx_user_deletion_logs_admin ON user_deletion_logs(deleted_by_admin_id);