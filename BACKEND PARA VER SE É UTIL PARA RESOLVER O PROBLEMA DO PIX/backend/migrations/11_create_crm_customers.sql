-- CRM Customers Table
CREATE TABLE IF NOT EXISTS crm_customers (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(20),
  whatsapp VARCHAR(20),
  address VARCHAR(300),
  neighborhood VARCHAR(100),
  city VARCHAR(100),
  observations TEXT,
  is_vip BOOLEAN DEFAULT FALSE,
  birthday DATE,
  credit_limit DECIMAL(10, 2) DEFAULT 0,
  is_inactive BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crm_customers_city ON crm_customers(city);
CREATE INDEX IF NOT EXISTS idx_crm_customers_is_vip ON crm_customers(is_vip);
CREATE INDEX IF NOT EXISTS idx_crm_customers_is_inactive ON crm_customers(is_inactive);
