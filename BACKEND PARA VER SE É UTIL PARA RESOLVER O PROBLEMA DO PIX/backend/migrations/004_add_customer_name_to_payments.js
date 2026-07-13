const db = require('../db');

module.exports = async () => {
  console.log('📦 Migration 004: Adicionar customer_name à tabela payments...');
  
  try {
    // Verificar se coluna já existe
    const checkColumn = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'payments' 
      AND column_name = 'customer_name'
    `);

    if (checkColumn.rows.length > 0) {
      console.log('ℹ️  Coluna customer_name já existe');
      return;
    }

    // Adicionar coluna
    await db.query(`
      ALTER TABLE payments 
      ADD COLUMN customer_name VARCHAR(255)
    `);

    console.log('✅ Coluna customer_name adicionada com sucesso');
  } catch (error) {
    console.error('❌ Erro na migration 004:', error.message);
    throw error;
  }
};
