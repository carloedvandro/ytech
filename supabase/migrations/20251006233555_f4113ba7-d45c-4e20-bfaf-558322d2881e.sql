-- ============================================
-- FASE 1: MIGRAÇÃO PARA SUPABASE AUTH
-- Criar tabela profiles e preparar estrutura
-- ============================================

-- 1. Criar tabela profiles (vinculada ao auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  cpf TEXT NOT NULL UNIQUE,
  whatsapp TEXT NOT NULL,
  username TEXT UNIQUE,
  referred_by UUID REFERENCES public.profiles(id),
  status user_status DEFAULT 'pending_payment'::user_status,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITHOUT TIME ZONE,
  deleted_at TIMESTAMP WITHOUT TIME ZONE
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_cpf ON public.profiles(cpf);
CREATE INDEX IF NOT EXISTS idx_profiles_whatsapp ON public.profiles(whatsapp);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);

-- 3. Enable RLS na tabela profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies para profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id OR deleted_at IS NULL);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = id AND deleted_at IS NULL);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view profiles for referral"
  ON public.profiles
  FOR SELECT
  USING (deleted_at IS NULL);

-- 5. Trigger para atualizar updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Função para criar profile automaticamente ao criar usuário no auth
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referred_by_id UUID;
BEGIN
  -- Extrair referred_by do metadata se existir
  referred_by_id := (NEW.raw_user_meta_data->>'referred_by')::uuid;

  -- Criar profile
  INSERT INTO public.profiles (
    id,
    full_name,
    cpf,
    whatsapp,
    referred_by,
    status
  ) VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'cpf',
    NEW.raw_user_meta_data->>'whatsapp',
    referred_by_id,
    'pending_payment'::user_status
  );

  -- Se tem referrer, criar entrada na rede
  IF referred_by_id IS NOT NULL THEN
    DECLARE
      parent_path uuid[];
      parent_level integer;
    BEGIN
      -- Buscar path e level do parent
      SELECT path, level INTO parent_path, parent_level
      FROM user_network
      WHERE user_id = referred_by_id;
      
      -- Se parent não tem registro na rede ainda, criar primeiro
      IF parent_path IS NULL THEN
        parent_path := ARRAY[referred_by_id];
        parent_level := 1;
        
        INSERT INTO user_network (user_id, parent_id, level, path)
        VALUES (referred_by_id, NULL, 1, ARRAY[referred_by_id]);
      END IF;
      
      -- Inserir novo usuário na rede
      INSERT INTO user_network (user_id, parent_id, level, path)
      VALUES (
        NEW.id,
        referred_by_id,
        parent_level + 1,
        parent_path || NEW.id
      );
    END;
  ELSE
    -- Usuário sem indicação (nível 1)
    INSERT INTO user_network (user_id, parent_id, level, path)
    VALUES (NEW.id, NULL, 1, ARRAY[NEW.id]);
  END IF;

  RETURN NEW;
END;
$$;

-- 7. Trigger para chamar a função ao criar usuário
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- 8. Atualizar user_roles para referenciar auth.users (já está correto, mas garantir)
-- A tabela user_roles já referencia auth.users(id), então está ok

-- 9. Adicionar coluna para controle de migração na tabela users antiga
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS migrated_to_auth BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_user_id UUID;

-- 10. Comentários para documentação
COMMENT ON TABLE public.profiles IS 'Perfis de usuários vinculados ao auth.users do Supabase Auth';
COMMENT ON COLUMN public.profiles.id IS 'UUID do usuário, igual ao auth.users.id';
COMMENT ON COLUMN public.profiles.referred_by IS 'UUID do usuário que indicou este usuário';
COMMENT ON FUNCTION public.handle_new_auth_user() IS 'Cria automaticamente profile e entrada na rede quando usuário se registra';