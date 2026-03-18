// Script para gerar imagens placeholder e popular o banco de dados
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const db = require('./db');

// Usando sharp para gerar imagens (instalar: npm install sharp)
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('❌ sharp não está instalado. Execute: npm install sharp');
  process.exit(1);
}

// Cores para cada categoria
const colorMap = {
  'Pimentas': '#C0392B',      // Vermelho
  'Especiarias': '#F5C518',   // Amarelo
  'Ervas': '#27AE60',          // Verde
  'Sal': '#34495E',            // Cinza
  'Temperos': '#E67E22'        // Laranja
};

async function generatePlaceholderImage(productName, category, filename) {
  const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
  const filePath = path.join(uploadDir, filename);
  const color = colorMap[category] || '#3498DB';

  // Criar imagem PNG 400x400 com o nome do produto
  const svg = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="400" fill="${color}"/>
    <text x="200" y="150" font-size="24" fill="white" text-anchor="middle" font-weight="bold" font-family="Arial">
      ${productName}
    </text>
    <text x="200" y="200" font-size="14" fill="rgba(255,255,255,0.8)" text-anchor="middle" font-family="Arial">
      ${category || 'Produto'}
    </text>
    <circle cx="200" cy="280" r="40" fill="rgba(255,255,255,0.2)"/>
  </svg>`;

  await sharp(Buffer.from(svg)).png().toFile(filePath);
  return `/api/uploads/${filename}`;
}

async function seedImages() {
  try {
    console.log('🌱 Iniciando seed de imagens...\n');

    // Garantir que o diretório de uploads existe
    const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`✓ Diretório criado: ${uploadDir}`);
    }

    // Buscar todos os produtos
    const productsResult = await db.query('SELECT id, name, category FROM products ORDER BY id');
    const products = productsResult.rows;

    if (products.length === 0) {
      console.log('⚠️  Nenhum produto encontrado no banco de dados');
      process.exit(0);
    }

    console.log(`📦 Encontrados ${products.length} produtos\n`);

    for (const product of products) {
      console.log(`  Processando: "${product.name}" (${product.category})`);

      // Verificar se já tem imagens
      const imagesResult = await db.query(
        'SELECT COUNT(*) as count FROM product_images WHERE product_id = $1',
        [product.id]
      );

      if (imagesResult.rows[0].count > 0) {
        console.log(`    ✓ Já tem ${imagesResult.rows[0].count} imagem(ns), pulando...`);
        continue;
      }

      // Gerar nome de arquivo único
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = `${uniqueSuffix}.png`;

      // Gerar imagem
      try {
        const imageUrl = await generatePlaceholderImage(
          product.name,
          product.category,
          filename
        );

        // Salvar no banco de dados
        await db.query(
          'INSERT INTO product_images (product_id, image_url, display_order) VALUES ($1, $2, $3)',
          [product.id, imageUrl, 0]
        );

        console.log(`    ✅ Imagem criada: ${imageUrl}`);
      } catch (error) {
        console.error(`    ❌ Erro ao criar imagem: ${error.message}`);
      }
    }

    console.log('\n✅ Seed de imagens concluído!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro fatal:', error.message);
    process.exit(1);
  }
}

seedImages();
