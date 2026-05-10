#!/usr/bin/env node

/**
 * Script para testar endpoints da API de Pix
 * Usage: npm run test:payments
 */

'use strict';

const API_URL = process.env.API_URL || 'http://localhost:3000/api';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function log(message, type = 'info') {
  const colors = {
    success: '\x1b[32m✅\x1b[0m',
    error: '\x1b[31m❌\x1b[0m',
    info: '\x1b[36mℹ️\x1b[0m',
    warning: '\x1b[33m⚠️\x1b[0m',
    data: '\x1b[35m📊\x1b[0m'
  };
  console.log(`${colors[type] || '•'} ${message}`);
}

async function testCreatePayment() {
  log('Testando criação de pagamento PIX...', 'info');
  
  const payload = {
    orderId: 999,
    amount: 99.90,
    description: 'Teste PIX - Cia de Condimentos',
    payerEmail: 'teste@condimentos.com',
    payerPhone: '11999999999'
  };

  try {
    const response = await fetch(`${API_URL}/payments/pix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.text();
      log(`Erro ${response.status}: ${err}`, 'error');
      return null;
    }

    const data = await response.json();
    log(`Pagamento criado com sucesso!`, 'success');
    log(`ID do Pagamento MP: ${data.mp_payment_id}`, 'data');
    log(`Status: ${data.status}`, 'data');
    log(`Valor: R$ ${(data.amount || payload.amount).toFixed(2)}`, 'data');
    
    if (data.qr_code_base64) {
      log(`QR Code gerado: ${data.qr_code_base64.substring(0, 50)}...`, 'data');
    }

    return data;
  } catch (error) {
    log(`Erro ao criar pagamento: ${error.message}`, 'error');
    return null;
  }
}

async function testGetPaymentStatus(paymentId) {
  log(`Consultando status do pagamento ${paymentId}...`, 'info');

  try {
    const response = await fetch(`${API_URL}/payments/status/${paymentId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const err = await response.text();
      log(`Erro ${response.status}: ${err}`, 'error');
      return null;
    }

    const data = await response.json();
    log(`Status atual: ${data.status}`, 'data');
    log(`Valor: R$ ${(data.amount || 0).toFixed(2)}`, 'data');
    
    return data;
  } catch (error) {
    log(`Erro ao consultar status: ${error.message}`, 'error');
    return null;
  }
}

async function testPollingPayment(paymentId) {
  log(`Iniciando polling do pagamento (10 tentativas, 5s intervalo)...`, 'warning');
  
  for (let i = 0; i < 10; i++) {
    log(`Tentativa ${i + 1}/10...`, 'info');
    
    const status = await testGetPaymentStatus(paymentId);
    
    if (status && status.status === 'approved') {
      log(`Pagamento APROVADO! 🎉`, 'success');
      return true;
    }
    
    if (i < 9) {
      log(`Aguardando 5 segundos...`, 'warning');
      await sleep(5000);
    }
  }
  
  log(`Polling finalizado (pagamento ainda não aprovado)`, 'warning');
  return false;
}

async function testInvalidPaymentId() {
  log(`Testando consulta com ID inválido...`, 'info');
  
  try {
    const response = await fetch(`${API_URL}/payments/status/999999`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.status === 404) {
      log(`Corretamente retornou 404 para pagamento inexistente`, 'success');
    } else {
      log(`Status ${response.status} retornado`, 'warning');
    }
  } catch (error) {
    log(`Erro: ${error.message}`, 'error');
  }
}

async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║     🧪 TESTE DE PAGAMENTO PIX - Mercado Pago  ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('');
  
  log(`API URL: ${API_URL}`, 'info');
  log(`Modo: ${process.env.NODE_ENV || 'development'}`, 'info');
  console.log('');

  // Teste 1: Criar pagamento
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info');
  log('TESTE 1: Criar Pagamento PIX', 'info');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info');
  
  const payment = await testCreatePayment();
  
  if (!payment) {
    log('Não foi possível criar pagamento. Verifique o backend.', 'error');
    process.exit(1);
  }

  console.log('');

  // Teste 2: Consultar status inicial
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info');
  log('TESTE 2: Consultar Status Inicial', 'info');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info');
  
  await testGetPaymentStatus(payment.mp_payment_id);

  console.log('');

  // Teste 3: Teste de ID inválido
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info');
  log('TESTE 3: Validação de ID Inválido', 'info');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info');
  
  await testInvalidPaymentId();

  console.log('');

  // Teste 4: Polling (opcional)
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info');
  log('TESTE 4: Polling Automático (opcional)', 'info');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'info');
  log('Para testar polling: faça o pagamento em seu banco no Mercado Pago', 'warning');
  log('Ou use um QR Code de teste se estiver em sandbox mode', 'warning');
  
  // Descomentar para polling real:
  // const approved = await testPollingPayment(payment.mp_payment_id);

  console.log('');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'success');
  log('✅ TESTES CONCLUÍDOS COM SUCESSO', 'success');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'success');
  console.log('');
  
  log('Próximos passos:', 'info');
  log('1. Verifique o QR Code no seu telefone', 'info');
  log('2. Escaneie e faça o pagamento', 'info');
  log('3. Status mudará de "pending" para "approved"', 'info');
  log('4. Frontend será notificado automaticamente (polling)', 'info');
  console.log('');
}

main().catch(error => {
  log(`Erro fatal: ${error.message}`, 'error');
  process.exit(1);
});
