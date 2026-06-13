// Script para popular dados de teste diretamente no banco PostgreSQL
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL não está configurada!');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function seedTestOrders() {
  try {
    console.log('🌱 Conectando ao banco de dados...');
    const client = await pool.connect();

    const orders = [
      { customer_name: 'João Silva', customer_email: 'joao@email.com', customer_address: 'Rua A, 123', subtotal: 235.50, total: 250.50, payment_status: 'Pago', payment_method: 'PIX', frete: 15.00 },
      { customer_name: 'Maria Santos', customer_email: 'maria@email.com', customer_address: 'Rua B, 456', subtotal: 360.75, total: 380.75, payment_status: 'Pago', payment_method: 'Cartão', frete: 20.00 },
      { customer_name: 'Pedro Costa', customer_email: 'pedro@email.com', customer_address: 'Rua C, 789', subtotal: 110.00, total: 120.00, payment_status: 'Pendente', payment_method: 'Boleto', frete: 10.00 },
      { customer_name: 'Ana Oliveira', customer_email: 'ana@email.com', customer_address: 'Rua D, 321', subtotal: 525.30, total: 550.30, payment_status: 'Pago', payment_method: 'PIX', frete: 25.00 },
      { customer_name: 'Carlos Souza', customer_email: 'carlos@email.com', customer_address: 'Rua E, 654', subtotal: 185.60, total: 185.60, payment_status: 'Pendente', payment_method: 'Dinheiro', frete: 0.00 },
      { customer_name: 'Julia Rocha', customer_email: 'julia@email.com', customer_address: 'Rua F, 987', subtotal: 400.00, total: 420.00, payment_status: 'Pago', payment_method: 'Cartão', frete: 20.00 },
      { customer_name: 'Ricardo Lima', customer_email: 'ricardo@email.com', customer_address: 'Rua G, 147', subtotal: 295.45, total: 310.45, payment_status: 'Pago', payment_method: 'PIX', frete: 15.00 },
      { customer_name: 'Fernanda Dias', customer_email: 'fernanda@email.com', customer_address: 'Rua H, 258', subtotal: 87.20, total: 95.20, payment_status: 'Pendente', payment_method: 'Boleto', frete: 8.00 },
      { customer_name: 'Thiago Mendes', customer_email: 'thiago@email.com', customer_address: 'Rua I, 369', subtotal: 695.00, total: 725.00, payment_status: 'Pago', payment_method: 'PIX', frete: 30.00 },
      { customer_name: 'Camila Torres', customer_email: 'camila@email.com', customer_address: 'Rua J, 741', subtotal: 198.15, total: 210.15, payment_status: 'Pago', payment_method: 'Cartão', frete: 12.00 }
    ];

    let inserted = 0;
    
    console.log(`🔄 Iniciando inserção de ${orders.length} pedidos...`);

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const daysAgo = Math.floor(Math.random() * 20);
      const createdDate = new Date();
      createdDate.setDate(createdDate.getDate() - daysAgo);

      try {
        const result = await client.query(
          `INSERT INTO orders (customer_name, customer_email, customer_address, subtotal, total, payment_status, payment_method, frete, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
          [order.customer_name, order.customer_email, order.customer_address, order.subtotal, order.total, order.payment_status, order.payment_method, order.frete, createdDate]
        );
        inserted++;
        console.log(`✅ ${inserted}. ${order.customer_name} - ID: ${result.rows[0].id}`);
      } catch (error) {
        console.error(`❌ Erro ao inserir ${order.customer_name}:`, error.message);
      }
    }

    const count = await client.query('SELECT COUNT(*) as total FROM orders');
    console.log(`\n✅ Total inserido: ${inserted} pedidos`);
    console.log(`📊 Total de pedidos no banco: ${count.rows[0].total}`);

    client.release();
    pool.end();
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

seedTestOrders();
