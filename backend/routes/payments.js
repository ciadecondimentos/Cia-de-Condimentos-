const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const QRCode = require('qrcode');
const db = require('../db');

// Importar SDK do Mercado Pago
const { MercadoPagoConfig, Payment } = require('mercadopago');

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET;

if (!MP_ACCESS_TOKEN) {
  console.warn('⚠️  MP_ACCESS_TOKEN não configurado');
}

// Inicializar cliente Mercado Pago
const mpClient = new MercadoPagoConfig({
  accessToken: MP_ACCESS_TOKEN
});

const mpPayment = new Payment(mpClient);

// ==================== Funções Auxiliares ====================

async function createPaymentMP(paymentData) {
  try {
    const result = await mpPayment.create({
      body: paymentData
    });
    return result;
  } catch (error) {
    throw new Error(`MP API Error: ${error.message}`);
  }
}

// Função para consultar pagamento com retry e backoff exponencial
async function getPaymentMPWithRetry(paymentId, maxRetries = 3, initialDelay = 500) {
  let lastError;
  let delay = initialDelay;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Tentativa ${attempt}/${maxRetries} - Consultando MP para pagamento ${paymentId}`);
      const result = await mpPayment.get({
        id: paymentId
      });
      
      if (result && result.id) {
        console.log(`✅ Consulta bem-sucedida (tentativa ${attempt}): Status = ${result.status}`);
        return result;
      }
      
      throw new Error('Resposta vazia do MP');
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        console.warn(`⚠️  Tentativa ${attempt} falhou. Aguardando ${delay}ms antes de retry...`);
        console.warn(`   Erro: ${error.message}`);
        
        // Aguardar antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Aumentar delay exponencialmente: 500ms -> 1000ms -> 2000ms
        delay = Math.min(delay * 2, 5000);
      } else {
        console.error(`❌ Todas as ${maxRetries} tentativas falharam para ${paymentId}`);
        console.error(`   Último erro: ${error.message}`);
      }
    }
  }
  
  throw new Error(`Falha ao consultar MP após ${maxRetries} tentativas: ${lastError.message}`);
}

async function getPaymentMP(paymentId) {
  try {
    const result = await mpPayment.get({
      id: paymentId
    });
    return result;
  } catch (error) {
    throw new Error(`MP API Error: ${error.message}`);
  }
}

// ==================== Rotas ====================

// POST /payments/pix - Criar pagamento PIX
router.post('/pix', async (req, res) => {
  try {
    const { orderId, amount, description, payerEmail, payerPhone, crm_purchase_id, customer_name } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Valor inválido' });
    }

    // Email é obrigatório para Mercado Pago
    const email = payerEmail || 'cliente@condimentos.com';

    console.log('📝 Criando pagamento PIX:', { amount, email, payerPhone, customer_name });

    // Criar pagamento PIX via SDK Mercado Pago
    let mpPaymentResult;
    try {
      mpPaymentResult = await createPaymentMP({
        transaction_amount: Number(amount),
        description: description || 'Pagamento PIX',
        payment_method_id: 'pix',
        payer: {
          email: email,
          phone: payerPhone ? { area_code: '55', number: payerPhone.replace(/\D/g, '') } : undefined
        }
      });
      console.log('✅ Resposta do Mercado Pago recebida:', JSON.stringify(mpPaymentResult, null, 2).substring(0, 500));
    } catch (mpError) {
      console.error('❌ Erro ao chamar Mercado Pago:', mpError.message);
      console.error('MP Error Details:', mpError);
      throw mpError;
    }

    // Extrair QR code da resposta
    const qrCode = mpPaymentResult.point_of_interaction?.transaction_data?.qr_code || null;
    const qrCodeBase64 = mpPaymentResult.point_of_interaction?.transaction_data?.qr_code_base64 || null;

    console.log('🔍 QR Code da resposta:', qrCode ? 'SIM' : 'NÃO', qrCodeBase64 ? 'Base64: SIM' : 'Base64: NÃO');

    // Se não tiver QR code da API, gerar localmente (fallback)
    let finalQrCodeBase64 = qrCodeBase64;
    if (!finalQrCodeBase64 && qrCode) {
      try {
        finalQrCodeBase64 = await QRCode.toDataURL(qrCode);
        console.log('⚠️  QR Code gerado localmente (fallback)');
      } catch (qrError) {
        console.warn('⚠️  Erro ao gerar QR Code local:', qrError.message);
      }
    }

    if (!finalQrCodeBase64) {
      console.error('❌ Nenhum QR Code disponível!', { qrCode, qrCodeBase64 });
      return res.status(500).json({ error: 'Erro ao gerar QR Code' });
    }

    // Salvar no banco de dados
    let result;
    try {
      // Tentar INSERT com customer_name (migration 004 executada)
      let sqlFields = 'order_id, mp_payment_id, status, amount, payment_method, qr_code, qr_code_base64, payer_email, payer_phone, customer_name';
      let sqlValues = '$1, $2, $3, $4, $5, $6, $7, $8, $9, $10';
      let params = [
        orderId || null,
        mpPaymentResult.id,
        mpPaymentResult.status,
        amount,
        'pix',
        qrCode,
        finalQrCodeBase64,
        email,
        payerPhone || null,
        customer_name || null
      ];

      // Adicionar crm_purchase_id se fornecido
      if (crm_purchase_id) {
        sqlFields += ', crm_purchase_id';
        sqlValues += ', $11';
        params.push(crm_purchase_id);
      }

      result = await db.query(
        `INSERT INTO payments (${sqlFields})
         VALUES (${sqlValues})
         RETURNING id, mp_payment_id, status, amount, qr_code, qr_code_base64`,
        params
      );
    } catch (innerError) {
      // Se coluna customer_name não existir, tentar sem ela
      if (innerError.message.includes('customer_name') || innerError.message.includes('column')) {
        console.warn('⚠️  Coluna customer_name não encontrada, inserindo sem ela');
        
        let sqlFields = 'order_id, mp_payment_id, status, amount, payment_method, qr_code, qr_code_base64, payer_email, payer_phone';
        let sqlValues = '$1, $2, $3, $4, $5, $6, $7, $8, $9';
        let params = [
          orderId || null,
          mpPaymentResult.id,
          mpPaymentResult.status,
          amount,
          'pix',
          qrCode,
          finalQrCodeBase64,
          email,
          payerPhone || null
        ];

        // Adicionar crm_purchase_id se fornecido
        if (crm_purchase_id) {
          sqlFields += ', crm_purchase_id';
          sqlValues += ', $10';
          params.push(crm_purchase_id);
        }

        result = await db.query(
          `INSERT INTO payments (${sqlFields})
           VALUES (${sqlValues})
           RETURNING id, mp_payment_id, status, amount, qr_code, qr_code_base64`,
          params
        );
      } else {
        throw innerError;
      }
    }

    console.log('✅ Pagamento PIX criado:', mpPaymentResult.id, crm_purchase_id ? `(Compra CRM: ${crm_purchase_id})` : '');

    // Calcular data de expiração (1 hora)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // +1 hora

    res.status(201).json({
      id: result.rows[0].id,
      mp_payment_id: result.rows[0].mp_payment_id,
      status: result.rows[0].status,
      amount: result.rows[0].amount,
      qr_code: result.rows[0].qr_code,
      qr_code_base64: result.rows[0].qr_code_base64,
      expires_at: expiresAt,
      expires_in_seconds: 3600 // 1 hora
    });

  } catch (error) {
    console.error('❌ Erro ao gerar PIX:', error.message);
    console.error('Stack:', error.stack);
    console.error('Full Error:', error);
    res.status(500).json({ error: 'Erro ao gerar PIX: ' + error.message });
  }
});

// GET /payments/status/:paymentId - Consultar status do pagamento
router.get('/status/:paymentId', async (req, res) => {
  const { paymentId } = req.params;
  const startTime = Date.now();

  try {
    console.log(`\n⏱️  [POLLING] Verificando status do pagamento: ${paymentId}`);
    
    // Buscar no banco
    const dbResult = await db.query(
      'SELECT * FROM payments WHERE mp_payment_id = $1',
      [paymentId]
    );

    if (dbResult.rows.length === 0) {
      console.warn(`⚠️  Pagamento ${paymentId} não encontrado no banco`);
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    const payment = dbResult.rows[0];
    console.log(`📋 Status ATUAL NO BANCO: ${payment.status}`);
    console.log(`   - Order ID: ${payment.order_id || 'N/A'}`);
    console.log(`   - CRM Purchase ID: ${payment.crm_purchase_id || 'N/A'}`);
    console.log(`   - Criado em: ${payment.created_at}`);

    // Consultar no Mercado Pago para atualizar status (com retry)
    let mpPaymentResult;
    let consulted = false;
    
    try {
      console.log(`🔄 Consultando Mercado Pago...`);
      mpPaymentResult = await getPaymentMPWithRetry(paymentId, 3, 500);
      consulted = true;
      console.log(`✅ Status CONSULTADO NO MP: ${mpPaymentResult.status}`);
      console.log(`   - Transaction Amount: ${mpPaymentResult.transaction_amount}`);
      console.log(`   - Status Code: ${mpPaymentResult.status}`);
    } catch (mpError) {
      console.warn(`⚠️  Falha ao consultar MP (usando dados do banco): ${mpError.message}`);
      // Usar dados do banco como fallback
      mpPaymentResult = {
        id: payment.mp_payment_id,
        status: payment.status,
        transaction_amount: payment.amount
      };
    }

    // Atualizar status no banco se mudou
    if (consulted && mpPaymentResult.status !== payment.status) {
      console.log(`\n🔄 STATUS MUDOU: ${payment.status} → ${mpPaymentResult.status}`);
      
      await db.query(
        'UPDATE payments SET status = $1, updated_at = NOW() WHERE mp_payment_id = $2',
        [mpPaymentResult.status, paymentId]
      );

      if (mpPaymentResult.status === 'approved') {
        console.log(`\n✅ PROCESSANDO CONFIRMAÇÃO DO PIX`);
        
        await db.query(
          'UPDATE payments SET confirmed_at = NOW() WHERE mp_payment_id = $1',
          [paymentId]
        );

        // Se tiver order_id, atualizar status do pedido
        if (payment.order_id) {
          await db.query(
            'UPDATE orders SET payment_status = $1 WHERE id = $2',
            ['Pago', payment.order_id]
          );

          await db.query(
            'UPDATE orders SET status = $1 WHERE id = $2',
            ['Pago', payment.order_id]
          );

          // Diminuir estoque
          const itemsResult = await db.query(
            'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
            [payment.order_id]
          );

          for (const item of itemsResult.rows) {
            await db.query(
              `UPDATE products SET stock = stock - $1 WHERE id = $2`,
              [item.quantity, item.product_id]
            );
          }

          const duration = Date.now() - startTime;
          console.log(`✅ PIX CONFIRMADO via POLLING (${duration}ms)`);
          console.log(`   - Pedido: #${payment.order_id}`);
          console.log(`   - Status atualizado para: Pago`);
          console.log(`   - Estoque diminuído`);
        }

        // Se tiver crm_purchase_id, atualizar compra do CRM
        if (payment.crm_purchase_id) {
          await db.query(
            'UPDATE crm_purchases SET payment_status = $1, updated_at = NOW() WHERE id = $2',
            ['pago', payment.crm_purchase_id]
          );

          const duration = Date.now() - startTime;
          console.log(`✅ PIX CONFIRMADO via POLLING (${duration}ms)`);
          console.log(`   - Compra CRM: #${payment.crm_purchase_id}`);
          console.log(`   - Payment Status atualizado para: pago`);
        }
      }
    } else if (consulted) {
      console.log(`ℹ️  Status PERMANECE: ${mpPaymentResult.status} (sem mudanças)`);
    }

    const duration = Date.now() - startTime;
    console.log(`\n📊 RESPOSTA DO POLLING:`);
    console.log(`   - Status Final: ${mpPaymentResult.status}`);
    console.log(`   - Fonte: ${consulted ? 'Mercado Pago' : 'Banco de Dados'}`);
    console.log(`   - Tempo: ${duration}ms`);

    return res.json({
      id: payment.id,
      mp_payment_id: mpPaymentResult.id,
      status: mpPaymentResult.status,
      amount: mpPaymentResult.transaction_amount,
      order_id: payment.order_id,
      crm_purchase_id: payment.crm_purchase_id,
      _debug: {
        consulted_mp: consulted,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
        banco_status_anterior: payment.status
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`\n❌ ERRO ao consultar status (${duration}ms):`);
    console.error(`   - Erro: ${error.message}`);
    console.error(`   - Stack: ${error.stack}`);
    res.status(500).json({ 
      error: 'Erro ao consultar status',
      details: error.message,
      _debug: {
        duration_ms: duration,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// GET /payments/:paymentId - Detalhes do pagamento
router.get('/:paymentId', async (req, res) => {
  const { paymentId } = req.params;

  try {
    const result = await db.query(
      'SELECT * FROM payments WHERE id = $1 OR mp_payment_id = $2',
      [paymentId, paymentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Erro ao buscar pagamento:', error.message);
    res.status(500).json({ error: 'Erro ao buscar pagamento' });
  }
});

// POST /payments/webhook - Webhook do Mercado Pago
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-signature'];
    const requestId = req.headers['x-request-id'];

    if (!signature || !requestId) {
      console.warn('⚠️  Webhook sem assinatura');
      return res.sendStatus(400);
    }

    if (!MP_WEBHOOK_SECRET) {
      console.warn('⚠️  MP_WEBHOOK_SECRET não configurado');
      return res.sendStatus(200); // Aceitar mesmo assim para debug
    }

    // Validar assinatura
    const parts = signature.split(',');
    const tsMatch = parts.find(p => p.startsWith('ts='));
    const hashMatch = parts.find(p => p.startsWith('v1='));

    if (!tsMatch || !hashMatch) {
      console.warn('⚠️  Assinatura malformada');
      return res.sendStatus(400);
    }

    const ts = tsMatch.split('=')[1];
    const hash = hashMatch.split('=')[1];
    const manifest = `id:${requestId};ts:${ts};`;

    const hmac = crypto
      .createHmac('sha256', MP_WEBHOOK_SECRET)
      .update(manifest)
      .digest('hex');

    if (hmac !== hash) {
      console.warn('❌ Webhook com assinatura inválida');
      return res.sendStatus(401);
    }

    const paymentId = req.body?.data?.id?.toString();
    if (!paymentId) {
      console.warn('⚠️  Webhook sem payment ID');
      return res.sendStatus(200);
    }

    // Consultar pagamento no MP
    const mpPayment = await getPaymentMP(paymentId);

    // Atualizar no banco
    const dbResult = await db.query(
      'UPDATE payments SET status = $1, updated_at = NOW() WHERE mp_payment_id = $2 RETURNING *',
      [mpPayment.status, paymentId]
    );

    if (mpPayment.status === 'approved' && dbResult.rows.length > 0) {
      await db.query(
        'UPDATE payments SET confirmed_at = NOW() WHERE mp_payment_id = $1',
        [paymentId]
      );

      // Se tiver order_id, atualizar status do pedido E CONFIRMAR ESTOQUE
      const payment = dbResult.rows[0];
      if (payment.order_id) {
        // Atualizar status de pagamento para "Pago"
        await db.query(
          'UPDATE orders SET payment_status = $1 WHERE id = $2',
          ['Pago', payment.order_id]
        );

        // ✅ NOVO: Também atualizar status do pedido para "Pago" (para PIX ir direto para aba confirmados)
        await db.query(
          'UPDATE orders SET status = $1 WHERE id = $2',
          ['Pago', payment.order_id]
        );

        // ✅ NOVO: Diminuir estoque para PIX quando pagamento é aprovado
        const itemsResult = await db.query(
          'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
          [payment.order_id]
        );

        for (const item of itemsResult.rows) {
          await db.query(
            `UPDATE products SET stock = stock - $1 WHERE id = $2`,
            [item.quantity, item.product_id]
          );
        }

        console.log(`✅ PIX CONFIRMADO - Pedido #${payment.order_id} - Status: Confirmado, Estoque atualizado`);
      }

      // ✅ NOVO: Se tiver crm_purchase_id, atualizar compra do CRM
      if (payment.crm_purchase_id) {
        await db.query(
          'UPDATE crm_purchases SET payment_status = $1, updated_at = NOW() WHERE id = $2',
          ['pago', payment.crm_purchase_id]
        );

        console.log(`✅ PIX CONFIRMADO - Compra CRM #${payment.crm_purchase_id} - Status: Pago`);
      }
    }

    console.log('📩 Webhook recebido:', {
      id: mpPayment.id,
      status: mpPayment.status,
      valor: mpPayment.transaction_amount
    });

    res.sendStatus(200);

  } catch (error) {
    console.error('❌ Erro no webhook:', error.message);
    res.sendStatus(500);
  }
});

// POST /payments/cancel/:paymentId - Cancelar pagamento
router.post('/cancel/:paymentId', async (req, res) => {
  const { paymentId } = req.params;

  try {
    console.log('🚫 Cancelando pagamento:', paymentId);

    // Buscar pagamento no banco
    const payment = await db.query(
      'SELECT * FROM payments WHERE mp_payment_id = $1 OR id = $1',
      [paymentId]
    );

    if (payment.rows.length === 0) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    const paymentRecord = payment.rows[0];
    const mpPaymentId = paymentRecord.mp_payment_id;

    // Tentar cancelar no Mercado Pago
    try {
      await mpPayment.cancel({
        id: mpPaymentId
      });
      console.log('✅ Pagamento cancelado no Mercado Pago:', mpPaymentId);
    } catch (mpError) {
      console.warn('⚠️  Erro ao cancelar no MP (pode estar já processado):', mpError.message);
    }

    // Atualizar no banco
    await db.query(
      'UPDATE payments SET status = $1, updated_at = NOW() WHERE mp_payment_id = $2',
      ['cancelled', mpPaymentId]
    );

    // Atualizar status do pedido se existir
    if (paymentRecord.order_id) {
      await db.query(
        'UPDATE orders SET payment_status = $1 WHERE id = $2',
        ['Cancelado', paymentRecord.order_id]
      );
    }

    res.json({
      success: true,
      message: 'Pagamento cancelado com sucesso',
      mp_payment_id: mpPaymentId
    });

  } catch (error) {
    console.error('❌ Erro ao cancelar pagamento:', error.message);
    res.status(500).json({ error: 'Erro ao cancelar pagamento: ' + error.message });
  }
});

// POST /payments/update - Atualizar payment com order_id
router.post('/update', async (req, res) => {
  const { mp_payment_id, order_id, status } = req.body;

  try {
    if (!mp_payment_id) {
      return res.status(400).json({ error: 'mp_payment_id é obrigatório' });
    }

    console.log('📝 Atualizando payment:', { mp_payment_id, order_id, status });

    // Atualizar payment com order_id
    const result = await db.query(
      'UPDATE payments SET order_id = COALESCE($1, order_id), status = COALESCE($2, status), updated_at = NOW() WHERE mp_payment_id = $3 RETURNING *',
      [order_id || null, status || null, mp_payment_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    console.log('✅ Payment atualizado:', mp_payment_id);

    res.json({
      success: true,
      payment: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Erro ao atualizar payment:', error.message);
    res.status(500).json({ error: 'Erro ao atualizar payment: ' + error.message });
  }
});

// POST /payments/confirm-test/:paymentId - Confirmar pagamento em modo teste (SANDBOX)
// ⚠️  APENAS PARA DESENVOLVIMENTO - NÃO USE EM PRODUÇÃO
router.post('/confirm-test/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!paymentId) {
      return res.status(400).json({ error: 'paymentId é obrigatório' });
    }

    console.log('🔧 [TESTE] Confirmando pagamento:', paymentId);

    // Buscar pagamento
    const paymentResult = await db.query(
      'SELECT * FROM payments WHERE mp_payment_id = $1 OR id = $1',
      [paymentId]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    const payment = paymentResult.rows[0];
    const mpPaymentId = payment.mp_payment_id;

    // ✅ ATUALIZAR PARA APPROVED
    const updateResult = await db.query(
      'UPDATE payments SET status = $1, confirmed_at = NOW(), updated_at = NOW() WHERE mp_payment_id = $2 RETURNING *',
      ['approved', mpPaymentId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(500).json({ error: 'Erro ao atualizar pagamento' });
    }

    const updatedPayment = updateResult.rows[0];

    // Se tiver order_id, atualizar status do pedido
    if (updatedPayment.order_id) {
      await db.query(
        'UPDATE orders SET payment_status = $1, status = $2, updated_at = NOW() WHERE id = $3',
        ['Pago', 'Confirmado', updatedPayment.order_id]
      );

      // Diminuir estoque
      const itemsResult = await db.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
        [updatedPayment.order_id]
      );

      for (const item of itemsResult.rows) {
        await db.query(
          'UPDATE products SET stock = stock - $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }

      console.log(`✅ [TESTE] PIX CONFIRMADO - Pedido #${updatedPayment.order_id}`);
    }

    res.json({
      success: true,
      message: '✅ Pagamento confirmado em modo teste',
      payment: updatedPayment
    });

  } catch (error) {
    console.error('❌ Erro ao confirmar pagamento de teste:', error.message);
    res.status(500).json({ error: 'Erro: ' + error.message });
  }
});

// ✅ GET /payments/pix/active - Retorna PIX ativo (ainda não expirou nem foi confirmado)
router.get('/pix/active', async (req, res) => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    let result;
    try {
      // Tentar com customer_name (migration 004 executada)
      result = await db.query(
        `SELECT id, mp_payment_id, status, amount, qr_code, qr_code_base64, 
                crm_purchase_id, customer_name, created_at, updated_at
         FROM payments 
         WHERE payment_method = 'pix' 
         AND status IN ('pending', 'processing') 
         AND created_at > $1
         ORDER BY created_at DESC 
         LIMIT 1`,
        [oneHourAgo]
      );
    } catch (innerError) {
      // Se coluna customer_name não existir, tentar sem ela
      if (innerError.message.includes('customer_name') || innerError.message.includes('column')) {
        console.warn('⚠️  Coluna customer_name não encontrada, usando query sem ela');
        result = await db.query(
          `SELECT id, mp_payment_id, status, amount, qr_code, qr_code_base64, 
                  crm_purchase_id, NULL as customer_name, created_at, updated_at
           FROM payments 
           WHERE payment_method = 'pix' 
           AND status IN ('pending', 'processing') 
           AND created_at > $1
           ORDER BY created_at DESC 
           LIMIT 1`,
          [oneHourAgo]
        );
      } else {
        throw innerError;
      }
    }

    if (result.rows.length === 0) {
      return res.json({ active: false, pix: null });
    }

    const payment = result.rows[0];
    const expiresAt = new Date(payment.created_at.getTime() + 60 * 60 * 1000);

    // Se já expirou, retornar como inativo
    if (new Date() > expiresAt) {
      return res.json({ active: false, pix: null });
    }

    res.json({
      active: true,
      pix: {
        mp_payment_id: payment.mp_payment_id,
        status: payment.status,
        amount: payment.amount,
        qr_code: payment.qr_code,
        qr_code_base64: payment.qr_code_base64,
        crm_purchase_id: payment.crm_purchase_id,
        customer_name: payment.customer_name,
        expires_at: expiresAt.toISOString(),
        expires_in_seconds: Math.floor((expiresAt - new Date()) / 1000)
      }
    });
  } catch (error) {
    console.error('❌ Erro ao buscar PIX ativo:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Erro ao buscar PIX ativo', details: error.message });
  }
});

module.exports = router;
