# 🚀 Guia de Implantação - Novo Sistema de Promoções

## ✅ O que foi criado

### Backend (Node.js)
- ✅ **Nova migração SQL** (17_simplify_promotions.sql) com 4 tabelas:
  - `promotions` - promoções por produto
  - `product_kits` - kits/pacotes
  - `kit_products` - relacionamento kit↔produto
  - `quantity_promotions` - promoções por quantidade
  - `quantity_promotion_products` - relacionamento quantidade↔produto

- ✅ **Novos endpoints API** em `backend/routes/promotions.js`:
  ```
  GET  /api/promotions           - lista promoções (admin)
  GET  /api/promotions/active    - lista promoções ativas (cliente)
  POST /api/promotions           - criar promoção
  PUT  /api/promotions/:id       - atualizar promoção
  DELETE /api/promotions/:id     - deletar promoção
  
  GET  /api/promotions/kits      - listar kits
  POST /api/promotions/kits      - criar kit
  PUT  /api/promotions/kits/:id  - editar kit
  DELETE /api/promotions/kits/:id - deletar kit
  
  GET  /api/promotions/quantity           - listar promoções por quantidade
  POST /api/promotions/quantity           - criar promoção
  PUT  /api/promotions/quantity/:id       - editar promoção
  DELETE /api/promotions/quantity/:id     - deletar promoção
  ```

### Frontend (Admin)
- ✅ Painel completamente novo com **3 abas**:
  1. 🏷️ **Promoções de Produto**
  2. 📦 **Kits**
  3. 📊 **Promoções por Quantidade**

- ✅ Funções no `admin.js`:
  - `switchPromoTab()` - trocar abas
  - `openAddProductPromo()` - criar promoção
  - `saveProductPromo()` - salvar promoção
  - `editProductPromo()` - editar
  - `deleteProductPromo()` - deletar
  - E similares para kits e quantidade

### Frontend (Cliente)
- ✅ Atualizado `app.js` para:
  - Carregar promoções ativas via `loadActivePromotions()`
  - Exibir selo **"X% OFF"** com desconto automático
  - Mostrar **tempo restante** da promoção
  - Exibir preço original com **strikethrough**
  - Destacar preço de promoção em **vermelho**

---

## 📋 Checklist de Implantação

### 1. Banco de Dados
- [ ] Certifique-se que o `DATABASE_URL` está configurado
- [ ] Execute as migrações (elas rodam automaticamente ao iniciar o servidor)
- [ ] Verifique se as tabelas foram criadas:
  ```sql
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('promotions', 'product_kits', 'kit_products', 'quantity_promotions', 'quantity_promotion_products');
  ```

### 2. Backend
- [ ] Reinicie o servidor: `node index.js`
- [ ] Verifique se os novos endpoints estão acessíveis:
  - GET `http://localhost:3000/api/promotions`
  - GET `http://localhost:3000/api/promotions/kits`
  - GET `http://localhost:3000/api/promotions/quantity`

### 3. Frontend (Admin)
- [ ] Acesse `http://localhost/admin.html`
- [ ] Procure pela seção **"🎯 Promoções"** (no menu esquerdo)
- [ ] Veja as 3 abas funcionando

### 4. Frontend (Cliente)
- [ ] Acesse `http://localhost/index.html`
- [ ] Produtos com promoção devem mostrar:
  - Selo vermelho com "% OFF"
  - Preço antigo riscado
  - Preço novo em vermelho

---

## 🔧 Como usar

### Criar uma Promoção de Produto

**No Admin:**
1. Vá em **"🎯 Promoções"**
2. Abra a aba **"🏷️ Promoções de Produto"**
3. Clique **"+ Nova Promoção"**
4. Selecione um produto
5. Defina o preço original (preenchido automaticamente)
6. Defina o preço da promoção (ex: 2.99)
7. Escolha até quando vai valer
8. Ative
9. Salve

**No Site do Cliente:**
- A promoção aparece automaticamente no card do produto
- Mostra desconto percentual
- Mostra tempo restante
- Mostra preço antigo e novo

---

### Criar um Kit

**No Admin:**
1. Vá em **"🎯 Promoções"**
2. Abra a aba **"📦 Kits"**
3. Clique **"+ Novo Kit"**
4. Digite o nome (ex: "Kit de Temperos")
5. **Selecione múltiplos produtos** com checkbox
6. Defina o preço do kit (ex: R$ 29,90)
7. Salve

**Exemplo real:**
```
Kit de Temperos
- Orégano (R$ 5,00)
- Manjericão (R$ 5,00)
- Alecrim (R$ 4,90)
Total separado: R$ 14,90
Preço do kit: R$ 12,00 (economiza R$ 2,90)
```

---

### Criar Promoção por Quantidade

**No Admin:**
1. Vá em **"🎯 Promoções"**
2. Abra a aba **"📊 Por Quantidade"**
3. Clique **"+ Nova Promoção"**
4. Nome: "Compre 5 e ganhe 10%"
5. Quantidade mínima: 5
6. Desconto: 10%
7. Selecione produtos (opcional - deixe vazio para todos)
8. Data de validade
9. Salve

**Como funciona no site:**
- Cliente compra 5 produtos do tipo selecionado
- Automaticamente ganha 10% de desconto no total

---

## 📊 Estrutura das Tabelas

### Tabela: promotions
```sql
CREATE TABLE promotions (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL (referência para products),
  discount_price DECIMAL(10, 2) - preço em promoção,
  original_price DECIMAL(10, 2) - preço original,
  start_date TIMESTAMP,
  end_date TIMESTAMP NOT NULL - quando termina,
  status VARCHAR(20) - 'Ativa' ou 'Inativa',
  created_at TIMESTAMP
);
```

### Tabela: product_kits
```sql
CREATE TABLE product_kits (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) - "Kit de Temperos",
  description TEXT,
  kit_price DECIMAL(10, 2) - preço especial,
  status VARCHAR(20) - 'Ativa' ou 'Inativa',
  created_at TIMESTAMP
);
```

### Tabela: kit_products
```sql
CREATE TABLE kit_products (
  id SERIAL PRIMARY KEY,
  kit_id INTEGER NOT NULL (referência para product_kits),
  product_id INTEGER NOT NULL (referência para products),
  quantity INTEGER DEFAULT 1 - quantos produtos
);
```

### Tabela: quantity_promotions
```sql
CREATE TABLE quantity_promotions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) - "Compre 5 e ganhe 10%",
  description TEXT,
  min_quantity INTEGER - quantidade mínima,
  discount_percentage DECIMAL(5, 2) - % de desconto,
  start_date TIMESTAMP,
  end_date TIMESTAMP NOT NULL,
  status VARCHAR(20)
);
```

### Tabela: quantity_promotion_products
```sql
CREATE TABLE quantity_promotion_products (
  id SERIAL PRIMARY KEY,
  qty_promo_id INTEGER (referência para quantity_promotions),
  product_id INTEGER (referência para products)
  -- deixa vazio se for para TODOS os produtos
);
```

---

## 🐛 Troubleshooting

### Problema: Promoções não aparecem no site

**Solução:**
1. Verifique se a promoção está com status **"Ativa"**
2. Verifique se a data de validade é **futura** (não passou)
3. Verifique se o `product_id` está correto
4. Recarregue a página do cliente (Ctrl+F5 para limpar cache)
5. Abra o console (F12) e procure por erros

### Problema: Preço não está correto

**Solução:**
1. Certifique-se que preço de promoção < preço original
2. Verifique os valores nos inputs (não deixe em branco)
3. Confira se salvou corretamente (verifique a tabela admin)

### Problema: Erro ao deletar promoção

**Solução:**
1. Recarregue a página do admin
2. Tente novamente
3. Se persistir, verifique os logs do servidor

---

## 📱 Responsividade

O sistema funciona perfeitamente em:
- ✅ Desktop (1920x1080)
- ✅ Tablet (768x1024)
- ✅ Mobile (375x667)

Os cards se adaptem automaticamente e o painel do admin fica organizado em mobile.

---

## 🔐 Segurança

- ✅ Apenas admin pode criar/editar promoções
- ✅ Validação de entrada no backend
- ✅ Datas são verificadas antes de exibir
- ✅ Descontos não podem ser maiores que o preço original

---

## 📝 Próximos Passos

1. **Deploy no Render:**
   ```bash
   git add .
   git commit -m "feat: add simplified promotions system (products, kits, quantity)"
   git push
   ```

2. **Testar em produção:**
   - Abra https://seu-site.netlify.app/admin.html
   - Crie uma promoção de teste
   - Verifique no site do cliente

3. **Monitorar:**
   - Acompanhe as promoções criadas
   - Verifique se os descontos estão sendo aplicados
   - Recolha feedback dos clientes

---

## 📞 Suporte

Qualquer dúvida ou problema, revise:
- `PROMOCOES_SIMPLIFICADO.md` - Como usar
- Este arquivo - Como implementar
- Logs do servidor - Erros técnicos

**Última atualização**: 15 de maio de 2026
