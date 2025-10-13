-- Remover a política antiga que está causando problemas
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Criar nova política correta para admins verem todos os perfis
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Garantir que a política "Public view limited profile data" não interfira
DROP POLICY IF EXISTS "Public view limited profile data" ON public.profiles;

-- Recriar a política pública apenas para usuários autenticados não-admins
CREATE POLICY "Public view limited profile data" 
ON public.profiles 
FOR SELECT 
USING (
  (deleted_at IS NULL AND auth.uid() IS NOT NULL AND NOT has_role(auth.uid(), 'admin'))
  OR
  (auth.uid() = id)
);