-- Criar tabela verification_codes para armazenar códigos de verificação por email
CREATE TABLE public.verification_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  whatsapp TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índice para buscar por whatsapp
CREATE INDEX idx_verification_codes_whatsapp ON public.verification_codes(whatsapp);

-- Habilitar RLS
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção e leitura via service_role (edge functions)
CREATE POLICY "Allow service role full access" 
ON public.verification_codes 
FOR ALL 
USING (true) 
WITH CHECK (true);