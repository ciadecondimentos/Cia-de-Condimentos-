const db = require('./db');

async function checkOrdersData() {
  try {
    console.log('🔍 Verificando dados na tabela orders...\n');

    // Total de pedidos
    const result = await db.query('SELECT COUNT(*) as total FROM orders');
    console.log('📊 Total de pedidos:', result.rows[0].total);

    // Pedidos com created_at
    const withDate = await db.query('SELECT COUNT(*) as total FROM orders WHERE created_at IS NOT NULL');
    console.log('📅 Pedidos com created_at:', withDate.rows[0].total);

    // Pedidos últimos 30 dias
    const recent = await db.query("SELECT COUNT(*) as total FROM orders WHERE created_at >= NOW() - INTERVAL '30 days'");
    console.log('⏰ Pedidos últimos 30 dias:', recent.rows[0].total);

    // Amostra
    const samples = await db.query('SELECT id, customer_name, created_at, total FROM orders ORDER BY id LIMIT 5');
    console.log('\n📝 Amostra de pedidos:');
    console.table(samples.rows);

    // Verificar total de faturamento
    const revenue = await db.query("SELECT COALESCE(SUM(CAST(total AS NUMERIC)), 0) as total_revenue FROM orders WHERE created_at >= NOW() - INTERVAL '30 days'");
    console.log('\n💰 Faturamento últimos 30 dias:', revenue.rows[0].total_revenue);

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

checkOrdersData();
