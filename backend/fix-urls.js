const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const updateImages = async () => {
  try {
    const conn = await pool.connect();
    
    console.log('Corrigindo URLs das imagens...\n');
    
    // Atualizar  URLs com onrender
    const updateResult = await conn.query(`
      UPDATE product_images 
      SET image_url = REPLACE(image_url, 'https://cia-de-condimentos.onrender.com', '')
      WHERE image_url LIKE '%onrender%'
    `);
    
    console.log(`✅ ${updateResult.rowCount} imagem(ns) corrigida(s)`);
    
    // Mostrar resultado
    const selectResult = await conn.query('SELECT product_id, image_url FROM product_images ORDER BY id');
    console.log('\nImagens atuais no banco:');
    selectResult.rows.forEach(row => {
      console.log(`  - Produto ${row.product_id}: ${row.image_url}`);
    });
    
    conn.release();
    pool.end();
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  }
};

updateImages();
