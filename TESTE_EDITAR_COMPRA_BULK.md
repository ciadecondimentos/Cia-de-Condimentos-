# 🧪 Teste: Editar Compra Completa (Múltiplos Produtos)

## 📋 Resumo da Funcionalidade

Nova funcionalidade adicionada ao sistema de registro de compras de fornecedores:
- **Antes**: Era necessário clicar em cada produto para editar um por um
- **Agora**: Existe um botão "✏️ Editar" no cabeçalho de cada data que permite editar TODOS os produtos daquela compra de uma vez

## 🎯 Localização

- **Arquivo**: `frontend/admin-suppliers.js`
- **Modal**: Usa o modal `supplierPurchaseModal` (mesmo da edição individual)
- **Botão**: Aparece no cabeçalho do card de data, ao lado do total e status

## ✨ Novas Funções

1. **`openEditBulkSupplierPurchase(supplierId, purchaseDate)`**
   - Abre modal com todos os produtos de uma data
   - Carrega dados do backend
   - Renderiza formulário com múltiplos produtos

2. **`calculateBulkSupplierTotal()`**
   - Calcula total geral em tempo real
   - Atualiza total de cada produto automaticamente
   - **Sem NaN** - usa `parseFloat()` com fallback para 0

3. **Edição de `saveSupplierPurchase()`**
   - Detecta se é edição em lote via `dataset.isBulk`
   - Faz múltiplas requisições PUT simultaneamente
   - Atualiza forma de pagamento, status e observações para todos os produtos

## 🧪 Passo a Passo para Testar

### 1. Navegar para Fornecedores
- Clique em "👥 Fornecedores" no menu lateral
- Clique em "👁️" para abrir detalhes de um fornecedor

### 2. Testar Edição em Lote
- Na seção "📦 Histórico de Compras"
- Localize um card de data com múltiplos produtos
- Clique no botão azul "✏️ Editar" no cabeçalho do card

### 3. Verificar Modal
O modal deve mostrar:
- ✅ Informações da data da compra
- ✅ Todos os produtos daquela data em cards individuais
- ✅ Campos de edição: Nome, Quantidade (com +/-), Valor Unitário, Total
- ✅ Campos compartilhados: Forma de Pagamento, Status, Observações
- ✅ **Total Geral em tempo real** (amarelo no final)

### 4. Testar Cálculos
Mude valores e verifique:
```
✓ Quantidade 5 × Valor 10.00 = Total 50.00
✓ Quantidade 2 × Valor 15.50 = Total 31.00
✓ Total Geral = Soma de todos os produtos
✓ SEM NaN em nenhum campo
```

### 5. Testar Incremento/Decremento
- Clique nos botões "−" e "+" para quantidade
- Totais devem atualizar automaticamente

### 6. Editar e Salvar
- Altere alguns valores
- Mude a forma de pagamento (ex: Dinheiro → PIX)
- Mude o status (ex: Pendente → Pago)
- Clique "💾 Salvar Compra"

### 7. Verificar Salvamento
- Modal deve fechar
- Deve mostrar toast "✓ X produto(s) atualizado(s) com sucesso!"
- Detalhes devem ser recarregados com novos valores
- ✅ Total deve estar correto (sem NaN)
- ✅ Forma de pagamento e status devem estar iguais para todos os produtos

## 🔍 Casos de Teste

| Caso | Ação | Resultado Esperado |
|------|------|-------------------|
| **1. Edição simples** | Mudar quantidade de 5 para 10 | Total recalcula para 2x o valor |
| **2. Múltiplos produtos** | Editar 3 produtos ao mesmo tempo | Todos salvam com novo valor |
| **3. Pagamento sincronizado** | Mudar PIX para Dinheiro | Todos ficam com "Dinheiro" |
| **4. Status sincronizado** | Mudar para "Pago" | Todos ficam "Pago" |
| **5. Preço quebrado** | Inserir 10.99 | Calcula corretamente: 2 × 10.99 = 21.98 |
| **6. Sem NaN** | Limpar campo e atualizar | Não mostra "NaN", usa 0 |
| **7. Validação** | Deixar campo vazio e salvar | Mostra alerta "Preencha todos os campos" |

## 🎨 Visual Esperado

```
┌─────────────────────────────────────────────────────────┐
│ 📅 10/05/2026                                  R$ 150.00 │
│ 3 produtos • 15 unidades        ✏️ Editar   ◐ PARCIAL   │
│─────────────────────────────────────────────────────────│
│ Pimenta 5 un × R$ 10.00                  R$ 50.00  ✏️ 🗑️ │
│ Sal 3 un × R$ 15.50                      R$ 46.50  ✏️ 🗑️ │
│ Alho 7 un × R$ 2.00                      R$ 14.00  ✏️ 🗑️ │
└─────────────────────────────────────────────────────────┘
```

Quando clica em "✏️ Editar", abre modal com campos editáveis para todos os 3 produtos.

## 📊 Exemplos de Teste com Valores

### Teste 1: Aumentar quantidade
- Antes: 5 × R$ 10.00 = R$ 50.00
- Edita para: 10 × R$ 10.00
- Depois: R$ 100.00 ✓

### Teste 2: Mudar preço
- Antes: 3 × R$ 5.00 = R$ 15.00
- Edita para: 3 × R$ 7.50
- Depois: R$ 22.50 ✓

### Teste 3: Múltiplos produtos com preços quebrados
- Produto 1: 2 × R$ 12.99 = R$ 25.98 ✓
- Produto 2: 5 × R$ 3.15 = R$ 15.75 ✓
- Total: R$ 41.73 ✓

## 🚀 Funcionalidades Preservadas

- ✅ Edição individual ainda funciona (botão ✏️ em cada linha)
- ✅ Deleção individual (botão 🗑️)
- ✅ Registro de novas compras
- ✅ Todos os dashboards
- ✅ Autenticação
- ✅ Banco de dados (sem alterações)
- ✅ APIs (sem alterações)

## 🐛 Possíveis Problemas

Se houver algum problema:
1. Abra o DevTools (F12)
2. Vá para "Console"
3. Procure por erros em vermelho
4. Verifique se o backend está respondendo (Network tab)
5. Verifique se `API_BASE` está correto no admin.js

## ✅ Checklist Final

- [ ] Botão "✏️ Editar" aparece no cabeçalho do card
- [ ] Modal abre ao clicar no botão
- [ ] Todos os produtos aparecem no modal
- [ ] Campos de quantidade têm +/- funcionando
- [ ] Total recalcula em tempo real
- [ ] Sem NaN em nenhum campo
- [ ] Forma de pagamento pode ser mudada
- [ ] Status pode ser mudado
- [ ] Observações podem ser editadas
- [ ] Botão "💾 Salvar Compra" salva tudo
- [ ] Detalhes são recarregados corretamente
- [ ] Nenhuma funcionalidade anterior foi removida

---

**Data de Implementação**: 28/05/2026
**Arquivos Modificados**: frontend/admin-suppliers.js
**Linhas Adicionadas**: ~300 linhas de novo código
