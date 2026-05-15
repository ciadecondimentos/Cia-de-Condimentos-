-- Create promotions table
CREATE TABLE IF NOT EXISTS promotions (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK(type IN ('percentage', 'fixed')),
  value DECIMAL(10, 2) NOT NULL,
  valid_until DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'Inativa' CHECK(status IN ('Ativa', 'Inativa', 'Expirada')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_promotions_code ON promotions(code);
CREATE INDEX idx_promotions_valid_until ON promotions(valid_until);
CREATE INDEX idx_promotions_status ON promotions(status);
