-- Remover política antiga de insert
DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;

-- Criar nova política que permite insert público (a validação é feita no código)
CREATE POLICY "Allow public insert payments"
ON public.payments
FOR INSERT
TO public
WITH CHECK (true);