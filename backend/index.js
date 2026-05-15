const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
dotenv.config();

const db = require('./db');
const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const ordersRoutes = require('./routes/orders');
const paymentsRoutes = require('./routes/payments');
const uploadRoutes = require('./routes/upload');
const crmRoutes = require('./routes/crm');
const suppliersRoutes = require('./routes/suppliers');

// TODO: Implementar uploads com Cloudinary ou S3 depois
// const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
// }

const app = express();
// app.use(helmet()); // Desabilitar helmet pois estava bloqueando scripts inline

// Configurar CORS explicitamente para aceitar requisições do frontend
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5000',
      'http://localhost:8080',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5000',
      'http://127.0.0.1:8080',
      'https://ciadecondimentosteste.netlify.app',
      'https://cia-de-condimentos.onrender.com',
      process.env.FRONTEND_URL
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

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

// Servir arquivos estáticos da pasta frontend (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '../frontend')));

// Servir arquivos estáticos da pasta img e frontend
app.use('/img', express.static(path.join(__dirname, '../img')));
app.use(express.static(path.join(__dirname, '../frontend')));

// TODO: Servir uploads com Cloudinary ou S3 depois
// app.use('/uploads', express.static(uploadDir, {
//   setHeaders: (res, pathname) => {
//     const ext = path.extname(pathname).toLowerCase();
//     if (mimeTypes[ext]) {
//       res.set('Content-Type', mimeTypes[ext]);
//     }
//     res.set('Access-Control-Allow-Origin', '*');
//     res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
//     res.set('Access-Control-Allow-Headers', 'Content-Type');
//   }
// }));

// TODO: Implementar upload com Cloudinary/S3
// console.log('Upload: usando armazenamento local em ' + uploadDir);

// TODO: Implementar upload com Cloudinary/S3 depois
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, uploadDir);
//   },
//   filename: (req, file, cb) => {
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//     cb(null, uniqueSuffix + path.extname(file.originalname));
//   }
// });
// const upload = multer({ 
//   storage,
//   fileFilter: (req, file, cb) => {
//     const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico', '.tiff'];
//     const ext = path.extname(file.originalname).toLowerCase();
//     if (allowedExtensions.includes(ext)) {
//       cb(null, true);
//     } else {
//       cb(new Error(`Formato de arquivo não permitido: ${ext}`), false);
//     }
//   }
// });

// Dummy upload handler - TODO: usar Cloudinary/S3
const upload = { single: (field) => (req, res, next) => next() };

// TODO: Implementar rota de upload com Cloudinary/S3 depois
// app.post('/api/upload', upload.single('image'), (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ error: 'Nenhum arquivo enviado' });
//     }
//     const imageUrl = `/uploads/${req.file.filename}`;
//     console.log('Upload salvo:', imageUrl);
//     return res.json({ imageUrl });
//   } catch (error) {
//     console.error('Erro no upload:', error);
//     res.status(500).json({ error: 'Erro interno do servidor' });
//   }
// });

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
app.use('/api/payments', paymentsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/suppliers', suppliersRoutes);

// Tratamento de erros geral
app.use((err, req, res, next) => {
  res.setHeader('Content-Type', 'application/json');

  // TODO: Adicionar tratamento de multer quando implementar uploads com Cloudinary
  // if (err instanceof multer.MulterError) {
  //   return res.status(400).json({ error: 'Erro no upload: ' + err.message });
  // }
  
  if (err) {
    console.error('Erro interno:', err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

const PORT = process.env.PORT || 3000;

// Iniciar servidor com melhor tratamento de erro
const server = app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Backend URL: ${process.env.BACKEND_URL || `http://localhost:${PORT}`}`);
  console.log(`🌐 CORS enabled for: https://ciadecondimentosteste.netlify.app, localhost:*`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});
