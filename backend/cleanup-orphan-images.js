// Script para limpar referências de arquivos que não existem
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const db = require('./db');

async function cleanupOrphanImages() {
  try {
    console.log('\n🧹 LIMPANDO REFERÊNCIAS DE IMAGENS ORPHÃS\n');

    const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
    
    // Listar todos os registros de imagens no banco
    const result = await db.query('SELECT id, product_id, image_url FROM product_images ORDER BY id');
    const dbImages = result.rows;

    console.log(`📊 Total de imagens no banco: ${dbImages.length}`);
    
    let orphaned = [];
    let valid = [];

    // Verificar cada uma
    for (const img of dbImages) {
      const filename = img.image_url.split('/').pop();
      const filepath = path.join(uploadDir, filename);
      
      if (!fs.existsSync(filepath)) {
        orphaned.push(img);
        console.log(`  ❌ ORPHÃ: ${img.image_url} (não existe no disco)`);
      } else {
        valid.push(img);
        console.log(`  ✅ OK: ${filename}`);
      }
    }

    console.log(`\n📈 Resumo: ${valid.length} válidas, ${orphaned.length} orphãs\n`);

    if (orphaned.length > 0) {
      console.log('🗑️  Deletando referências orphãs...\n');
      
      for (const img of orphaned) {
        await db.query('DELETE FROM product_images WHERE id = $1', [img.id]);
        console.log(`  ✓ Deletado: [ID ${img.id}] ${img.image_url}`);
      }
      
      console.log(`\n✅ ${orphaned.length} referências removidas`);
    } else {
      console.log('✅ Nenhuma referência orphã encontrada!');
    }

    // Listar produtos com/sem imagens
    console.log('\n📦 Status dos produtos:\n');
    const products = await db.query(`
      SELECT 
        p.id,
        p.name,
        COUNT(pi.id) as image_count
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id
      GROUP BY p.id, p.name
      ORDER BY p.id
    `);

    for (const p of products.rows) {
      const icon = p.image_count > 0 ? '📷' : '⚠️';
      console.log(`  ${icon} Produto ${p.id}: "${p.name}" (${p.image_count} imagem${p.image_count !== 1 ? 'ns' : ''})`);
    }

    console.log('\n✅ Limpeza concluída!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

cleanupOrphanImages();
