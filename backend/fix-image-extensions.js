// Script para atualizar URLs de imagens de .png para .svg
const dotenv = require('dotenv');
dotenv.config();

const db = require('./db');

async function fixImageExtensions() {
  try {
    console.log('🔧 Atualizando extensões de imagens...\n');

    // Encontrar todas as imagens com extensão .png
    const result = await db.query(
      `SELECT id, product_id, image_url 
       FROM product_images 
       WHERE image_url LIKE '%.png'
       ORDER BY id`
    );

    const images = result.rows;

    if (images.length === 0) {
      console.log('✓ Nenhuma imagem com extensão .png encontrada');
      process.exit(0);
    }

    let updated = 0;
    for (const img of images) {
      const newUrl = img.image_url.replace('.png', '.svg');
      await db.query(
        'UPDATE product_images SET image_url = $1 WHERE id = $2',
        [newUrl, img.id]
      );
      console.log(`  ✓ ${img.image_url} → ${newUrl}`);
      updated++;
    }

    console.log(`\n✅ Total atualizado: ${updated} registros`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

fixImageExtensions();
