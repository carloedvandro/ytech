-- Remover funções auxiliares de migração que não são mais necessárias
DROP FUNCTION IF EXISTS public.disable_auth_trigger();
DROP FUNCTION IF EXISTS public.enable_auth_trigger();