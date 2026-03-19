const db = require('./db');

async function fix() {
  try {
    console.log('Iniciando correção de URLs...');
    const r = await db.query(
      `UPDATE product_images 
       SET image_url = REPLACE(image_url, 'https://cia-de-condimentos.onrender.com', '')
       WHERE image_url LIKE '%onrender%'`
    );
    console.log(`Corrigidas ${r.rowCount} imagens`);
    process.exit(0);
  } catch (e) {
    console.log(`Erro: ${e.message}`);
    process.exit(1);
  }
}

fix();
