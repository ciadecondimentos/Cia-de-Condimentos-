const express = require('express');
const router = express.Router();
const db = require('../db');

// POST create order (public - no authentication required)
router.post('/', async (req, res) => {
  try {
    const { customer, items, subtotal, frete, total, payment, status = 'Pendente', paymentStatus = 'Aguardando' } = req.body;

    if (!customer || !items || !subtotal || frete === undefined || !total) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { name, phone, address } = customer;
    if (!name || !phone || !address) {
      return res.status(400).json({ error: 'Name, phone and address are required' });
    }

    // Create order (email and cpf are optional)
    const orderResult = await db.query(
      `INSERT INTO orders (customer_name, customer_email, customer_phone, customer_cpf, customer_address, subtotal, frete, total, payment_method, status, payment_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, customer_name, customer_email, customer_phone, customer_cpf, customer_address, subtotal, frete, total, payment_method, status, payment_status, created_at`,
      [name, customer.email || '', phone, customer.cpf || '', address, subtotal, frete, total, payment, status, paymentStatus]
    );

    const orderId = orderResult.rows[0].id;

    // Insert order items
    for (const item of items) {
      await db.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.id, item.qty, item.price]
      );

      // Update product stock
      await db.query(
        `UPDATE products SET stock = stock - $1 WHERE id = $2`,
        [item.qty, item.id]
      );
    }

    res.status(201).json({
      id: orderResult.rows[0].id,
      ...orderResult.rows[0]
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// GET orders (admin)
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT o.*, json_agg(json_build_object('product_id', oi.product_id, 'quantity', oi.quantity, 'price', oi.price)) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       GROUP BY o.id
       ORDER BY o.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET order by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT o.*, json_agg(json_build_object('product_id', oi.product_id, 'quantity', oi.quantity, 'price', oi.price)) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.id = $1
       GROUP BY o.id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// PUT update order
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, payment_status } = req.body;

    const result = await db.query(
      `UPDATE orders 
       SET status = COALESCE($1, status),
           payment_status = COALESCE($2, payment_status)
       WHERE id = $3
       RETURNING *`,
      [status, payment_status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// DELETE order (admin)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // first remove order items
    await db.query('DELETE FROM order_items WHERE order_id = $1', [id]);
    // then remove order itself
    const result = await db.query('DELETE FROM orders WHERE id = $1 RETURNING id', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

module.exports = router;
