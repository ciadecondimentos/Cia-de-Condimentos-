#!/usr/bin/env node

/**
 * Script de teste da API PIX com Mock de dados
 * Não requer banco de dados - testa apenas os endpoints
 * Usage: npm run test:mock
 */

'use strict';

const API_URL = 'http://localhost:3000/api';
let testsPassed = 0;
let testsFailed = 0;

function log(msg, type = 'info') {
  const colors = {
    success: '\x1b[32m✅\x1b[0m',
    error: '\x1b[31m❌\x1b[0m',
    info: '\x1b[36mℹ️\x1b[0m',
    warning: '\x1b[33m⚠️\x1b[0m',
    header: '\x1b[1;36m',
    reset: '\x1b[0m'
  };
  const icon = colors[type] || '•';
  console.log(`${icon} ${msg}`);
}

function section(title) {
  console.log('\n' + colors.header + '━'.repeat(50));
  console.log(title);
  console.log('━'.repeat(50) + colors.reset + '\n');
}

const colors = {
  header: '\x1b[1;36m',
  reset: '\x1b[0m'
};

async function testEndpoint(name, method, endpoint, body = null) {
  try {
    log(`Testando: ${method} ${endpoint}`, 'info');

    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_URL}${endpoint}`, options);
    
    if (response.ok) {
      const data = await response.json();
      log(`${name}: OK (${response.status})`, 'success');
      testsPassed++;
      return { ok: true, data, status: response.status };
    } else {
      log(`${name}: Falhou (${response.status})`, 'warning');
      testsFailed++;
      return { ok: false, status: response.status };
    }
  } catch (error) {
    log(`${name}: ERRO - ${error.message}`, 'error');
    testsFailed++;
    return { ok: false, error: error.message };
  }
}

async function testCreateProduct() {
  section('TESTE 1: Criar Produto');

  const product = {
    name: 'Pimenta Calabresa (Teste)',
    description: 'Teste de produto para validação',
    price: 25.90,
    category: 'Pimentas',
    stock: 50,
    active: true
  };

  return await testEndpoint('POST /api/products', 'POST', '/products', product);
}

async function testGetProducts() {
  section('TESTE 2: Listar Produtos');

  return await testEndpoint('GET /api/products', 'GET', '/products');
}

async function testCreateOrder() {
  section('TESTE 3: Criar Pedido');

  const order = {
    customer: {
      name: 'Cliente Teste PIX',
      phone: '11999999999',
      address: 'Rua Teste, 123, São Paulo'
    },
    items: [
      { id: 1, qty: 2, price: 25.90, name: 'Pimenta Calabresa' }
    ],
    subtotal: 51.80,
    frete: 0,
    total: 51.80,
    payment: 'PIX',
    status: 'Aguardando Pagamento',
    paymentStatus: 'Pendente'
  };

  const result = await testEndpoint('POST /api/orders', 'POST', '/orders', order);
  
  if (result.ok && result.data.id) {
    log(`Pedido criado com ID: ${result.data.id}`, 'info');
  }

  return result;
}

async function testCreatePixPayment() {
  section('TESTE 4: Criar Pagamento PIX');

  const payment = {
    orderId: 1,
    amount: 99.90,
    description: 'Teste PIX - Cia de Condimentos',
    payerEmail: 'teste@condimentos.com',
    payerPhone: '11999999999'
  };

  const result = await testEndpoint('POST /api/payments/pix', 'POST', '/payments/pix', payment);

  if (result.ok && result.data) {
    log(`Payment ID: ${result.data.mp_payment_id}`, 'info');
    log(`Status: ${result.data.status}`, 'info');
    if (result.data.qr_code) {
      log(`QR Code gerado: ${result.data.qr_code.substring(0, 30)}...`, 'info');
    }
  }

  return result;
}

async function testGetPaymentStatus() {
  section('TESTE 5: Consultar Status de Pagamento');

  return await testEndpoint('GET /api/payments/status/:id', 'GET', '/payments/status/123456789');
}

async function testInvalidEndpoint() {
  section('TESTE 6: Validação de Erro (Endpoint Inválido)');

  const result = await testEndpoint('GET /api/invalid', 'GET', '/invalid');
  
  if (!result.ok) {
    log(`Corretamente retornou erro para endpoint inválido`, 'success');
    testsPassed++;
  }

  return result;
}

async function main() {
  console.clear();
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║   🧪 TESTE COMPLETO API - Cia de Condimentos  ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  log(`API URL: ${API_URL}`, 'info');
  log(`Node Version: ${process.version}`, 'info');
  console.log('');

  // Verificar se backend está rodando
  log('Verificando conectividade com backend...', 'warning');
  
  try {
    const response = await fetch(`${API_URL}/products`, { 
      method: 'GET',
      timeout: 5000 
    });
    log('✅ Backend acessível!', 'success');
  } catch (error) {
    log('❌ Backend não está rodando!', 'error');
    log('Inicie com: npm start', 'warning');
    console.log('');
    log('Para testar localmente:', 'info');
    log('1. Terminal 1: cd backend && npm start', 'info');
    log('2. Terminal 2: npm run test:mock', 'info');
    process.exit(1);
  }

  console.log('\n');

  // Executar testes
  try {
    await testGetProducts();
    await testCreateOrder();
    await testCreatePixPayment();
    await testGetPaymentStatus();
    await testInvalidEndpoint();
  } catch (error) {
    log(`Erro geral: ${error.message}`, 'error');
  }

  // Resumo
  section('📊 RESUMO DOS TESTES');

  console.log(`Testes Passou:    ${testsPassed}`);
  console.log(`Testes Falharam:  ${testsFailed}`);
  console.log(`Total:            ${testsPassed + testsFailed}\n`);

  if (testsFailed === 0) {
    log('🎉 TODOS OS TESTES PASSARAM!', 'success');
  } else {
    log(`⚠️  ${testsFailed} teste(s) falharam`, 'warning');
  }

  console.log('\n');
  log('Próximas Etapas:', 'info');
  log('1. Deploy para Render (git push)', 'info');
  log('2. Configurar Webhook no Mercado Pago', 'info');
  log('3. Testar fluxo completo com QR Code real', 'info');
  console.log('');

  process.exit(testsFailed > 0 ? 1 : 0);
}

main();
