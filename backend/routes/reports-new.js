const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper to convert NUMERIC to proper numbers
function cleanData(obj) {
  if (!obj) return obj;
  const result = {};
  for (const key in obj) {
    let val = obj[key];
    if (typeof val === 'string') {
      const num = parseFloat(val);
      result[key] = isNaN(num) ? 0 : num;
    } else if (typeof val === 'number') {
      result[key] = isNaN(val) ? 0 : val;
    } else {
      result[key] = val || 0;
    }
  }
  return result;
}

// ==================== HEALTH CHECK ====================
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== GENERAL REPORT ====================
router.get('/general', async (req, res) => {
  try {
    const { period = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const sales = await db.query(`
      SELECT 
        COUNT(*)::integer as total_orders,
        COALESCE(CAST(SUM(total) AS NUMERIC(15,2)), 0)::text as total_revenue
      FROM orders WHERE created_at >= $1 AND payment_status = 'Pago'
    `, [startDate]);

    res.json({
      period,
      sales: cleanData(sales.rows[0]),
      crm: { total_customers: 0, total_spent_crm: 0 },
      suppliers: { total_suppliers: 0, total_spent_suppliers: 0 },
      paymentMethods: [],
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
