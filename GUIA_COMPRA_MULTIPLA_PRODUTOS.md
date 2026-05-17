# 📦 Guia: Registrar Múltiplos Produtos em Uma Compra

## ✨ Novo Recurso da Central de Clientes (CRM)

A partir de agora, o administrador pode registrar **múltiplos produtos em uma única compra**, sem precisar adicionar um por um!

---

## 🎯 Passo a Passo

### 1️⃣ **Acesse o Cliente**
```
Central de Clientes (CRM) → Clique no cliente
```

### 2️⃣ **Clique em "+ Registrar Compra"**
O modal abrirá mostrando **TODOS OS PRODUTOS** do banco de dados com checkboxes.

### 3️⃣ **Selecione os Produtos**
Marque os checkboxes dos produtos que o cliente comprou:
- ✅ Pimenta Dedo Moça - 500g
- ✅ Cominho - 100g  
- ✅ Orégano - 50g

### 4️⃣ **Define as Quantidades**
Quando você marca um checkbox, **aparece um campo de quantidade ao lado**:
```
☑ Cominho - 100g          R$ 8.00
    [1] x R$ 8.00 = R$ 8.00
```

Altere o número conforme necessário!

### 5️⃣ **Veja o Total Atualizar**
O total geral da compra calcula **automaticamente** enquanto você ajusta as quantidades:

```
╔════════════════════════════╗
║ Total da Compra: R$ 24.50  ║
╚════════════════════════════╝
```

### 6️⃣ **Preencha os Campos Comuns**
Todos os produtos compartilham:
- 📅 **Data da Compra** (obrigatório)
- 💳 **Forma de Pagamento** (Dinheiro, PIX, Cartão, etc.)
- 📊 **Status do Pagamento** (Pendente, Pago, Parcial)
- 📝 **Observações** (opcional)

### 7️⃣ **Salva Tudo de Uma Vez!**
Clique em **"💾 Salvar Compra"** e pronto! Todas as 3 compras são registradas com os mesmos dados de data e pagamento.

---

## 💡 Exemplo Prático

**Cliente:** João Silva  
**Comprou no dia:** 17/05/2026  
**Forma de Pagamento:** PIX  
**Status:** Pago

### Produtos:
| Produto | Quantidade | Preço Unit. | Subtotal |
|---------|-----------|------------|----------|
| Pimenta Dedo Moça | 2 | R$ 12.50 | R$ 25.00 |
| Cominho | 3 | R$ 8.00 | R$ 24.00 |
| Orégano | 1 | R$ 6.50 | R$ 6.50 |
| **TOTAL GERAL** | | | **R$ 55.50** |

### Processo:
1. ✅ Marca "Pimenta Dedo Moça" → aparece campo com "1"
2. Muda para "2"
3. ✅ Marca "Cominho" → aparece campo com "1"
4. Muda para "3"
5. ✅ Marca "Orégano" → aparece campo com "1"
6. Deixa como "1"
7. Seleciona data: 17/05/2026
8. Seleciona pagamento: PIX
9. Seleciona status: Pago
10. Clica "Salvar Compra"
11. 🎉 **Pronto! 3 compras registradas em uma ação!**

---

## ✅ Validações Automáticas

O sistema verifica:
- ✅ Pelo menos 1 produto deve ser selecionado
- ✅ Data da compra é obrigatória
- ✅ Quantidade deve ser ≥ 1
- ✅ Mensagens de erro claras se algo estiver faltando

---

## 🔄 Editar Compra Individual

Se você precisa **editar uma compra que já foi registrada**, clique no ✏️ (lápis) ao lado da compra no histórico. A interface volta para o modo tradicional de edição.

---

## 📊 Histórico de Compras

Após salvar, todas as compras aparecem no histórico do cliente:

```
Data         | Produto                | Qtd | Valor Unit. | Total
─────────────────────────────────────────────────────────────────
17/05/2026   | Pimenta Dedo Moça      | 2   | R$ 12.50   | R$ 25.00
17/05/2026   | Cominho                | 3   | R$ 8.00    | R$ 24.00
17/05/2026   | Orégano                | 1   | R$ 6.50    | R$ 6.50
```

---

## 🎁 Benefícios

| Antes | Depois |
|-------|--------|
| ❌ Adicionar 1 produto por vez | ✅ Adicionar múltiplos em 1 ação |
| ❌ Clicar "Salvar" 5 vezes | ✅ Clicar "Salvar" 1 vez |
| ❌ Repetir data e pagamento 5 vezes | ✅ Preencher uma única vez |
| ❌ 5 modais | ✅ 1 modal |

---

## 🚀 Resumo Rápido

**Antigamente:**  
```
1. Abrir modal → 1 produto → Salvar
2. Abrir modal → 1 produto → Salvar
3. Abrir modal → 1 produto → Salvar
4. Abrir modal → 1 produto → Salvar
5. Abrir modal → 1 produto → Salvar
```

**Agora:**  
```
1. Abrir modal → 5 produtos selecionados → Salvar (tudo de uma vez!)
```

---

## 📞 Dúvidas Frequentes

**P: Posso desmarcar um produto depois de marcar?**  
R: Sim! Basta desmarcar o checkbox e o campo de quantidade desaparece.

**P: O que acontece se mudar a quantidade para 0?**  
R: Tecnicamente é possível, mas a validação exige quantidade ≥ 1.

**P: Todos os produtos têm que ter a mesma data de compra?**  
R: Sim, todos os produtos marcados usarão a mesma data que você selecionar.

**P: Posso mudar pagamento para cada produto?**  
R: Não, todos compartilham os mesmos dados de pagamento. Se precisar, registre em outra compra.

**P: Como aparece no histórico?**  
R: Cada produto marcado aparece como uma compra separada, mas todas com os mesmos dados de data/pagamento.

---

## 🎯 Dica Pro

Use este recurso quando:
- ✅ Um cliente faz uma **grande compra** de vários produtos
- ✅ Um **distribuidor** pedir quantidade de múltiplos itens
- ✅ Quer **otimizar tempo** no CRM

---

**Versão:** 1.0 - 17/05/2026  
**Projeto:** Cia de Condimentos - CRM
