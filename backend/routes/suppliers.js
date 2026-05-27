const express = require('express');
const router = express.Router();
const db = require('../db');

// ==================== FORNECEDORES ====================

// GET: Listar todos os fornecedores com filtros
router.get('/', async (req, res) => {
  try {
    const { filter, search, sortBy = 'name' } = req.query;
    let query = 'SELECT * FROM suppliers WHERE 1=1';
    const params = [];

    // Filtros
    if (filter === 'active') {
      query += ' AND is_active = true';
    } else if (filter === 'inactive') {
      query += ' AND is_active = false';
    } else if (filter === 'debt') {
      query += ` AND id IN (
        SELECT DISTINCT supplier_id FROM supplier_purchases 
        WHERE payment_status IN ('pendente', 'parcial')
      )`;
    } else if (filter === 'new') {
      query += ' AND created_at >= NOW() - INTERVAL \'30 days\'';
    }

    // Busca por nome, telefone ou cidade
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (company_name ILIKE $${params.length} OR contact_name ILIKE $${params.length} OR phone ILIKE $${params.length} OR city ILIKE $${params.length})`;
    }

    // Ordenação
    const sortMap = {
      'name': 'company_name ASC',
      'recent': 'created_at DESC',
      'spent': '(SELECT COALESCE(SUM(total_price), 0) FROM supplier_purchases WHERE supplier_id = suppliers.id) DESC',
      'debt': '(SELECT COALESCE(SUM(CASE WHEN payment_status IN (\'pendente\', \'parcial\') THEN total_price ELSE 0 END), 0) FROM supplier_purchases WHERE supplier_id = suppliers.id) DESC'
    };
    
    query += ` ORDER BY ${sortMap[sortBy] || sortMap['name']}`;

    const result = await db.query(query, params);
    
    // Enriquecer dados com estatísticas
    const suppliers = await Promise.all(result.rows.map(async (supplier) => {
      const statsResult = await db.query(`
        SELECT 
          COUNT(*)::integer as total_purchases,
          COALESCE(CAST(SUM(total_price) AS NUMERIC(15,2)), 0) as total_spent,
          COALESCE(CAST(SUM(CASE WHEN payment_status = 'pago' THEN total_price ELSE 0 END) AS NUMERIC(15,2)), 0) as paid,
          COALESCE(CAST(SUM(CASE WHEN payment_status IN ('pendente', 'parcial') THEN total_price ELSE 0 END) AS NUMERIC(15,2)), 0) as pending,
          MAX(purchase_date) as last_purchase
        FROM supplier_purchases 
        WHERE supplier_id = $1
      `, [supplier.id]);

      return {
        ...supplier,
        stats: statsResult.rows[0]
      };
    }));

    res.json(suppliers);
  } catch (error) {
    console.error('Erro ao listar fornecedores:', error);
    res.status(500).json({ error: 'Erro ao listar fornecedores' });
  }
});

// GET: Obter fornecedor específico com histórico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Dados do fornecedor
    const supplierResult = await db.query('SELECT * FROM suppliers WHERE id = $1', [id]);
    if (supplierResult.rows.length === 0) {
      return res.status(404).json({ error: 'Fornecedor não encontrado' });
    }

    const supplier = supplierResult.rows[0];

    // Histórico de compras
    const purchasesResult = await db.query(
      'SELECT * FROM supplier_purchases WHERE supplier_id = $1 ORDER BY purchase_date DESC',
      [id]
    );

    // Estatísticas
    const statsResult = await db.query(`
      SELECT 
        COUNT(*)::integer as total_purchases,
        COALESCE(CAST(SUM(total_price) AS NUMERIC(15,2)), 0) as total_spent,
        COALESCE(CAST(SUM(CASE WHEN payment_status = 'pago' THEN total_price ELSE 0 END) AS NUMERIC(15,2)), 0) as paid,
        COALESCE(CAST(SUM(CASE WHEN payment_status IN ('pendente', 'parcial') THEN total_price ELSE 0 END) AS NUMERIC(15,2)), 0) as pending,
        COALESCE(CAST(AVG(total_price) AS NUMERIC(15,2)), 0) as average_ticket,
        MAX(purchase_date) as last_purchase,
        MIN(purchase_date) as first_purchase
      FROM supplier_purchases 
      WHERE supplier_id = $1
    `, [id]);

    // Cálculos mensais/anuais
    const yearResult = await db.query(`
      SELECT 
        COALESCE(CAST(SUM(CASE WHEN EXTRACT(YEAR FROM purchase_date) = EXTRACT(YEAR FROM NOW()) 
                   AND EXTRACT(MONTH FROM purchase_date) = EXTRACT(MONTH FROM NOW()) 
                   THEN total_price ELSE 0 END) AS NUMERIC(15,2)), 0) as this_month,
        COALESCE(CAST(SUM(CASE WHEN EXTRACT(YEAR FROM purchase_date) = EXTRACT(YEAR FROM NOW()) 
                   THEN total_price ELSE 0 END) AS NUMERIC(15,2)), 0) as this_year
      FROM supplier_purchases 
      WHERE supplier_id = $1
    `, [id]);

    res.json({
      supplier,
      purchases: purchasesResult.rows,
      stats: statsResult.rows[0],
      periodStats: yearResult.rows[0]
    });
  } catch (error) {
    console.error('Erro ao obter fornecedor:', error);
    res.status(500).json({ error: 'Erro ao obter fornecedor' });
  }
});

// POST: Criar novo fornecedor
router.post('/', async (req, res) => {
  try {
    console.log('POST /suppliers - recebido:', req.body);
    
    const {
      company_name, contact_name, phone, whatsapp, email, address, neighborhood, city, cnpj, observations, is_active
    } = req.body;

    if (!company_name) {
      return res.status(400).json({ error: 'Nome da empresa é obrigatório' });
    }

    const result = await db.query(
      `INSERT INTO suppliers 
       (company_name, contact_name, phone, whatsapp, email, address, neighborhood, city, cnpj, observations, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [company_name, contact_name || null, phone || null, whatsapp || null, email || null, address || null, neighborhood || null, city || null, cnpj || null, observations || null, is_active !== false]
    );

    console.log('Fornecedor criado com sucesso:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar fornecedor:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    });
    res.status(500).json({ 
      error: 'Erro ao criar fornecedor',
      detail: error.message 
    });
  }
});

// PUT: Atualizar fornecedor
router.put('/:id', async (req, res) => {
  try {
    console.log('PUT /suppliers/:id - id:', req.params.id, '- recebido:', req.body);
    
    const { id } = req.params;
    const {
      company_name, contact_name, phone, whatsapp, email, address, neighborhood, city, cnpj, observations, is_active
    } = req.body;

    const result = await db.query(
      `UPDATE suppliers 
       SET company_name = COALESCE($1, company_name),
           contact_name = COALESCE($2, contact_name),
           phone = COALESCE($3, phone),
           whatsapp = COALESCE($4, whatsapp),
           email = COALESCE($5, email),
           address = COALESCE($6, address),
           neighborhood = COALESCE($7, neighborhood),
           city = COALESCE($8, city),
           cnpj = COALESCE($9, cnpj),
           observations = COALESCE($10, observations),
           is_active = COALESCE($11, is_active),
           updated_at = NOW()
       WHERE id = $12
       RETURNING *`,
      [company_name, contact_name, phone, whatsapp, email, address, neighborhood, city, cnpj, observations, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Fornecedor não encontrado' });
    }

    console.log('Fornecedor atualizado com sucesso:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar fornecedor:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    });
    res.status(500).json({ 
      error: 'Erro ao atualizar fornecedor',
      detail: error.message 
    });
  }
});

// DELETE: Deletar fornecedor
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query('DELETE FROM suppliers WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Fornecedor não encontrado' });
    }

    res.json({ message: 'Fornecedor deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar fornecedor:', error);
    res.status(500).json({ error: 'Erro ao deletar fornecedor' });
  }
});

// ==================== HISTÓRICO DE COMPRAS ====================

// GET: Histórico de um fornecedor
router.get('/:id/purchases', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'SELECT * FROM supplier_purchases WHERE supplier_id = $1 ORDER BY purchase_date DESC',
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao obter compras:', error);
    res.status(500).json({ error: 'Erro ao obter compras' });
  }
});

// POST: Registrar compra/suprimento
router.post('/:id/purchases', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      product_name, quantity, unit_price, purchase_date, payment_method, payment_status, notes
    } = req.body;

    if (!product_name || !quantity || !unit_price || !purchase_date) {
      return res.status(400).json({ error: 'Campos obrigatórios não preenchidos' });
    }

    const total_price = quantity * unit_price;

    const result = await db.query(
      `INSERT INTO supplier_purchases 
       (supplier_id, product_name, quantity, unit_price, total_price, purchase_date, payment_method, payment_status, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [id, product_name, quantity, unit_price, total_price, purchase_date, payment_method, payment_status || 'pendente', notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao registrar compra:', error);
    res.status(500).json({ error: 'Erro ao registrar compra' });
  }
});

// PUT: Atualizar compra
router.put('/:id/purchases/:purchaseId', async (req, res) => {
  try {
    const { id, purchaseId } = req.params;
    const {
      product_name, quantity, unit_price, purchase_date, payment_method, payment_status, notes
    } = req.body;

    let total_price = unit_price * quantity;

    const result = await db.query(
      `UPDATE supplier_purchases 
       SET product_name = COALESCE($1, product_name),
           quantity = COALESCE($2, quantity),
           unit_price = COALESCE($3, unit_price),
           total_price = $4,
           purchase_date = COALESCE($5, purchase_date),
           payment_method = COALESCE($6, payment_method),
           payment_status = COALESCE($7, payment_status),
           notes = COALESCE($8, notes),
           updated_at = NOW()
       WHERE id = $9 AND supplier_id = $10
       RETURNING *`,
      [product_name, quantity, unit_price, total_price, purchase_date, payment_method, payment_status, notes, purchaseId, id]
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
router.delete('/:id/purchases/:purchaseId', async (req, res) => {
  try {
    const { id, purchaseId } = req.params;

    const result = await db.query(
      'DELETE FROM supplier_purchases WHERE id = $1 AND supplier_id = $2 RETURNING id',
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
