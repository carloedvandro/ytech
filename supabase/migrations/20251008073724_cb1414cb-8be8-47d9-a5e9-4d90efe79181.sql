-- Permitir que usuários cancelem suas próprias ativações pendentes
CREATE POLICY "Users can cancel their own pending activations"
ON sim_activations
FOR UPDATE
USING (
  auth.uid() = user_id 
  AND status = 'pending'
)
WITH CHECK (
  auth.uid() = user_id 
  AND status = 'cancelled'
);