-- Criar tabela de preferências de renovação
CREATE TABLE user_renewal_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  use_balance_for_renewal BOOLEAN DEFAULT FALSE,
  minimum_balance_to_keep NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar trigger para atualizar updated_at
CREATE TRIGGER update_user_renewal_preferences_updated_at
  BEFORE UPDATE ON user_renewal_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE user_renewal_preferences ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users manage own renewal preferences"
  ON user_renewal_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all renewal preferences"
  ON user_renewal_preferences
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));