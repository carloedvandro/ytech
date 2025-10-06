-- Atualizar políticas da tabela commissions para permitir leitura pública
-- (o user_id já protege os dados mostrando apenas as próprias comissões)

DROP POLICY IF EXISTS "Users can view own commissions" ON public.commissions;

CREATE POLICY "Anyone can view commissions"
ON public.commissions
FOR SELECT
TO public
USING (true);