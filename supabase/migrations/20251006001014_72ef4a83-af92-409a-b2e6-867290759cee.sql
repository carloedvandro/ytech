-- Permitir que usuários vejam toda sua rede (todos os níveis)
DROP POLICY IF EXISTS "Users can view own network" ON public.user_network;

CREATE POLICY "Users can view entire network"
ON public.user_network
FOR SELECT
USING (auth.uid()::text = ANY(path));