const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

function genToken(user){
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

// Middleware de autenticação
function authenticateToken(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Endpoint para confirmação de e-mail
router.post('/confirm-email', async (req, res) => {
  const { email, code } = req.body || {};
  if (!email || !code) return res.status(400).json({ error: 'Missing email or code' });
  try {
    const result = await db.query('SELECT id, email_confirmation_code, email_confirmation_expires, email_confirmed FROM users WHERE email=$1', [email]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    const user = result.rows[0];
    if (user.email_confirmed) return res.status(400).json({ error: 'Email already confirmed' });
    if (!user.email_confirmation_code || !user.email_confirmation_expires) return res.status(400).json({ error: 'No confirmation code found' });
    if (user.email_confirmation_code !== code) return res.status(400).json({ error: 'Invalid code' });
    if (new Date() > new Date(user.email_confirmation_expires)) return res.status(400).json({ error: 'Code expired' });
    await db.query('UPDATE users SET email_confirmed=true, email_confirmation_code=NULL, email_confirmation_expires=NULL WHERE id=$1', [user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao confirmar e-mail:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/register', async (req, res) => {
  const { name, cpf, phone, email, password } = req.body || {};
  if(!name || !cpf || !phone || !email || !password) return res.status(400).json({ error: 'Missing fields' });
  try{
    const exists = await db.query('select id from users where email=$1', [email]);
    if(exists.rowCount) return res.status(400).json({ error: 'Email already in use' });
    const cpfExists = await db.query('select id from users where cpf=$1', [cpf]);
    if(cpfExists.rowCount) return res.status(400).json({ error: 'CPF already registered' });
    const hash = await bcrypt.hash(password, 10);
    // Gerar código de confirmação
    const confirmationCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 dígitos
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
    const result = await db.query(
      'insert into users(name,cpf,phone,email,password_hash,email_confirmed,email_confirmation_code,email_confirmation_expires) values($1,$2,$3,$4,$5,$6,$7,$8) returning id,name,cpf,phone,email,created_at,email_confirmed,email_confirmation_code,email_confirmation_expires',
      [name, cpf, phone, email, hash, false, confirmationCode, expires]
    );
    const user = result.rows[0];
    const token = genToken(user);
    // Envio de e-mail removido - módulo não está mais disponível
    // try {
    //   await sendConfirmationEmail(user.email, confirmationCode);
    // } catch (err) {
    //   console.error('Erro ao enviar e-mail de confirmação:', err);
    // }
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, cpf: user.cpf || '', phone: user.phone || '', email_confirmed: user.email_confirmed } });
  }catch(err){
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if(!email || !password) return res.status(400).json({ error: 'Missing fields' });
  try{
    const result = await db.query('select id,name,email,cpf,phone,password_hash from users where email=$1', [email]);
    if(result.rowCount === 0) return res.status(400).json({ error: 'Invalid credentials' });
    const u = result.rows[0];
    const ok = await bcrypt.compare(password, u.password_hash);
    if(!ok) return res.status(400).json({ error: 'Invalid credentials' });
    const token = genToken(u);
    res.json({ token, user: { id: u.id, name: u.name, email: u.email, cpf: u.cpf || '', phone: u.phone || '' } });
  }catch(err){
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', async (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.split(' ')[1];
  if(!token) return res.status(401).json({ error: 'No token' });
  try{
    const payload = jwt.verify(token, JWT_SECRET);
    const result = await db.query('select id,name,email,created_at from users where id=$1', [payload.id]);
    if(result.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ user: result.rows[0] });
  }catch(err){
    console.error(err);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Listar todos os usuários/clientes
router.get('/users', async (req, res) => {
  try{
    const result = await db.query('select id,name,cpf,phone,email,created_at,total_orders,total_spent from users order by created_at desc');
    const customers = result.rows.map(u => ({
      id: u.id,
      name: u.name,
      cpf: u.cpf,
      phone: u.phone,
      email: u.email,
      total_orders: u.total_orders || 0,
      total_spent: parseFloat(u.total_spent) || 0,
      createdAt: u.created_at
    }));
    res.json(customers);
  }catch(err){
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ADMIN - Criar um novo cliente manualmente
router.post('/admin/customers', async (req, res) => {
  try {
    const { name, email, phone, cpf, address, city, state, zip, notes, total_orders, total_spent } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    // Verificar se email já existe (se fornecido)
    if (email) {
      const exists = await db.query('SELECT id FROM users WHERE email=$1', [email]);
      if (exists.rowCount > 0) {
        return res.status(400).json({ error: 'Email já cadastrado' });
      }
    }

    // Gerar uma senha aleatória para o cliente (não será usado para login)
    const randomPassword = Math.random().toString(36).slice(-8);
    const hash = await bcrypt.hash(randomPassword, 10);

    const result = await db.query(
      `INSERT INTO users(name, email, phone, cpf, password_hash, address, city, state, zip, notes, total_orders, total_spent, email_confirmed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)
       RETURNING id, name, email, phone, cpf, address, city, state, zip, notes, total_orders, total_spent, created_at`,
      [name, email || null, phone || null, cpf || null, hash, address || null, city || null, state || null, zip || null, notes || null, total_orders || 0, total_spent || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Falha ao criar cliente' });
  }
});

// ADMIN - Buscar cliente por ID
router.get('/admin/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'SELECT id, name, email, phone, cpf, address, city, state, zip, notes, total_orders, total_spent, created_at FROM users WHERE id=$1',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Falha ao buscar cliente' });
  }
});

// ADMIN - Atualizar cliente
router.put('/admin/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, cpf, address, city, state, zip, notes, total_orders, total_spent } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const result = await db.query(
      `UPDATE users 
       SET name=$1, email=$2, phone=$3, cpf=$4, address=$5, city=$6, state=$7, zip=$8, notes=$9, total_orders=$10, total_spent=$11
       WHERE id=$12
       RETURNING id, name, email, phone, cpf, address, city, state, zip, notes, total_orders, total_spent, created_at`,
      [name, email || null, phone || null, cpf || null, address || null, city || null, state || null, zip || null, notes || null, total_orders || 0, total_spent || 0, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ error: 'Falha ao atualizar cliente' });
  }
});

// ADMIN - Deletar cliente
router.delete('/admin/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query('DELETE FROM users WHERE id=$1 RETURNING id', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    res.json({ message: 'Cliente deletado com sucesso', id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: 'Falha ao deletar cliente' });
  }
});

module.exports = router;
