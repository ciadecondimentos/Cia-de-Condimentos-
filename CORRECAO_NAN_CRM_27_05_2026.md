# Correção do Problema NaN no CRM - 27 de Maio de 2026

## Problema Identificado
Os valores monetários (Total Comprado, Pago, Em Aberto, Ticket Médio, etc) estavam aparecendo como "R$ NaN" no painel CRM.

## Causa Raiz
Quando `quantity` e `unit_price` chegavam do frontend como strings, a multiplicação `quantity * unit_price` resultava em `NaN`, pois JavaScript não consegue multiplicar strings.

## Correções Aplicadas

### 1. Backend (backend/routes/crm.js)

#### POST /customers/:id/purchases (Registrar nova compra)
```javascript
// ANTES
const total_price = quantity * unit_price;

// DEPOIS
const parsedQuantity = parseFloat(quantity);
const parsedUnitPrice = parseFloat(unit_price);
const total_price = parsedQuantity * parsedUnitPrice;
```

#### PUT /customers/:id/purchases/:purchaseId (Editar compra)
```javascript
// ANTES
let total_price = unit_price * quantity;

// DEPOIS
const parsedQuantity = parseFloat(quantity || 0);
const parsedUnitPrice = parseFloat(unit_price || 0);
let total_price = parsedUnitPrice * parsedQuantity;
```

### 2. Frontend (frontend/admin-crm.js)

#### Renderização de Produtos (linha 1335)
- Adicionado `parseFloat()` quando passando o preço para a função JavaScript

#### Função toggleCrmProduct()
```javascript
crmSelectedProducts[productId] = {
  id: productId,
  name: productName,
  price: parseFloat(productPrice),  // ← ADICIONADO parseFloat()
  quantity: 1
};
```

#### Função calculateCrmGrandTotal()
```javascript
// ADICIONADO
const price = parseFloat(product.price) || 0;
const subtotal = quantity * price;
```

#### Função saveCrmPurchase()
```javascript
// ADICIONADO parseFloat() e parseInt()
quantity: parseInt(product.quantity) || 0,
unit_price: parseFloat(product.price) || 0,
```

## Script de Limpeza
Criado arquivo `backend/fix-crm-nan.js` para corrigir dados antigos que possam ter valores inválidos:
```bash
node backend/fix-crm-nan.js
```

## Arquivos Modificados
1. `backend/routes/crm.js` - Parse de quantity e unit_price
2. `frontend/admin-crm.js` - Garantir parseFloat em várias funções
3. `backend/fix-crm-nan.js` - Script novo para limpeza de dados

## Commits
1. `fix: Parse quantity e unit_price como números antes de calcular total_price no CRM`
2. `fix: Garantir parseFloat em preços e quantidades no CRM frontend`

## Próximos Passos
1. Reiniciar o servidor backend
2. Testar registrar nova compra no CRM
3. Verificar se os totais estão sendo calculados corretamente
4. Se necessário, executar `fix-crm-nan.js` para limpar dados antigos
