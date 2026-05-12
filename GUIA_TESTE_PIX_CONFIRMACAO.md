# Guia de Teste - Confirmação de Pagamento PIX

## ✅ Correção Implementada (12 maio 2026)

O sistema agora detecta automaticamente quando um PIX foi pago a cada 2 segundos. Quando a confirmação é recebida, a modal de sucesso aparece na tela do cliente.

---

## 🧪 Teste 1: Fluxo Completo no Desenvolvimento (Sandbox)

### Pré-requisitos
- Ambiente de desenvolvimento rodando (`npm start` no backend)
- Mercado Pago configurado com token de teste
- Console do navegador aberto (F12 ou Ctrl+Shift+I)

### Passos
1. **Abrir a loja**: Acesse `http://localhost:3000` (ou seu endereço)
2. **Adicionar produtos ao carrinho**
3. **Ir ao checkout**: Clique em "Carrinho" → "Proceder ao pagamento"
4. **Selecionar PIX**: Na tela de método de pagamento, escolha "PIX"
5. **Escanear QR Code**: Na tela do QR Code, escanear com outro dispositivo ou usar ferramenta de simulação
6. **Observar o console**: Você verá logs em tempo real:

```
⏱️  INICIANDO POLLING DE PAGAMENTO PIX
   ID do pagamento: 12345678
   ID do pedido: 1
   Valor: R$ 100,00
   Intervalo inicial: 2000ms

📊 [POLLING] Tentativa #1 (0s decorridos) - Intervalo: 2000ms
✅ Resposta recebida - Status: pending
⏳ Pagamento ainda pendente - aguardando confirmação...

📊 [POLLING] Tentativa #2 (2s decorridos) - Intervalo: 2000ms
✅ Resposta recebida - Status: pending
⏳ Pagamento ainda pendente - aguardando confirmação...

📊 [POLLING] Tentativa #3 (4s decorridos) - Intervalo: 2000ms
✅ ✅ ✅ PAGAMENTO APROVADO! Mostrando confirmação...
✓ Polling interrompido - Duração: 4s - Tentativas: 3
```

7. **Verificar modal**: A modal de confirmação deve aparecer com:
   - ✅ Grande checkmark verde
   - "Pagamento Confirmado!"
   - Número do pedido
   - Valor pago
   - Auto-fecha após 5 segundos

---

## 🧪 Teste 2: Teste com Endpoint de Confirmação Manual (Para Sandbox)

Se você não conseguir completar o pagamento real, pode usar o endpoint de teste:

### Via cURL
```bash
curl -X POST http://localhost:3000/api/payments/confirm-test/PAYMENT_ID
```

**Exemplo:**
```bash
curl -X POST http://localhost:3000/api/payments/confirm-test/12345678
```

### Resposta esperada
```json
{
  "id": 1,
  "mp_payment_id": "12345678",
  "status": "approved",
  "confirmed_at": "2026-05-12T14:30:00Z"
}
```

---

## 🧪 Teste 3: Verificar Logs do Backend

### No terminal onde o backend está rodando:

Você deve ver logs como:

```
⏱️  [POLLING] Verificando status do pagamento: 12345678
📋 Status atual no banco: pending | Order: 1
🔄 Tentativa 1/3 - Consultando MP para pagamento 12345678
✅ Consulta bem-sucedida (tentativa 1): Status = approved
🔄 Status mudou: pending → approved
✅ PIX CONFIRMADO (polling - 245ms) - Pedido #1
📊 Resposta: Status = approved | Tempo = 245ms | Fonte = MP
```

---

## 🔄 Fluxo de Retry Automático

O sistema agora tenta consultar o Mercado Pago até 3 vezes com backoff exponencial:

1. **Tentativa 1**: Espera 500ms antes de retry
2. **Tentativa 2**: Espera 1000ms antes de retry
3. **Tentativa 3**: Espera 2000ms antes de retry
4. **Se todas falharem**: Usa dados do banco como fallback

---

## ⚠️ Possíveis Cenários

### Cenário 1: Pagamento Confirmado Rapidamente
```
Tentativa 1 → APROVADO ✅
Tempo: ~2 segundos
```

### Cenário 2: Pagamento Demora (Ex: Fila do Mercado Pago)
```
Tentativa 1 → Pendente
Tentativa 2 → Pendente
Tentativa 3 → APROVADO ✅
Tempo: ~6-8 segundos
```

### Cenário 3: Falha de Conexão com Mercado Pago
```
Tentativa 1 → Erro (retry automático)
Tentativa 2 → Erro (retry automático)
Tentativa 3 → Erro
Usa dados do banco como fallback
```

### Cenário 4: Pagamento Rejeitado
```
Tentativa 1 → Status: rejected
❌ Mensagem: "Pagamento foi rejeitado"
Polling para
```

---

## 🎯 O Que Testar

- [ ] Fluxo completo de PIX no desenvolvimento
- [ ] Modal de confirmação aparece após pagamento
- [ ] Número do pedido correto é exibido
- [ ] Valor correto é exibido
- [ ] Modal auto-fecha após 5 segundos
- [ ] Estoque é diminuído corretamente
- [ ] Pedido aparece com status "Confirmado"
- [ ] Múltiplas tentativas funcionam corretamente
- [ ] Backoff exponencial está ativo
- [ ] Logs aparecem no console
- [ ] Logs aparecem no terminal do backend

---

## 🚀 Depois de Configurar a Webhook do Mercado Pago

Quando você tiver acesso à conta do Mercado Pago:

1. Configure a URL da webhook: `https://seu-dominio.com/api/payments/webhook`
2. O sistema continuará funcionando normalmente
3. A webhook será a via principal de confirmação
4. O polling permanecerá como fallback

**IMPORTANTE**: O código de webhook foi mantido intacto. Nenhuma rota ou código foi removido. Você pode configurar depois sem problemas!

---

## 📊 Debugging

### Ver logs em tempo real
1. Abra o navegador (F12)
2. Vá para a aba "Console"
3. Procure por logs com `[POLLING]`, `✅`, `❌`

### Ver logs do backend
1. Terminal onde `npm start` está rodando
2. Procure por logs com `[POLLING]`, `Tentativa`, `Status`

### Limpar dados para novo teste
```sql
-- Limpar pagamentos de teste (tenha cuidado!)
DELETE FROM payments WHERE created_at > NOW() - INTERVAL 1 HOUR;
```

---

## ✨ Melhorias Implementadas

1. **Retry Automático**: 3 tentativas com backoff exponencial
2. **Primeira Tentativa Imediata**: Não espera 2s, consulta logo
3. **Logs Detalhados**: Cada tentativa é registrada
4. **Backoff Exponencial**: 500ms → 1000ms → 2000ms
5. **Fallback para Banco**: Se MP falhar, usa dados locais
6. **Tratamento de Status**: Reconhece approved, pending, rejected, cancelled
7. **Modal Melhorada**: Logs durante exibição da modal
8. **Estoque Automático**: Diminui automaticamente ao confirmar

---

## 🎓 Troubleshooting

**P: A modal não aparece?**
R: Verifique:
- Console do navegador para erros
- Se `paymentPollingData` tem ID de pagamento
- Se `/api/payments/status/:paymentId` retorna 200

**P: Polling nunca para?**
R: Timeout automático em 30 minutos. Ou adicione `stopPaymentPolling()` manualmente.

**P: Status fica "pending" para sempre?**
R: Possível causa:
- Mercado Pago não processou o pagamento
- Token de acesso inválido
- Verifique logs do backend para erros da API

**P: Como saber se funcionou?**
R: Modal aparece com ✅ grande e "Pagamento Confirmado!"

---

## 📞 Próximos Passos

1. Testar o fluxo completo
2. Validar logs no console
3. Quando tiver acesso ao MP, configurar webhook em: `Settings > Notifications > Webhooks`
4. URL: `https://seu-dominio.com/api/payments/webhook`
5. Selecionar evento: `payment.created` e `payment.updated`

**Pronto! 🎉 O sistema agora detecta PIX pagos a cada 2 segundos e mostra confirmação automática!**
