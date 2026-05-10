# 🔗 Configuração de Webhook — Mercado Pago

Este guia mostra como configurar o webhook do Mercado Pago para notificar seu backend quando um pagamento PIX é aprovado.

---

## 📋 O que é um Webhook?

Um webhook é uma callback HTTP que o Mercado Pago dispara quando algo acontece na sua conta (pagamento aprovado, cancelado, etc). Seu backend recebe a notificação e pode atualizar os pedidos automaticamente.

**Vantagem:** Você não precisa fazer polling (ficar consultando o status) a cada 5 segundos. O Mercado Pago avisa você automaticamente.

---

## ✅ Pré-requisitos

- ✅ Backend deployed no Render (ou outro serviço)
- ✅ Domínio com HTTPS (obrigatório para Mercado Pago)
- ✅ Credenciais MP configuradas em `.env`
- ✅ Rota webhook criada em `routes/payments.js`

---

## 🔧 Passo 1: Encontrar o Webhook Secret

O **Webhook Secret** foi fornecido quando você criou a integração PIX no Mercado Pago.

**Onde encontrar:**
1. Acesse [Mercado Pago Dashboard](https://www.mercadopago.com.br/admin/account/integrations/webhooks)
2. Procure por "Webhooks" ou "Integrações"
3. Copie o **Webhook Secret** (já está no seu `.env`)

```env
MP_WEBHOOK_SECRET=9b0b3897d11dc822f6f87910e21fc81e59f8007978c23893b2157835845921ef
```

---

## 🌐 Passo 2: Configurar URL do Webhook no Mercado Pago

### Acesso ao Painel:
1. Vá para [Credenciais da Integração](https://www.mercadopago.com.br/account/credentials)
2. Clique em **"Integrações"** → **"Webhooks"**
3. Clique em **"Adicionar novo webhook"** (ou editar existente)

### URL do Webhook:
```
https://seu-app-name.onrender.com/api/payments/webhook
```

**Substitua `seu-app-name` pelo seu domínio real:**
- Se usar Render: `https://cia-de-condimentos.onrender.com/api/payments/webhook`
- Se usar outro serviço: ajuste conforme

### Eventos para disparar:
Selecione os eventos que quer monitorar:
- ✅ `payment.created` - Novo pagamento criado
- ✅ `payment.updated` - Pagamento atualizado (IMPORTANTE para saber se foi aprovado)

---

## 🧪 Passo 3: Testar o Webhook (Local)

Para testar **antes de fazer deploy**, use uma ferramenta como **ngrok** para expor seu localhost:

### 3.1 Instalar ngrok
```bash
# No Windows
choco install ngrok

# Ou baixar de https://ngrok.com/download
```

### 3.2 Iniciar ngrok
```bash
ngrok http 3000
```

Você verá algo como:
```
ngrok by @inconshreveable

Tunnel Status: online
Public URL: https://abc123def456.ngrok.io
```

### 3.3 Usar URL do ngrok no Mercado Pago
No webhook do MP, use:
```
https://abc123def456.ngrok.io/api/payments/webhook
```

### 3.4 Testar com cURL
```bash
curl -X POST https://seu-app.com/api/payments/webhook \
  -H "Content-Type: application/json" \
  -H "x-signature: sua_assinatura_aqui" \
  -H "x-request-id: 123456" \
  -d '{
    "action": "payment.updated",
    "data": {
      "id": "123456789"
    }
  }'
```

---

## 🔐 Segurança: Validação da Assinatura

Seu backend **valida** que a notificação realmente veio do Mercado Pago usando a assinatura HMAC-SHA256.

**Como funciona:**
1. MP envia: `x-signature` (HMAC da notificação)
2. MP envia: `x-request-id` (ID único da requisição)
3. Seu código valida: `HMAC-SHA256(x-request-id, MP_WEBHOOK_SECRET) === x-signature`

**Exemplo (já implementado em `routes/payments.js`):**
```javascript
const crypto = require('crypto');

const signature = req.headers['x-signature'];
const requestId = req.headers['x-request-id'];

if (!signature || !requestId) {
  return res.status(401).json({ error: 'Assinatura ausente' });
}

const hash = crypto
  .createHmac('sha256', process.env.MP_WEBHOOK_SECRET)
  .update(requestId)
  .digest('hex');

if (hash !== signature) {
  return res.status(401).json({ error: 'Assinatura inválida' });
}

// Webhook é válido, processa...
```

---

## 📊 Fluxo Webhook

```
1. Cliente faz pagamento PIX
                    ↓
2. Mercado Pago aprova pagamento
                    ↓
3. MP dispara webhook → POST /api/payments/webhook
                    ↓
4. Seu backend valida assinatura
                    ↓
5. Backend atualiza pagamento.status = 'approved'
                    ↓
6. Backend atualiza order.payment_status = 'Confirmado'
                    ↓
7. Frontend notificado (polling detecta mudança)
                    ↓
8. Cliente vê "Pagamento Confirmado" ✅
```

---

## 🚀 Fazer Deploy com Webhook

### No Render:

1. **Fazer push do código:**
```bash
git add .
git commit -m "Adicionar webhooks Mercado Pago"
git push
```

2. **Verificar variáveis de ambiente:**
   - ✅ `MP_ACCESS_TOKEN` 
   - ✅ `MP_WEBHOOK_SECRET`

3. **Testar webhook:**
```bash
# Após deploy, teste com:
curl -X POST https://seu-app.onrender.com/api/payments/webhook \
  -H "Content-Type: application/json" \
  -H "x-signature: hash_aqui" \
  -H "x-request-id: 123" \
  -d '{}'
```

---

## 🐛 Troubleshooting

### "Webhook não recebe notificações"
1. Verificar se URL está correta em MP Dashboard
2. Verificar se backend está online (Render não está hibernado)
3. Conferir logs do Render para erros 4xx/5xx

### "Erro de assinatura inválida"
1. Verificar `MP_WEBHOOK_SECRET` no `.env`
2. Garantir que `x-signature` e `x-request-id` estão chegando
3. Logs mostram: `console.log('Assinatura válida')` ?

### "Pagamento não atualiza status"
1. Verificar se webhook está sendo disparado (logs do Render)
2. Confirmar que `payment.status === 'approved'` no webhook
3. Verificar se `order.payment_status` está sendo atualizado no DB

---

## 📚 Referências

- [Documentação Mercado Pago Webhooks](https://www.mercadopago.com.br/developers/pt/docs/checkout-api/webhooks)
- [Validação de Assinatura](https://www.mercadopago.com.br/developers/pt/docs/checkout-api/webhooks/validate-event)
- [API Pagamentos](https://www.mercadopago.com.br/developers/pt/docs/payments-api)

---

## ✅ Checklist Final

- [ ] Webhook Secret copiado para `.env`
- [ ] URL do webhook configurada no MP Dashboard
- [ ] Eventos selecionados: `payment.created` e `payment.updated`
- [ ] Backend deployado com HTTPS
- [ ] Validação de assinatura funcionando
- [ ] Logs mostrando notificações recebidas
- [ ] Status do pagamento atualizando automaticamente

---

**Quando tudo estiver pronto:** O sistema funcionará 100% automático! 🎉

Cliente escaneia QR → Paga → MP notifica → Sistema atualiza → Cliente vê sucesso ✅
