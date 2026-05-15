-- Remove Foreign Key constraint from order_items.product_id
-- This allows order items to remain in the database even after their product is deleted
-- This is important for maintaining order history and audit trails

ALTER TABLE order_items 
DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;
