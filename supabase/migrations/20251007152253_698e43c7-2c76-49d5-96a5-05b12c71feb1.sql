-- Adicionar campo qr_code_url na tabela sim_activations para armazenar QR codes de eSIM
ALTER TABLE sim_activations 
ADD COLUMN qr_code_url TEXT,
ADD COLUMN activated_by UUID REFERENCES auth.users(id),
ADD COLUMN activated_at TIMESTAMP WITH TIME ZONE;

-- Comentários para documentar os novos campos
COMMENT ON COLUMN sim_activations.qr_code_url IS 'URL do QR code gerado para ativação de eSIM';
COMMENT ON COLUMN sim_activations.activated_by IS 'ID do admin que ativou o chip/eSIM';
COMMENT ON COLUMN sim_activations.activated_at IS 'Data e hora da ativação pelo admin';