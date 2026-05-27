// Script para corrigir valores NaN nas compras do CRM
const db = require('./db');

async function fixNaNValues() {
  try {
    console.log('🔧 Iniciando correcção de valores NaN/inválidos no CRM...\n');

    // 1. Identificar e listar registros com problemas
    console.log('📋 Buscando registros com problemas...');
    const badRecords = await db.query(`
      SELECT id, customer_id, product_name, quantity, unit_price, total_price, purchase_date
      FROM crm_purchases
      WHERE total_price IS NULL 
         OR total_price = 0
         OR quantity IS NULL
         OR unit_price IS NULL
         OR quantity::text ~ '^[^0-9.-]'
         OR unit_price::text ~ '^[^0-9.-]'
      ORDER BY id DESC
    `);

    if (badRecords.rows.length === 0) {
      console.log('✅ Nenhum registro com problemas encontrado!');
      return;
    }

    console.log(`\n⚠️  Encontrados ${badRecords.rows.length} registros com problemas:\n`);
    badRecords.rows.forEach(row => {
      console.log(`  ID: ${row.id} | Customer: ${row.customer_id} | Qty: ${row.quantity} | Price: ${row.unit_price} | Total: ${row.total_price}`);
    });

    // 2. Tentar corrigir registros onde total_price é 0 ou null
    console.log('\n🔄 Corrigindo registros com total_price inválido...');
    const fixed = await db.query(`
      UPDATE crm_purchases
      SET total_price = quantity * unit_price
      WHERE (total_price IS NULL OR total_price = 0)
        AND quantity IS NOT NULL 
        AND quantity > 0
        AND unit_price IS NOT NULL 
        AND unit_price > 0
      RETURNING id, quantity, unit_price, total_price
    `);

    if (fixed.rows.length > 0) {
      console.log(`✅ Corrigidos ${fixed.rows.length} registros:`);
      fixed.rows.forEach(row => {
        console.log(`  ID: ${row.id} | Qty: ${row.quantity} | Price: ${row.unit_price} | New Total: ${row.total_price}`);
      });
    }

    // 3. Recalcular estatísticas dos clientes
    console.log('\n📊 Recalculando estatísticas dos clientes...');
    const customers = await db.query('SELECT DISTINCT customer_id FROM crm_purchases');
    
    for (const { customer_id } of customers.rows) {
      const stats = await db.query(`
        SELECT 
          COUNT(*) as total_purchases,
          SUM(total_price) as total_spent,
          SUM(CASE WHEN payment_status = 'pago' THEN total_price ELSE 0 END) as paid,
          SUM(CASE WHEN payment_status IN ('pendente', 'parcial') THEN total_price ELSE 0 END) as pending,
          AVG(total_price) as average_ticket
        FROM crm_purchases 
        WHERE customer_id = $1
      `, [customer_id]);

      const { total_purchases, total_spent, paid, pending, average_ticket } = stats.rows[0];
      
      if (total_spent && total_spent > 0) {
        console.log(`  Customer ${customer_id}: Spent R$ ${total_spent} | Paid R$ ${paid} | Pending R$ ${pending}`);
      }
    }

    console.log('\n✅ Correcção concluída com sucesso!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Erro ao corrigir valores:', error);
    process.exit(1);
  }
}

fixNaNValues();
