-- Remover o constraint antigo
ALTER TABLE sim_activations DROP CONSTRAINT IF EXISTS sim_activations_status_check;

-- Adicionar novo constraint incluindo 'cancelled'
ALTER TABLE sim_activations ADD CONSTRAINT sim_activations_status_check 
CHECK (status IN ('pending', 'activated', 'rejected', 'cancelled'));