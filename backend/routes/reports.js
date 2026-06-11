const express = require('express');
const router = express.Router();
const db = require('../db');

// ==================== RELATÓRIO GERAL ====================
// Consolidação de Pedidos + Clientes + Fornecedores
router.get('/general', async (req, res) => {
  try {
    const { period = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Total de Vendas (Pedidos)
    const salesResult = await db.query(`
      SELECT 
        COUNT(*)::integer as total_orders,
        COALESCE(CAST(SUM(total) AS NUMERIC(15,2)), 0) as total_revenue,
        COUNT(CASE WHEN payment_status = 'Pago' THEN 1 END)::integer as paid_orders
      FROM orders
      WHERE created_at >= $1 AND payment_status = 'Pago'
    `, [startDate]);

    // Total de Clientes CRM
    const crmResult = await db.query(`
      SELECT 
        COUNT(*)::integer as total_customers,
        COALESCE(CAST(SUM(cp.total_price) AS NUMERIC(15,2)), 0) as total_spent_crm
      FROM crm_customers cc
      LEFT JOIN crm_purchases cp ON cc.id = cp.customer_id AND cp.purchase_date >= $1
      WHERE cc.created_at >= $1
    `, [startDate]);

    // Total de Fornecedores
    const suppliersResult = await db.query(`
      SELECT 
        COUNT(*)::integer as total_suppliers,
        COALESCE(CAST(SUM(sp.total_price) AS NUMERIC(15,2)), 0) as total_spent_suppliers
      FROM suppliers s
      LEFT JOIN supplier_purchases sp ON s.id = sp.supplier_id AND sp.purchase_date >= $1
      WHERE s.created_at >= $1
    `, [startDate]);

    // Formas de pagamento (Pedidos)
    const paymentMethodsResult = await db.query(`
      SELECT 
        payment_method,
        COUNT(*)::integer as count,
        COALESCE(CAST(SUM(total) AS NUMERIC(15,2)), 0) as total
      FROM orders
      WHERE created_at >= $1 AND payment_status = 'Pago'
      GROUP BY payment_method
      ORDER BY total DESC
    `, [startDate]);

    const generalReport = {
      period,
      sales: salesResult.rows[0] || {
        total_orders: 0,
        total_revenue: 0,
        paid_orders: 0
      },
      crm: crmResult.rows[0] || {
        total_customers: 0,
        total_spent_crm: 0
      },
      suppliers: suppliersResult.rows[0] || {
        total_suppliers: 0,
        total_spent_suppliers: 0
      },
      paymentMethods: paymentMethodsResult.rows || [],
      generatedAt: new Date().toISOString()
    };

    res.json(generalReport);
  } catch (error) {
    console.error('Erro ao gerar relatório geral:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório geral', details: error.message });
  }
});

// ==================== RELATÓRIO DE PEDIDOS ====================
router.get('/orders', async (req, res) => {
  try {
    const { period = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Resumo geral de pedidos
    const summaryResult = await db.query(`
      SELECT 
        COUNT(*)::integer as total_orders,
        COUNT(CASE WHEN payment_status = 'Pago' THEN 1 END)::integer as paid_orders,
        COUNT(CASE WHEN payment_status = 'Pendente' THEN 1 END)::integer as pending_orders,
        COUNT(CASE WHEN payment_status = 'Cancelado' THEN 1 END)::integer as cancelled_orders,
        COALESCE(CAST(SUM(CASE WHEN payment_status = 'Pago' THEN total ELSE 0 END) AS NUMERIC(15,2)), 0) as total_revenue,
        COALESCE(CAST(AVG(CASE WHEN payment_status = 'Pago' THEN total ELSE 0 END) AS NUMERIC(15,2)), 0) as average_ticket,
        COALESCE(CAST(SUM(frete) AS NUMERIC(15,2)), 0) as total_shipping
      FROM orders
      WHERE created_at >= $1
    `, [startDate]);

    // Pedidos por status
    const statusResult = await db.query(`
      SELECT 
        status,
        COUNT(*)::integer as count,
        COALESCE(CAST(SUM(total) AS NUMERIC(15,2)), 0) as total
      FROM orders
      WHERE created_at >= $1
      GROUP BY status
      ORDER BY count DESC
    `, [startDate]);

    // Pedidos por método de pagamento
    const paymentMethodResult = await db.query(`
      SELECT 
        payment_method,
        COUNT(*)::integer as count,
        COUNT(CASE WHEN payment_status = 'Pago' THEN 1 END)::integer as paid_count,
        COALESCE(CAST(SUM(CASE WHEN payment_status = 'Pago' THEN total ELSE 0 END) AS NUMERIC(15,2)), 0) as total_revenue
      FROM orders
      WHERE created_at >= $1
      GROUP BY payment_method
      ORDER BY count DESC
    `, [startDate]);

    // Top clientes por pedidos
    const topCustomersResult = await db.query(`
      SELECT 
        customer_name,
        customer_email,
        customer_phone,
        COUNT(*)::integer as total_orders,
        COALESCE(CAST(SUM(total) AS NUMERIC(15,2)), 0) as total_spent,
        COUNT(CASE WHEN payment_status = 'Pago' THEN 1 END)::integer as paid_orders
      FROM orders
      WHERE created_at >= $1
      GROUP BY customer_email, customer_name, customer_phone
      ORDER BY total_spent DESC
      LIMIT 10
    `, [startDate]);

    // Evolução diária de vendas
    const dailySalesResult = await db.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*)::integer as total_orders,
        COUNT(CASE WHEN payment_status = 'Pago' THEN 1 END)::integer as paid_orders,
        COALESCE(CAST(SUM(CASE WHEN payment_status = 'Pago' THEN total ELSE 0 END) AS NUMERIC(15,2)), 0) as revenue
      FROM orders
      WHERE created_at >= $1
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `, [startDate]);

    const ordersReport = {
      period,
      summary: summaryResult.rows[0] || {
        total_orders: 0,
        paid_orders: 0,
        pending_orders: 0,
        cancelled_orders: 0,
        total_revenue: 0,
        average_ticket: 0,
        total_shipping: 0
      },
      byStatus: statusResult.rows || [],
      byPaymentMethod: paymentMethodResult.rows || [],
      topCustomers: topCustomersResult.rows || [],
      dailySales: dailySalesResult.rows || [],
      generatedAt: new Date().toISOString()
    };

    res.json(ordersReport);
  } catch (error) {
    console.error('Erro ao gerar relatório de pedidos:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório de pedidos', details: error.message });
  }
});

// ==================== RELATÓRIO DE CLIENTES (CRM) ====================
router.get('/crm', async (req, res) => {
  try {
    const { period = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    console.log('📊 Gerando relatório CRM com período:', period, 'dias');
    console.log('   Data inicial:', startDate.toISOString());

    // Resumo geral de clientes
    console.log('📝 Executando query: resumo de clientes...');
    const summaryResult = await db.query(`
      SELECT 
        COUNT(*)::integer as total_customers,
        COUNT(CASE WHEN is_vip = true THEN 1 END)::integer as vip_customers,
        COUNT(CASE WHEN is_inactive = false THEN 1 END)::integer as active_customers,
        COUNT(CASE WHEN created_at >= $1 THEN 1 END)::integer as new_customers_period
      FROM crm_customers
    `, [startDate]);

    console.log('✅ Query de resumo executada com sucesso');

    // Total gasto por clientes
    console.log('📝 Executando query: total gasto por clientes...');
    const spendingResult = await db.query(`
      SELECT 
        COALESCE(CAST(SUM(total_price) AS NUMERIC(15,2)), 0) as total_spent,
        COUNT(*)::integer as total_transactions,
        COALESCE(CAST(AVG(total_price) AS NUMERIC(15,2)), 0) as average_transaction
      FROM crm_purchases
      WHERE purchase_date >= $1
    `, [startDate]);

    console.log('✅ Query de gastos executada com sucesso');

    // Status de pagamento CRM
    console.log('📝 Executando query: status de pagamento...');
    const paymentStatusResult = await db.query(`
      SELECT 
        payment_status,
        COUNT(*)::integer as count,
        COALESCE(CAST(SUM(total_price) AS NUMERIC(15,2)), 0) as total
      FROM crm_purchases
      WHERE purchase_date >= $1
      GROUP BY payment_status
      ORDER BY total DESC
    `, [startDate]);

    console.log('✅ Query de status de pagamento executada com sucesso');

    // Garantir que sempre há os 3 status
    const allStatuses = ['pago', 'pendente', 'parcial'];
    const statusMap = {};
    (paymentStatusResult.rows || []).forEach(row => {
      statusMap[row.payment_status] = row;
    });
    const completedPaymentStatus = allStatuses.map(status => 
      statusMap[status] || { payment_status: status, count: 0, total: 0 }
    );

    // Top clientes por gasto
    console.log('📝 Executando query: top clientes...');
    const topCustomersResult = await db.query(`
      SELECT 
        cc.id,
        cc.full_name,
        cc.phone,
        cc.city,
        cc.is_vip,
        COUNT(cp.id)::integer as total_purchases,
        COALESCE(CAST(SUM(cp.total_price) AS NUMERIC(15,2)), 0) as total_spent,
        COALESCE(CAST(SUM(CASE WHEN cp.payment_status = 'pago' THEN cp.total_price ELSE 0 END) AS NUMERIC(15,2)), 0) as paid,
        COALESCE(CAST(SUM(CASE WHEN cp.payment_status IN ('pendente', 'parcial') THEN cp.total_price ELSE 0 END) AS NUMERIC(15,2)), 0) as pending
      FROM crm_customers cc
      LEFT JOIN crm_purchases cp ON cc.id = cp.customer_id AND cp.purchase_date >= $1
      GROUP BY cc.id, cc.full_name, cc.phone, cc.city, cc.is_vip
      ORDER BY total_spent DESC
      LIMIT 10
    `, [startDate]);

    console.log('✅ Query de top clientes executada com sucesso');

    // Clientes com atraso
    console.log('📝 Executando query: clientes com atraso...');
    const debtorsResult = await db.query(`
      SELECT 
        cc.id,
        cc.full_name,
        cc.phone,
        cc.city,
        COUNT(cp.id)::integer as pending_purchases,
        COALESCE(CAST(SUM(cp.total_price) AS NUMERIC(15,2)), 0) as total_debt
      FROM crm_customers cc
      LEFT JOIN crm_purchases cp ON cc.id = cp.customer_id AND cp.payment_status IN ('pendente', 'parcial')
      GROUP BY cc.id, cc.full_name, cc.phone, cc.city
      HAVING COUNT(cp.id) > 0
      ORDER BY total_debt DESC
      LIMIT 10
    `, [startDate]);

    console.log('✅ Query de devedores executada com sucesso');

    const crmReport = {
      period,
      summary: summaryResult.rows[0] || {
        total_customers: 0,
        vip_customers: 0,
        active_customers: 0,
        new_customers_period: 0
      },
      spending: spendingResult.rows[0] || {
        total_spent: 0,
        total_transactions: 0,
        average_transaction: 0
      },
      paymentStatus: completedPaymentStatus || [],
      topCustomers: topCustomersResult.rows || [],
      debtors: debtorsResult.rows || [],
      generatedAt: new Date().toISOString()
    };

    res.json(crmReport);
  } catch (error) {
    console.error('Erro ao gerar relatório CRM:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório CRM', details: error.message });
  }
});

// ==================== RELATÓRIO DE FORNECEDORES ====================
router.get('/suppliers', async (req, res) => {
  try {
    const { period = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    console.log('📊 Gerando relatório de fornecedores com período:', period, 'dias');
    console.log('   Data inicial:', startDate.toISOString());

    // Resumo geral de fornecedores
    console.log('📝 Executando query: resumo de fornecedores...');
    const summaryResult = await db.query(`
      SELECT 
        COUNT(*)::integer as total_suppliers,
        COUNT(CASE WHEN is_active = true THEN 1 END)::integer as active_suppliers,
        COUNT(CASE WHEN created_at >= $1 THEN 1 END)::integer as new_suppliers_period
      FROM suppliers
    `, [startDate]);

    console.log('✅ Query de resumo de fornecedores executada com sucesso');

    // Total gasto com fornecedores
    console.log('📝 Executando query: total gasto com fornecedores...');
    const spendingResult = await db.query(`
      SELECT 
        COALESCE(CAST(SUM(total_price) AS NUMERIC(15,2)), 0) as total_spent,
        COUNT(*)::integer as total_purchases,
        COALESCE(CAST(AVG(total_price) AS NUMERIC(15,2)), 0) as average_purchase
      FROM supplier_purchases
      WHERE purchase_date >= $1
    `, [startDate]);

    console.log('✅ Query de gasto com fornecedores executada com sucesso');

    // Status de pagamento a fornecedores
    console.log('📝 Executando query: status de pagamento de fornecedores...');
    const paymentStatusResult = await db.query(`
      SELECT 
        payment_status,
        COUNT(*)::integer as count,
        COALESCE(CAST(SUM(total_price) AS NUMERIC(15,2)), 0) as total
      FROM supplier_purchases
      WHERE purchase_date >= $1
      GROUP BY payment_status
      ORDER BY total DESC
    `, [startDate]);

    console.log('✅ Query de status de pagamento de fornecedores executada com sucesso');

    // Garantir que sempre há os 3 status
    const allStatuses = ['pago', 'pendente', 'parcial'];
    const suppStatusMap = {};
    (paymentStatusResult.rows || []).forEach(row => {
      suppStatusMap[row.payment_status] = row;
    });
    const completedSupplierPaymentStatus = allStatuses.map(status => 
      suppStatusMap[status] || { payment_status: status, count: 0, total: 0 }
    );

    // Top fornecedores por volume
    console.log('📝 Executando query: top fornecedores...');
    const topSuppliersResult = await db.query(`
      SELECT 
        s.id,
        s.company_name,
        s.contact_name,
        s.phone,
        s.city,
        s.is_active,
        COUNT(sp.id)::integer as total_purchases,
        COALESCE(CAST(SUM(sp.total_price) AS NUMERIC(15,2)), 0) as total_spent,
        COALESCE(CAST(SUM(CASE WHEN sp.payment_status = 'pago' THEN sp.total_price ELSE 0 END) AS NUMERIC(15,2)), 0) as paid,
        COALESCE(CAST(SUM(CASE WHEN sp.payment_status IN ('pendente', 'parcial') THEN sp.total_price ELSE 0 END) AS NUMERIC(15,2)), 0) as pending
      FROM suppliers s
      LEFT JOIN supplier_purchases sp ON s.id = sp.supplier_id AND sp.purchase_date >= $1
      GROUP BY s.id, s.company_name, s.contact_name, s.phone, s.city, s.is_active
      ORDER BY total_spent DESC
      LIMIT 10
    `, [startDate]);

    console.log('✅ Query de top fornecedores executada com sucesso');

    // Fornecedores com atraso
    console.log('📝 Executando query: fornecedores com atraso...');
    const debtorsResult = await db.query(`
      SELECT 
        s.id,
        s.company_name,
        s.contact_name,
        s.phone,
        s.city,
        COUNT(sp.id)::integer as pending_purchases,
        COALESCE(CAST(SUM(sp.total_price) AS NUMERIC(15,2)), 0) as total_debt
      FROM suppliers s
      LEFT JOIN supplier_purchases sp ON s.id = sp.supplier_id AND sp.payment_status IN ('pendente', 'parcial')
      GROUP BY s.id, s.company_name, s.contact_name, s.phone, s.city
      HAVING COUNT(sp.id) > 0
      ORDER BY total_debt DESC
      LIMIT 10
    `, [startDate]);

    const suppliersReport = {
      period,
      summary: summaryResult.rows[0] || {
        total_suppliers: 0,
        active_suppliers: 0,
        new_suppliers_period: 0
      },
      spending: spendingResult.rows[0] || {
        total_spent: 0,
        total_purchases: 0,
        average_purchase: 0
      },
      paymentStatus: completedSupplierPaymentStatus || [],
      topSuppliers: topSuppliersResult.rows || [],
      debtors: debtorsResult.rows || [],
      generatedAt: new Date().toISOString()
    };

    res.json(suppliersReport);
  } catch (error) {
    console.error('Erro ao gerar relatório de fornecedores:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório de fornecedores', details: error.message });
  }
});

module.exports = router;
