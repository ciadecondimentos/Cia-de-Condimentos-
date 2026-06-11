const express = require('express');
const router = express.Router();
const db = require('../db');

// ==================== CLIENTES CRM ====================

// GET: Listar todos os clientes com filtros
router.get('/customers', async (req, res) => {
  try {
    const { filter, search, sortBy = 'name' } = req.query;
    let query = 'SELECT * FROM crm_customers WHERE 1=1';
    const params = [];

    // Filtros
    if (filter === 'vip') {
      query += ' AND is_vip = true';
    } else if (filter === 'debtors') {
      query += ` AND id IN (
        SELECT DISTINCT customer_id FROM crm_purchases 
        WHERE payment_status IN ('pendente', 'parcial')
      )`;
    } else if (filter === 'inactive') {
      query += ' AND is_inactive = true';
    } else if (filter === 'new') {
      query += ' AND created_at >= NOW() - INTERVAL \'30 days\'';
    }

    // Busca por nome, telefone ou cidade
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (full_name ILIKE $${params.length} OR phone ILIKE $${params.length} OR city ILIKE $${params.length})`;
    }

    // Ordenação
    const sortMap = {
      'name': 'full_name ASC',
      'recent': 'created_at DESC',
      'spent': '(SELECT COALESCE(SUM(total_price), 0) FROM crm_purchases WHERE customer_id = crm_customers.id) DESC',
      'debt': '(SELECT COALESCE(SUM(CASE WHEN payment_status IN (\'pendente\', \'parcial\') THEN total_price ELSE 0 END), 0) FROM crm_purchases WHERE customer_id = crm_customers.id) DESC'
    };
    
    query += ` ORDER BY ${sortMap[sortBy] || sortMap['name']}`;

    const result = await db.query(query, params);
    
    console.log('📊 GET /customers:', result.rows.length, 'clientes encontrados');
    
    // Enriquecer dados com estatísticas
    const customers = await Promise.all(result.rows.map(async (customer) => {
      const statsResult = await db.query(`
        SELECT 
          COUNT(DISTINCT purchase_date)::integer as total_purchases,
          COALESCE(CAST(SUM(total_price) AS NUMERIC(15,2)), 0) as total_spent,
          COALESCE(CAST(SUM(CASE WHEN payment_status = 'pago' THEN total_price ELSE 0 END) AS NUMERIC(15,2)), 0) as paid,
          COALESCE(CAST(SUM(CASE WHEN payment_status IN ('pendente', 'parcial') THEN total_price ELSE 0 END) AS NUMERIC(15,2)), 0) as pending,
          MAX(purchase_date) as last_purchase
        FROM crm_purchases 
        WHERE customer_id = $1
      `, [customer.id]);

      const customerData = {
        ...customer,
        stats: statsResult.rows[0]
      };
      
      if (result.rows.indexOf(customer) === 0) {
        console.log('   Exemplo retornado:', customerData);
      }

      return customerData;
    }));

    console.log('✅ Total geral pago por todos clientes:', customers.reduce((sum, c) => sum + parseFloat(c.stats?.paid || 0), 0));
    console.log('✅ Total geral pendente por todos clientes:', customers.reduce((sum, c) => sum + parseFloat(c.stats?.pending || 0), 0));

    res.json(customers);
  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    res.status(500).json({ error: 'Erro ao listar clientes' });
  }
});

// GET: Obter cliente específico com histórico
router.get('/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Dados do cliente
    const customerResult = await db.query('SELECT * FROM crm_customers WHERE id = $1', [id]);
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const customer = customerResult.rows[0];

    // Histórico de compras
    const purchasesResult = await db.query(
      'SELECT * FROM crm_purchases WHERE customer_id = $1 ORDER BY purchase_date DESC',
      [id]
    );

    // Estatísticas
    const statsResult = await db.query(`
      SELECT 
        COUNT(DISTINCT purchase_date)::integer as total_purchases,
        COALESCE(CAST(SUM(total_price) AS NUMERIC(15,2)), 0) as total_spent,
        COALESCE(CAST(SUM(CASE WHEN payment_status = 'pago' THEN total_price ELSE 0 END) AS NUMERIC(15,2)), 0) as paid,
        COALESCE(CAST(SUM(CASE WHEN payment_status IN ('pendente', 'parcial') THEN total_price ELSE 0 END) AS NUMERIC(15,2)), 0) as pending,
        COALESCE(CAST(AVG(total_price) AS NUMERIC(15,2)), 0) as average_ticket,
        MAX(purchase_date) as last_purchase,
        MIN(purchase_date) as first_purchase
      FROM crm_purchases 
      WHERE customer_id = $1
    `, [id]);

    // Cálculos mensais/anuais
    const yearResult = await db.query(`
      SELECT 
        COALESCE(CAST(SUM(CASE WHEN EXTRACT(YEAR FROM purchase_date) = EXTRACT(YEAR FROM NOW()) 
                   AND EXTRACT(MONTH FROM purchase_date) = EXTRACT(MONTH FROM NOW()) 
                   THEN total_price ELSE 0 END) AS NUMERIC(15,2)), 0) as this_month,
        COALESCE(CAST(SUM(CASE WHEN EXTRACT(YEAR FROM purchase_date) = EXTRACT(YEAR FROM NOW()) 
                   THEN total_price ELSE 0 END) AS NUMERIC(15,2)), 0) as this_year
      FROM crm_purchases 
      WHERE customer_id = $1
    `, [id]);

    res.json({
      customer,
      purchases: purchasesResult.rows,
      stats: statsResult.rows[0],
      periodStats: yearResult.rows[0]
    });
  } catch (error) {
    console.error('Erro ao obter cliente:', error);
    res.status(500).json({ error: 'Erro ao obter cliente' });
  }
});

// POST: Criar novo cliente
router.post('/customers', async (req, res) => {
  try {
    console.log('POST /customers - recebido:', req.body);
    
    const {
      full_name, phone, whatsapp, address, neighborhood, city,
      observations, is_vip, birthday, credit_limit, is_inactive
    } = req.body;

    if (!full_name) {
      return res.status(400).json({ error: 'Nome completo é obrigatório' });
    }

    console.log('Criando cliente com dados:', { 
      full_name, phone, whatsapp, address, neighborhood, city, 
      observations, is_vip, birthday, credit_limit, is_inactive 
    });

    const result = await db.query(
      `INSERT INTO crm_customers 
       (full_name, phone, whatsapp, address, neighborhood, city, observations, is_vip, birthday, credit_limit, is_inactive) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [full_name, phone, whatsapp || null, address || null, neighborhood || null, city || null, observations || null, is_vip || false, birthday || null, credit_limit || 0, is_inactive || false]
    );

    console.log('Cliente criado com sucesso:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar cliente:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      fullError: error
    });
    res.status(500).json({ 
      error: 'Erro ao criar cliente',
      detail: error.message 
    });
  }
});

// PUT: Atualizar cliente
router.put('/customers/:id', async (req, res) => {
  try {
    console.log('PUT /customers/:id - id:', req.params.id, '- recebido:', req.body);
    
    const { id } = req.params;
    const {
      full_name, phone, whatsapp, address, neighborhood, city,
      observations, is_vip, birthday, credit_limit, is_inactive
    } = req.body;

    const result = await db.query(
      `UPDATE crm_customers 
       SET full_name = COALESCE($1, full_name),
           phone = COALESCE($2, phone),
           whatsapp = COALESCE($3, whatsapp),
           address = COALESCE($4, address),
           neighborhood = COALESCE($5, neighborhood),
           city = COALESCE($6, city),
           observations = COALESCE($7, observations),
           is_vip = COALESCE($8, is_vip),
           birthday = COALESCE($9, birthday),
           credit_limit = COALESCE($10, credit_limit),
           is_inactive = COALESCE($11, is_inactive),
           updated_at = NOW()
       WHERE id = $12
       RETURNING *`,
      [full_name, phone, whatsapp, address, neighborhood, city, observations, is_vip, birthday, credit_limit, is_inactive, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    console.log('Cliente atualizado com sucesso:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar cliente:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      fullError: error
    });
    res.status(500).json({ 
      error: 'Erro ao atualizar cliente',
      detail: error.message 
    });
  }
});

// DELETE: Deletar cliente
router.delete('/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query('DELETE FROM crm_customers WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    res.json({ message: 'Cliente deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar cliente:', error);
    res.status(500).json({ error: 'Erro ao deletar cliente' });
  }
});

// ==================== HISTÓRICO DE COMPRAS ====================

// GET: Histórico de um cliente
router.get('/customers/:id/purchases', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'SELECT * FROM crm_purchases WHERE customer_id = $1 ORDER BY purchase_date DESC',
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao obter compras:', error);
    res.status(500).json({ error: 'Erro ao obter compras' });
  }
});

// POST: Registrar compra manual
router.post('/customers/:id/purchases', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      product_name, quantity, unit_price, purchase_date, payment_method, payment_status, notes
    } = req.body;

    console.log('POST /purchases recebido - purchase_date:', purchase_date, 'tipo:', typeof purchase_date);

    if (!product_name || !quantity || !unit_price || !purchase_date) {
      return res.status(400).json({ error: 'Campos obrigatórios não preenchidos' });
    }

    const total_price = quantity * unit_price;

    // Corrigir problema de timezone: extrair apenas a data (YYYY-MM-DD) sem converter para UTC
    const purchaseDateOnly = purchase_date.split('T')[0];
    
    console.log('Date extraída:', purchaseDateOnly);

    const result = await db.query(
      `INSERT INTO crm_purchases 
       (customer_id, product_name, quantity, unit_price, total_price, purchase_date, payment_method, payment_status, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [id, product_name, quantity, unit_price, total_price, purchaseDateOnly, payment_method, payment_status || 'pendente', notes]
    );

    console.log('Compra salva:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao registrar compra:', error);
    res.status(500).json({ error: 'Erro ao registrar compra' });
  }
});

// PUT: Atualizar compra
router.put('/customers/:id/purchases/:purchaseId', async (req, res) => {
  try {
    const { id, purchaseId } = req.params;
    const {
      product_name, quantity, unit_price, purchase_date, payment_method, payment_status, notes
    } = req.body;

    console.log('PUT /purchases/:id - purchase_date recebido:', purchase_date);

    let total_price = unit_price * quantity;

    // Corrigir problema de timezone: extrair apenas a data (YYYY-MM-DD) sem converter para UTC
    const purchaseDateOnly = purchase_date ? purchase_date.split('T')[0] : null;
    
    console.log('PUT - Date extraída:', purchaseDateOnly);

    const result = await db.query(
      `UPDATE crm_purchases 
       SET product_name = COALESCE($1, product_name),
           quantity = COALESCE($2, quantity),
           unit_price = COALESCE($3, unit_price),
           total_price = $4,
           purchase_date = COALESCE($5, purchase_date),
           payment_method = COALESCE($6, payment_method),
           payment_status = COALESCE($7, payment_status),
           notes = COALESCE($8, notes),
           updated_at = NOW()
       WHERE id = $9 AND customer_id = $10
       RETURNING *`,
      [product_name, quantity, unit_price, total_price, purchaseDateOnly, payment_method, payment_status, notes, purchaseId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Compra não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar compra:', error);
    res.status(500).json({ error: 'Erro ao atualizar compra' });
  }
});

// DELETE: Deletar compra
router.delete('/customers/:id/purchases/:purchaseId', async (req, res) => {
  try {
    const { id, purchaseId } = req.params;

    const result = await db.query(
      'DELETE FROM crm_purchases WHERE id = $1 AND customer_id = $2 RETURNING id',
      [purchaseId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Compra não encontrada' });
    }

    res.json({ message: 'Compra deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar compra:', error);
    res.status(500).json({ error: 'Erro ao deletar compra' });
  }
});

module.exports = router;
