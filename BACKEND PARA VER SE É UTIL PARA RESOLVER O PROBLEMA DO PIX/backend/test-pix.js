#!/usr/bin/env node

/**
 * Script de teste para validar a configuração do Pix
 * Execute: node test-pix.js
 */

require('dotenv').config();

console.log('\n🧪 TESTE DE CONFIGURAÇÃO PIX\n');
console.log('═'.repeat(50));

// Verificar variáveis de ambiente
const checks = [
  { name: 'DATABASE_URL', value: process.env.DATABASE_URL, required: true },
  { name: 'NODE_ENV', value: process.env.NODE_ENV, required: false },
  { name: 'PORT', value: process.env.PORT, required: false },
  { name: 'JWT_SECRET', value: process.env.JWT_SECRET, required: true },
  { name: 'MP_ACCESS_TOKEN', value: process.env.MP_ACCESS_TOKEN, required: true },
  { name: 'MP_WEBHOOK_SECRET', value: process.env.MP_WEBHOOK_SECRET, required: true },
];

let allOk = true;

checks.forEach(check => {
  const status = check.value ? '✅' : '❌';
  const required = check.required ? '(obrigatório)' : '(opcional)';
  
  if (!check.value && check.required) {
    allOk = false;
  }
  
  const displayValue = check.value ? 
    (check.value.length > 20 ? check.value.substring(0, 20) + '...' : check.value) : 
    'NÃO CONFIGURADO';
  
  console.log(`${status} ${check.name.padEnd(25)} ${required.padEnd(15)} ${displayValue}`);
});

console.log('═'.repeat(50));

if (allOk) {
  console.log('\n✅ TODAS AS CONFIGURAÇÕES ESTÃO OK!\n');
  console.log('🚀 Você pode fazer deploy com segurança.\n');
} else {
  console.log('\n❌ FALTAM CONFIGURAÇÕES!\n');
  console.log('📝 Complete o arquivo .env com as variáveis obrigatórias.\n');
  process.exit(1);
}

// Testar conexão com banco
console.log('🔗 Testando conexão com banco de dados...\n');

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.log('❌ Erro ao conectar no banco:', err.message);
    process.exit(1);
  }
  
  console.log('✅ Banco de dados conectado com sucesso!');
  console.log(`📅 Hora do servidor: ${res.rows[0].now}\n`);
  
  // Verificar tabelas necessárias
  console.log('📊 Verificando tabelas...\n');
  
  const tables = ['products', 'orders', 'payments'];
  
  pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1)`,
    [tables],
    (err, res) => {
      if (err) {
        console.log('❌ Erro ao verificar tabelas:', err.message);
        pool.end();
        process.exit(1);
      }
      
      tables.forEach(table => {
        const exists = res.rows.find(r => r.table_name === table);
        console.log(`${exists ? '✅' : '⚠️ '} Tabela "${table}" ${exists ? 'existe' : 'não encontrada'}`);
      });
      
      console.log('\n' + '═'.repeat(50));
      console.log('\n✅ TUDO PRONTO PARA DEPLOY!\n');
      console.log('📋 Próximas etapas:');
      console.log('1. Fazer commit e push do código');
      console.log('2. Configurar webhook no Mercado Pago:');
      console.log('   https://seu-dominio.com/api/payments/webhook');
      console.log('3. Testar endpoints da API\n');
      
      pool.end();
    }
  );
});
