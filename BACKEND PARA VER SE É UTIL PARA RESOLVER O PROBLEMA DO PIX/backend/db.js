const { Pool } = require('pg');

// Verificar se DATABASE_URL está configurado
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL não está configurado!');
  console.error('   Configure a variável de ambiente DATABASE_URL com a URL de conexão do PostgreSQL');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Log de conexão com o banco de dados
pool.on('connect', () => {
  console.log('✅ Conexão estabelecida com o banco de dados PostgreSQL');
});

pool.on('error', (error) => {
  console.error('❌ Erro na conexão com o banco de dados:', error.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
