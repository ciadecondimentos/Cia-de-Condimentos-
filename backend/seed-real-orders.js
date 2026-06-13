// Script para adicionar dados reais de exemplo na tabela orders
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL não está configurada!');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function seedRealOrders() {
  try {
    console.log('🌱 Adicionando dados reais de exemplo na tabela orders...');
    const client = await pool.connect();

    // Dados realistas baseados em uma loja de condimentos
    const orders = [
      // Pedidos de junho (últimos dias)
      { name: 'Mercado Central Frutos', email: 'compras@mercadocentral.com.br', address: 'Av. Paulista, 1000 - São Paulo', total: 450.00, method: 'PIX', status: 'Pago', shipping: 25.00, daysAgo: 1 },
      { name: 'Supermercado Bom Preço', email: 'fornecedores@bompreco.com.br', address: 'Rua Principal, 500 - Rio de Janeiro', total: 320.50, method: 'Transferência', status: 'Pago', shipping: 20.00, daysAgo: 2 },
      { name: 'Restaurante Tempero da Casa', email: 'pedidos@temperodasaca.com.br', address: 'Av. Atlântica, 250 - Rio de Janeiro', total: 680.00, method: 'Cartão', status: 'Pago', shipping: 30.00, daysAgo: 3 },
      { name: 'Distribuidora A&B', email: 'vendas@distribab.com.br', address: 'Km 5 Rodovia BR-116 - São Paulo', total: 1200.00, method: 'Boleto', status: 'Pago', shipping: 50.00, daysAgo: 4 },
      { name: 'Padaria Artesanal Pão Quente', email: 'suprimentos@paoquente.com.br', address: 'Rua das Flores, 120 - Curitiba', total: 290.30, method: 'PIX', status: 'Pago', shipping: 18.00, daysAgo: 5 },
      
      // Pedidos de dias anteriores
      { name: 'Restaurante Gourmet Premium', email: 'chef@gourmerpremium.com.br', address: 'Av. Paulista, 1500 - São Paulo', total: 950.00, method: 'Transferência', status: 'Pago', shipping: 40.00, daysAgo: 6 },
      { name: 'Loja de Produtos Naturais Vida Saudável', email: 'pedidos@vidasaudavel.com.br', address: 'Rua Getúlio Vargas, 800 - Belo Horizonte', total: 420.75, method: 'Cartão', status: 'Pago', shipping: 22.00, daysAgo: 7 },
      { name: 'Cooperativa de Agricultores da Região', email: 'compras@cooperativa.com.br', address: 'Fazenda Santa Rita - Interior SP', total: 1450.00, method: 'PIX', status: 'Pago', shipping: 60.00, daysAgo: 8 },
      { name: 'Churrascaria Dom Brás', email: 'fornecedores@dombras.com.br', address: 'Av. Imigrantes, 3000 - São Paulo', total: 580.20, method: 'Boleto', status: 'Pago', shipping: 28.00, daysAgo: 9 },
      { name: 'Pizzaria Italiana Autêntica', email: 'suprimentos@pizzariaitaliana.com.br', address: 'Rua Roma, 450 - São Paulo', total: 340.00, method: 'PIX', status: 'Pendente', shipping: 18.00, daysAgo: 10 },
      
      // Mais pedidos para ter histórico maior
      { name: 'Confeitaria Doce Tentação', email: 'pedidos@docetentacao.com.br', address: 'Av. Getúlio Vargas, 200 - Brasília', total: 520.50, method: 'Cartão', status: 'Pago', shipping: 25.00, daysAgo: 11 },
      { name: 'Buffet Corporativo Elite', email: 'vendas@buffet-elite.com.br', address: 'Rua Pamplona, 1250 - São Paulo', total: 890.00, method: 'Transferência', status: 'Pago', shipping: 38.00, daysAgo: 12 },
      { name: 'Sorveteria Gelado Perfeito', email: 'fornecedores@gelado-perfeito.com.br', address: 'Av. Brasil, 5000 - Porto Alegre', total: 270.80, method: 'PIX', status: 'Pago', shipping: 16.00, daysAgo: 13 },
      { name: 'Indústria de Alimentos Brasil', email: 'compras@industrialiimentos.com.br', address: 'Zona Industrial, Lot 10 - Sorocaba', total: 2100.00, method: 'Boleto', status: 'Pago', shipping: 80.00, daysAgo: 14 },
      { name: 'Mercearia do Bairro', email: 'pedidos@merceariadobairro.com.br', address: 'Rua Central, 45 - Curitiba', total: 185.30, method: 'Dinheiro', status: 'Pago', shipping: 10.00, daysAgo: 15 },
      
      // Semana anterior
      { name: 'Farmácia Saúde Plus', email: 'compras@farmaciasaude.com.br', address: 'Av. Santos Dumont, 800 - São Paulo', total: 350.00, method: 'PIX', status: 'Pago', shipping: 18.00, daysAgo: 16 },
      { name: 'Café Especial Artesanal', email: 'fornecedores@cafeartesanal.com.br', address: 'Rua Consolação, 150 - São Paulo', total: 420.25, method: 'Cartão', status: 'Pago', shipping: 20.00, daysAgo: 17 },
      { name: 'Hotel 5 Estrelas Luxo', email: 'suprimentos@hotel5estrelas.com.br', address: 'Av. Atlântica, 1000 - Rio de Janeiro', total: 1680.00, method: 'Transferência', status: 'Pago', shipping: 70.00, daysAgo: 18 },
      { name: 'Bar e Restaurante Boteco Tradicional', email: 'pedidos@botecotrad.com.br', address: 'Rua do Povo, 200 - Brasília', total: 540.50, method: 'PIX', status: 'Pendente', shipping: 25.00, daysAgo: 19 },
      { name: 'Lanchonete Rápida Qualidade', email: 'compras@lanchequalidade.com.br', address: 'Av. Paulista, 2000 - São Paulo', total: 280.00, method: 'Cartão', status: 'Pago', shipping: 14.00, daysAgo: 20 },
    ];

    let inserted = 0;
    console.log(`📦 Inserindo ${orders.length} pedidos reais...\n`);

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const createdDate = new Date();
      createdDate.setDate(createdDate.getDate() - order.daysAgo);

      try {
        await client.query(
          `INSERT INTO orders (customer_name, customer_email, customer_address, subtotal, total, payment_status, payment_method, frete, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            order.name,
            order.email,
            order.address,
            parseFloat((order.total - order.shipping).toFixed(2)),
            order.total,
            order.status,
            order.method,
            order.shipping,
            createdDate
          ]
        );
        inserted++;
        console.log(`✅ ${inserted}. ${order.name} - R$ ${order.total}`);
      } catch (error) {
        console.error(`❌ Erro ao inserir ${order.name}:`, error.message);
      }
    }

    const count = await client.query('SELECT COUNT(*) as total FROM orders');
    console.log(`\n✅ Total inserido: ${inserted} pedidos`);
    console.log(`📊 Total de pedidos no banco: ${count.rows[0].total}`);

    // Mostrar alguns dados
    const sample = await client.query(`
      SELECT customer_name, total, payment_status, created_at 
      FROM orders 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    console.log('\n📋 Últimos pedidos inseridos:');
    sample.rows.forEach((row, idx) => {
      console.log(`   ${idx + 1}. ${row.customer_name} - R$ ${row.total} - ${row.payment_status}`);
    });

    client.release();
    pool.end();
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

seedRealOrders();
