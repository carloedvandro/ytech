-- Criar políticas para asaas_webhook_events
-- Permitir que admins vejam todos os eventos
CREATE POLICY "Admins can view webhook events" 
ON public.asaas_webhook_events 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Permitir que a service role insira eventos (via edge function)
CREATE POLICY "Service role can insert webhook events" 
ON public.asaas_webhook_events 
FOR INSERT 
WITH CHECK (true);

-- Permitir que a service role atualize eventos (via edge function)
CREATE POLICY "Service role can update webhook events" 
ON public.asaas_webhook_events 
FOR UPDATE 
USING (true);
