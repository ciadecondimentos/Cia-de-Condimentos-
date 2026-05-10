const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const db = require('../db');

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configurar multer para armazenar em memória
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    // Aceitar apenas imagens
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos'));
    }
  }
});

// POST /upload/product - Upload de imagem de produto
router.post('/product', upload.single('image'), async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID é obrigatório' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem foi enviada' });
    }

    console.log(`📤 Upload de imagem para produto #${productId}...`);

    // Fazer upload para Cloudinary
    const cloudinaryPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'cia-de-condimentos/products', // Organizar em pasta
          public_id: `product_${productId}_${Date.now()}`,
          resource_type: 'auto'
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(req.file.buffer);
    });

    const cloudinaryResult = await cloudinaryPromise;
    const imageUrl = cloudinaryResult.secure_url;

    console.log(`✅ Imagem uploadada para Cloudinary: ${imageUrl}`);

    // Atualizar URL no banco de dados
    const updateResult = await db.query(
      'UPDATE products SET image_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [imageUrl, productId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    console.log(`✅ Produto #${productId} atualizado com nova imagem`);

    res.status(200).json({
      success: true,
      message: 'Imagem enviada com sucesso',
      product: updateResult.rows[0],
      image_url: imageUrl
    });

  } catch (error) {
    console.error('❌ Erro ao fazer upload:', error.message);
    res.status(500).json({ error: 'Erro ao enviar imagem: ' + error.message });
  }
});

// DELETE /upload/:productId - Deletar imagem de produto
router.delete('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    // Buscar produto para pegar URL da imagem
    const productResult = await db.query(
      'SELECT image_url FROM products WHERE id = $1',
      [productId]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    const imageUrl = productResult.rows[0].image_url;

    if (imageUrl) {
      // Extrair public_id da URL do Cloudinary
      // URL formato: https://res.cloudinary.com/[cloud]/image/upload/v[version]/[public_id]
      const publicIdMatch = imageUrl.match(/\/([^/]+)$/);
      if (publicIdMatch) {
        const publicId = publicIdMatch[1].split('.')[0]; // Remove extensão
        const folderPath = `cia-de-condimentos/products/${publicId}`;

        try {
          await cloudinary.uploader.destroy(folderPath);
          console.log(`🗑️ Imagem deletada do Cloudinary: ${folderPath}`);
        } catch (cloudinaryError) {
          console.warn('⚠️ Erro ao deletar imagem do Cloudinary:', cloudinaryError.message);
        }
      }
    }

    // Atualizar banco de dados
    await db.query(
      'UPDATE products SET image_url = NULL, updated_at = NOW() WHERE id = $1',
      [productId]
    );

    res.json({
      success: true,
      message: 'Imagem deletada com sucesso'
    });

  } catch (error) {
    console.error('❌ Erro ao deletar imagem:', error.message);
    res.status(500).json({ error: 'Erro ao deletar imagem: ' + error.message });
  }
});

module.exports = router;
