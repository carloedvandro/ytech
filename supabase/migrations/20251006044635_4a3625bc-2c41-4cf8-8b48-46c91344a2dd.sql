-- Adicionar coluna username à tabela users
ALTER TABLE users ADD COLUMN username text;

-- Criar índice único para username
CREATE UNIQUE INDEX users_username_key ON users(username) WHERE username IS NOT NULL;

-- Comentário explicativo
COMMENT ON COLUMN users.username IS 'Username único para links de indicação personalizados';