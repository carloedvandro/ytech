-- Remover política anterior que deu erro
DROP POLICY IF EXISTS "Users can view network payments" ON public.payments;

-- Política corrigida com cast explícito de tipos
CREATE POLICY "Users can view network payments"
ON public.payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_network
    WHERE user_network.user_id = payments.user_id
    AND auth.uid()::text = ANY(
      SELECT unnest(user_network.path)::text
    )
  )
);