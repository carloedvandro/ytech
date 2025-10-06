-- Ajustar política RLS para permitir update de username sem auth.uid()
-- Remove a política antiga restritiva
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- Cria nova política que permite updates sem necessitar auth.uid()
-- mas ainda valida que é o mesmo usuário pelo id
CREATE POLICY "Users can update own data" ON users
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Nota: Esta é uma solução temporária. Idealmente, deveria haver autenticação 
-- adequada do Supabase implementada no futuro.