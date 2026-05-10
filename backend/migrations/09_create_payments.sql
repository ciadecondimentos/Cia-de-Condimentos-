CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  mp_payment_id BIGINT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending',
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50),
  qr_code TEXT,
  qr_code_base64 TEXT,
  payer_email VARCHAR(255),
  payer_phone VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payments_mp_id ON payments(mp_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
