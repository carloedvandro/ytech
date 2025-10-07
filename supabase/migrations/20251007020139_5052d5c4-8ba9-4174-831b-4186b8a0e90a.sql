-- Primeiro, remover dados órfãos da user_network que não existem em profiles
DELETE FROM public.user_network
WHERE user_id NOT IN (SELECT id FROM public.profiles);

-- Remover constraints antigas
ALTER TABLE public.user_network DROP CONSTRAINT IF EXISTS user_network_user_id_fkey;
ALTER TABLE public.user_network DROP CONSTRAINT IF EXISTS user_network_parent_id_fkey;

-- Adicionar novas constraints apontando para profiles (que referencia auth.users)
ALTER TABLE public.user_network 
  ADD CONSTRAINT user_network_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

ALTER TABLE public.user_network 
  ADD CONSTRAINT user_network_parent_id_fkey 
  FOREIGN KEY (parent_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;