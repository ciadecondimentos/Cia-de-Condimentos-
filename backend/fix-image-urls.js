const db = require('./db');

(async () => {
  try {
    // Buscar imagens com URL absoluta errada (onrender)
    const result = await db.query(
      "SELECT * FROM product_images WHERE image_url LIKE '%onrender%'"
    );
    
    console.log('Imagens com URL errada:', result.rows.length);
    
    if (result.rows.length > 0) {
      // Corrigir para URL relativa
      for (const row of result.rows) {
        const newUrl = row.image_url.replace('https://cia-de-condimentos.onrender.com', '');
        console.log(`Corrigindo imagem ${row.id}:`);
        console.log(`  De: ${row.image_url}`);
        console.log(`  Para: ${newUrl}`);
        
        await db.query(
          'UPDATE product_images SET image_url = $1 WHERE id = $2',
          [newUrl, row.id]
        );
      }
      console.log('\n✅ Todas as imagens foram corrigidas!');
    } else {
      console.log('✅ Nenhuma imagem com URL errada encontrada.');
    }
    
    // Mostrar todas as imagens agora
    const allImages = await db.query('SELECT * FROM product_images');
    console.log('\nImagens atuais no banco:');
    allImages.rows.forEach(row => {
      console.log(`  - Produto ${row.product_id}: ${row.image_url}`);
    });
    
    process.exit(0);
  } catch (e) {
    console.error('Erro:', e.message);
    process.exit(1);
  }
})();
