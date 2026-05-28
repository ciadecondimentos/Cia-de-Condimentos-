# Setup: PIX com Atualização Automática do CRM

## ✅ Alterações Implementadas

### Backend (backend/routes/payments.js)
1. **POST /payments/pix** - Agora aceita `crm_purchase_id` na request
2. **GET /payments/status/:paymentId** - Atualiza `crm_purchases.payment_status = 'pago'` quando PIX é confirmado
3. **POST /payments/webhook** - Mesmo comportamento do polling para webhook

### Frontend (frontend/admin-crm.js)
1. **Armazenar Purchase IDs** - `crmOrdersData` agora inclui array `purchaseIds`
2. **Enviar crm_purchase_id** - Ao gerar PIX, envia o ID da compra CRM
3. **Polling Automático** - Verifica status do PIX a cada 5 segundos por até 10 minutos
4. **Atualização em Tempo Real** - Quando PIX confirmado, recarrega histórico do cliente
5. **Formatação de Valores** - Todos os valores monetários agora usam `formatMoney()` (nunca NaN)

---

## ⚠️ Alteração Necessária no Banco de Dados

### Adicione a coluna crm_purchase_id na tabela payments:

```sql
ALTER TABLE payments ADD COLUMN crm_purchase_id INTEGER REFERENCES crm_purchases(id) ON DELETE SET NULL;
```

**Ou, se preferir com um índice:**

```sql
ALTER TABLE payments ADD COLUMN crm_purchase_id INTEGER REFERENCES crm_purchases(id) ON DELETE SET NULL;
CREATE INDEX idx_payments_crm_purchase ON payments(crm_purchase_id);
```

---

## 🧪 Testando a Implementação

### 1. Gerar PIX no CRM
- Abra a Central de Clientes
- Selecione um cliente
- Na seção de histórico, clique em "GERAR CÓDIGO PIX" em uma compra pendente

### 2. Verificar Polling
- Abra o Console do Navegador (F12)
- Procure por "[Poll X]" para ver as verificações de status
- A cada 5 segundos, deve aparecer uma nova verificação

### 3. Confirmar PIX
- Use a API ou Mercado Pago Sandbox para confirmar o PIX
- O histórico deve atualizar automaticamente
- O status deve mudar para "✓ PAGO"

---

## 📋 Comportamento Esperado

### Antes:
- ❌ Compra mostra "R$ NaN"
- ❌ PIX gerado mas pagamento não atualiza automaticamente
- ❌ Precisa recarregar página manualmente

### Depois:
- ✅ Compra mostra valor correto (ex: "R$ 150.00")
- ✅ PIX verifica status automaticamente a cada 5s
- ✅ Quando pago, histórico atualiza em tempo real
- ✅ Dashboard reflete os pagamentos confirmados

---

## 🔧 Variáveis de Ambiente

Certifique-se de que existem:
- `MP_ACCESS_TOKEN` - Token Mercado Pago
- `MP_WEBHOOK_SECRET` - Secret do webhook (opcional para polling)
- `DATABASE_URL` - Conexão PostgreSQL

---

## 📝 Logs para Debug

Verifique o console do servidor para:
- `📝 Gerando PIX para CRM...` - PIX criado
- `🔄 [Poll N] Status PIX: approved` - PIX confirmado
- `✅ PIX CONFIRMADO` - Compra CRM atualizada

---

## ❌ Possíveis Erros

### "Column 'crm_purchase_id' does not exist"
**Solução:** Execute o SQL para adicionar a coluna ao banco

### "[Poll N] Status PIX: pending"
**Esperado:** O PIX ainda não foi pago. Polling continua.

### "NaN" aparecendo em valores
**Verifique:** Se `formatMoney()` está sendo usado em todos os lugares

---

## 🚀 Próximas Melhorias (Opcional)

1. Webhook automático do Mercado Pago (em vez de polling)
2. Notificação por email/WhatsApp quando PIX é confirmado
3. Agrupamento de múltiplas compras em uma transação PIX única
4. Página de pagamento com QR code dinâmico

