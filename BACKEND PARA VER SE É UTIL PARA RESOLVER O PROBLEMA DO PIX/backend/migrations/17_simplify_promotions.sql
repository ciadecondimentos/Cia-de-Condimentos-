-- Drop old promotions table
DROP TABLE IF EXISTS promotions CASCADE;

-- Create new simplified promotions table
CREATE TABLE IF NOT EXISTS promotions (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  discount_price DECIMAL(10, 2) NOT NULL,
  original_price DECIMAL(10, 2) NOT NULL,
  start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_date TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'Ativa' CHECK(status IN ('Ativa', 'Inativa', 'Expirada')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_promotions_product ON promotions(product_id);
CREATE INDEX IF NOT EXISTS idx_promotions_end_date ON promotions(end_date);
CREATE INDEX IF NOT EXISTS idx_promotions_status ON promotions(status);

-- Create kits table
CREATE TABLE IF NOT EXISTS product_kits (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  kit_price DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'Ativa' CHECK(status IN ('Ativa', 'Inativa')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kits_status ON product_kits(status);

-- Create junction table for kit products
CREATE TABLE IF NOT EXISTS kit_products (
  id SERIAL PRIMARY KEY,
  kit_id INTEGER NOT NULL REFERENCES product_kits(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(kit_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_kit_products_kit ON kit_products(kit_id);
CREATE INDEX IF NOT EXISTS idx_kit_products_product ON kit_products(product_id);

-- Create quantity promotions table
CREATE TABLE IF NOT EXISTS quantity_promotions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  min_quantity INTEGER NOT NULL,
  discount_percentage DECIMAL(5, 2) NOT NULL,
  start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_date TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'Ativa' CHECK(status IN ('Ativa', 'Inativa', 'Expirada')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_qty_promos_end_date ON quantity_promotions(end_date);
CREATE INDEX IF NOT EXISTS idx_qty_promos_status ON quantity_promotions(status);

-- Create junction table for quantity promotions (can apply to specific categories or all products)
CREATE TABLE IF NOT EXISTS quantity_promotion_products (
  id SERIAL PRIMARY KEY,
  qty_promo_id INTEGER NOT NULL REFERENCES quantity_promotions(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(qty_promo_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_qty_promo_products ON quantity_promotion_products(qty_promo_id);
