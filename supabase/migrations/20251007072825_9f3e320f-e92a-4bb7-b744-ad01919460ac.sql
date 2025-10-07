
-- Tabela para ajustes de saldo feitos por administradores
CREATE TABLE IF NOT EXISTS admin_balance_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('add', 'remove')),
  reason TEXT,
  balance_before NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS
ALTER TABLE admin_balance_adjustments ENABLE ROW LEVEL SECURITY;

-- Admins podem ver todos os ajustes
CREATE POLICY "Admins can view all adjustments"
ON admin_balance_adjustments
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins podem criar ajustes
CREATE POLICY "Admins can create adjustments"
ON admin_balance_adjustments
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Usuários podem ver seus próprios ajustes
CREATE POLICY "Users can view own adjustments"
ON admin_balance_adjustments
FOR SELECT
USING (auth.uid() = user_id);

-- Criar índices
CREATE INDEX idx_balance_adjustments_user_id ON admin_balance_adjustments(user_id);
CREATE INDEX idx_balance_adjustments_admin_id ON admin_balance_adjustments(admin_id);
CREATE INDEX idx_balance_adjustments_created_at ON admin_balance_adjustments(created_at DESC);
