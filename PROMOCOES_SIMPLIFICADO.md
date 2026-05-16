# 🎯 Novo Sistema de Promoções Simplificado

## Overview
O sistema de promoções foi completamente reformulado para ser **mais simples** e **mais visual**. Agora você tem 3 opções:

## 1️⃣ Promoções de Produto

### Como usar:
1. Abra a aba **"🏷️ Promoções de Produto"** no painel de promoções
2. Clique em **"+ Nova Promoção"**
3. Selecione um produto
4. Defina o **preço original** e o **preço da promoção**
5. Escolha a data de **válido até**
6. Ative a promoção

### Resultado no site do cliente:
- ✅ Selo vermelho com **"X% OFF"** no canto superior direito do card
- ✅ Tempo restante da promoção no canto inferior direito
- ✅ Preço original com **traço (strikethrough)**: `De 4,90`
- ✅ Preço da promoção em **vermelho e destacado**: `Por 2,99`

### Exemplo visual:
```
┌─────────────────┬─────┐
│                 │70%  │
│     Imagem      │ OFF │
│     Produto     │5 dias
│                 │     │
├─────────────────┴─────┤
│ Nome do Produto       │
│ Descrição curta       │
├───────────────────────┤
│ De 4,90 (com risco)   │
│ Por 2,99 (vermelho)   │
│ [Adicionar ao Carrinho]
└───────────────────────┘
```

---

## 2️⃣ Kits (Pacotes de Produtos)

### Como usar:
1. Abra a aba **"📦 Kits"**
2. Clique em **"+ Novo Kit"**
3. Digite o nome do kit (ex: "Kit de Ervas Aromáticas")
4. Selecione **múltiplos produtos** (checkbox)
5. Defina um **preço especial** para o kit
6. Salve

### Exemplo de kits:
- **Kit de Temperos**: Orégano + Manjericão + Alecrim = R$ 15,90 (economia de R$ 5,00)
- **Kit de Ervas**: Sálvia + Tomilho + Endro = R$ 12,50
- **Kit Mix Completo**: 10 produtos selecionados = R$ 45,00

### Como aparece no site:
- Os kits aparecem como produtos especiais
- Mostra quantos produtos tem no kit
- O preço do kit é muito mais atrativo que comprar tudo separado

---

## 3️⃣ Promoções por Quantidade

### Como usar:
1. Abra a aba **"📊 Por Quantidade"**
2. Clique em **"+ Nova Promoção"**
3. Digite um nome (ex: "Compre 5 e ganhe 10%")
4. Defina a **quantidade mínima** (ex: 5 unidades)
5. Defina o **percentual de desconto** (ex: 10%)
6. Escolha **produtos específicos** ou deixe em branco para todos
7. Defina a data de **válido até**

### Exemplos práticos:
```
Nome: "Compre 5 e Ganhe 10%"
Quantidade mínima: 5
Desconto: 10%
Produtos: Todos (ou selecione alguns)
```

```
Nome: "Promoção em Massa"
Quantidade mínima: 3
Desconto: 15%
Produtos: Apenas produtos de massa
```

### Como aparece no site:
- Quando o cliente adiciona 5+ itens do mesmo tipo, automaticamente ganha 10% de desconto no carrinho
- O desconto é aplicado automaticamente

---

## 📊 Resumo das Três Opções

| Tipo | Quando usar | Exemplo |
|------|------------|---------|
| **Promoção Produto** | Você quer destacar um produto específico | "Sal do Himalaia em promoção a R$ 12,99" |
| **Kit** | Você quer agrupar produtos com desconto | "Compre 5 temperos por R$ 29,90" |
| **Por Quantidade** | Você quer incentivar compras em volume | "Leve 5 ou mais e ganhe 15% de desconto" |

---

## 🎨 Customizações Visuais

### Selo de Promoção (Promoções de Produto)
- **Fundo**: Vermelho (#ff4444)
- **Texto**: "70% OFF" (automaticamente calculado)
- **Posição**: Canto superior direito
- **Tamanho**: Pequeno e destacado

### Cronômetro (Tempo Restante)
- **Fundo**: Escuro (rgba(0,0,0,0.7))
- **Posição**: Canto inferior direito
- **Texto**: "5 dias", "3 horas", etc.

### Preço com Desconto
- **Preço original**: `De 4,90` com traço no meio (strikethrough)
- **Preço promo**: Vermelho e maior, exemplo: `Por 2,99`
- **Alinhamento**: Um ao lado do outro

---

## ⚙️ Dicas Importantes

1. **Datas**: A promoção só aparece se a data de validade não tiver passado
2. **Status**: Você pode desativar uma promoção sem deletá-la (Status = "Inativa")
3. **Múltiplos Tipos**: Um produto pode estar em várias promoções ao mesmo tempo
4. **Kits**: O sistema não remove o produto original, cria uma opção de kit
5. **Por Quantidade**: O desconto é aplicado automaticamente no carrinho

---

## 🔧 Suporte Técnico

Se encontrar algum problema:
- Verifique se as datas estão preenchidas corretamente
- Certifique-se que os produtos existem no sistema
- Recarregue a página para atualizar as promoções
- Verifique o status (deve estar "Ativa")

---

**Última atualização**: 15 de maio de 2026
