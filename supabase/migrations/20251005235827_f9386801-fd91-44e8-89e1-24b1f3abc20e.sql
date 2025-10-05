-- Permitir que usuários não autenticados possam se cadastrar
CREATE POLICY "Allow public user registration" 
ON public.users 
FOR INSERT 
TO anon
WITH CHECK (true);