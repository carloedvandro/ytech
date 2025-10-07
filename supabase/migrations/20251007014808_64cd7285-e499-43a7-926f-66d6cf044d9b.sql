-- Criar função auxiliar para desabilitar/habilitar trigger durante migração
CREATE OR REPLACE FUNCTION public.disable_auth_trigger()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Desabilitar trigger que cria profile/network automaticamente
  EXECUTE 'ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created';
END;
$$;

CREATE OR REPLACE FUNCTION public.enable_auth_trigger()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Reabilitar trigger
  EXECUTE 'ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created';
END;
$$;