// Script simples para gerar imagens em SVG e populr banco de dados
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const https = require('https');
dotenv.config();

const db = require('./db');

// Cores para cada categoria
const colorMap = {
  'Pimentas': '#C0392B',      // Vermelho
  'Especiarias': '#F5C518',   // Amarelo
  'Ervas': '#27AE60',          // Verde
  'Sal': '#34495E',            // Cinza
  'Temperos': '#E67E22'        // Laranja
};

function generateSvg(productName, category) {
  const color = colorMap[category] || '#3498DB';
  const emoji = {
    'Pimentas': '🌶️',
    'Especiarias': '✨',
    'Ervas': '🌿',
    'Sal': '🧂',
    'Temperos': '🍴'
  }[category] || '🌯';

  return `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
        <stop offset="100%" style="stop-color:#${parseInt(color.substring(1), 16).toString(16).padStart(6, '0')};stop-opacity:0.8" />
      </linearGradient>
    </defs>
    <rect width="400" height="400" fill="url(#grad)"/>
    <circle cx="200" cy="160" r="80" fill="rgba(255,255,255,0.1)"/>
    <text x="200" y="200" font-size="80" text-anchor="middle" dominant-baseline="central">${emoji}</text>
    <text x="200" y="300" font-size="20" fill="white" text-anchor="middle" font-weight="bold" font-family="Arial">
      ${productName}
    </text>
    <text x="200" y="330" font-size="12" fill="rgba(255,255,255,0.8)" text-anchor="middle" font-family="Arial">
      ${category || 'Produto'}
    </text>
  </svg>`;
}

async function seedImages() {
  try {
    console.log('🌱 Iniciando seed de imagens...\n');

    // Garantir que o diretório de uploads existe
    const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log(`✓ Diretório criado: ${uploadDir}\n`);
    }

    // Buscar todos os produtos
    const productsResult = await db.query('SELECT id, name, category FROM products WHERE active = true ORDER BY id');
    const products = productsResult.rows;

    if (products.length === 0) {
      console.log('⚠️  Nenhum produto encontrado no banco de dados');
      process.exit(0);
    }

    console.log(`📦 Encontrados ${products.length} produtos\n`);

    let created = 0;
    let skipped = 0;

    for (const product of products) {
      // Verificar se já tem imagens
      const imagesResult = await db.query(
        'SELECT COUNT(*) as count FROM product_images WHERE product_id = $1',
        [product.id]
      );

      if (imagesResult.rows[0].count > 0) {
        console.log(`  ⊘ "${product.name}" já tem imagem, pulando`);
        skipped++;
        continue;
      }

      // Gerar nome de arquivo único
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = `${uniqueSuffix}.svg`;
      const filePath = path.join(uploadDir, filename);

      try {
        // Gerar SVG
        const svg = generateSvg(product.name, product.category);
        fs.writeFileSync(filePath, svg, 'utf8');

        const imageUrl = `/api/uploads/${filename}`;

        // Salvar no banco de dados
        await db.query(
          'INSERT INTO product_images (product_id, image_url, display_order) VALUES ($1, $2, $3)',
          [product.id, imageUrl, 0]
        );

        console.log(`  ✓ "${product.name}" -> ${imageUrl}`);
        created++;
      } catch (error) {
        console.error(`  ✗ Erro com "${product.name}": ${error.message}`);
      }
    }

    console.log(`\n✅ Seed concluído: ${created} imagens criadas, ${skipped} puladas`);
    console.log('🎨 Imagens SVG salvas em: ' + uploadDir);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro fatal:', error.message);
    process.exit(1);
  }
}

seedImages();
