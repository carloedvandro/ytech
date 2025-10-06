-- Permitir leitura pública da tabela user_network (sem dados sensíveis)
DROP POLICY IF EXISTS "Users can view entire network" ON public.user_network;

CREATE POLICY "Allow public read on network"
ON public.user_network
FOR SELECT
USING (true);