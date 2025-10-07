
-- Deletar registros existentes que não podem ser migrados
DELETE FROM user_roles 
WHERE user_id NOT IN (
  SELECT auth_user_id FROM users WHERE auth_user_id IS NOT NULL
);

-- Remover a foreign key antiga
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

-- Migrar user_id para os IDs do auth antes de criar a nova foreign key
UPDATE user_roles ur
SET user_id = u.auth_user_id
FROM users u
WHERE ur.user_id = u.id
AND u.auth_user_id IS NOT NULL;

-- Adicionar nova foreign key apontando para auth.users
ALTER TABLE user_roles 
ADD CONSTRAINT user_roles_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Adicionar role de admin para o usuário
INSERT INTO user_roles (user_id, role)
VALUES ('e7d1f677-4289-44c6-8ecc-3f6823f57d13', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
