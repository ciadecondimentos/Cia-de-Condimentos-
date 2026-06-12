const db = require('./db');

async function seedTestData() {
  console.log('🌱 Adicionando dados de teste para relatórios...');
  
  try {
    // Criar algumas ordens com dados variados
    console.log('📦 Adicionando pedidos de teste...');
    
    const orders = [
      { customer_name: 'João Silva', total: 250.50, payment_status: 'Pago', payment_method: 'PIX', frete: 15.00 },
      { customer_name: 'Maria Santos', total: 380.75, payment_status: 'Pago', payment_method: 'Cartão', frete: 20.00 },
      { customer_name: 'Pedro Costa', total: 120.00, payment_status: 'Pendente', payment_method: 'Boleto', frete: 10.00 },
      { customer_name: 'Ana Oliveira', total: 550.30, payment_status: 'Pago', payment_method: 'PIX', frete: 25.00 },
      { customer_name: 'Carlos Souza', total: 185.60, payment_status: 'Pendente', payment_method: 'Dinheiro', frete: 0.00 },
      { customer_name: 'Julia Rocha', total: 420.00, payment_status: 'Pago', payment_method: 'Cartão', frete: 20.00 },
      { customer_name: 'Ricardo Lima', total: 310.45, payment_status: 'Pago', payment_method: 'PIX', frete: 15.00 },
      { customer_name: 'Fernanda Dias', total: 95.20, payment_status: 'Pendente', payment_method: 'Boleto', frete: 8.00 },
    ];

    for (const order of orders) {
      await db.query(
        `INSERT INTO orders (customer_name, total, payment_status, payment_method, frete, created_at) 
         VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '${Math.floor(Math.random() * 20)} days')`,
        [order.customer_name, order.total, order.payment_status, order.payment_method, order.frete]
      );
    }
    console.log(`✅ ${orders.length} pedidos adicionados`);

    // Verificar dados adicionados
    const orderCheck = await db.query('SELECT COUNT(*) as count FROM orders');
    console.log(`📊 Total de pedidos no banco: ${orderCheck.rows[0].count}`);

    console.log('✅ Dados de teste adicionados com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao adicionar dados de teste:', error);
    process.exit(1);
  }
}

seedTestData();
