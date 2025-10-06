-- Remover política antiga
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- Criar política que permite leitura pública (roles não são dados sensíveis)
CREATE POLICY "Anyone can view user roles"
ON public.user_roles
FOR SELECT
TO public
USING (true);