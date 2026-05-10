-- Add image_url column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

-- Create index on image_url for faster queries
CREATE INDEX IF NOT EXISTS idx_products_image_url ON products(image_url);

-- Add comment to explain the column
COMMENT ON COLUMN products.image_url IS 'URL da imagem do produto armazenada no Cloudinary';
