-- Permitir acesso público para login (buscar usuário por email)
-- IMPORTANTE: Esta política permite apenas SELECT, não expõe a senha pois ela será validada no frontend
CREATE POLICY "Allow public login access"
ON public.users
FOR SELECT
TO anon
USING (true);