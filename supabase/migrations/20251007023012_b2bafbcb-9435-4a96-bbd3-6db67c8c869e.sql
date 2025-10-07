-- Adicionar coluna email na tabela profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Atualizar emails dos profiles existentes com base nos emails do auth.users
UPDATE profiles
SET email = au.email
FROM auth.users au
WHERE profiles.id = au.id
  AND (profiles.email IS NULL OR profiles.email = '');