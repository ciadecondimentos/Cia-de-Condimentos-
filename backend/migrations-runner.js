const fs = require('fs');
const path = require('path');
const db = require('./db');

/**
 * Run all migrations from the migrations directory
 * Migrations are executed in alphabetical order (01_*, 02_*, etc.)
 */
async function runMigrations() {
  try {
    console.log('🔄 Iniciando execução de migrações...');
    
    const migrationsDir = path.join(__dirname, 'migrations');
    
    // Check if migrations directory exists
    if (!fs.existsSync(migrationsDir)) {
      console.warn('⚠️  Diretório de migrações não encontrado:', migrationsDir);
      return;
    }
    
    // Read all migration files (both .sql and .js) from migrations directory
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql') || file.endsWith('.js'))
      .sort(); // Sort alphabetically to ensure correct order
    
    if (files.length === 0) {
      console.log('ℹ️  Nenhuma migração encontrada');
      return;
    }
    
    console.log(`📋 Encontradas ${files.length} migração(ões):`);
    files.forEach(f => console.log(`   - ${f}`));
    
    // Execute each migration
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      
      try {
        console.log(`\n⏳ Executando: ${file}`);
        
        // Detectar tipo de migração
        if (file.endsWith('.js')) {
          // Executar migração JavaScript
          const migration = require(filePath);
          await migration.migrate();
          console.log(`✅ ${file} executada com sucesso`);
        } else {
          // Executar migração SQL
          const sql = fs.readFileSync(filePath, 'utf-8');
          await db.query(sql);
          console.log(`✅ ${file} executada com sucesso`);
        }
      } catch (error) {
        // Log the error but continue with other migrations
        // This allows idempotent migrations (e.g., CREATE TABLE IF NOT EXISTS)
        if (error.message.includes('already exists') || error.message.includes('constraint') || error.code === '42P07' || error.code === '42P09') {
          console.log(`ℹ️  ${file} - ${error.message.split('\n')[0]}`);
        } else {
          console.error(`❌ Erro ao executar ${file}:`, error.message);
        }
      }
    }
    
    console.log('\n✅ Execução de migrações concluída!');
    return true;
  } catch (error) {
    console.error('❌ Erro fatal ao executar migrações:', error);
    throw error;
  }
}

module.exports = { runMigrations };
