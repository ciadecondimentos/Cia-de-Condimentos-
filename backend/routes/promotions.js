const express = require('express');
const db = require('../db');
const router = express.Router();

// GET all promotions
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM promotions ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching promotions:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET single promotion
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM promotions WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Promotion not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching promotion:', error);
    res.status(500).json({ error: error.message });
  }
});

// CREATE new promotion
router.post('/', async (req, res) => {
  try {
    const { code, description, type, value, valid_until, status, notes } = req.body;
    
    // Validations
    if (!code || !description || !type || !value || !valid_until) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!['percentage', 'fixed'].includes(type)) {
      return res.status(400).json({ error: 'Invalid promotion type' });
    }
    
    if (value <= 0) {
      return res.status(400).json({ error: 'Value must be greater than 0' });
    }
    
    const result = await db.query(
      `INSERT INTO promotions (code, description, type, value, valid_until, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [code, description, type, value, valid_until, status || 'Inativa', notes || null]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating promotion:', error);
    
    // Check for unique constraint violation
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Promotion code already exists' });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// UPDATE promotion
router.put('/:id', async (req, res) => {
  try {
    const { code, description, type, value, valid_until, status, notes } = req.body;
    
    // Check if promotion exists
    const checkResult = await db.query('SELECT * FROM promotions WHERE id = $1', [req.params.id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Promotion not found' });
    }
    
    // Validations
    if (!['percentage', 'fixed'].includes(type)) {
      return res.status(400).json({ error: 'Invalid promotion type' });
    }
    
    if (value <= 0) {
      return res.status(400).json({ error: 'Value must be greater than 0' });
    }
    
    const result = await db.query(
      `UPDATE promotions 
       SET code = $1, description = $2, type = $3, value = $4, valid_until = $5, status = $6, notes = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [code, description, type, value, valid_until, status, notes || null, req.params.id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating promotion:', error);
    
    // Check for unique constraint violation
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Promotion code already exists' });
    }
    
    res.status(500).json({ error: error.message });
  }
});

// DELETE promotion
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM promotions WHERE id = $1 RETURNING *', [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Promotion not found' });
    }
    
    res.json({ message: 'Promotion deleted successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Error deleting promotion:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET promotion by code (for validation)
router.get('/code/:code', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM promotions WHERE code = $1 AND status = 'Ativa' AND valid_until >= CURRENT_DATE`,
      [req.params.code]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Promotion not found or expired' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching promotion by code:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
