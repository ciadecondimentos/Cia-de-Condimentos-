const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper to convert NUMERIC to proper numbers
function cleanData(obj) {
  if (!obj) return obj;
  const result = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      let val = obj[key];
      if (typeof val === 'string') {
        if (val === 'NaN' || val === 'null' || val === '') {
          result[key] = 0;
        } else {
          const num = parseFloat(val);
          result[key] = isNaN(num) ? 0 : num;
        }
      } else if (typeof val === 'number') {
        result[key] = isNaN(val) ? 0 : val;
      } else if (val === null || val === undefined) {
        result[key] = 0;
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}

// ==================== HEALTH CHECK ====================
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Test CRM table query
router.get('/test-crm', async (req, res) => {
  try {
    const result = await db.query('SELECT COUNT(*) as cnt FROM crm_customers');
    res.json({ success: true, crm_customers: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug CRM purchases data
router.get('/debug/crm-purchases', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        COUNT(*) as total_records,
        SUM(CAST(total_price AS NUMERIC)) as sum_total_price,
        COUNT(DISTINCT payment_status) as status_count
      FROM crm_purchases LIMIT 1
    `);
    const sample = await db.query('SELECT id, customer_id, total_price, payment_status, purchase_date FROM crm_purchases LIMIT 5');
    res.json({ 
      success: true, 
      summary: result.rows[0],
      samples: sample.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Debug general report queries
router.get('/debug/general', async (req, res) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const crmData = await db.query(`
      SELECT 
        (SELECT COUNT(DISTINCT id) FROM crm_customers)::integer as total_customers,
        COALESCE(SUM(total_price::numeric), 0)::numeric as total_spent_crm
      FROM crm_purchases
      WHERE purchase_date >= $1
    `, [startDate]);

    const suppliersData = await db.query(`
      SELECT 
        COUNT(DISTINCT s.id)::integer as total_suppliers,
        COALESCE(SUM(CAST(sp.total_price AS NUMERIC)), 0)::numeric as total_spent_suppliers
      FROM suppliers s
      LEFT JOIN supplier_purchases sp ON s.id = sp.supplier_id AND sp.purchase_date >= $1
    `, [startDate]);

    res.json({
      startDate,
      crmData: crmData.rows[0],
      suppliersData: suppliersData.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List all tables
router.get('/debug/tables', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    res.json({ tables: result.rows.map(r => r.table_name) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check orders table structure
router.get('/debug/orders-structure', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'orders'
      ORDER BY ordinal_position
    `);
    const count = await db.query('SELECT COUNT(*) as total FROM orders');
    res.json({ 
      columns: result.rows,
      totalOrders: count.rows[0].total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test single order insertion
router.post('/debug/test-insert-order', async (req, res) => {
  try {
    const testOrder = {
      customer_name: 'Teste Silva',
      customer_email: 'teste@email.com',
      customer_address: 'Rua Teste, 123',
      subtotal: 100.00,
      total: 115.00,
      payment_status: 'Pago',
      payment_method: 'PIX',
      frete: 15.00
    };

    console.log('🧪 Tentando inserir pedido de teste:', testOrder);

    const result = await db.query(
      `INSERT INTO orders (customer_name, customer_email, customer_address, subtotal, total, payment_status, payment_method, frete, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING id`,
      [testOrder.customer_name, testOrder.customer_email, testOrder.customer_address, testOrder.subtotal, testOrder.total, testOrder.payment_status, testOrder.payment_method, testOrder.frete]
    );

    res.json({ 
      success: true, 
      inserted_id: result.rows[0].id,
      message: 'Pedido de teste inserido com sucesso'
    });
  } catch (error) {
    console.error('❌ Erro ao inserir teste:', error);
    res.status(500).json({ 
      error: error.message,
      code: error.code,
      detail: error.detail
    });
  }
});

// ==================== SEED TEST DATA ====================
router.post('/debug/seed-test-orders', async (req, res) => {
  try {
    console.log('🌱 Iniciando seed de dados de teste para pedidos...');
    
    const orders = [
      { customer_name: 'João Silva', customer_email: 'joao@email.com', customer_address: 'Rua A, 123', subtotal: 235.50, total: 250.50, payment_status: 'Pago', payment_method: 'PIX', frete: 15.00 },
      { customer_name: 'Maria Santos', customer_email: 'maria@email.com', customer_address: 'Rua B, 456', subtotal: 360.75, total: 380.75, payment_status: 'Pago', payment_method: 'Cartão', frete: 20.00 },
      { customer_name: 'Pedro Costa', customer_email: 'pedro@email.com', customer_address: 'Rua C, 789', subtotal: 110.00, total: 120.00, payment_status: 'Pendente', payment_method: 'Boleto', frete: 10.00 },
      { customer_name: 'Ana Oliveira', customer_email: 'ana@email.com', customer_address: 'Rua D, 321', subtotal: 525.30, total: 550.30, payment_status: 'Pago', payment_method: 'PIX', frete: 25.00 },
      { customer_name: 'Carlos Souza', customer_email: 'carlos@email.com', customer_address: 'Rua E, 654', subtotal: 185.60, total: 185.60, payment_status: 'Pendente', payment_method: 'Dinheiro', frete: 0.00 },
      { customer_name: 'Julia Rocha', customer_email: 'julia@email.com', customer_address: 'Rua F, 987', subtotal: 400.00, total: 420.00, payment_status: 'Pago', payment_method: 'Cartão', frete: 20.00 },
      { customer_name: 'Ricardo Lima', customer_email: 'ricardo@email.com', customer_address: 'Rua G, 147', subtotal: 295.45, total: 310.45, payment_status: 'Pago', payment_method: 'PIX', frete: 15.00 },
      { customer_name: 'Fernanda Dias', customer_email: 'fernanda@email.com', customer_address: 'Rua H, 258', subtotal: 87.20, total: 95.20, payment_status: 'Pendente', payment_method: 'Boleto', frete: 8.00 },
      { customer_name: 'Thiago Mendes', customer_email: 'thiago@email.com', customer_address: 'Rua I, 369', subtotal: 695.00, total: 725.00, payment_status: 'Pago', payment_method: 'PIX', frete: 30.00 },
      { customer_name: 'Camila Torres', customer_email: 'camila@email.com', customer_address: 'Rua J, 741', subtotal: 198.15, total: 210.15, payment_status: 'Pago', payment_method: 'Cartão', frete: 12.00 }
    ];

    let inserted = 0;
    let errors = [];

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const daysAgo = Math.floor(Math.random() * 20);
      const createdDate = new Date();
      createdDate.setDate(createdDate.getDate() - daysAgo);
      
      try {
        console.log(`Inserindo pedido ${i + 1}/${orders.length}: ${order.customer_name}, data: ${createdDate}`);
        const result = await db.query(
          `INSERT INTO orders (customer_name, customer_email, customer_address, subtotal, total, payment_status, payment_method, frete, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
          [order.customer_name, order.customer_email, order.customer_address, order.subtotal, order.total, order.payment_status, order.payment_method, order.frete, createdDate]
        );
        inserted++;
        console.log(`✅ Pedido ${inserted} inserido: ID=${result.rows[0].id}, ${order.customer_name}`);
      } catch (insertError) {
        console.error(`❌ Erro ao inserir pedido ${i + 1}:`, insertError.message, insertError.code, insertError.detail);
        errors.push({ index: i + 1, name: order.customer_name, error: insertError.message });
      }
    }

    const count = await db.query('SELECT COUNT(*) as total FROM orders');
    console.log(`✅ ${inserted} pedidos adicionados com sucesso. Total no banco: ${count.rows[0].total}`);

    res.json({ 
      success: true, 
      inserted, 
      total: parseInt(count.rows[0].total),
      errors: errors.length > 0 ? errors : undefined,
      message: `${inserted} de ${orders.length} pedidos inseridos com sucesso`
    });
  } catch (error) {
    console.error('❌ Erro geral ao adicionar dados de teste:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.toString()
    });
  }
});

// ==================== GENERAL REPORT ====================
router.get('/general', async (req, res) => {
  try {
    const { dateStart, dateEnd } = req.query;
    
    if (!dateStart || !dateEnd) {
      return res.status(400).json({ error: 'dateStart e dateEnd são obrigatórios' });
    }
    
    const startDate = new Date(dateStart + 'T00:00:00Z');
    const endDate = new Date(dateEnd + 'T23:59:59Z');
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Formato de data inválido. Use YYYY-MM-DD' });
    }
    
    if (startDate > endDate) {
      return res.status(400).json({ error: 'dateStart não pode ser maior que dateEnd' });
    }

    // Sales from orders
    const sales = await db.query(`
      SELECT 
        COUNT(*)::integer as total_orders,
        COALESCE(CAST(SUM(total) AS NUMERIC(15,2)), 0)::text as total_revenue
      FROM orders WHERE created_at >= $1 AND created_at <= $2
    `, [startDate, endDate]);

    // CRM data - SUM ALL payment statuses from crmPaymentStatus
    const crmData = await db.query(`
      SELECT 
        (SELECT COUNT(DISTINCT id) FROM crm_customers)::integer as total_customers,
        COALESCE((
          SELECT SUM(CAST(total_price AS NUMERIC))::numeric FROM crm_purchases WHERE purchase_date >= $1 AND purchase_date <= $2
        ), 0)::numeric as total_spent_crm
      FROM crm_purchases 
      LIMIT 1
    `, [startDate, endDate]);

    // CRM payment status
    const crmPaymentStatus = await db.query(`
      SELECT 
        payment_status,
        COUNT(*)::integer as count,
        COALESCE(SUM(CAST(total_price AS NUMERIC)), 0)::numeric as total
      FROM crm_purchases
      WHERE purchase_date >= $1 AND purchase_date <= $2
      GROUP BY payment_status
    `, [startDate, endDate]);

    // Suppliers data
    const suppliersData = await db.query(`
      SELECT 
        COUNT(DISTINCT s.id)::integer as total_suppliers,
        COALESCE(SUM(CAST(sp.total_price AS NUMERIC)), 0)::numeric as total_spent_suppliers
      FROM suppliers s
      LEFT JOIN supplier_purchases sp ON s.id = sp.supplier_id AND sp.purchase_date >= $1 AND sp.purchase_date <= $2
    `, [startDate, endDate]);

    // Payment methods
    const paymentMethods = await db.query(`
      SELECT 
        payment_method,
        COUNT(*)::integer as count,
        COALESCE(CAST(SUM(total) AS NUMERIC(15,2)), 0)::text as total
      FROM orders
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY payment_method
    `, [startDate, endDate]);

    res.json({
      sales: cleanData(sales.rows[0]),
      crm: cleanData(crmData.rows[0]),
      crmPaymentStatus: (crmPaymentStatus.rows || []).map(cleanData),
      suppliers: cleanData(suppliersData.rows[0]),
      paymentMethods: (paymentMethods.rows || []).map(cleanData),
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro em /general:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ORDERS REPORT ====================
router.get('/orders', async (req, res) => {
  try {
    const { dateStart, dateEnd } = req.query;
    
    // Validar datas
    if (!dateStart || !dateEnd) {
      return res.status(400).json({ error: 'dateStart e dateEnd são obrigatórios' });
    }
    
    const startDate = new Date(dateStart + 'T00:00:00Z');
    const endDate = new Date(dateEnd + 'T23:59:59Z');
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Formato de data inválido. Use YYYY-MM-DD' });
    }
    
    if (startDate > endDate) {
      return res.status(400).json({ error: 'dateStart não pode ser maior que dateEnd' });
    }

    const summary = await db.query(`
      SELECT 
        COUNT(*)::integer as total_orders,
        COUNT(CASE WHEN payment_status = 'Pago' THEN 1 END)::integer as paid_orders,
        COUNT(CASE WHEN payment_status = 'Pendente' THEN 1 END)::integer as pending_orders,
        COUNT(CASE WHEN payment_status = 'Cancelado' THEN 1 END)::integer as cancelled_orders,
        COALESCE(CAST(SUM(CASE WHEN payment_status = 'Pago' THEN total ELSE 0 END) AS NUMERIC(15,2)), 0)::text as total_revenue,
        COALESCE(CAST(AVG(CASE WHEN payment_status = 'Pago' THEN total ELSE 0 END) AS NUMERIC(15,2)), 0)::text as average_ticket,
        COALESCE(CAST(SUM(frete) AS NUMERIC(15,2)), 0)::text as total_shipping
      FROM orders WHERE created_at >= $1 AND created_at <= $2
    `, [startDate, endDate]);

    res.json({
      summary: cleanData(summary.rows[0]),
      byStatus: [],
      byPaymentMethod: [],
      topCustomers: [],
      dailySales: [],
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro em /orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== CRM REPORT ====================
router.get('/crm', async (req, res) => {
  try {
    const { dateStart, dateEnd } = req.query;
    
    if (!dateStart || !dateEnd) {
      return res.status(400).json({ error: 'dateStart e dateEnd são obrigatórios' });
    }
    
    const startDate = new Date(dateStart + 'T00:00:00Z');
    const endDate = new Date(dateEnd + 'T23:59:59Z');
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Formato de data inválido. Use YYYY-MM-DD' });
    }
    
    if (startDate > endDate) {
      return res.status(400).json({ error: 'dateStart não pode ser maior que dateEnd' });
    }
    
    const periodLabel = `${dateStart} a ${dateEnd}`;

    // Query 1: Summary
    const summary = await db.query(`
      SELECT 
        COUNT(*)::integer as total_customers,
        COUNT(CASE WHEN is_vip = true THEN 1 END)::integer as vip_customers,
        COUNT(CASE WHEN is_inactive = false THEN 1 END)::integer as active_customers,
        (SELECT COUNT(DISTINCT id) FROM crm_customers WHERE created_at >= $1 AND created_at <= $2)::integer as new_customers_period
      FROM crm_customers
    `, [startDate, endDate]);

    // Query 2: Spending
    const spending = await db.query(`
      SELECT 
        COALESCE(CAST(SUM(total_price) AS NUMERIC(15,2)), 0)::text as total_spent,
        COUNT(*)::integer as total_transactions,
        COALESCE(CAST(AVG(total_price) AS NUMERIC(15,2)), 0)::text as average_transaction
      FROM crm_purchases
      WHERE purchase_date >= $1 AND purchase_date <= $2
    `, [startDate, endDate]);

    // Query 3: Payment status
    const paymentStatus = await db.query(`
      SELECT 
        payment_status,
        COUNT(*)::integer as count,
        COALESCE(CAST(SUM(total_price) AS NUMERIC(15,2)), 0)::text as total
      FROM crm_purchases
      WHERE purchase_date >= $1 AND purchase_date <= $2
      GROUP BY payment_status
    `, [startDate, endDate]);

    res.json({
      period,
      periodLabel,
      summary: cleanData(summary.rows[0]),
      spending: cleanData(spending.rows[0]),
      paymentStatus: (paymentStatus.rows || []).map(cleanData),
      topCustomers: [],
      debtors: [],
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro em /crm:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// ==================== SUPPLIERS REPORT ====================
router.get('/suppliers', async (req, res) => {
  try {
    const { dateStart, dateEnd } = req.query;
    
    if (!dateStart || !dateEnd) {
      return res.status(400).json({ error: 'dateStart e dateEnd são obrigatórios' });
    }
    
    const startDate = new Date(dateStart + 'T00:00:00Z');
    const endDate = new Date(dateEnd + 'T23:59:59Z');
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Formato de data inválido. Use YYYY-MM-DD' });
    }
    
    if (startDate > endDate) {
      return res.status(400).json({ error: 'dateStart não pode ser maior que dateEnd' });
    }
    
    const periodLabel = `${dateStart} a ${dateEnd}`;

    // Query 1: Summary
    const summary = await db.query(`
      SELECT 
        COUNT(*)::integer as total_suppliers,
        COUNT(CASE WHEN is_active = true THEN 1 END)::integer as active_suppliers,
        (SELECT COUNT(DISTINCT id) FROM suppliers WHERE created_at >= $1 AND created_at <= $2)::integer as new_suppliers_period
      FROM suppliers
    `, [startDate, endDate]);

    // Query 2: Spending
    const spending = await db.query(`
      SELECT 
        COALESCE(CAST(SUM(total_price) AS NUMERIC(15,2)), 0)::text as total_spent,
        COUNT(*)::integer as total_purchases,
        COALESCE(CAST(AVG(total_price) AS NUMERIC(15,2)), 0)::text as average_purchase
      FROM supplier_purchases
      WHERE purchase_date >= $1 AND purchase_date <= $2
    `, [startDate, endDate]);

    // Query 3: Payment status
    const paymentStatus = await db.query(`
      SELECT 
        payment_status,
        COUNT(*)::integer as count,
        COALESCE(CAST(SUM(total_price) AS NUMERIC(15,2)), 0)::text as total
      FROM supplier_purchases
      WHERE purchase_date >= $1 AND purchase_date <= $2
      GROUP BY payment_status
    `, [startDate, endDate]);

    res.json({
      period,
      periodLabel,
      summary: cleanData(summary.rows[0]),
      spending: cleanData(spending.rows[0]),
      paymentStatus: (paymentStatus.rows || []).map(cleanData),
      topSuppliers: [],
      debtors: [],
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro em /suppliers:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

module.exports = router;
