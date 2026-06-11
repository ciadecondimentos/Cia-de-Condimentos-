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
        SUM(CAST(total AS NUMERIC)) as sum_total,
        SUM(CAST(total_price AS NUMERIC)) as sum_total_price,
        COUNT(DISTINCT payment_status) as status_count
      FROM crm_purchases LIMIT 1
    `);
    const sample = await db.query('SELECT id, customer_id, total, total_price, payment_status, purchase_date FROM crm_purchases LIMIT 5');
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
// Temp debug endpoint
router.get('/debug/simple', async (req, res) => {
  try {
    const test1 = await db.query(`SELECT COUNT(*) as cnt FROM crm_purchases WHERE total_price IS NOT NULL`);
    const test2 = await db.query(`SELECT COUNT(*) as cnt FROM crm_purchases WHERE total_price IS NULL`);
    const test3 = await db.query(`SELECT COUNT(*) as cnt, SUM(total_price::numeric) as total FROM crm_purchases`);
    res.json({ test1: test1.rows[0], test2: test2.rows[0], test3: test3.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Debug: Check CRM purchases raw data and casting
router.get('/debug/crm-total', async (req, res) => {
  try {
    const { period = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Show first few raw records
    const rawRecords = await db.query(`
      SELECT id, total_price, payment_status, purchase_date 
      FROM crm_purchases 
      LIMIT 5
    `);

    // Try different casting approaches
    const test1 = await db.query(`
      SELECT SUM(total_price::numeric) as result FROM crm_purchases WHERE purchase_date >= $1
    `, [startDate]);

    const test2 = await db.query(`
      SELECT SUM(CAST(total_price AS NUMERIC)) as result FROM crm_purchases WHERE purchase_date >= $1
    `, [startDate]);

    const test3 = await db.query(`
      SELECT SUM(CAST(total_price AS NUMERIC)) as result FROM crm_purchases
    `);

    const test4 = await db.query(`
      SELECT COUNT(*) as cnt, SUM(CAST(total_price AS NUMERIC))::numeric as total 
      FROM crm_purchases
    `);

    res.json({
      period,
      startDate: startDate.toISOString(),
      rawRecords: rawRecords.rows,
      test1: test1.rows[0],
      test2: test2.rows[0],
      test3: test3.rows[0],
      test4: test4.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== GENERAL REPORT ====================
router.get('/general', async (req, res) => {
  try {
    const { period = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Sales from orders
    const sales = await db.query(`
      SELECT 
        COUNT(*)::integer as total_orders,
        COALESCE(CAST(SUM(total) AS NUMERIC(15,2)), 0)::text as total_revenue
      FROM orders WHERE created_at >= $1
    `, [startDate]);

    // CRM data
    // CRM data - using exact same pattern as crmPaymentStatus
    const crmData = await db.query(`
      SELECT 
        (SELECT COUNT(DISTINCT id) FROM crm_customers)::integer as total_customers,
        COALESCE(SUM(CAST(total_price AS NUMERIC)), 0)::numeric as total_spent_crm
      FROM crm_purchases
      WHERE purchase_date >= $1
    `, [startDate]);

    // CRM payment status
    const crmPaymentStatus = await db.query(`
      SELECT 
        payment_status,
        COUNT(*)::integer as count,
        COALESCE(SUM(CAST(total_price AS NUMERIC)), 0)::numeric as total
      FROM crm_purchases
      WHERE purchase_date >= $1
      GROUP BY payment_status
    `, [startDate]);

    // Suppliers data
    const suppliersData = await db.query(`
      SELECT 
        COUNT(DISTINCT s.id)::integer as total_suppliers,
        COALESCE(SUM(CAST(sp.total_price AS NUMERIC)), 0)::numeric as total_spent_suppliers
      FROM suppliers s
      LEFT JOIN supplier_purchases sp ON s.id = sp.supplier_id AND sp.purchase_date >= $1
    `, [startDate]);

    // Payment methods
    const paymentMethods = await db.query(`
      SELECT 
        payment_method,
        COUNT(*)::integer as count,
        COALESCE(CAST(SUM(total) AS NUMERIC(15,2)), 0)::text as total
      FROM orders
      WHERE created_at >= $1
      GROUP BY payment_method
    `, [startDate]);

    res.json({
      period,
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
    const { period = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const summary = await db.query(`
      SELECT 
        COUNT(*)::integer as total_orders,
        COUNT(CASE WHEN payment_status = 'Pago' THEN 1 END)::integer as paid_orders,
        COUNT(CASE WHEN payment_status = 'Pendente' THEN 1 END)::integer as pending_orders,
        0::integer as cancelled_orders,
        COALESCE(CAST(SUM(CASE WHEN payment_status = 'Pago' THEN total ELSE 0 END) AS NUMERIC(15,2)), 0)::text as total_revenue,
        COALESCE(CAST(AVG(CASE WHEN payment_status = 'Pago' THEN total ELSE 0 END) AS NUMERIC(15,2)), 0)::text as average_ticket,
        COALESCE(CAST(SUM(frete) AS NUMERIC(15,2)), 0)::text as total_shipping
      FROM orders WHERE created_at >= $1
    `, [startDate]);

    res.json({
      period,
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
    const { period = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Query 1: Summary
    const summary = await db.query(`
      SELECT 
        COUNT(*)::integer as total_customers,
        COUNT(CASE WHEN is_vip = true THEN 1 END)::integer as vip_customers,
        COUNT(CASE WHEN is_inactive = false THEN 1 END)::integer as active_customers,
        0::integer as new_customers_period
      FROM crm_customers
    `);

    // Query 2: Spending
    const spending = await db.query(`
      SELECT 
        COALESCE(CAST(SUM(total_price) AS NUMERIC(15,2)), 0)::text as total_spent,
        COUNT(*)::integer as total_transactions,
        COALESCE(CAST(AVG(total_price) AS NUMERIC(15,2)), 0)::text as average_transaction
      FROM crm_purchases
      WHERE purchase_date >= $1
    `, [startDate]);

    // Query 3: Payment status
    const paymentStatus = await db.query(`
      SELECT 
        payment_status,
        COUNT(*)::integer as count,
        COALESCE(CAST(SUM(total_price) AS NUMERIC(15,2)), 0)::text as total
      FROM crm_purchases
      WHERE purchase_date >= $1
      GROUP BY payment_status
    `, [startDate]);

    res.json({
      period,
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
    const { period = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Query 1: Summary
    const summary = await db.query(`
      SELECT 
        COUNT(*)::integer as total_suppliers,
        COUNT(CASE WHEN is_active = true THEN 1 END)::integer as active_suppliers,
        0::integer as new_suppliers_period
      FROM suppliers
    `);

    // Query 2: Spending
    const spending = await db.query(`
      SELECT 
        COALESCE(CAST(SUM(total_price) AS NUMERIC(15,2)), 0)::text as total_spent,
        COUNT(*)::integer as total_purchases,
        COALESCE(CAST(AVG(total_price) AS NUMERIC(15,2)), 0)::text as average_purchase
      FROM supplier_purchases
      WHERE purchase_date >= $1
    `, [startDate]);

    // Query 3: Payment status
    const paymentStatus = await db.query(`
      SELECT 
        payment_status,
        COUNT(*)::integer as count,
        COALESCE(CAST(SUM(total_price) AS NUMERIC(15,2)), 0)::text as total
      FROM supplier_purchases
      WHERE purchase_date >= $1
      GROUP BY payment_status
    `, [startDate]);

    res.json({
      period,
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
