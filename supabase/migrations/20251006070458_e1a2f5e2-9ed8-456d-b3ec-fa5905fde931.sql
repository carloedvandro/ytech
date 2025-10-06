
-- Remover a foreign key constraint existente
ALTER TABLE commissions 
DROP CONSTRAINT IF EXISTS commissions_payment_id_fkey;

-- Alterar o tipo da coluna payment_id de UUID para TEXT
ALTER TABLE commissions 
ALTER COLUMN payment_id TYPE TEXT USING payment_id::TEXT;

-- Adicionar índice para melhorar performance nas consultas
CREATE INDEX IF NOT EXISTS idx_commissions_payment_id ON commissions(payment_id);

-- Adicionar comentário explicativo
COMMENT ON COLUMN commissions.payment_id IS 'Payment identifier - can be UUID for one-time payments or composite string for recurring payments (subscription_id + asaas_payment_id)';
