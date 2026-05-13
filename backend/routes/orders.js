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

    // Validate items exist in database
    for (const item of items) {
      if (!item.id || !item.qty || !item.price) {
        return res.status(400).json({ error: 'Each item must have id, qty, and price' });
      }
      
      const productExists = await db.query('SELECT id FROM products WHERE id = $1', [item.id]);
      if (productExists.rows.length === 0) {
        return res.status(400).json({ error: 'Product with id ' + item.id + ' not found' });
      }
    }

    // Create order (email is optional, send a default if not provided)
    const customerEmail = customer.email && customer.email.trim() ? customer.email : 'nao-informado@compra.local';
    const customerCpf = customer.cpf || null;

    const orderResult = await db.query(
      `INSERT INTO orders (customer_name, customer_email, customer_phone, customer_cpf, customer_address, subtotal, frete, total, payment_method, status, payment_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, customer_name, customer_email, customer_phone, customer_cpf, customer_address, subtotal, frete, total, payment_method, status, payment_status, created_at`,
      [name, customerEmail, phone, customerCpf, address, subtotal, frete, total, payment, status, paymentStatus]
    );

    const orderId = orderResult.rows[0].id;

    // Insert order items (SEM diminuir estoque ainda!)
    for (const item of items) {
      await db.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.id, item.qty, item.price]
      );

      // NÃO diminuir estoque aqui - será feito quando:
      // - PIX: pagamento aprovado (webhook)
      // - Cartão/Dinheiro: admin der baixa no pedido
    }

    res.status(201).json({
      id: orderResult.rows[0].id,
      ...orderResult.rows[0]
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order', details: error.message });
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
    const { status, payment_status, payment } = req.body;

    // Buscar pedido atual antes de atualizar
    const currentOrderResult = await db.query(
      'SELECT * FROM orders WHERE id = $1',
      [id]
    );

    if (currentOrderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const currentOrder = currentOrderResult.rows[0];
    const newPaymentStatus = payment_status || currentOrder.payment_status;

    // Atualizar pedido
    const result = await db.query(
      `UPDATE orders 
       SET status = COALESCE($1, status),
           payment_status = COALESCE($2, payment_status),
           payment = COALESCE($3, payment)
       WHERE id = $4
       RETURNING *`,
      [status, payment_status, payment, id]
    );

    // ✅ NOVO: Se admin marcou como "Pago", diminuir estoque
    if (newPaymentStatus === 'Pago' && currentOrder.payment_status !== 'Pago') {
      console.log(`💳 Admin marcou pedido #${id} como Pago - Diminuindo estoque...`);
      
      const itemsResult = await db.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
        [id]
      );

      for (const item of itemsResult.rows) {
        await db.query(
          `UPDATE products SET stock = stock - $1 WHERE id = $2`,
          [item.quantity, item.product_id]
        );
      }

      // Se for Cartão/Dinheiro, mudar status para "Confirmado"
      if (currentOrder.payment_method !== 'PIX') {
        await db.query(
          `UPDATE orders SET status = $1 WHERE id = $2`,
          ['Confirmado', id]
        );
        
        console.log(`✅ Pedido #${id} (${currentOrder.payment_method}) - Estoque baixado, Status: Confirmado`);
      }
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// POST confirm stock for non-PIX orders (admin action)
// Diminui o estoque quando admin dá baixa no pedido (Cartão ou Dinheiro)
router.post('/:id/confirm-stock', async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar o pedido
    const orderResult = await db.query(
      'SELECT payment_method FROM orders WHERE id = $1',
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    const paymentMethod = orderResult.rows[0].payment_method;

    // Apenas para Cartão e Dinheiro (não PIX, que já faz automaticamente)
    if (paymentMethod === 'PIX') {
      return res.status(400).json({ error: 'PIX já confirma estoque automaticamente quando pagamento é aprovado' });
    }

    // Buscar todos os itens do pedido
    const itemsResult = await db.query(
      'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
      [id]
    );

    if (itemsResult.rows.length === 0) {
      return res.status(404).json({ error: 'Nenhum item encontrado no pedido' });
    }

    // Diminuir estoque para cada produto
    for (const item of itemsResult.rows) {
      await db.query(
        `UPDATE products SET stock = stock - $1 WHERE id = $2`,
        [item.quantity, item.product_id]
      );
    }

    // Marcar que o estoque foi confirmado
    await db.query(
      'UPDATE orders SET status = $1 WHERE id = $2',
      ['Confirmado', id]
    );

    console.log(`✅ Estoque confirmado para pedido #${id} (${paymentMethod})`);

    res.json({
      success: true,
      message: `Estoque confirmado para o pedido #${id}`,
      order_id: id
    });

  } catch (error) {
    console.error('Erro ao confirmar estoque:', error.message);
    res.status(500).json({ error: 'Erro ao confirmar estoque: ' + error.message });
  }
});

// DELETE all orders (admin - USE WITH CAUTION!) - MUST BE BEFORE /:id route
router.delete('/delete/all', async (req, res) => {
  try {
    // Delete all order items first
    await db.query('DELETE FROM order_items');
    // Then delete all orders
    const result = await db.query('DELETE FROM orders');

    console.log(`🗑️ ADMIN: ${result.rowCount} pedidos deletados`);

    res.json({ 
      success: true,
      deleted: result.rowCount,
      message: `${result.rowCount} pedidos deletados com sucesso`
    });
  } catch (error) {
    console.error('Error deleting all orders:', error);
    res.status(500).json({ error: 'Failed to delete all orders' });
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
