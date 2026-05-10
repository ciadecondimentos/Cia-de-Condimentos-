# 🚀 Deploy - Pix Mercado Pago

## ✅ Checklist Pré-Deploy

Antes de fazer deploy, verifique:

### 1. Variáveis de Ambiente
```bash
# Execute o script de teste
node test-pix.js
```

Você deve ver todas as variáveis com ✅.

### 2. Banco de Dados
Certifique-se que as migrações rodaram:
```bash
npm start  # Executa migrate automaticamente
```

### 3. Dependências
Nenhuma dependência nova foi adicionada. As que já usava são suficientes:
- express
- pg (PostgreSQL)
- cors
- helmet
- multer
- dotenv
- bcrypt
- jsonwebtoken

---

## 📝 Configuração no Render/Vercel

### 1. Variáveis de Ambiente no Render

Adicione no painel:

```env
DATABASE_URL=postgresql://user:pass@host:5432/db
NODE_ENV=production
PORT=3001
JWT_SECRET=sua_chave_aleatoria_forte_aqui
MP_ACCESS_TOKEN=seu_token_mercado_pago
MP_WEBHOOK_SECRET=seu_webhook_secret
UPLOAD_DIR=/app/uploads
```

### 2. Build Command
```
npm install
```

### 3. Start Command
```
npm start
```

---

## 🧪 Testando após Deploy

### Testar Criar PIX
```bash
curl -X POST https://seu-app.com/api/payments/pix \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": 1,
    "amount": 99.90,
    "description": "Pedido teste",
    "payerEmail": "cliente@test.com",
    "payerPhone": "11999999999"
  }'
```

Você receberá:
```json
{
  "id": 1,
  "mp_payment_id": 123456789,
  "status": "pending",
  "qr_code": "00020126...",
  "qr_code_base64": "data:image/png;base64,..."
}
```

### Testar Consultar Status
```bash
curl https://seu-app.com/api/payments/status/123456789
```

---

## 🔌 Webhook do Mercado Pago

Quando tiver acesso à conta Mercado Pago:

1. Acesse: https://www.mercadopago.com.br/account/notifications
2. Configure URL do webhook:
   ```
   https://seu-app.com/api/payments/webhook
   ```
3. Selecione eventos: `payment.created`, `payment.updated`

---

## 🐛 Debug/Logs

Para ver logs em tempo real no Render:
```
Acesse: Settings → Logs
```

---

## ✨ Status dos Pagamentos

O sistema rastreia:
- `pending` - Aguardando pagamento
- `approved` - Pagamento confirmado ✅
- `rejected` - Pagamento rejeitado ❌
- `cancelled` - Pagamento cancelado 🚫

Quando status muda para `approved`, o pedido é automaticamente atualizado com `payment_status = 'Confirmado'`.

---

## 💡 Dicas

- Teste com QR Code estático primeiro (sem Pix dinâmico)
- Use modo sandbox do Mercado Pago durante testes
- Monitore logs para erros de API
- Guarde os IDs dos pagamentos para auditoria
