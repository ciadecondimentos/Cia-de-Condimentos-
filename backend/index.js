const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
dotenv.config();

const db = require('./db');
const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const ordersRoutes = require('./routes/orders');

// Garantir que o diretório de uploads existe
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Middleware para definir MIME types corretos
const mimeTypes = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.tiff': 'image/tiff'
};

// Servir arquivos estáticos da pasta img
app.use('/img', express.static(path.join(__dirname, '../img')));

// Servir uploads com tipos MIME corretos - ANTES das rotas da API
app.use('/uploads', express.static(uploadDir, {
  setHeaders: (res, pathname) => {
    const ext = path.extname(pathname).toLowerCase();
    if (mimeTypes[ext]) {
      res.set('Content-Type', mimeTypes[ext]);
    }
    // Adicionar headers CORS para permitir cross-origin
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
  }
}));

// Configurar multer com armazenamento local
console.log('Upload: usando armazenamento local em ' + uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Preservar extensão original
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage,
  // Aceitar qualquer tipo de arquivo de imagem
  fileFilter: (req, file, cb) => {
    // Aceitar qualquer arquivo com extensão de imagem
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico', '.tiff'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Formato de arquivo não permitido: ${ext}. Formatos permitidos: ${allowedExtensions.join(', ')}`), false);
    }
  }
});

// Rota para upload de imagem
app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    // Retornar URL baseada no filename
    if (req.file.filename) {
      // Sempre salvar URL relativa no banco de dados
      // O frontend vai resolver a URL completa conforme necessário
      const imageUrl = `/uploads/${req.file.filename}`;
      console.log('Upload salvo:', imageUrl);
      return res.json({ imageUrl });
    }

    console.error('Upload: não foi possível determinar URL da imagem', req.file);
    res.status(500).json({ error: 'Não foi possível determinar URL da imagem' });
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Servir frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

// Endpoint para corrigir URLs das imagens (remove domínio onrender se houver)
app.post('/api/fix-urls', async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE product_images 
       SET image_url = REPLACE(image_url, 'https://cia-de-condimentos.onrender.com', '')
       WHERE image_url LIKE '%onrender%'`
    );
    res.json({ 
      success: true, 
      fixed: result.rowCount,
      message: `${result.rowCount} imagem(ns) corrigida(s)`
    });
  } catch (error) {
    console.error('Erro ao corrigir URLs:', error);
    res.status(500).json({ error: error.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);

// Tratamento de erros para multer / outros
app.use((err, req, res, next) => {
  res.setHeader('Content-Type', 'application/json');

  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: 'Erro no upload: ' + err.message });
  } else if (err) {
    console.error('Erro interno:', err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
  next();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
