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
    const { orderId, amount, description, payerEmail, payerPhone } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Valor inválido' });
    }

    // Email é obrigatório para Mercado Pago
    const email = payerEmail || 'cliente@condimentos.com';

    console.log('📝 Criando pagamento PIX:', { amount, email, payerPhone });

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
    const result = await db.query(
      `INSERT INTO payments (order_id, mp_payment_id, status, amount, payment_method, qr_code, qr_code_base64, payer_email, payer_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, mp_payment_id, status, amount, qr_code, qr_code_base64`,
      [
        orderId || null,
        mpPaymentResult.id,
        mpPaymentResult.status,
        amount,
        'pix',
        qrCode,
        finalQrCodeBase64,
        email,
        payerPhone || null
      ]
    );

    console.log('✅ Pagamento PIX criado:', mpPaymentResult.id);

    res.status(201).json({
      id: result.rows[0].id,
      mp_payment_id: result.rows[0].mp_payment_id,
      status: result.rows[0].status,
      amount: result.rows[0].amount,
      qr_code: result.rows[0].qr_code,
      qr_code_base64: result.rows[0].qr_code_base64
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

  try {
    // Buscar no banco
    const dbResult = await db.query(
      'SELECT * FROM payments WHERE mp_payment_id = $1',
      [paymentId]
    );

    if (dbResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    const payment = dbResult.rows[0];

    // Consultar no Mercado Pago para atualizar status
    try {
      const mpPaymentResult = await getPaymentMP(paymentId);

      // Atualizar status no banco
      if (mpPaymentResult.status !== payment.status) {
        await db.query(
          'UPDATE payments SET status = $1, updated_at = NOW() WHERE mp_payment_id = $2',
          [mpPaymentResult.status, paymentId]
        );

        if (mpPaymentResult.status === 'approved') {
          await db.query(
            'UPDATE payments SET confirmed_at = NOW() WHERE mp_payment_id = $1',
            [paymentId]
          );

          // Se tiver order_id, atualizar status do pedido
          if (payment.order_id) {
            // Atualizar payment_status
            await db.query(
              'UPDATE orders SET payment_status = $1 WHERE id = $2',
              ['Confirmado', payment.order_id]
            );

            // ✅ NOVO: Também atualizar status do pedido para "Confirmado"
            await db.query(
              'UPDATE orders SET status = $1 WHERE id = $2',
              ['Confirmado', payment.order_id]
            );

            // ✅ NOVO: Diminuir estoque se ainda não foi feito
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

            console.log(`✅ PIX CONFIRMADO (polling) - Pedido #${payment.order_id}`);
          }
        }
      }

      console.log(`📊 Status atualizado - ID: ${paymentId} - Status: ${mpPaymentResult.status}`);

      return res.json({
        id: payment.id,
        mp_payment_id: mpPaymentResult.id,
        status: mpPaymentResult.status,
        amount: mpPaymentResult.transaction_amount,
        order_id: payment.order_id
      });
    } catch (mpError) {
      console.warn('⚠️  Não conseguiu consultar MP, retornando dados do banco');
      return res.json({
        id: payment.id,
        mp_payment_id: payment.mp_payment_id,
        status: payment.status,
        amount: payment.amount,
        order_id: payment.order_id
      });
    }

  } catch (error) {
    console.error('❌ Erro ao consultar status:', error.message);
    res.status(500).json({ error: 'Erro ao consultar status' });
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
        // Atualizar status de pagamento para "Confirmado"
        await db.query(
          'UPDATE orders SET payment_status = $1 WHERE id = $2',
          ['Confirmado', payment.order_id]
        );

        // ✅ NOVO: Também atualizar status do pedido para "Confirmado" (para PIX ir direto para aba confirmados)
        await db.query(
          'UPDATE orders SET status = $1 WHERE id = $2',
          ['Confirmado', payment.order_id]
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

module.exports = router;
