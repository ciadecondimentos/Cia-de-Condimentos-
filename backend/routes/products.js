const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper function to fetch product images
async function getProductImages(productId) {
  try {
    const result = await db.query(
      'SELECT image_url FROM product_images WHERE product_id = $1 ORDER BY display_order',
      [productId]
    );
    return result.rows.map(row => row.image_url);
  } catch (error) {
    console.error('Error fetching product images:', error);
    return [];
  }
}

// Helper function to enrich products with images
async function enrichProductsWithImages(products) {
  for (let product of products) {
    product.images = await getProductImages(product.id);
  }
  return products;
}

// GET all products (public - for client site)
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM products WHERE active = true ORDER BY id');
    const products = await enrichProductsWithImages(result.rows);
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET all products including inactive (admin only)
router.get('/admin/all', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM products ORDER BY id DESC');
    const products = await enrichProductsWithImages(result.rows);
    res.json(products);
  } catch (error) {
    console.error('Error fetching all products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET single product by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM products WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const product = result.rows[0];
    product.images = await getProductImages(product.id);
    
    // Adicionar imagem principal (Cloudinary) se existir
    if (product.image_url) {
      product.main_image = product.image_url;
    } else if (product.images && product.images.length > 0) {
      product.main_image = product.images[0];
    }
    
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST create product (admin)
router.post('/', async (req, res) => {
  try {
    const { name, category, price, stock, description, images, barcode, sku, weight, origin, brand, expiry, active } = req.body;

    if (!name || price === undefined || stock === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await db.query(
      `INSERT INTO products (name, category, price, stock, description, barcode, cod, weight, origin, brand, expiry, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [name, category || null, price, stock, description || '', barcode || '', cod || '', weight || '', origin || '', brand || 'Cia. Condimentos e Especiarias', expiry || '', active !== false]
    );

    const product = result.rows[0];

    // Save images if provided
    if (images && Array.isArray(images) && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        await db.query(
          'INSERT INTO product_images (product_id, image_url, display_order) VALUES ($1, $2, $3)',
          [product.id, images[i], i]
        );
      }
      product.images = images;
    } else {
      product.images = [];
    }

    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// POST add images to existing product
router.post('/:id/images', async (req, res) => {
  try {
    const { id } = req.params;
    const { images } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }

    // Check if product exists
    const product = await db.query('SELECT * FROM products WHERE id = $1', [id]);
    if (product.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get current image count
    const countResult = await db.query('SELECT COUNT(*) as count FROM product_images WHERE product_id = $1', [id]);
    let displayOrder = parseInt(countResult.rows[0].count) || 0;

    // Save new images
    for (let imageUrl of images) {
      await db.query(
        'INSERT INTO product_images (product_id, image_url, display_order) VALUES ($1, $2, $3)',
        [id, imageUrl, displayOrder]
      );
      displayOrder++;
    }

    const allImages = await getProductImages(id);
    res.json({ id, images: allImages });
  } catch (error) {
    console.error('Error adding images to product:', error);
    res.status(500).json({ error: 'Failed to add images' });
  }
});

// DELETE product image
router.delete('/:id/images/:imageId', async (req, res) => {
  try {
    const { id, imageId } = req.params;

    const result = await db.query(
      'DELETE FROM product_images WHERE id = $1 AND product_id = $2 RETURNING *',
      [imageId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const allImages = await getProductImages(id);
    res.json({ id, images: allImages });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// PUT update product (admin)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, price, stock, description, images, barcode, sku, weight, origin, brand, expiry, active } = req.body;

    const result = await db.query(
      `UPDATE products 
       SET name = COALESCE($1, name),
           category = COALESCE($2, category),
           price = COALESCE($3, price),
           stock = COALESCE($4, stock),
           description = COALESCE($5, description),
           barcode = COALESCE($6, barcode),
           cod = COALESCE($7, cod),
           weight = COALESCE($8, weight),
           origin = COALESCE($9, origin),
           brand = COALESCE($10, brand),
           expiry = COALESCE($11, expiry),
           active = COALESCE($12, active)
       WHERE id = $13
       RETURNING *`,
      [name, category, price, stock, description, barcode, cod, weight, origin, brand, expiry, active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = result.rows[0];

    // If images are provided, replace all images
    if (images && Array.isArray(images)) {
      // Delete old images
      await db.query('DELETE FROM product_images WHERE product_id = $1', [id]);
      
      // Insert new images
      for (let i = 0; i < images.length; i++) {
        await db.query(
          'INSERT INTO product_images (product_id, image_url, display_order) VALUES ($1, $2, $3)',
          [id, images[i], i]
        );
      }
      product.images = images;
    } else {
      product.images = await getProductImages(id);
    }

    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE product (admin)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️  Tentando deletar produto ID: ${id}`);
    
    // Check if product has order items
    console.log(`  → Verificando se produto tem itens em pedidos...`);
    const orderItemsCheck = await db.query(
      'SELECT COUNT(*) as count FROM order_items WHERE product_id = $1',
      [id]
    );
    
    if (orderItemsCheck.rows[0].count > 0) {
      console.warn(`  ⚠️  Produto #${id} está em ${orderItemsCheck.rows[0].count} item(ns) de pedidos`);
      return res.status(400).json({ 
        error: `Não é possível deletar este produto. Ele está vinculado a ${orderItemsCheck.rows[0].count} item(ns) de pedidos.`,
        code: 'PRODUCT_HAS_ORDER_ITEMS'
      });
    }
    
    // First, delete all associated images
    console.log(`  → Deletando imagens do produto...`);
    await db.query('DELETE FROM product_images WHERE product_id = $1', [id]);
    console.log(`  ✅ Imagens deletadas`);
    
    // Then delete the product
    console.log(`  → Deletando produto...`);
    const result = await db.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      console.warn(`  ⚠️  Produto #${id} não encontrado`);
      return res.status(404).json({ error: 'Product not found' });
    }

    console.log(`  ✅ Produto #${id} deletado com sucesso`);
    res.json({ message: 'Product deleted', product: result.rows[0] });
  } catch (error) {
    console.error('❌ Erro ao deletar produto:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to delete product', 
      message: error.message 
    });
  }
});

module.exports = router;
