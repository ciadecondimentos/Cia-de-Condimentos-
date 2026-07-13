// Script para remover dados de teste fictícios do banco PostgreSQL
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL não está configurada!');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Nomes dos clientes fictícios inseridos pelo seed
const fakeCustomerNames = [
  'João Silva',
  'Maria Santos',
  'Pedro Costa',
  'Ana Oliveira',
  'Carlos Souza',
  'Julia Rocha',
  'Ricardo Lima',
  'Fernanda Dias',
  'Thiago Mendes',
  'Camila Torres'
];

async function cleanTestData() {
  try {
    console.log('🧹 Conectando ao banco de dados...');
    const client = await pool.connect();

    // Contar pedidos fictícios antes de deletar
    const beforeCount = await client.query(
      `SELECT COUNT(*) as total FROM orders WHERE customer_name = ANY($1)`,
      [fakeCustomerNames]
    );

    console.log(`📊 Pedidos fictícios encontrados: ${beforeCount.rows[0].total}`);

    // Deletar pedidos fictícios
    const deleteResult = await client.query(
      `DELETE FROM orders WHERE customer_name = ANY($1)`,
      [fakeCustomerNames]
    );

    console.log(`🗑️  Pedidos fictícios removidos: ${deleteResult.rowCount}`);

    // Contar total de pedidos restantes
    const afterCount = await client.query('SELECT COUNT(*) as total FROM orders');
    console.log(`✅ Total de pedidos reais restantes: ${afterCount.rows[0].total}`);

    // Mostrar alguns pedidos reais ainda no banco
    const sampleOrders = await client.query(
      `SELECT id, customer_name, customer_email, total, created_at FROM orders LIMIT 5`
    );

    if (sampleOrders.rows.length > 0) {
      console.log('\n📋 Exemplo de pedidos reais:');
      sampleOrders.rows.forEach((order, idx) => {
        console.log(`   ${idx + 1}. ${order.customer_name} - ${order.customer_email} - R$ ${order.total}`);
      });
    }

    client.release();
    pool.end();
    console.log('\n✅ Limpeza concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

cleanTestData();
