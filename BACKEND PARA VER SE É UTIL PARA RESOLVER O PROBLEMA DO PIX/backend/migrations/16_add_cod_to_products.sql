-- Add cod column to products table if it doesn't exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS cod VARCHAR(100);

-- Create index on cod for faster queries
CREATE INDEX IF NOT EXISTS idx_products_cod ON products(cod);

-- Add comment to explain the column
COMMENT ON COLUMN products.cod IS 'Código interno do produto';
