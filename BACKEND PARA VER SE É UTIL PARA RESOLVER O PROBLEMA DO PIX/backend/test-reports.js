// Test script for reports endpoints
require('dotenv').config();
const db = require('./db');

async function testReports() {
  try {
    console.log('🔍 Testando relatório de CRM...\n');
    
    const period = 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));
    
    console.log('📝 Executando query: resumo de clientes...');
    const summaryResult = await db.query(`
      SELECT 
        COUNT(*)::integer as total_customers,
        COUNT(CASE WHEN is_vip = true THEN 1 END)::integer as vip_customers,
        COUNT(CASE WHEN is_inactive = false THEN 1 END)::integer as active_customers,
        COUNT(CASE WHEN created_at >= $1 THEN 1 END)::integer as new_customers_period
      FROM crm_customers
    `, [startDate]);
    
    console.log('✅ Query de resumo executada com sucesso');
    console.log('Resultado:', summaryResult.rows[0]);
    
    console.log('\n📝 Executando query: total gasto por clientes...');
    const spendingResult = await db.query(`
      SELECT 
        COALESCE(CAST(SUM(total_price) AS NUMERIC(15,2)), 0) as total_spent,
        COUNT(*)::integer as total_transactions,
        COALESCE(CAST(AVG(total_price) AS NUMERIC(15,2)), 0) as average_transaction
      FROM crm_purchases
      WHERE purchase_date >= $1
    `, [startDate]);
    
    console.log('✅ Query de gastos executada com sucesso');
    console.log('Resultado:', spendingResult.rows[0]);
    
    console.log('\n📝 Executando query: status de pagamento...');
    const paymentStatusResult = await db.query(`
      SELECT 
        payment_status,
        COUNT(*)::integer as count,
        COALESCE(CAST(SUM(total_price) AS NUMERIC(15,2)), 0) as total
      FROM crm_purchases
      WHERE purchase_date >= $1
      GROUP BY payment_status
      ORDER BY count DESC
    `, [startDate]);
    
    console.log('✅ Query de status de pagamento executada com sucesso');
    console.log('Resultado:', paymentStatusResult.rows);
    
    console.log('\n📝 Executando query: top clientes...');
    const topCustomersResult = await db.query(`
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
    
    console.log('✅ Query de top clientes executada com sucesso');
    console.log('Resultado:', topCustomersResult.rows);
    
    console.log('\n📝 Executando query: clientes com atraso...');
    const debtorsResult = await db.query(`
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
    
    console.log('✅ Query de devedores executada com sucesso');
    console.log('Resultado:', debtorsResult.rows);
    
    console.log('\n✅ Testes de CRM completados!');
    
    // Agora testar fornecedores
    console.log('\n\n🔍 Testando relatório de FORNECEDORES...\n');
    
    console.log('📝 Executando query: resumo de fornecedores...');
    const suppSummaryResult = await db.query(`
      SELECT 
        COUNT(*)::integer as total_suppliers,
        COUNT(CASE WHEN is_active = true THEN 1 END)::integer as active_suppliers,
        COUNT(CASE WHEN created_at >= $1 THEN 1 END)::integer as new_suppliers_period
      FROM suppliers
    `, [startDate]);
    
    console.log('✅ Query de resumo de fornecedores executada com sucesso');
    console.log('Resultado:', suppSummaryResult.rows[0]);
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

testReports();
