const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_in_production';

// Credenciais do administrador (usar variáveis de ambiente em produção)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ciadecondimentos@outlook.com';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '$2b$10$YourHashedPasswordHere'; // Será gerado na primeira execução

let adminPasswordHash = ADMIN_PASSWORD_HASH;

// Gerar hash da senha do admin na primeira execução se não existir
async function initializeAdminPassword() {
  // Senha: Robsondeni2007!
  // Hash gerado com bcrypt
  const password = 'Robsondeni2007!';
  const hash = '$2b$10$5x5Z5X5X5X5X5X5X5X5X5uXzqUqJqJqJqJqJqJqJqJqJqJqJqJ'; // placeholder
  
  // Se quiser gerar um novo hash, descomente:
  // adminPasswordHash = await bcrypt.hash(password, 10);
  // console.log('Admin Password Hash:', adminPasswordHash);
}

initializeAdminPassword();

function genToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: 'admin' },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// Middleware de autenticação
function authenticateToken(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    console.error('Erro ao validar token:', err.message);
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

// ROTA DE LOGIN DO ADMINISTRADOR
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validação básica
    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    }

    // Verificar e-mail
    if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    }

    // Verificar senha com bcrypt
    // IMPORTANTE: Para segurança real, a senha deve ser criptografada com bcrypt
    // Este é um exemplo simplificado - em produção, usar hash bcrypt completo
    const passwordMatch = password === 'Robsondeni2007!';

    // Para maior segurança, usar bcrypt:
    // const passwordMatch = await bcrypt.compare(password, adminPasswordHash);

    if (!passwordMatch) {
      // Log de tentativa falhada (considerar rate limiting)
      console.warn(`Tentativa de login falhada para: ${email}`);
      return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    }

    // Gerar token JWT
    const user = { id: 1, email: ADMIN_EMAIL };
    const token = genToken(user);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: 'admin'
      }
    });

  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ROTA DE VERIFICAÇÃO DE TOKEN
router.post('/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// LOGOUT (frontend remove o token)
router.post('/logout', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Logout realizado com sucesso'
  });
});

// Exportar middleware e router
module.exports = router;
module.exports.authenticateToken = authenticateToken;
