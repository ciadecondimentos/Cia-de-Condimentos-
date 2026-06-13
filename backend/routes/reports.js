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

    // CRM data
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

// ==================== DAILY SALES ====================
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
    let dailySales = [];
    try {
      const result = await db.query(`
        SELECT 
          TO_CHAR(created_at, 'YYYY-MM-DD') as date,
          COUNT(*)::integer as orders,
          COALESCE(CAST(SUM(total) AS NUMERIC(15,2)), 0)::text as revenue,
          COUNT(CASE WHEN payment_status = 'Pago' THEN 1 END)::integer as paid_orders,
          COUNT(CASE WHEN payment_status = 'Pendente' THEN 1 END)::integer as pending_orders
        FROM orders
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
        ORDER BY TO_CHAR(created_at, 'YYYY-MM-DD') ASC
      `, [startDate, endDate]);
      dailySales = (result.rows || []).map(cleanData);
    } catch (e) {
      console.error('Orders daily-sales query error:', e);
      dailySales = [];
    }

    // Compras CRM por dia
    let dailyCRM = [];
    try {
      const result = await db.query(`
        SELECT 
          TO_CHAR(purchase_date::timestamp, 'YYYY-MM-DD') as date,
          COUNT(*)::integer as transactions,
          COALESCE(CAST(SUM(total_price) AS NUMERIC(15,2)), 0)::text as total,
          COUNT(CASE WHEN payment_status = 0 THEN 1 END)::integer as pending,
          COUNT(CASE WHEN payment_status != 0 THEN 1 END)::integer as paid
        FROM crm_purchases
        WHERE purchase_date::timestamp >= $1 AND purchase_date::timestamp <= $2
        GROUP BY TO_CHAR(purchase_date::timestamp, 'YYYY-MM-DD')
        ORDER BY TO_CHAR(purchase_date::timestamp, 'YYYY-MM-DD') ASC
      `, [startDate, endDate]);
      dailyCRM = (result.rows || []).map(cleanData);
    } catch (e) {
      console.error('CRM daily-sales query error:', e);
      dailyCRM = [];
    }

    res.json({
      orders: dailySales,
      crm: dailyCRM,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro em /daily-sales:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== TOP CUSTOMERS ====================
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

// ==================== PAYMENT SUMMARY ====================
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
