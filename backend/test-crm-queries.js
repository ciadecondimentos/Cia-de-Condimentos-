// Teste direto das queries de CRM
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://ciacondimentos_db_pc0f_user:tVq07yH36CWOwjEhnnEXs8e7uSjTACj6@dpg-d6svv2q4d50c73c0f3o0-a.oregon-postgres.render.com/ciacondimentos_db_pc0f',
  ssl: { rejectUnauthorized: false }
});

async function testCRMQueries() {
  try {
    const period = 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    console.log('📝 Query 1: Resumo de clientes...');
    const q1 = await pool.query(`
      SELECT 
        COUNT(*)::integer as total_customers,
        COUNT(CASE WHEN is_vip = true THEN 1 END)::integer as vip_customers,
        COUNT(CASE WHEN is_inactive = false THEN 1 END)::integer as active_customers,
        COUNT(CASE WHEN created_at >= $1 THEN 1 END)::integer as new_customers_period
      FROM crm_customers
    `, [startDate]);
    console.log('✅', q1.rows[0]);

    console.log('\n📝 Query 2: Gasto total...');
    const q2 = await pool.query(`
      SELECT 
        COALESCE(CAST(SUM(total_price) AS NUMERIC(15,2)), 0) as total_spent,
        COUNT(*)::integer as total_transactions,
        COALESCE(CAST(AVG(total_price) AS NUMERIC(15,2)), 0) as average_transaction
      FROM crm_purchases
      WHERE purchase_date >= $1
    `, [startDate]);
    console.log('✅', q2.rows[0]);

    console.log('\n📝 Query 3: Status de pagamento...');
    const q3 = await pool.query(`
      SELECT 
        payment_status,
        COUNT(*)::integer as count,
        COALESCE(CAST(SUM(total_price) AS NUMERIC(15,2)), 0) as total
      FROM crm_purchases
      WHERE purchase_date >= $1
      GROUP BY payment_status
      ORDER BY total DESC
    `, [startDate]);
    console.log('✅', q3.rows);

    console.log('\n📝 Query 4: Top clientes...');
    const q4 = await pool.query(`
      SELECT 
        cc.id,
        cc.full_name,
        cc.phone,
        cc.city,
        cc.is_vip,
        COUNT(cp.id)::integer as total_purchases,
        COALESCE(CAST(SUM(cp.total_price) AS NUMERIC(15,2)), 0) as total_spent,
        COALESCE(CAST(SUM(CASE WHEN cp.payment_status = 'pago' THEN cp.total_price ELSE 0 END) AS NUMERIC(15,2)), 0) as paid,
        COALESCE(CAST(SUM(CASE WHEN cp.payment_status IN ('pendente', 'parcial') THEN cp.total_price ELSE 0 END) AS NUMERIC(15,2)), 0) as pending
      FROM crm_customers cc
      LEFT JOIN crm_purchases cp ON cc.id = cp.customer_id AND cp.purchase_date >= $1
      GROUP BY cc.id, cc.full_name, cc.phone, cc.city, cc.is_vip
      ORDER BY total_spent DESC
      LIMIT 10
    `, [startDate]);
    console.log('✅', q4.rows.slice(0, 2));

    console.log('\n📝 Query 5: Clientes com atraso...');
    const q5 = await pool.query(`
      SELECT 
        cc.id,
        cc.full_name,
        cc.phone,
        cc.city,
        COUNT(cp.id)::integer as pending_purchases,
        COALESCE(CAST(SUM(cp.total_price) AS NUMERIC(15,2)), 0) as total_debt
      FROM crm_customers cc
      LEFT JOIN crm_purchases cp ON cc.id = cp.customer_id AND cp.payment_status IN ('pendente', 'parcial')
      GROUP BY cc.id, cc.full_name, cc.phone, cc.city
      HAVING COUNT(cp.id) > 0
      ORDER BY total_debt DESC
      LIMIT 10
    `, [startDate]);
    console.log('✅ Debtors found:', q5.rows.length);
    
    if (q5.rows.length > 0) {
      console.log('   Sample:', q5.rows[0]);
    }

    console.log('\n✅ Todas as queries de CRM funcionaram!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    pool.end();
  }
}

testCRMQueries();
