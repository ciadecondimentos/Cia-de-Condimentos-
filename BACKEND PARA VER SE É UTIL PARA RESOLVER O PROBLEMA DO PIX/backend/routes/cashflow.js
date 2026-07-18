const express = require('express');
const router = express.Router();
const db = require('../db');

// ==================== TRANSAÇÕES ====================

// GET: Listar todas as transações com filtros opcionais
router.get('/transactions', async (req, res) => {
  try {
    const { startDate, endDate, type, category } = req.query;
    
    let query = 'SELECT * FROM cashflow_transactions WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (startDate) {
      query += ` AND transaction_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND transaction_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    if (type) {
      query += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    query += ' ORDER BY transaction_date DESC, created_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar transações:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST: Criar nova transação
router.post('/transactions', async (req, res) => {
  try {
    const { type, category, description, value, transaction_date } = req.body;

    // Validações
    if (!type || !category || !value || !transaction_date) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    if (!['entrada', 'saida'].includes(type)) {
      return res.status(400).json({ error: 'Tipo inválido (deve ser "entrada" ou "saida")' });
    }

    if (value <= 0) {
      return res.status(400).json({ error: 'Valor deve ser maior que zero' });
    }

    const validCategories = ['combustivel', 'produto', 'venda', 'devolucao', 'outro'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Categoria inválida' });
    }

    const query = `
      INSERT INTO cashflow_transactions (type, category, description, value, transaction_date, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `;

    const result = await db.query(query, [type, category, description || null, value, transaction_date]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar transação:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT: Atualizar transação
router.put('/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, category, description, value, transaction_date } = req.body;

    // Validações
    if (value !== undefined && value <= 0) {
      return res.status(400).json({ error: 'Valor deve ser maior que zero' });
    }

    if (type && !['entrada', 'saida'].includes(type)) {
      return res.status(400).json({ error: 'Tipo inválido' });
    }

    if (category) {
      const validCategories = ['combustivel', 'produto', 'venda', 'devolucao', 'outro'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ error: 'Categoria inválida' });
      }
    }

    const query = `
      UPDATE cashflow_transactions
      SET type = COALESCE($2, type),
          category = COALESCE($3, category),
          description = COALESCE($4, description),
          value = COALESCE($5, value),
          transaction_date = COALESCE($6, transaction_date),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, [id, type, category, description, value, transaction_date]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar transação:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE: Deletar transação
router.delete('/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = 'DELETE FROM cashflow_transactions WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }

    res.json({ message: 'Transação deletada com sucesso', deleted: result.rows[0] });
  } catch (error) {
    console.error('Erro ao deletar transação:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== RELATÓRIOS ====================

// GET: Resumo de fluxo de caixa por período
router.get('/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let whereClause = '';
    const params = [];

    if (startDate) {
      whereClause += ` AND transaction_date >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ` AND transaction_date <= $${params.length + 1}`;
      params.push(endDate);
    }

    const query = `
      SELECT
        type,
        category,
        COUNT(*) as count,
        SUM(value) as total,
        AVG(value) as average,
        MIN(value) as minimum,
        MAX(value) as maximum
      FROM cashflow_transactions
      WHERE 1=1 ${whereClause}
      GROUP BY type, category
      ORDER BY type DESC, total DESC
    `;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao gerar resumo:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET: Totais por tipo (entrada/saída)
router.get('/totals', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let whereClause = '';
    const params = [];

    if (startDate) {
      whereClause += ` AND transaction_date >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ` AND transaction_date <= $${params.length + 1}`;
      params.push(endDate);
    }

    const query = `
      SELECT
        type,
        COUNT(*) as count,
        SUM(value) as total
      FROM cashflow_transactions
      WHERE 1=1 ${whereClause}
      GROUP BY type
    `;

    const result = await db.query(query, params);
    
    let totalEntrada = 0;
    let totalSaida = 0;
    let countEntrada = 0;
    let countSaida = 0;

    result.rows.forEach(row => {
      if (row.type === 'entrada') {
        totalEntrada = parseFloat(row.total) || 0;
        countEntrada = row.count;
      } else if (row.type === 'saida') {
        totalSaida = parseFloat(row.total) || 0;
        countSaida = row.count;
      }
    });

    res.json({
      entrada: {
        count: countEntrada,
        total: totalEntrada
      },
      saida: {
        count: countSaida,
        total: totalSaida
      },
      saldo: totalEntrada - totalSaida
    });
  } catch (error) {
    console.error('Erro ao calcular totais:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
