const express = require('express');
const db = require('../db');
const router = express.Router();

// ==================== PRODUCT PROMOTIONS ====================

// GET all active product promotions
router.get('/active', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.*, pr.id as promotion_id, pr.discount_price, pr.original_price, pr.end_date
      FROM products p
      JOIN promotions pr ON p.id = pr.product_id
      WHERE pr.status = 'Ativa' AND pr.end_date > CURRENT_TIMESTAMP
      ORDER BY pr.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching active promotions:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET all promotions (admin)
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT pr.*, p.name as product_name, p.price
      FROM promotions pr
      JOIN products p ON pr.product_id = p.id
      ORDER BY pr.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching promotions:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET single promotion
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT pr.*, p.name as product_name, p.price
      FROM promotions pr
      JOIN products p ON pr.product_id = p.id
      WHERE pr.id = $1
    `, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Promotion not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching promotion:', error);
    res.status(500).json({ error: error.message });
  }
});

// CREATE new product promotion
router.post('/', async (req, res) => {
  try {
    const { product_id, discount_price, original_price, end_date, status } = req.body;
    
    if (!product_id || !discount_price || !original_price || !end_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (discount_price >= original_price) {
      return res.status(400).json({ error: 'Discount price must be less than original price' });
    }
    
    const result = await db.query(
      `INSERT INTO promotions (product_id, discount_price, original_price, end_date, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [product_id, discount_price, original_price, end_date, status || 'Ativa']
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating promotion:', error);
    res.status(500).json({ error: error.message });
  }
});

// UPDATE promotion
router.put('/:id', async (req, res) => {
  try {
    const { product_id, discount_price, original_price, end_date, status } = req.body;
    
    const checkResult = await db.query('SELECT * FROM promotions WHERE id = $1', [req.params.id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Promotion not found' });
    }
    
    const result = await db.query(
      `UPDATE promotions 
       SET product_id = $1, discount_price = $2, original_price = $3, end_date = $4, status = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [product_id, discount_price, original_price, end_date, status, req.params.id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating promotion:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE promotion
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM promotions WHERE id = $1 RETURNING *', [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Promotion not found' });
    }
    
    res.json({ message: 'Promotion deleted successfully' });
  } catch (error) {
    console.error('Error deleting promotion:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== KITS ====================

// GET all kits
router.get('/kits', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT pk.*, COUNT(kp.id) as product_count
      FROM product_kits pk
      LEFT JOIN kit_products kp ON pk.id = kp.kit_id
      GROUP BY pk.id
      ORDER BY pk.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching kits:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET single kit with products
router.get('/kits/:id', async (req, res) => {
  try {
    const kitResult = await db.query('SELECT * FROM product_kits WHERE id = $1', [req.params.id]);
    if (kitResult.rows.length === 0) {
      return res.status(404).json({ error: 'Kit not found' });
    }
    
    const productsResult = await db.query(`
      SELECT p.*, kp.quantity
      FROM kit_products kp
      JOIN products p ON kp.product_id = p.id
      WHERE kp.kit_id = $1
    `, [req.params.id]);
    
    res.json({
      ...kitResult.rows[0],
      products: productsResult.rows
    });
  } catch (error) {
    console.error('Error fetching kit:', error);
    res.status(500).json({ error: error.message });
  }
});

// CREATE new kit
router.post('/kits', async (req, res) => {
  try {
    const { name, description, kit_price, product_ids, status } = req.body;
    
    if (!name || !kit_price || !product_ids || product_ids.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Create kit
    const kitResult = await db.query(
      `INSERT INTO product_kits (name, description, kit_price, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, description || null, kit_price, status || 'Ativa']
    );
    
    const kit_id = kitResult.rows[0].id;
    
    // Add products to kit
    for (const product_id of product_ids) {
      await db.query(
        'INSERT INTO kit_products (kit_id, product_id) VALUES ($1, $2)',
        [kit_id, product_id]
      );
    }
    
    res.status(201).json(kitResult.rows[0]);
  } catch (error) {
    console.error('Error creating kit:', error);
    res.status(500).json({ error: error.message });
  }
});

// UPDATE kit
router.put('/kits/:id', async (req, res) => {
  try {
    const { name, description, kit_price, product_ids, status } = req.body;
    
    const kitResult = await db.query(
      `UPDATE product_kits 
       SET name = $1, description = $2, kit_price = $3, status = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [name, description || null, kit_price, status, req.params.id]
    );
    
    if (kitResult.rows.length === 0) {
      return res.status(404).json({ error: 'Kit not found' });
    }
    
    // Update products if provided
    if (product_ids) {
      await db.query('DELETE FROM kit_products WHERE kit_id = $1', [req.params.id]);
      
      for (const product_id of product_ids) {
        await db.query(
          'INSERT INTO kit_products (kit_id, product_id) VALUES ($1, $2)',
          [req.params.id, product_id]
        );
      }
    }
    
    res.json(kitResult.rows[0]);
  } catch (error) {
    console.error('Error updating kit:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE kit
router.delete('/kits/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM product_kits WHERE id = $1 RETURNING *', [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Kit not found' });
    }
    
    res.json({ message: 'Kit deleted successfully' });
  } catch (error) {
    console.error('Error deleting kit:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== QUANTITY PROMOTIONS ====================

// GET all quantity promotions
router.get('/quantity', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT qp.*, COUNT(qpp.id) as product_count
      FROM quantity_promotions qp
      LEFT JOIN quantity_promotion_products qpp ON qp.id = qpp.qty_promo_id
      GROUP BY qp.id
      ORDER BY qp.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching quantity promotions:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET single quantity promotion with products
router.get('/quantity/:id', async (req, res) => {
  try {
    const qtyPromoResult = await db.query(
      'SELECT * FROM quantity_promotions WHERE id = $1',
      [req.params.id]
    );
    
    if (qtyPromoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quantity promotion not found' });
    }
    
    const productsResult = await db.query(`
      SELECT p.*
      FROM quantity_promotion_products qpp
      JOIN products p ON qpp.product_id = p.id
      WHERE qpp.qty_promo_id = $1
    `, [req.params.id]);
    
    res.json({
      ...qtyPromoResult.rows[0],
      products: productsResult.rows
    });
  } catch (error) {
    console.error('Error fetching quantity promotion:', error);
    res.status(500).json({ error: error.message });
  }
});

// CREATE new quantity promotion
router.post('/quantity', async (req, res) => {
  try {
    const { name, description, min_quantity, discount_percentage, end_date, product_ids, status } = req.body;
    
    if (!name || !min_quantity || !discount_percentage || !end_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Create quantity promotion
    const result = await db.query(
      `INSERT INTO quantity_promotions (name, description, min_quantity, discount_percentage, end_date, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, description || null, min_quantity, discount_percentage, end_date, status || 'Ativa']
    );
    
    const promo_id = result.rows[0].id;
    
    // Add products to promotion if provided
    if (product_ids && product_ids.length > 0) {
      for (const product_id of product_ids) {
        await db.query(
          'INSERT INTO quantity_promotion_products (qty_promo_id, product_id) VALUES ($1, $2)',
          [promo_id, product_id]
        );
      }
    }
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating quantity promotion:', error);
    res.status(500).json({ error: error.message });
  }
});

// UPDATE quantity promotion
router.put('/quantity/:id', async (req, res) => {
  try {
    const { name, description, min_quantity, discount_percentage, end_date, product_ids, status } = req.body;
    
    const result = await db.query(
      `UPDATE quantity_promotions 
       SET name = $1, description = $2, min_quantity = $3, discount_percentage = $4, end_date = $5, status = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [name, description || null, min_quantity, discount_percentage, end_date, status, req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quantity promotion not found' });
    }
    
    // Update products if provided
    if (product_ids) {
      await db.query('DELETE FROM quantity_promotion_products WHERE qty_promo_id = $1', [req.params.id]);
      
      for (const product_id of product_ids) {
        await db.query(
          'INSERT INTO quantity_promotion_products (qty_promo_id, product_id) VALUES ($1, $2)',
          [req.params.id, product_id]
        );
      }
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating quantity promotion:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE quantity promotion
router.delete('/quantity/:id', async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM quantity_promotions WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quantity promotion not found' });
    }
    
    res.json({ message: 'Quantity promotion deleted successfully' });
  } catch (error) {
    console.error('Error deleting quantity promotion:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
