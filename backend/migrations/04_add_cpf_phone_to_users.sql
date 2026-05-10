-- Adicionar colunas CPF e Telefone à tabela users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS cpf VARCHAR(11) UNIQUE,
ADD COLUMN IF NOT EXISTS phone VARCHAR(11);
