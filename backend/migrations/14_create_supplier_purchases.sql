-- Supplier Purchases/Supplies History Table
CREATE TABLE IF NOT EXISTS supplier_purchases (
  id SERIAL PRIMARY KEY,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_supplier_purchases_supplier_id ON supplier_purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_purchases_purchase_date ON supplier_purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_supplier_purchases_payment_status ON supplier_purchases(payment_status);
