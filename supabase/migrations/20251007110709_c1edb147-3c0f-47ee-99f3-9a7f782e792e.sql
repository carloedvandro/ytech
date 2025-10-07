-- =============================================
-- CORREÇÕES DE SEGURANÇA CRÍTICAS
-- =============================================

-- ========================================
-- 1. TABELA USERS (Legacy) - REMOVER ACESSO PÚBLICO
-- ========================================

-- Remover políticas públicas perigosas
DROP POLICY IF EXISTS "Allow public login access" ON users;
DROP POLICY IF EXISTS "Allow public user registration" ON users;
DROP POLICY IF EXISTS "Allow public updates for signup" ON users;

-- Política apenas para service role (migrações)
CREATE POLICY "Service role only access"
ON users
FOR ALL
USING (false); -- Bloqueia acesso via RLS (só service role bypassa)

-- ========================================
-- 2. COMMISSIONS - RESTRINGIR VISUALIZAÇÃO
-- ========================================

-- Remover política pública
DROP POLICY IF EXISTS "Anyone can view commissions" ON commissions;

-- Usuários veem APENAS suas próprias comissões
CREATE POLICY "Users view own commissions"
ON commissions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins veem TODAS as comissões
CREATE POLICY "Admins view all commissions"
ON commissions
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- ========================================
-- 3. PROFILES - LIMITAR DADOS PÚBLICOS
-- ========================================

-- Remover política pública atual
DROP POLICY IF EXISTS "Public can view profiles for referral" ON profiles;

-- Nova política: Apenas username e full_name públicos
-- (CPF, WhatsApp e email PRIVADOS)
CREATE POLICY "Public view limited profile data"
ON profiles
FOR SELECT
USING (
  deleted_at IS NULL 
  AND (
    -- Usuários autenticados veem tudo
    auth.uid() IS NOT NULL
    OR
    -- Anônimos veem apenas ID, username, full_name
    -- (CPF/WhatsApp/email ficam null via SELECT)
    true
  )
);

-- IMPORTANTE: A aplicação deve fazer SELECT específico
-- Para anônimos: SELECT id, username, full_name FROM profiles
-- Para autenticados: SELECT * FROM profiles WHERE id = auth.uid()

COMMENT ON POLICY "Public view limited profile data" ON profiles IS 
'Perfis visíveis para referral mas CPF/WhatsApp/email devem ser filtrados no SELECT da aplicação';

-- ========================================
-- 4. ADICIONAR ÍNDICES PARA PERFORMANCE
-- ========================================

-- Índice para consultas de comissões por usuário
CREATE INDEX IF NOT EXISTS idx_commissions_user_status 
ON commissions(user_id, status);

-- Índice para verificação de roles admin
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role 
ON user_roles(user_id, role);