# Guia de Testes - Sistema de Imagens de Produtos

## ✅ Checklist de Implementação

### Banco de Dados
- [x] Migration para `product_images` criada
- [x] Tabela criada com sucesso
- [x] Foreign key para produtos configurado
- [x] Índices criados para performance

### Backend (API)
- [x] GET `/api/products` - Retorna `images[]`
- [x] GET `/api/products/:id` - Retorna `images[]`
- [x] GET `/api/products/admin/all` - Retorna `images[]`
- [x] POST `/api/products` - Aceita array `images`
- [x] PUT `/api/products/:id` - Atualiza `images`
- [x] POST `/api/products/:id/images` - Adiciona imagens
- [x] DELETE `/api/products/:id/images/:imageId` - Remove imagem

### Frontend Admin
- [x] Input de arquivo aceita múltiplos arquivos
- [x] Upload paralelo de múltiplos arquivos
- [x] Exibição de imagens atuais ao editar
- [x] Salva array de imagens no banco
- [x] Mostra primeira imagem na tabela

### Frontend Loja
- [x] Renderiza primeira imagem do array
- [x] Fallback para emoji se sem imagem
- [x] Compatibilidade com dados antigos

---

## 🧪 Testes Manuais

### Teste 1: Criar novo produto com 1 imagem
1. Abrir `http://localhost:3000/admin.html`
2. Ir para **Produtos** → **Adicionar Novo Produto**
3. Preencher:
   - Nome: "Pimenta de Teste 1"
   - Categoria: "Pimentas"
   - Preço: 20.00
   - Estoque: 10
4. Selecionar **1 arquivo de imagem**
5. Clicar **Salvar**
6. ✅ Verificar: Produto aparece na tabela com a imagem

### Teste 2: Criar novo produto com múltiplas imagens
1. Abrir `http://localhost:3000/admin.html`
2. Ir para **Produtos** → **Adicionar Novo Produto**
3. Preencher:
   - Nome: "Pimenta de Teste 2"
   - Categoria: "Pimentas"
   - Preço: 25.00
   - Estoque: 15
4. Selecionar **3 arquivos de imagem**
5. Clicar **Salvar**
6. ✅ Verificar no banco (SQL):
   ```sql
   SELECT * FROM product_images WHERE product_id = (
     SELECT id FROM products WHERE name = 'Pimenta de Teste 2'
   ) ORDER BY display_order;
   ```
   Deve retornar **3 linhas** com as 3 imagens

### Teste 3: Editar produto e substituir imagens
1. Abrir `http://localhost:3000/admin.html`
2. Ir para **Produtos** → Clicar em ✏️ para editar
3. Ver as imagens atuais listadas
4. Selecionar **2 arquivos De imagem diferentes**
5. Clicar **Salvar**
6. ✅ Verificar que:
   - Imagens antigas foram deletadas
   - Apenas as 2 novas imagens existem no banco
   ```sql
   SELECT COUNT(*) FROM product_images WHERE product_id = X;
   ```
   Deve retornar **2**

### Teste 4: Visualizar no frontend
1. Abrir `http://localhost:3000/` (loja)
2. Verificar se as imagens aparecem na grade de produtos
3. ✅ Primeira imagem de cada produto deve estar visível
4. Se não tiver imagem, deve mostrar 🌶️

### Teste 5: Compatibilidade com dados antigos
1. Verificar produtos criados antes da migration
2. ✅ Devem aparecer normalmente na loja
3. ✅ Emoji 🌶️ deve aparecer em vez da imagem

---

## 🔍 SQL de Verificação Rápida

### Ver todas as imagens de um produto:
```sql
SELECT pi.id, pi.image_url, pi.display_order 
FROM product_images pi
WHERE pi.product_id = 1
ORDER BY pi.display_order;
```

### Ver quantas imagens cada produto tem:
```sql
SELECT p.id, p.name, COUNT(pi.id) as total_imagens
FROM products p
LEFT JOIN product_images pi ON p.id = pi.product_id
GROUP BY p.id, p.name
ORDER BY p.id;
```

### Ver produtos sem imagens:
```sql
SELECT p.id, p.name
FROM products p
LEFT JOIN product_images pi ON p.id = pi.product_id
WHERE pi.id IS NULL
ORDER BY p.id;
```

### Deletar todas as imagens de um produto (para testar novamente):
```sql
DELETE FROM product_images WHERE product_id = 1;
```

---

## 📱 Testes de API (com curl ou Postman)

### Criar produto com imagens:
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pimenta via API",
    "category": "Pimentas",
    "price": 30,
    "stock": 20,
    "images": [
      "/api/uploads/img1.jpg",
      "/api/uploads/img2.jpg"
    ]
  }'
```

### Buscar produto com imagens:
```bash
curl http://localhost:3000/api/products/1
```

Resposta esperada:
```json
{
  "id": 1,
  "name": "Pimenta Malagueta",
  "images": [
    "/api/uploads/123456-test.jpg"
  ],
  ...
}
```

### Adicionar imagens a produto existente:
```bash
curl -X POST http://localhost:3000/api/products/1/images \
  -H "Content-Type: application/json" \
  -d '{
    "images": [
      "/api/uploads/nova1.jpg",
      "/api/uploads/nova2.jpg"
    ]
  }'
```

---

## ⚠️ Possíveis Problemas e Soluções

### Problema: "Erro ao salvar produto"
- ✅ Verificar se arquivo foi selecionado
- ✅ Verificar console do navegador (F12)
- ✅ Verificar logs do servidor

### Problema: Imagens não aparecem na loja
- ✅ Verificar se produto está ativo (`active = true`)
- ✅ Verificar URL da imagem no banco
- ✅ Tentar acessar a imagem direto no navegador

### Problema: "Nenhum arquivo enviado"
- ✅ Selecionar pelo menos 1 arquivo
- ✅ Verificar tipo de arquivo (deve ser imagem)

### Problema: Upload muito lento
- ✅ Normal para múltiplas imagens grandes
- ✅ Verificar tamanho dos arquivos
- ✅ Considerar compactar as imagens

---

## 🚀 Próximas Melhorias (Opcional)

1. **Drag & drop para reordenar imagens**
   - Modificar `display_order` via API

2. **Preview de imagens antes de salvar**
   - Mostrar thumbnails no formulário

3. **Compressão de imagens**
   - Reduzir tamanho antes de fazer upload

4. **Galeria de imagens no produto**
   - Mostrar todas as imagens, não apenas a primeira

5. **Limite de tamanho de arquivo**
   - Validar no frontend antes de enviar

---

## ✨ Resultado Final

Após todos os testes passarem:

✅ Imagens serão salvas corretamente no banco de dados  
✅ Admin pode fazer upload de múltiplas imagens  
✅ Produtos mostram a primeira imagem na loja  
✅ Compatibilidade com dados antigos  
✅ Sistema pronto para produção!
