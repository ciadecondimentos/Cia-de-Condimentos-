-- Criar tabela de transações de fluxo de caixa
CREATE TABLE IF NOT EXISTS cashflow_transactions (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL CHECK (type IN ('entrada', 'saida')),
  category VARCHAR(50) NOT NULL CHECK (category IN ('combustivel', 'produto', 'venda', 'devolucao', 'outro')),
  description TEXT,
  value DECIMAL(10, 2) NOT NULL CHECK (value > 0),
  transaction_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_cashflow_transaction_date ON cashflow_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_cashflow_type ON cashflow_transactions(type);
CREATE INDEX IF NOT EXISTS idx_cashflow_category ON cashflow_transactions(category);
CREATE INDEX IF NOT EXISTS idx_cashflow_created_at ON cashflow_transactions(created_at);

-- Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_cashflow_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_cashflow_updated_at ON cashflow_transactions;
CREATE TRIGGER trigger_update_cashflow_updated_at
BEFORE UPDATE ON cashflow_transactions
FOR EACH ROW
EXECUTE FUNCTION update_cashflow_updated_at();
