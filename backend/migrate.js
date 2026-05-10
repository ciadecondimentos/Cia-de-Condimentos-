const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const { pool } = require('./db');

async function runMigrations() {
  try {
    console.log('🔄 Rodando migrations...');
    
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrations = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Ordena alfabeticamente
    
    for (const migration of migrations) {
      const migrationPath = path.join(migrationsDir, migration);
      const sql = fs.readFileSync(migrationPath, 'utf8');
      
      console.log(`  ⏳ Executando: ${migration}`);
      await pool.query(sql);
      console.log(`  ✅ ${migration} concluído`);
    }
    
    console.log('✅ Todas as migrations executadas com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao executar migrations:', error.message);
    process.exit(1);
  }
}

runMigrations();
