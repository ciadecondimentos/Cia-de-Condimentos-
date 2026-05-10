const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET;
const MP_API_BASE = 'https://api.mercadopago.com/v1';

if (!MP_ACCESS_TOKEN) {
  console.warn('⚠️  MP_ACCESS_TOKEN não configurado');
}

// ==================== Funções Auxiliares ====================

async function createPaymentMP(paymentData) {
  const response = await fetch(`${MP_API_BASE}/payments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(paymentData)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`MP API Error ${response.status}: ${error}`);
  }

  return response.json();
}

async function getPaymentMP(paymentId) {
  const response = await fetch(`${MP_API_BASE}/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
    }
  });

  if (!response.ok) {
    throw new Error(`MP API Error: ${response.status}`);
  }

  return response.json();
}

// ==================== Rotas ====================

// POST /payments/pix - Criar pagamento PIX
router.post('/pix', async (req, res) => {
  try {
    const { orderId, amount, description, payerEmail, payerPhone } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Valor inválido' });
    }

    if (!payerEmail) {
      return res.status(400).json({ error: 'Email do pagador é obrigatório' });
    }

    // Criar pagamento no Mercado Pago
    const mpPayment = await createPaymentMP({
      transaction_amount: Number(amount),
      description: description || 'Pagamento PIX',
      payment_method_id: 'pix',
      payer: {
        email: payerEmail,
        phone: payerPhone ? { area_code: '55', number: payerPhone } : undefined
      }
    });

    // Salvar no banco de dados
    const result = await db.query(
      `INSERT INTO payments (order_id, mp_payment_id, status, amount, payment_method, qr_code, qr_code_base64, payer_email, payer_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, mp_payment_id, status, amount, qr_code, qr_code_base64`,
      [
        orderId || null,
        mpPayment.id,
        mpPayment.status,
        amount,
        'pix',
        mpPayment.point_of_interaction?.transaction_data?.qr_code || null,
        mpPayment.point_of_interaction?.transaction_data?.qr_code_base64 || null,
        payerEmail,
        payerPhone || null
      ]
    );

    console.log('✅ Pagamento PIX criado:', mpPayment.id);

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
    res.status(500).json({ error: 'Erro ao gerar PIX' });
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
      const mpPayment = await getPaymentMP(paymentId);

      // Atualizar status no banco
      if (mpPayment.status !== payment.status) {
        await db.query(
          'UPDATE payments SET status = $1, updated_at = NOW() WHERE mp_payment_id = $2',
          [mpPayment.status, paymentId]
        );

        if (mpPayment.status === 'approved') {
          await db.query(
            'UPDATE payments SET confirmed_at = NOW() WHERE mp_payment_id = $1',
            [paymentId]
          );
        }
      }

      console.log(`📊 Status atualizado - ID: ${paymentId} - Status: ${mpPayment.status}`);

      return res.json({
        id: payment.id,
        mp_payment_id: mpPayment.id,
        status: mpPayment.status,
        amount: mpPayment.transaction_amount,
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

      // Se tiver order_id, atualizar status do pedido
      const payment = dbResult.rows[0];
      if (payment.order_id) {
        await db.query(
          'UPDATE orders SET payment_status = $1 WHERE id = $2',
          ['Confirmado', payment.order_id]
        );
        console.log(`✅ PIX CONFIRMADO - Pedido #${payment.order_id}`);
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

module.exports = router;
