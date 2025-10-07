-- Criar tabela para rastrear gerações de material de divulgação
CREATE TABLE IF NOT EXISTS public.marketing_material_generations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  material_type text NOT NULL,
  generated_content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.marketing_material_generations ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver suas próprias gerações
CREATE POLICY "Users can view own generations"
ON public.marketing_material_generations
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Usuários podem inserir suas próprias gerações
CREATE POLICY "Users can insert own generations"
ON public.marketing_material_generations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Criar índice para melhorar performance de consultas por data
CREATE INDEX idx_marketing_generations_user_date 
ON public.marketing_material_generations(user_id, created_at DESC);