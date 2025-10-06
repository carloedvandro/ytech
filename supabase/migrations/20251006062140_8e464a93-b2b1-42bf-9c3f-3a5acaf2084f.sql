-- Adicionar campos para assinatura recorrente na tabela payments
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS subscription_id text,
ADD COLUMN IF NOT EXISTS next_renewal_date timestamp with time zone;

-- Adicionar índice para buscar por subscription_id
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON public.payments(subscription_id);

-- Comentários para documentação
COMMENT ON COLUMN public.payments.subscription_id IS 'ID da assinatura recorrente no Asaas';
COMMENT ON COLUMN public.payments.next_renewal_date IS 'Data da próxima renovação automática';