-- Remover políticas antigas de payments
DROP POLICY IF EXISTS "Anyone can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Anyone can view payments" ON public.payments;

-- Criar novas políticas mais seguras
-- Permitir que usuários vejam apenas seus próprios pagamentos
CREATE POLICY "Users can view own payments" 
ON public.payments 
FOR SELECT 
USING (auth.uid() = user_id);

-- Permitir que admins vejam todos os pagamentos
CREATE POLICY "Admins can view all payments" 
ON public.payments 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Permitir que usuários insiram seus próprios pagamentos
CREATE POLICY "Users can insert own payments" 
ON public.payments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Permitir que edge functions atualizem pagamentos (via service role)
CREATE POLICY "Service role can update payments" 
ON public.payments 
FOR UPDATE 
USING (true);
