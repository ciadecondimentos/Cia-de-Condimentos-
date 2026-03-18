# ✓ CHECKLIST DE VERIFICAÇÃO - IMAGENS DE PRODUTOS

## 🔍 Verificação Rápida (5 minutos)

### Passo 1: Verificar Banco de Dados
```sql
-- Executar no seu database client

-- 1. Verificar se tabela foi criada
SELECT * FROM information_schema.tables 
WHERE table_name = 'product_images';
-- ✅ Deve retornar 1 resultado

-- 2. Verificar estrutura da tabela
\d product_images;
-- ✅ Deve mostrar: id, product_id, image_url, display_order, created_at

-- 3. Verificar índices
SELECT * FROM pg_indexes 
WHERE tablename = 'product_images';
-- ✅ Deve retornar pelo menos 2 índices
```

**Status: [ ] Banco OK**

---

### Passo 2: Verificar Admin Panel
1. Abrir `http://localhost:3000/admin.html`
2. Ir para **Produtos**
3. Clicar **Adicionar Novo Produto**
4. Preencher dados:
   - Nome: "Teste Imagem 1"
   - Preço: 10.00
   - Estoque: 5
5. **Selecionar 2-3 arquivos de imagem** ← IMPORTANTE!
6. ⚠️ Verificar se:
   - [ ] Input de arquivo aceita múltiplos arquivos
   - [ ] Mostra nome dos arquivos selecionados

**Status: [ ] Admin UI OK**

---

### Passo 3: Testar Salvamento
1. Clicar **Salvar**
2. ⚠️ Verificar:
   - [ ] Toast "Produto salvo com sucesso!"
   - [ ] Produto aparece na tabela com imagem

**Status: [ ] Salvar OK**

---

### Passo 4: Verificar Banco
```sql
-- Verificar se produto foi criado
SELECT * FROM products 
WHERE name = 'Teste Imagem 1';
-- ✅ Deve retornar 1 produto

-- Verificar se imagens foram salvas
SELECT * FROM product_images 
WHERE product_id = (
  SELECT id FROM products WHERE name = 'Teste Imagem 1'
);
-- ✅ Deve retornar 2-3 imagens!
```

**Status: [ ] Imagens no Banco OK**

---

### Passo 5: Verificar Loja
1. Abrir `http://localhost:3000/` (loja)
2. ⚠️ Procurar produto "Teste Imagem 1"
3. Verificar:
   - [ ] Imagem aparece no card
   - [ ] É uma das imagens que enviou
   - [ ] Não é emoji 🌶️

**Status: [ ] Loja OK**

---

### Passo 6: Testar Edição
1. Voltar para `admin.html`
2. Clicar em ✏️ para editar "Teste Imagem 1"
3. ⚠️ Verificar:
   - [ ] Imagens atuais aparecem listadas
   - [ ] Pode selecionar novas imagens
   - [ ] Campo diz: "Selecione novas imagens para substituir as antigas"

Selecionar 2 NOVAS imagens e salvar.

**Status: [ ] Edição OK**

---

### Passo 7: Verificar Substituição
```sql
-- Verificar se imagens antigas foram deletadas
SELECT * FROM product_images 
WHERE product_id = (
  SELECT id FROM products WHERE name = 'Teste Imagem 1'
);
-- ✅ Deve retornar apenas 2 imagens (novas)!
```

1. Abrir loja
2. ⚠️ Verificar:
   - [ ] Imagem é uma das novas selecionadas
   - [ ] Imagens antigas não aparecem mais

**Status: [ ] Substituição OK**

---

## 🧪 Testes Detalhados (20 minutos)

### Teste 1: Múltiplos Produtos com Múltiplas Imagens
```
✓ Criar 3 produtos
✓ Cada com 2-3 imagens diferentes
✓ Salvar todos
✓ Verificar no banco:
  SELECT count(*) FROM product_images;
  -- Deve retornar entre 6-9
```

**Status: [ ] Teste 1 OK**

---

### Teste 2: Produtos sem Imagem
```
✓ Criar 1 produto SEM selecionar imagem
✓ Salvar
✓ Abrir loja
✓ Verificar:
  - Produto mostra emoji 🌶️
  - Nenhum erro no console (F12)
```

**Status: [ ] Teste 2 OK**

---

### Teste 3: Compatibilidade com Dados Antigos
```
✓ Se já tinha produtos antigos no banco:
  - Abrir loja
  - Verificar se aparecem
  - Se tiverem campo "image" antigo:
    - Devem funcionar normalmente
    - Mostram a imagem antiga OR emoji
```

**Status: [ ] Teste 3 OK**

---

### Teste 4: Verificar API Diretamente
```bash
# GET produtos com imagens
curl http://localhost:3000/api/products | jq '.[] | {id, name, images}'

# Deve retornar algo como:
# {
#   "id": 1,
#   "name": "Pimenta Malagueta",
#   "images": [
#     "/api/uploads/123.jpg",
#     "/api/uploads/456.jpg"
#   ]
# }
```

**Status: [ ] Teste 4 OK**

---

### Teste 5: Deletar Produto e Verificar Cascata
```
✓ Ir ao admin e deletar um produto que tem imagens
✓ Verificar no banco:
  SELECT * FROM product_images 
  WHERE product_id = (id do produto deletado);
  -- Deve retornar: 0 resultados (deletadas!)
```

**Status: [ ] Teste 5 OK**

---

## 🎓 Verificação de Código

### Backend (products.js)
```javascript
✓ Função getProductImages() existe
✓ Função enrichProductsWithImages() existe
✓ Rotas GET retornam images[]
✓ Rotas POST/PUT aceitam images array
✓ INSERT em product_images acontece
```

**Status: [ ] Backend OK**

---

### Admin (admin.js)
```javascript
✓ saveProduct() faz upload paralelo
✓ Promise.all() usado para coordenar
✓ renderProductsTable() mostra primeira imagem
✓ openEditProduct() mostra imagens atuais
✓ Múltiplos arquivos suportados
```

**Status: [ ] Admin JS OK**

---

### Frontend (index.html)
```javascript
✓ renderProducts() usa images[0]
✓ Fallback para p.image existe
✓ Emoji 🌶️ mostra se sem imagem
✓ Sem erros no console
```

**Status: [ ] Frontend JS OK**

---

## 🚨 Troubleshooting

### Problema: "Erro ao salvar produto"
- [ ] Abrir console (F12)
- [ ] Verificar mensagem de erro
- [ ] Se for "Nenhum arquivo enviado" → selecionar arquivo
- [ ] Se for erro de upload → verificar storage/Cloudinary config
- [ ] Se for erro de API → verificar GET /api/products retorna images[]

---

### Problema: Banco não tem tabela product_images
- [ ] Executar: `node backend/migrate.js`
- [ ] Deve ver: "✅ 08_create_product_images.sql concluído"
- [ ] Se não funcionar → verificar arquivo existe em migrations/

---

### Problema: Imagens não aparecem na loja
- [ ] Verificar se produto está ativo (active = true)
- [ ] Abrir console (F12) → Network tab
- [ ] Verificar se URL da imagem retorna 200 OK
- [ ] Se retornar 404 → verificar arquivo existe no /uploads/
- [ ] Se tiver erro CORS → verificar configuração de headers

---

### Problema: Upload lento
- [ ] Normal para múltiplas imagens grandes
- [ ] Comprimir imagens antes
- [ ] Verificar velocidade da internet
- [ ] Verificar tamanho dos arquivos

---

## 📋 Checklist Final

**Verificação Rápida:**
- [ ] Banco de dados OK
- [ ] Admin UI funciona
- [ ] Salvamento OK
- [ ] Imagens no banco
- [ ] Loja mostra imagens
- [ ] Edição funciona
- [ ] Substituição OK

**Testes Funcionais:**
- [ ] Múltiplos produtos com imagens
- [ ] Produtos sem imagem (emoji)
- [ ] Compatibilidade com dados antigos
- [ ] API retorna images[]
- [ ] Delete em cascata funciona

**Verificação de Código:**
- [ ] Backend OK
- [ ] Admin OK
- [ ] Frontend OK

**Troubleshooting:**
- [ ] Nenhum erro
- [ ] Console limpo (F12)
- [ ] Imagens carregando (Network OK)

---

## ✅ Status Final

Se todos os checkpoints acima têm ✅ marcado:

### 🎉 SISTEMA DE IMAGENS ESTÁ FUNCIONANDO PERFEITAMENTE!

---

## 📞 Próximas Ações

1. **Fazer backup** do banco de dados
2. **Testar com dados reais** (seus produtos)
3. **Treinar time** sobre novo sistema
4. **Deploy em produção** (se aplicável)
5. **Monitorar** performance

---

**Criado em:** 18 de março de 2026  
**Status:** ✅ PRONTO PARA USO
