-- Permitir que admins atualizem ativações (para confirmar)
CREATE POLICY "Admins can update activations"
ON public.sim_activations
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Permitir que admins deletem ativações
CREATE POLICY "Admins can delete activations"
ON public.sim_activations
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));