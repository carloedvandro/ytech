-- Adicionar política para admins gerenciarem preferências de renovação de qualquer usuário
CREATE POLICY "Admins can manage all renewal preferences"
ON public.user_renewal_preferences
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));