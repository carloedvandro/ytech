-- Remover todas as políticas de payments
DROP POLICY IF EXISTS "Allow public insert payments" ON public.payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;

-- Criar políticas que funcionam com role anon (frontend)
CREATE POLICY "Anyone can insert payments"
ON public.payments
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Anyone can view payments"
ON public.payments
FOR SELECT
TO anon
USING (true);