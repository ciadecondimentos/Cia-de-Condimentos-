-- Suppliers/Vendors Table
CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(200) NOT NULL,
  contact_name VARCHAR(150),
  phone VARCHAR(20),
  whatsapp VARCHAR(20),
  email VARCHAR(150),
  address VARCHAR(300),
  neighborhood VARCHAR(100),
  city VARCHAR(100),
  cnpj VARCHAR(18),
  observations TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_suppliers_city ON suppliers(city);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON suppliers(is_active);
CREATE INDEX IF NOT EXISTS idx_suppliers_company_name ON suppliers(company_name);
