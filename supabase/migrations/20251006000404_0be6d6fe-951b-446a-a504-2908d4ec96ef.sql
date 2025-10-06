-- Criar função para inserir na rede quando usuário é criado
CREATE OR REPLACE FUNCTION public.handle_new_user_network()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_path uuid[];
  parent_level integer;
BEGIN
  -- Se tem referred_by, calcular nível e caminho
  IF NEW.referred_by IS NOT NULL THEN
    -- Buscar path e level do parent
    SELECT path, level INTO parent_path, parent_level
    FROM user_network
    WHERE user_id = NEW.referred_by;
    
    -- Se parent não tem registro na rede ainda, criar primeiro
    IF parent_path IS NULL THEN
      parent_path := ARRAY[NEW.referred_by];
      parent_level := 1;
      
      INSERT INTO user_network (user_id, parent_id, level, path)
      VALUES (NEW.referred_by, NULL, 1, ARRAY[NEW.referred_by]);
    END IF;
    
    -- Inserir novo usuário na rede
    INSERT INTO user_network (user_id, parent_id, level, path)
    VALUES (
      NEW.id,
      NEW.referred_by,
      parent_level + 1,
      parent_path || NEW.id
    );
  ELSE
    -- Usuário sem indicação (nível 1)
    INSERT INTO user_network (user_id, parent_id, level, path)
    VALUES (NEW.id, NULL, 1, ARRAY[NEW.id]);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para inserir automaticamente na rede
DROP TRIGGER IF EXISTS on_user_created_network ON public.users;
CREATE TRIGGER on_user_created_network
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_network();