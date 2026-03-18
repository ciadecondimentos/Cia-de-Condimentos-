// Script para ver quais imagens faltam
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const db = require('./db');

async function checkMissingImages() {
  try {
    const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
    
    const result = await db.query('SELECT id, product_id, image_url FROM product_images ORDER BY product_id');
    const images = result.rows;
    
    console.log('📸 Verificando imagens...\n');
    console.log(`Total de registros no banco: ${images.length}`);
    console.log(`Arquivos na pasta: ${fs.readdirSync(uploadDir).length}\n`);
    
    let missing = 0;
    images.forEach(img => {
      const filename = img.image_url.split('/').pop(); // Extrai o filename da URL
      const filepath = path.join(uploadDir, filename);
      const exists = fs.existsSync(filepath);
      
      if (!exists) {
        console.log(`❌ FALTANDO: [${img.id}] Produto ${img.product_id}: ${img.image_url}`);
        missing++;
      } else {
        console.log(`✓ OK: ${filename}`);
      }
    });
    
    console.log(`\n⚠️  Total FALTANDO: ${missing} arquivos`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

checkMissingImages();
