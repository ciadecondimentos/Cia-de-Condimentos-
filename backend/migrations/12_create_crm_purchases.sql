-- CRM Purchases History Table
CREATE TABLE IF NOT EXISTS crm_purchases (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES crm_customers(id) ON DELETE CASCADE,
  product_name VARCHAR(200) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  purchase_date DATE NOT NULL,
  payment_method VARCHAR(50), -- dinheiro, cartão, cheque, pix, etc
  payment_status VARCHAR(20) DEFAULT 'pendente', -- pendente, pago, parcial
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_crm_purchases_customer_id ON crm_purchases(customer_id);
CREATE INDEX idx_crm_purchases_purchase_date ON crm_purchases(purchase_date);
CREATE INDEX idx_crm_purchases_payment_status ON crm_purchases(payment_status);
