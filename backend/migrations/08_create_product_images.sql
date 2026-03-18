-- Create product_images table for storing multiple images per product
CREATE TABLE IF NOT EXISTS product_images (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL,
  image_url TEXT NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_display_order ON product_images(product_id, display_order);
