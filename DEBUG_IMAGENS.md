# 🔍 GUIA DE DEBUG - Imagens Não Aparecem

## Passo 1: Abrir Console do Navegador
1. Pressione **F12** no admin
2. Vá para aba **Console**
3. Execute cada passo abaixo e observe os logs

---

## Passo 2: Testar Novo Produto COM Imagens

### Procedimento
1. Admin → **Adicionar Novo Produto**
2. Preencha:
   - Nome: "Teste Debug"
   - Preço: 10.00
   - Estoque: 5
3. **Selecione 1 arquivo de imagem**
4. Observe no console:
   - [ ] Vê "___ arquivo(s) selecionado(s): 📎 filename" ?
5. Clic **Salvar Produto**
6. Observe no console:
   - [ ] Vê "Iniciando upload de 1 arquivo(s)"?
   - [ ] Vê "Upload bem-sucedido arquivo 1: /api/uploads/..."?
   - [ ] Vê "Salvando produto: {...}"?

### Se Vir Erro no Console

**Erro: "Upload falhou"**
- Significa que `/api/upload` não retornou 200 OK
- Acione **Network Tab** (F12 → Network)
- Refaça os passos
- Procure por request que começa com `/api/upload`
- Clique nela
- Veja **Response**:
  - Se retornar erro: anote a mensagem
  - Se retornar sucesso: então o erro é depois

**Erro: "Nenhum arquivo enviado"**
- Significa que o arquivo não foi enviado
- Verifique se selecionou arquivo
- Verifique se é realmente uma imagem (jpg, png, etc)

**Erro: "Erro ao salvar produto"**
- Significa que o POST /api/products falhou
- No Console, descole o erro completo
- Na **Network Tab**, procure `/api/products`
- Veja a **Response** para detalhes

---

## Passo 3: Verificar Banco de Dados

Após salvar o produto, execute NO banco de dados:

```sql
-- Ver o produto criado
SELECT id, name FROM products WHERE name = 'Teste Debug';
-- Anote o ID (ex: 42)

-- Ver se foi salvo no banco
SELECT * FROM product_images 
WHERE product_id = 42;  -- Use o ID do seu produto
-- Deve retornar 1 linha com a imagem
```

**Se houver resultado:**
- ✅ Imagem foi salva no banco!
- Problema é na leitura/exibição

**Se NÃO houver resultado:**
- ❌ Imagem NÃO foi salva no banco
- Problema é no upload ou salvamento

---

## Passo 4: Verificar Loja

1. Abrir `http://localhost:3000/` (loja)
2. **Abrir Console** (F12)
3. Procurar produto "Teste Debug"
4. Se não aparecer:
   - Verificar se está ativo nos produtos

```javascript
// No Console da loja, execute:
fetch('/api/products').then(r => r.json()).then(products => {
  const teste = products.find(p => p.name === 'Teste Debug');
  console.log('Produto encontrado:', teste);
  if (teste && teste.images) {
    console.log('Imagens:', teste.images);
  }
});
```

Veja no console a resposta

---

## ✅ Checklist de Diagnóstico

### Console Log (Admin)
- [ ] Arquivo selecionado mostra no form
- [ ] "Enviando X imagem(ns)..." aparece
- [ ] "Upload bem-sucedido" aparece con URL
- [ ] "Salv produto com sucesso" aparece

### Network Tab (Admin)
- [ ] POST /api/upload retorna 200 com imageUrl
- [ ] POST /api/products retorna 201 com product data

### Banco de Dados
- [ ] SELECT FROM products retorna novo produto
- [ ] SELECT FROM product_images retorna imagem com mesmo product_id

### Loja
- [ ] GET /api/products retorna com images[]
- [ ] produto.images[0] contém URL valid
- [ ] Imagem carrega (Network tab mostra 200)

---

## 🐛 Problemas Comuns e Soluções

### P: "Arquivo selecionado mas não aparece prévia"
**R:** Recarregue a página (F5) e tente novamente

### P: "Upload diz sucesso mas imagem não aparece"
**R:** Verifique no Network tab se a URL retornada é valid
- Tente acessar URL direto no navegador
- Deve fazer download ou mostrar imagem

### P: "Database retorna vazio"
**R:** Verifique se a URL foi realmente salva
```sql
SELECT image_url FROM product_images WHERE product_id = X;
```
- A URL existe?
- É uma URL/caminho válido?

### P: "Loja mostra emoji mas banco tem imagem"
**R:** Problema é na leitura da API
- Verifique Network tab
- GET /api/products status = 200?
- Resposta contém images[]?

---

## 💡 Dicas de Debug

### Ver exatamente o que foi salvo:
```javascript
// No console da loja
fetch('/api/products/1').then(r => r.json()).then(p => console.log(JSON.stringify(p, null, 2)));
```

### Limpar cache (às vezes ajuda):
- Ctrl + Shift + R (limpa cache completo)
- Ou abra em modo Anônimo/Incognito

### Se nada funcionar:
1. Recarregue o servidor backend
2. Limpe o cache
3. Tente criar novo produto do zero
4. Abra console e siga todos os passos

---

## 📋 Relatório para Support

Se ainda não funcionar, forneça:

1. **Logs do Console** (screenshot ou copie)
2. **Resposta do Network tab**:
   - URL: `/api/upload` response
   - URL: `/api/products` response
3. **Query do banco**:
   ```sql
   SELECT * FROM product_images LIMIT 5;
   ```
4. **Versão do navegador** (F12 → Console primeira linha)

---

## ✨ Status Esperado

✅ Arquivo selecionado  
✅ Upload retorna URL  
✅ Produto salvo comimensagens  
✅ Bancouma imagem  
✅ Loja mostra imagem  

**Se tudo acima está ✅ = Sistema OK!**
