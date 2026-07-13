#!/usr/bin/env bash

# ============================================
# Script de teste da API Pix
# Execute: bash test-api.sh
# ============================================

API_URL="http://localhost:3001"

echo "🧪 TESTE DA API PIX"
echo "=================================="
echo ""

# 1. Criar pagamento PIX
echo "1️⃣  Criando pagamento PIX..."
echo ""

RESPONSE=$(curl -s -X POST "$API_URL/api/payments/pix" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": 1,
    "amount": 99.90,
    "description": "Pedido #1 - Teste",
    "payerEmail": "cliente@test.com",
    "payerPhone": "11999999999"
  }')

echo "Resposta:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Extrair ID do pagamento
PAYMENT_ID=$(echo "$RESPONSE" | jq -r '.mp_payment_id' 2>/dev/null)

if [ -z "$PAYMENT_ID" ] || [ "$PAYMENT_ID" == "null" ]; then
  echo "❌ Erro ao criar pagamento"
  exit 1
fi

echo "✅ Pagamento criado com ID: $PAYMENT_ID"
echo ""

# 2. Consultar status
echo "2️⃣  Consultando status do pagamento..."
echo ""

curl -s -X GET "$API_URL/api/payments/status/$PAYMENT_ID" | jq '.'
echo ""

# 3. Buscar detalhes
echo "3️⃣  Buscando detalhes do pagamento..."
echo ""

curl -s -X GET "$API_URL/api/payments/1" | jq '.'
echo ""

echo "=================================="
echo "✅ TESTES CONCLUÍDOS"
echo ""
echo "💡 Próximas etapas:"
echo "1. Escanear o QR Code com seu telefone"
echo "2. Fazer o pagamento de teste (se em sandbox)"
echo "3. Verificar se status muda para 'approved'"
echo ""
