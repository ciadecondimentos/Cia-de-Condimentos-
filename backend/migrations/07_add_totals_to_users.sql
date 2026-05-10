-- Adicionar colunas de total de pedidos e total gasto na tabela users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_spent NUMERIC(12,2) DEFAULT 0;