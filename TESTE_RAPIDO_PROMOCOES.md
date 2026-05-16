# 🧪 Guia de Teste Rápido - Sistema de Promoções

## ⚡ 5 Minutos de Teste

### Pré-requisitos:
- ✅ DATABASE_URL configurado
- ✅ Servidor rodando: `node index.js`
- ✅ Admin panel acessível
- ✅ Site do cliente carregando produtos

---

## Teste 1: Criar Promoção de Produto ⏱️ 2min

### No Admin:
1. Abra `/admin.html`
2. Clique em **"🎯 Promoções"** (menu esquerdo)
3. Certifique-se que está na aba **"🏷️ Promoções de Produto"**
4. Clique **"+ Nova Promoção"**
5. Preencha assim:
   ```
   Produto: [Selecione qualquer um]
   Preço Original: [automaticamente preenchido]
   Preço da Promoção: [coloque um valor menor]
   Válido até: [escolha 7 dias no futuro]
   Status: Ativa
   ```
6. Clique **"💾 Salvar Promoção"** (no final do modal)
7. Deverá aparecer mensagem: **"✅ Promoção salva com sucesso!"**

### Resultado esperado:
- ✅ Promoção aparece na tabela
- ✅ Mostra nome do produto, desconto %, preços
- ✅ Botões de editar/deletar visíveis

### No Site do Cliente:
1. Abra `/index.html` (ou recarregue com Ctrl+F5)
2. Procure pelo produto que você criou promoção
3. Deverá ver:
   - 🔴 Selo vermelho com **"X% OFF"** no canto superior direito
   - ⏰ Número de dias no canto inferior
   - ~~R$ 4.90~~ **R$ 2.99** (preço antigo riscado, novo em vermelho)

---

## Teste 2: Criar um Kit 📦 ⏱️ 2min

### No Admin:
1. Na aba **"📦 Kits"**
2. Clique **"+ Novo Kit"**
3. Preencha:
   ```
   Nome do Kit: Kit Teste
   Descrição: Meu primeiro kit
   Preço do Kit: 15.00
   Produtos: [Selecione 3-5 produtos com checkbox]
   ```
4. Clique **"💾 Salvar"**
5. Mensagem: **"✅ Kit salvo com sucesso!"**

### Resultado esperado:
- ✅ Kit aparece na tabela
- ✅ Mostra quantidade de produtos
- ✅ Mostra preço do kit

---

## Teste 3: Criar Promoção por Quantidade 📊 ⏱️ 2min

### No Admin:
1. Na aba **"📊 Por Quantidade"**
2. Clique **"+ Nova Promoção"**
3. Preencha:
   ```
   Nome: Compre 3 e ganhe 10%
   Quantidade mínima: 3
   Desconto: 10
   Válido até: [30 dias no futuro]
   Produtos: [Deixe em branco para TODOS]
   ```
4. Clique **"💾 Salvar"**
5. Mensagem: **"✅ Promoção salva com sucesso!"**

### Resultado esperado:
- ✅ Promoção aparece na tabela
- ✅ Mostra "Compre 3+" e "10%"

---

## ✅ Testes de API (Opcional)

Se quiser testar direto a API via browser/Postman:

### Listar Promoções de Produto
```
GET http://localhost:3000/api/promotions
```

Resposta esperada:
```json
[
  {
    "id": 1,
    "product_id": 5,
    "product_name": "Orégano",
    "discount_price": "2.99",
    "original_price": "4.90",
    "end_date": "2026-06-15T00:00:00.000Z",
    "status": "Ativa"
  }
]
```

### Listar Promoções Ativas (Cliente)
```
GET http://localhost:3000/api/promotions/active
```

### Listar Kits
```
GET http://localhost:3000/api/promotions/kits
```

### Listar Promoções por Quantidade
```
GET http://localhost:3000/api/promotions/quantity
```

---

## 🔍 Verificação de Banco de Dados

### Conecte ao seu PostgreSQL:
```sql
-- Ver promoções de produto
SELECT * FROM promotions;

-- Ver kits
SELECT * FROM product_kits;

-- Ver produtos no kit
SELECT p.name, pk.kit_id FROM kit_products kp
JOIN products p ON kp.product_id = p.id;

-- Ver promoções por quantidade
SELECT * FROM quantity_promotions;
```

---

## 🐛 Checklist de Validação

### Backend
- [ ] Servidor inicia sem erros
- [ ] Endpoints `/api/promotions*` retornam dados
- [ ] Pode criar promoção via POST
- [ ] Pode editar via PUT
- [ ] Pode deletar via DELETE

### Admin Panel
- [ ] Abas funcionam (mudam conteúdo)
- [ ] Botões "+ Nova" abrem modais
- [ ] Formulários salvam dados
- [ ] Validações funcionam (campos obrigatórios)
- [ ] Lista de promoções atualiza ao salvar
- [ ] Botões editar/deletar funcionam

### Site Cliente
- [ ] Produtos sem promoção: normal
- [ ] Produtos com promoção: mostra selo
- [ ] Selo mostra desconto correto
- [ ] Preço antigo riscado
- [ ] Preço novo em vermelho
- [ ] Tempo restante mostra
- [ ] Recarrega sem erro (Ctrl+F5)

---

## 📊 Dados de Teste Sugeridos

### Produto 1: Orégano
```
Preço original: R$ 4.90
Preço promoção: R$ 2.99
Desconto: 39%
Válido: 7 dias
```

### Produto 2: Sal Himalaia
```
Preço original: R$ 19.90
Preço promoção: R$ 9.90
Desconto: 50%
Válido: 30 dias
```

### Kit Teste
```
Nome: Kit Básico
Produtos: 3-5 itens
Preço: R$ 25.00
```

### Promoção Quantidade
```
Nome: 3+ itens = 10% desconto
Quantidade: 3
Desconto: 10%
Aplicar: Todos
```

---

## ✨ Teste de User Experience

### Fluxo Cliente:
1. [ ] Acessa site
2. [ ] Vê promoção destacada
3. [ ] Clica no produto
4. [ ] Vê detalhes com preço correto
5. [ ] Adiciona ao carrinho
6. [ ] Vai ao carrinho
7. [ ] Preço está correto
8. [ ] Prossegue ao checkout
9. [ ] Desconto reflete corretamente

---

## 🚀 Teste de Performance

### Deve ser rápido:
- [ ] Carregar lista de promoções: < 1s
- [ ] Criar promoção: < 2s
- [ ] Atualizar site: < 500ms
- [ ] Editar promoção: < 2s
- [ ] Deletar promoção: < 2s

---

## ❌ Testes de Erro

### Tentar criar promoção SEM produto:
→ Deve mostrar erro: "Selecione um produto"

### Tentar preço de promoção MAIOR que original:
→ Deve mostrar erro: "Preço de promoção deve ser menor"

### Tentar sem data de validade:
→ Deve mostrar erro: "Defina a data de validade"

### Tentar criar kit SEM produtos:
→ Deve mostrar erro: "Selecione pelo menos um produto"

---

## 📝 Relatório de Teste

Se encontrar algum problema, documente:

```
PROBLEMA:
[Descreva o que aconteceu]

PASSOS PARA REPRODUZIR:
1. ...
2. ...
3. ...

RESULTADO ESPERADO:
[O que deveria ter acontecido]

RESULTADO REAL:
[O que realmente aconteceu]

LOGS/ERROS:
[Se houver erro, copie aqui]
```

---

## ✅ Sucesso!

Se todos os testes passarem, o sistema está **100% funcional**! 🎉

**Próximo passo:** Deploy em produção

---

**Dica Pro:** Use o browser DevTools (F12) para ver:
- Console: erros JavaScript
- Network: chamadas API
- Application: dados salvos

---

**Última atualização**: 15 de maio de 2026
