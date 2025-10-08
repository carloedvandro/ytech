-- Adicionar coluna phone_number na tabela sim_activations
ALTER TABLE sim_activations 
ADD COLUMN phone_number text;

-- Adicionar comentário explicativo
COMMENT ON COLUMN sim_activations.phone_number IS 'Número da linha atrelada ao SIM/eSIM';