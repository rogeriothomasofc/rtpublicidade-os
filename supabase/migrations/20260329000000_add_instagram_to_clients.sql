-- Adiciona campo instagram_username na tabela clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS instagram_username text;
