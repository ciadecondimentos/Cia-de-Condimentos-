# 🚀 Guia Completo de Deploy — Cia de Condimentos + Pix

**Status:** ✅ Backend pronto | ✅ Frontend pronto | ✅ Credenciais configuradas

---

## 📋 Checklist Pré-Deploy

### Backend
- ✅ `routes/payments.js` — Endpoints PIX criados
- ✅ `migrations/09_create_payments.sql` — Tabela de pagamentos
- ✅ `.env` — Credenciais Mercado Pago configuradas
- ✅ `package.json` — Scripts de teste adicionados
- ✅ `test-pix.js` — Validação de configuração
- ✅ `test-payments.js` — Testes de endpoints
- ✅ `test-mock.js` — Testes sem banco de dados

### Frontend
- ✅ `index.html` — Integração Pix com QR Code
- ✅ Polling automático (5s intervalo)
- ✅ Métodos de pagamento: PIX, Dinheiro, Cartão

### Servidor
- ✅ Database: PostgreSQL no Render
- ✅ Backend: Node.js + Express
- ✅ Frontend: HTML/CSS/JS puro

---

## 🔧 PASSO 1: Preparar Variáveis de Ambiente

### No Render Dashboard:

Vá para seu serviço → **Environment** e configure:

```env
# Database
DATABASE_URL=postgresql://ciacondimentos_db_pc0f_user:tVq07yH36CWOwjEhnnEXs8e7uSjTACj6@dpg-d6svv2q4d50c73c0f3o0-a.oregon-postgres.render.com/ciacondimentos_db_pc0f

# Server
NODE_ENV=production
PORT=3000

# JWT
JWT_SECRET=cia_new_secret_key_2026_render

# Mercado Pago
MP_ACCESS_TOKEN=APP_USR-784933418142695-031515-63fc634ae777312bdb5d9c314b4614b1-2703647209
MP_WEBHOOK_SECRET=9b0b3897d11dc822f6f87910e21fc81e59f8007978c23893b2157835845921ef

# Uploads
UPLOAD_DIR=/app/uploads
```

---

## 🔗 PASSO 2: Configurar Webhook no Mercado Pago

### Acessar Dashboard Mercado Pago:

1. Acesse [Webhooks MP](https://www.mercadopago.com.br/account/notifications)
2. Clique em **Agregar nueva app** ou edite existente
3. Cole a URL do seu webhook:

```
https://cia-de-condimentos.onrender.com/api/payments/webhook
```

**Substitua `cia-de-condimentos` pelo seu domínio real no Render!**

4. Selecione eventos:
   - ✅ `payment.updated` (IMPORTANTE!)
   - ✅ `payment.created` (opcional)

5. **Webhook Secret:** Já salvo em `.env`

6. **Salve e teste** (MP enviará notificação de teste)

---

## 📤 PASSO 3: Fazer Push para Deploy

### Terminal:

```bash
cd /path/to/Cia-de-Condimentos--main

# Verificar status
git status

# Adicionar todos os arquivos
git add .

# Commit com mensagem descritiva
git commit -m "Implementar Pix/Mercado Pago com webhooks e frontend integrado"

# Push para Render
git push origin main

# (Se usar branch diferente: git push origin seu-branch)
```

### Render fará:
1. ✅ Clone do repositório
2. ✅ `npm install` no backend
3. ✅ Executa `npm start` (que roda migrations)
4. ✅ Banco é criado/atualizado
5. ✅ API fica online

**Status:** Veja em Render Dashboard → Logs

---

## 🧪 PASSO 4: Testar Endpoints (Pós-Deploy)

### Teste 1: Validar Configuração

```bash
# Local
npm run test:pix

# Esperado:
# ✅ DATABASE_URL ✅
# ✅ NODE_ENV ✅
# ✅ JWT_SECRET ✅
# ✅ MP_ACCESS_TOKEN ✅
# ✅ MP_WEBHOOK_SECRET ✅
```

### Teste 2: Criar Produto

```bash
curl -X POST https://seu-app.onrender.com/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_JWT_TOKEN" \
  -d '{
    "name": "Pimenta Teste",
    "price": 29.90,
    "category": "Pimentas",
    "stock": 50,
    "active": true
  }'
```

### Teste 3: Criar Pedido

```bash
curl -X POST https://seu-app.onrender.com/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "name": "Teste Cliente",
      "phone": "11999999999",
      "address": "Rua Teste, 123"
    },
    "items": [{"id": 1, "qty": 1, "price": 29.90, "name": "Pimenta Teste"}],
    "subtotal": 29.90,
    "total": 29.90,
    "payment": "PIX"
  }'
```

**Retorno esperado:**
```json
{
  "id": 1,
  "customer": {...},
  "items": [...],
  "payment_status": "Pendente",
  "created_at": "2026-05-10T..."
}
```

### Teste 4: Gerar QR Code PIX

```bash
curl -X POST https://seu-app.onrender.com/api/payments/pix \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": 1,
    "amount": 29.90,
    "description": "Pedido #1",
    "payerEmail": "cliente@test.com",
    "payerPhone": "11999999999"
  }'
```

**Retorno esperado:**
```json
{
  "id": 1,
  "mp_payment_id": 12345678901,
  "status": "pending",
  "amount": 29.90,
  "qr_code": "00020126...",
  "qr_code_base64": "data:image/png;base64,..."
}
```

### Teste 5: Consultar Status

```bash
curl https://seu-app.onrender.com/api/payments/status/12345678901
```

---

## 🌐 PASSO 5: Testar no Frontend

### Acesso:
```
https://seu-app.onrender.com
```

### Fluxo:
1. Adicione produtos ao carrinho
2. Clique "Finalizar Compra"
3. Preencha dados (nome, telefone, endereço)
4. Escolha "PIX"
5. **QR Code aparece** na tela
6. Escaneie com seu telefone
7. Faça o pagamento (em sandbox ou teste)
8. Página atualiza automaticamente com ✅

---

## 🔐 PASSO 6: Validar Webhook

### MP enviará POST para:
```
POST https://seu-app.onrender.com/api/payments/webhook
Headers:
  x-signature: <assinatura HMAC>
  x-request-id: <id único>
  
Body:
{
  "action": "payment.updated",
  "data": {
    "id": 12345678901
  }
}
```

### Seu backend:
1. ✅ Valida assinatura HMAC-SHA256
2. ✅ Consulta Mercado Pago pelo ID
3. ✅ Se status = "approved":
   - ✅ Atualiza `payments.status = 'approved'`
   - ✅ Atualiza `orders.payment_status = 'Confirmado'`
4. ✅ Retorna 200 OK

**Logs:** Veja em Render → Logs do serviço

---

## 📊 PASSO 7: Monitorar Transações

### Dashboard Mercado Pago:

1. Vá para [Atividade](https://www.mercadopago.com.br/activity)
2. Veja todos os pagamentos recebidos
3. Status: pending → approved → settled

### Banco de Dados:

```sql
-- Listar pagamentos
SELECT id, mp_payment_id, status, amount, created_at 
FROM payments 
ORDER BY created_at DESC;

-- Listar pedidos
SELECT id, payment_status, total, created_at 
FROM orders 
ORDER BY created_at DESC;
```

---

## 🐛 Troubleshooting

### "Webhook não recebe notificações"
- [ ] URL configurada corretamente no MP
- [ ] Backend está online (Render não hibernando)
- [ ] HTTPS habilitado
- [ ] Checar logs de erro em Render

### "Erro de assinatura inválida"
- [ ] Verificar `MP_WEBHOOK_SECRET` em `.env`
- [ ] Logs mostram `x-signature` e `x-request-id`?

### "QR Code não aparece"
- [ ] `MP_ACCESS_TOKEN` correto?
- [ ] Renderizar QR Code: `base64_to_image(qr_code_base64)`
- [ ] Mercado Pago retorna erro?

### "Pagamento não atualiza status"
- [ ] Webhook está sendo disparado (Render logs)?
- [ ] Status muda de "pending" para "approved"?
- [ ] Database update está funcionando?

---

## ✅ Checklist Final

### Antes de considerar "Pronto":

- [ ] `.env` contém todas as 6 variáveis obrigatórias
- [ ] Webhook URL configurada no MP Dashboard
- [ ] `git push` feito com sucesso
- [ ] Render logs mostram "listening on port 3000"
- [ ] Banco está online e acessível
- [ ] GET `/api/products` retorna 200
- [ ] POST `/api/orders` cria ordem com sucesso
- [ ] POST `/api/payments/pix` gera QR Code
- [ ] Frontend exibe QR Code corretamente
- [ ] Polling detecta mudança de status
- [ ] Webhook MP envia notificações

---

## 🎉 Sucesso!

Se tudo passar:

✅ **Sistema completamente funcional**

Clientes podem:
1. Navegar produtos
2. Adicionar ao carrinho
3. Fazer checkout com PIX
4. Escanear QR Code
5. Pagar pelo banco
6. Ver confirmação automática

Você recebe:
1. Notificações de novos pedidos (webhook)
2. Confirmação automática quando pagamento aprovado
3. Histórico em Mercado Pago Dashboard
4. Dados em seu banco PostgreSQL

---

## 📚 Documentação Adicional

- [DEPLOY_PIX.md](./DEPLOY_PIX.md) — Deploy detalhado
- [WEBHOOK_SETUP.md](./WEBHOOK_SETUP.md) — Configuração de webhooks
- [README.md](./README.md) — API endpoints completa
- [Mercado Pago Docs](https://www.mercadopago.com.br/developers/pt)

---

## 🚀 Próximos Passos (Opcionais)

1. **Adicionar mais métodos de pagamento** (Cartão, Boleto)
2. **Enviar email/SMS com confirmação**
3. **Dashboard de admin** para gerenciar pedidos
4. **Histórico de cliente**
5. **Rastreamento de entrega**
6. **Avaliações de produtos**

---

**Última atualização:** 10 de maio de 2026  
**Status:** ✅ PRODUÇÃO PRONTA
