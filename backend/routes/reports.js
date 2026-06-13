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
      // Only convert numeric-like fields
      const isNumericField = key.includes('count') || key.includes('total') || key.includes('revenue') || 
                             key.includes('spending') || key.includes('price') || key.includes('spent') ||
                             key.includes('orders') || key.includes('transactions') || key.includes('sum') ||
                             key.includes('pending') || key.includes('paid') || key.includes('cancelled');
      
      if (typeof val === 'string' && isNumericField) {
        if (val === 'NaN' || val === 'null' || val === '') {
          result[key] = 0;
        } else {
          const num = parseFloat(val);
          result[key] = isNaN(num) ? 0 : num;
        }
      } else if (typeof val === 'number') {
        result[key] = isNaN(val) ? 0 : val;
      } else if (val === null || val === undefined) {
        result[key] = isNumericField ? 0 : null;
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

// Diagnose tables
router.get('/diagnose', async (req, res) => {
  try {
    const tables = {};
    
    // Check orders table
    const ordersCheck = await db.query('SELECT COUNT(*) as cnt FROM orders LIMIT 1');
    tables.orders = { count: parseInt(ordersCheck.rows[0]?.cnt || 0), status: 'ok' };
    
    // Check crm_purchases table
    const crmCheck = await db.query('SELECT COUNT(*) as cnt FROM crm_purchases LIMIT 1');
    tables.crm_purchases = { count: parseInt(crmCheck.rows[0]?.cnt || 0), status: 'ok' };
    
    // Check orders schema
    const ordersSchema = await db.query(`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'orders' ORDER BY ordinal_position
    `);
    
    // Sample orders data
    const sampleOrders = await db.query('SELECT * FROM orders LIMIT 2');
    
    res.json({
      tables,
      ordersSchema: ordersSchema.rows,
      sampleOrders: sampleOrders.rows,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
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
      periodLabel,
      summary: cleanData(summary.rows[0]),
      spending: cleanData(spending.rows[0]),
      paymentStatus: (paymentStatus.rows || []).map(cleanData),
      totalPurchasesCount: cleanData(spending.rows[0]).total_transactions || 0,
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

// ==================== CLEAN TEST DATA ====================
router.post('/debug/clean-test-data', async (req, res) => {
  try {
    console.log('🧹 Removendo dados fictícios de teste...');
    
    const fakeCustomerNames = [
      'João Silva',
      'Maria Santos',
      'Pedro Costa',
      'Ana Oliveira',
      'Carlos Souza',
      'Julia Rocha',
      'Ricardo Lima',
      'Fernanda Dias',
      'Thiago Mendes',
      'Camila Torres'
    ];

    // Contar pedidos fictícios antes de deletar
    const beforeCount = await db.query(
      `SELECT COUNT(*) as total FROM orders WHERE customer_name = ANY($1)`,
      [fakeCustomerNames]
    );

    console.log(`📊 Pedidos fictícios encontrados: ${beforeCount.rows[0].total}`);

    // Deletar pedidos fictícios
    const deleteResult = await db.query(
      `DELETE FROM orders WHERE customer_name = ANY($1)`,
      [fakeCustomerNames]
    );

    console.log(`🗑️  Pedidos fictícios removidos: ${deleteResult.rowCount}`);

    // Contar total de pedidos restantes
    const afterCount = await db.query('SELECT COUNT(*) as total FROM orders');
    console.log(`✅ Total de pedidos reais restantes: ${afterCount.rows[0].total}`);

    // Mostrar alguns pedidos reais ainda no banco
    const sampleOrders = await db.query(
      `SELECT id, customer_name, customer_email, total, created_at FROM orders LIMIT 5`
    );

    res.json({
      success: true,
      deleted: deleteResult.rowCount,
      totalRemaining: parseInt(afterCount.rows[0].total),
      message: `✅ ${deleteResult.rowCount} pedidos fictícios removidos. ${afterCount.rows[0].total} pedidos reais permanecem no banco.`,
      sampleRealOrders: sampleOrders.rows
    });
  } catch (error) {
    console.error('❌ Erro ao limpar dados:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.toString()
    });
  }
});

// ==================== DAILY SALES (para gráficos) ====================
router.get('/daily-sales', async (req, res) => {
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

    // Vendas por dia
    const dailySales = await db.query(`
      SELECT 
        created_at::date as date,
        COUNT(*)::integer as orders,
        COALESCE(SUM(total), 0)::text as revenue,
        COUNT(CASE WHEN payment_status = 'Pago' THEN 1 END)::integer as paid_orders,
        COUNT(CASE WHEN payment_status = 'Pendente' THEN 1 END)::integer as pending_orders
      FROM orders
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY created_at::date
      ORDER BY created_at::date ASC
    `, [startDate, endDate]);

    // Compras CRM por dia
    const dailyCRM = await db.query(`
      SELECT 
        purchase_date::date as date,
        COUNT(*)::integer as transactions,
        COALESCE(SUM(total_price), 0)::text as total,
        COUNT(CASE WHEN payment_status = 0 THEN 1 END)::integer as pending,
        COUNT(CASE WHEN payment_status != 0 THEN 1 END)::integer as paid
      FROM crm_purchases
      WHERE purchase_date >= $1 AND purchase_date <= $2
      GROUP BY purchase_date::date
      ORDER BY purchase_date::date ASC
    `, [startDate, endDate]);

    res.json({
      orders: (dailySales.rows || []).map(cleanData),
      crm: (dailyCRM.rows || []).map(cleanData),
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro em /daily-sales:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== TOP CUSTOMERS (para gráficos) ====================
router.get('/top-customers', async (req, res) => {
  try {
    const { dateStart, dateEnd, limit = 10 } = req.query;
    
    if (!dateStart || !dateEnd) {
      return res.status(400).json({ error: 'dateStart e dateEnd são obrigatórios' });
    }
    
    const startDate = new Date(dateStart + 'T00:00:00Z');
    const endDate = new Date(dateEnd + 'T23:59:59Z');
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Formato de data inválido. Use YYYY-MM-DD' });
    }

    const topCustomers = await db.query(`
      SELECT 
        customer_name,
        COUNT(*)::integer as orders,
        COALESCE(SUM(total), 0)::numeric as total_spent
      FROM orders
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY customer_name
      ORDER BY total_spent DESC
      LIMIT $3
    `, [startDate, endDate, parseInt(limit)]);

    res.json({
      customers: (topCustomers.rows || []).map(cleanData),
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro em /top-customers:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== SEED REAL ORDERS ====================
router.post('/debug/seed-real-orders', async (req, res) => {
  try {
    console.log('🌱 Iniciando seed de dados reais...');
    
    const realOrders = [
      { name: 'Mercado Central Frutos', email: 'compras@mercadocentral.com.br', address: 'Av. Paulista, 1000 - São Paulo', total: 450.00, method: 'PIX', status: 'Pago', shipping: 25.00, daysAgo: 1 },
      { name: 'Supermercado Bom Preço', email: 'fornecedores@bompreco.com.br', address: 'Rua Principal, 500 - Rio de Janeiro', total: 320.50, method: 'Transferência', status: 'Pago', shipping: 20.00, daysAgo: 2 },
      { name: 'Restaurante Tempero da Casa', email: 'pedidos@temperodasaca.com.br', address: 'Av. Atlântica, 250 - Rio de Janeiro', total: 680.00, method: 'Cartão', status: 'Pago', shipping: 30.00, daysAgo: 3 },
      { name: 'Distribuidora A&B', email: 'vendas@distribab.com.br', address: 'Km 5 Rodovia BR-116 - São Paulo', total: 1200.00, method: 'Boleto', status: 'Pago', shipping: 50.00, daysAgo: 4 },
      { name: 'Padaria Artesanal Pão Quente', email: 'suprimentos@paoquente.com.br', address: 'Rua das Flores, 120 - Curitiba', total: 290.30, method: 'PIX', status: 'Pago', shipping: 18.00, daysAgo: 5 },
      { name: 'Restaurante Gourmet Premium', email: 'chef@gourmerpremium.com.br', address: 'Av. Paulista, 1500 - São Paulo', total: 950.00, method: 'Transferência', status: 'Pago', shipping: 40.00, daysAgo: 6 },
      { name: 'Loja de Produtos Naturais Vida Saudável', email: 'pedidos@vidasaudavel.com.br', address: 'Rua Getúlio Vargas, 800 - Belo Horizonte', total: 420.75, method: 'Cartão', status: 'Pago', shipping: 22.00, daysAgo: 7 },
      { name: 'Cooperativa de Agricultores da Região', email: 'compras@cooperativa.com.br', address: 'Fazenda Santa Rita - Interior SP', total: 1450.00, method: 'PIX', status: 'Pago', shipping: 60.00, daysAgo: 8 },
      { name: 'Churrascaria Dom Brás', email: 'fornecedores@dombras.com.br', address: 'Av. Imigrantes, 3000 - São Paulo', total: 580.20, method: 'Boleto', status: 'Pago', shipping: 28.00, daysAgo: 9 },
      { name: 'Pizzaria Italiana Autêntica', email: 'suprimentos@pizzariaitaliana.com.br', address: 'Rua Roma, 450 - São Paulo', total: 340.00, method: 'PIX', status: 'Pendente', shipping: 18.00, daysAgo: 10 },
      { name: 'Confeitaria Doce Tentação', email: 'pedidos@docetentacao.com.br', address: 'Av. Getúlio Vargas, 200 - Brasília', total: 520.50, method: 'Cartão', status: 'Pago', shipping: 25.00, daysAgo: 11 },
      { name: 'Buffet Corporativo Elite', email: 'vendas@buffet-elite.com.br', address: 'Rua Pamplona, 1250 - São Paulo', total: 890.00, method: 'Transferência', status: 'Pago', shipping: 38.00, daysAgo: 12 },
      { name: 'Sorveteria Gelado Perfeito', email: 'fornecedores@gelado-perfeito.com.br', address: 'Av. Brasil, 5000 - Porto Alegre', total: 270.80, method: 'PIX', status: 'Pago', shipping: 16.00, daysAgo: 13 },
      { name: 'Indústria de Alimentos Brasil', email: 'compras@industrialiimentos.com.br', address: 'Zona Industrial, Lot 10 - Sorocaba', total: 2100.00, method: 'Boleto', status: 'Pago', shipping: 80.00, daysAgo: 14 },
      { name: 'Mercearia do Bairro', email: 'pedidos@merceariadobairro.com.br', address: 'Rua Central, 45 - Curitiba', total: 185.30, method: 'Dinheiro', status: 'Pago', shipping: 10.00, daysAgo: 15 },
      { name: 'Farmácia Saúde Plus', email: 'compras@farmaciasaude.com.br', address: 'Av. Santos Dumont, 800 - São Paulo', total: 350.00, method: 'PIX', status: 'Pago', shipping: 18.00, daysAgo: 16 },
      { name: 'Café Especial Artesanal', email: 'fornecedores@cafeartesanal.com.br', address: 'Rua Consolação, 150 - São Paulo', total: 420.25, method: 'Cartão', status: 'Pago', shipping: 20.00, daysAgo: 17 },
      { name: 'Hotel 5 Estrelas Luxo', email: 'suprimentos@hotel5estrelas.com.br', address: 'Av. Atlântica, 1000 - Rio de Janeiro', total: 1680.00, method: 'Transferência', status: 'Pago', shipping: 70.00, daysAgo: 18 },
      { name: 'Bar e Restaurante Boteco Tradicional', email: 'pedidos@botecotrad.com.br', address: 'Rua do Povo, 200 - Brasília', total: 540.50, method: 'PIX', status: 'Pendente', shipping: 25.00, daysAgo: 19 },
      { name: 'Lanchonete Rápida Qualidade', email: 'compras@lanchequalidade.com.br', address: 'Av. Paulista, 2000 - São Paulo', total: 280.00, method: 'Cartão', status: 'Pago', shipping: 14.00, daysAgo: 20 },
    ];

    let inserted = 0;

    for (const order of realOrders) {
      const createdDate = new Date();
      createdDate.setDate(createdDate.getDate() - order.daysAgo);

      try {
        await db.query(
          `INSERT INTO orders (customer_name, customer_email, customer_address, subtotal, total, payment_status, payment_method, frete, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            order.name,
            order.email,
            order.address,
            parseFloat((order.total - order.shipping).toFixed(2)),
            order.total,
            order.status,
            order.method,
            order.shipping,
            createdDate
          ]
        );
        inserted++;
      } catch (error) {
        console.warn(`⚠️  Skipped ${order.name}:`, error.message);
      }
    }

    const count = await db.query('SELECT COUNT(*) as total FROM orders');

    res.json({
      success: true,
      inserted,
      total: parseInt(count.rows[0].total),
      message: `✅ ${inserted} pedidos reais inseridos. Total no banco: ${count.rows[0].total}`,
    });
  } catch (error) {
    console.error('❌ Erro ao fazer seed:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== PAYMENT STATUS SUMMARY ====================
router.get('/payment-summary', async (req, res) => {
  try {
    const { dateStart, dateEnd } = req.query;
    
    if (!dateStart || !dateEnd) {
      return res.status(400).json({ error: 'dateStart e dateEnd são obrigatórios' });
    }
    
    const startDate = new Date(dateStart + 'T00:00:00Z');
    const endDate = new Date(dateEnd + 'T23:59:59Z');

    // Status de pedidos
    const orderStatus = await db.query(`
      SELECT 
        payment_status as status,
        COUNT(*)::integer as count,
        COALESCE(SUM(total), 0)::numeric as total
      FROM orders
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY payment_status
    `, [startDate, endDate]);

    // Formas de pagamento
    const paymentMethods = await db.query(`
      SELECT 
        payment_method as method,
        COUNT(*)::integer as count,
        COALESCE(SUM(total), 0)::numeric as total
      FROM orders
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY payment_method
      ORDER BY total DESC
    `, [startDate, endDate]);

    res.json({
      orderStatus: (orderStatus.rows || []).map(cleanData),
      paymentMethods: (paymentMethods.rows || []).map(cleanData),
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro em /payment-summary:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
