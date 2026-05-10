// Script para criar imagens faltantes
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const db = require('./db');

// Emojis por categoria
const emojiMap = {
  'Pimentas': '🌶️',
  'Especiarias': '✨',
  'Ervas': '🌿',
  'Sal': '🧂',
  'Condimentos': '🍴',
  'Temperos': '🍴'
};

function generateSvg(productName, category) {
  const colors = {
    'Pimentas': '#C0392B',
    'Especiarias': '#F5C518',
    'Ervas': '#27AE60',
    'Sal': '#34495E',
    'Condimentos': '#E67E22',
    'Temperos': '#E67E22'
  };
  
  const color = colors[category] || '#3498DB';
  const emoji = emojiMap[category] || '🌯';

  return `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
        <stop offset="100%" style="stop-color:#222;stop-opacity:0.8" />
      </linearGradient>
    </defs>
    <rect width="400" height="400" fill="url(#grad1)"/>
    <circle cx="200" cy="150" r="70" fill="rgba(255,255,255,0.15)"/>
    <text x="200" y="160" font-size="90" text-anchor="middle" dominant-baseline="central">${emoji}</text>
    <rect x="40" y="250" width="320" height="110" fill="rgba(0,0,0,0.3)" rx="10"/>
    <text x="200" y="290" font-size="22" fill="white" text-anchor="middle" font-weight="bold" font-family="Arial, sans-serif" font-family="Arial">
      ${productName.substring(0, 20)}
    </text>
    <text x="200" y="320" font-size="13" fill="rgba(255,255,255,0.9)" text-anchor="middle" font-family="Arial">
      ${category || 'Produto'}
    </text>
  </svg>`;
}

async function createMissingImages() {
  try {
    const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
    
    // Garantir paste
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Buscar produtos sem imagens ou com imagens faltantes
    const result = await db.query(`
      SELECT p.id, p.name, p.category, pi.id as image_id, pi.image_url
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE p.active = true
      ORDER BY p.id
    `);

    const products = result.rows;
    
    console.log('🎨 Criando imagens faltantes...\n');

    let created = 0;
    const processed = new Set();

    for (const record of products) {
      if (processed.has(record.id)) continue;
      processed.add(record.id);

      const { id, name, category, image_url } = record;

      if (image_url) {
        // Verificar se arquivo existe
        const filename = image_url.split('/').pop();
        const filepath = path.join(uploadDir, filename);

        if (!fs.existsSync(filepath)) {
          console.log(`  ⚙️  Criando: ${filename}`);
          const svg = generateSvg(name, category);
          
          // Converter SVG para PNG em base64 ou simplesmente salvar como SVG (navegadores entendem)
          // Para simplicidade, vamos salvar como SVG
          fs.writeFileSync(filepath, svg, 'utf8');
          console.log(`  ✓ Criado: ${filepath}`);
          created++;
        } else {
          console.log(`  ✓ Existe: ${filename}`);
        }
      } else {
        // Produto sem imagem, criar uma
        const svg = generateSvg(name, category);
        const filename = Date.now() + '-' + Math.round(Math.random() * 1E9) + '.svg';
        const filepath = path.join(uploadDir, filename);
        const imageUrl = `/api/uploads/${filename}`;

        fs.writeFileSync(filepath, svg, 'utf8');
        
        // Salvar no banco
        await db.query(
          'INSERT INTO product_images (product_id, image_url, display_order) VALUES ($1, $2, $3)',
          [id, imageUrl, 0]
        );

        console.log(`  ✓ Criado novo: ${filename} para "${name}"`);
        created++;
      }
    }

    console.log(`\n✅ Total criado: ${created} imagens`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createMissingImages();
