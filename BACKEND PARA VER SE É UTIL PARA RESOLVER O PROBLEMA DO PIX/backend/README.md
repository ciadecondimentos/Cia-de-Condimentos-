# Cia de Condimentos — Backend

API Express com autenticação JWT, gerenciamento de produtos, pedidos e **pagamentos via PIX (Mercado Pago)**.

## 🚀 Início Rápido

### Instalação local:
```bash
cd backend
npm install

# Copiar arquivo de variáveis
cp .env.example .env

# Preencher .env com suas credenciais
# DATABASE_URL, JWT_SECRET, MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET

# Rodar migrações e iniciar servidor
npm start
```

### Desenvolvimento:
```bash
npm run dev  # com nodemon
```

### Testar configuração PIX:
```bash
npm run test:pix
```

---

## 📋 Variáveis de Ambiente

### Obrigatórias:
```env
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=sua_chave_secreta_aleatoria_minimo_32_caracteres
MP_ACCESS_TOKEN=seu_token_mercado_pago
MP_WEBHOOK_SECRET=seu_webhook_secret
```

### Opcionais:
```env
NODE_ENV=production
PORT=3001
UPLOAD_DIR=/app/uploads
```

---

## 🔌 Endpoints Disponíveis

### Produtos
- `GET /api/products` - Listar produtos
- `POST /api/products` - Criar produto (admin)
- `PUT /api/products/:id` - Atualizar produto (admin)
- `DELETE /api/products/:id` - Deletar produto (admin)

### Pedidos
- `POST /api/orders` - Criar pedido (sem autenticação)
- `GET /api/orders` - Listar pedidos (admin)
- `GET /api/orders/:id` - Detalhes do pedido
- `PUT /api/orders/:id` - Atualizar status (admin)

### Pagamentos (PIX)
- `POST /api/payments/pix` - Gerar QR Code PIX
- `GET /api/payments/status/:paymentId` - Consultar status
- `GET /api/payments/:paymentId` - Detalhes do pagamento
- `POST /api/payments/webhook` - Webhook Mercado Pago

### Upload
- `POST /api/upload` - Upload de imagem

---

## 💳 Usando Pix

### 1. Criar Pagamento
```bash
curl -X POST http://localhost:3001/api/payments/pix \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": 1,
    "amount": 99.90,
    "description": "Pedido #1",
    "payerEmail": "cliente@email.com",
    "payerPhone": "11999999999"
  }'
```

**Resposta:**
```json
{
  "id": 1,
  "mp_payment_id": 123456789,
  "status": "pending",
  "qr_code": "00020126...",
  "qr_code_base64": "data:image/png;base64,..."
}
```

### 2. Consultar Status
```bash
curl http://localhost:3001/api/payments/status/123456789
```

---

## 🧪 Testar Localmente

### Opção 1: Script Bash
```bash
bash test-api.sh
```

### Opção 2: Postman
Importe a collection em `test-api.postman.json`

### Opção 3: cURL manual
```bash
# Criar pagamento
curl -X POST http://localhost:3001/api/payments/pix \
  -H "Content-Type: application/json" \
  -d '{"amount": 10, "payerEmail": "test@test.com"}'

# Consultar status
curl http://localhost:3001/api/payments/status/PAYMENT_ID
```

---

## 📊 Banco de Dados

### Migrações
Executadas automaticamente com `npm start`.

### Tabelas principais:
- `products` - Produtos da loja
- `orders` - Pedidos dos clientes
- `payments` - Pagamentos PIX

---

## 🔐 Deploy no Render

1. **Variáveis de ambiente no Render:**
   - DATABASE_URL (Postgres)
   - JWT_SECRET (gerar com: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - MP_ACCESS_TOKEN (do Mercado Pago)
   - MP_WEBHOOK_SECRET (do Mercado Pago)

2. **Build command:**
   ```
   npm install
   ```

3. **Start command:**
   ```
   npm start
   ```

4. **Webhook do Mercado Pago:**
   Após deploy, configure em https://www.mercadopago.com.br/account/notifications:
   ```
   https://seu-app.com/api/payments/webhook
   ```

---

## 📚 Documentação Completa

Para deploy detalhado: veja [DEPLOY_PIX.md](./DEPLOY_PIX.md)

---

## 🐛 Troubleshooting

- **Erro de conexão com banco:** Verifique `DATABASE_URL`
- **Pix não funciona:** Verifique `MP_ACCESS_TOKEN`
- **Webhook não recebe:** Configure URL correta no Mercado Pago


