# Solução: Imagens de Produtos Salvas no Banco de Dados

## Problema
As imagens dos produtos não estavam aparecendo no frontend e não estavam sendo persistidas corretamente no banco de dados.

## Solução Implementada

### 1. **Banco de Dados (Migrations)**

**Arquivo:** `backend/migrations/08_create_product_images.sql`

Criada nova tabela `product_images` para armazenar múltiplas imagens por produto:

```sql
CREATE TABLE IF NOT EXISTS product_images (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL,
  image_url TEXT NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
```

**Benefícios:**
- Suporta múltiplas imagens por produto
- `display_order` permite controlar a ordem das imagens
- Foreign key garante integridade referencial
- Deleção em cascata remove imagens quando produto é deletado

---

### 2. **Backend (API - products.js)**

**Arquivo:** `backend/routes/products.js`

#### Mudanças principais:

1. **Novas funções auxiliares:**
   - `getProductImages(productId)` - Busca todas as imagens de um produto
   - `enrichProductsWithImages(products)` - Adiciona o array `images` aos produtos

2. **Rotas modificadas:**
   - **GET `/`** - Agora retorna `images[]` junto com os produtos ativos
   - **GET `/admin/all`** - Retorna `images[]` para todos os produtos
   - **GET `/:id`** - Retorna um produto com seu array `images`

3. **Novas rotas:**
   - **POST `/`** - Cria produto com múltiplas imagens (array)
   - **POST `/:id/images`** - Adiciona mais imagens a um produto existente
   - **DELETE `/:id/images/:imageId`** - Remove uma imagem específica

4. **Rota modificada:**
   - **PUT `/:id`** - Atualiza produto e substitui todas as imagens se enviadas

**Novo formato de resposta:**
```json
{
  "id": 1,
  "name": "Pimenta Malagueta",
  "category": "Pimentas",
  "price": 15.50,
  "stock": 50,
  "description": "Pimenta fresca...",
  "images": [
    "/api/uploads/image1.jpg",
    "/api/uploads/image2.jpg"
  ],
  "active": true
}
```

---

### 3. **Admin (frontend - admin.js)**

**Arquivo:** `frontend/admin.js`

#### Mudanças principais:

1. **Input de arquivo atualizado:**
   - Mudou de `accept="image/*"` para `accept="image/*" multiple`
   - Agora permite selecionar múltiplos arquivos

2. **Função `renderProductsTable()` atualizada:**
   - Usa `p.images[0]` em vez de `p.image`
   - Suporta array de imagens

3. **Função `saveProduct()` reescrita:**
   - Faz upload de **múltiplos arquivos** em paralelo
   - Usa `Promise.all()` para esperar todos os uploads
   - Envia array `images[]` na requisição POST/PUT

4. **Função `openEditProduct()` atualizada:**
   - Exibe as imagens atuais do produto
   - Mostra até 50px de altura para preview
   - Permite selecionar novas imagens para substituir

#### Novo fluxo de upload:
```
Selecionar múltiplos arquivos → Upload paralelo de todos → 
Salvar produto com array de URLs → Sucesso!
```

---

### 4. **Frontend (index.html)**

**Arquivo:** `frontend/index.html`

#### Função `renderProducts()` atualizada:

```javascript
// Agora usa o array de imagens
var imageUrl = (p.images && p.images.length > 0) ? p.images[0] : p.image;
```

**Benefícios:**
- Usa a primeira imagem do array `images[]`
- Fallback para `p.image` para compatibilidade com dados antigos
- Graceful degradation se não houver imagens (mostra emoji 🌶️)

---

## Processo de Migração Automática

1. As migrations foram executadas com sucesso
2. A nova tabela `product_images` foi criada
3. Produtos antigos continuam funcionando (sem imagens no banco)
4. Novos produtos salvam imagens na tabela `product_images`

---

## Como Usar

### Para adicionar imagens a um novo produto:
1. Abrir Admin Panel
2. Clicar "Adicionar Novo Produto"
3. Preencher dados do produto
4. **Selecionar múltiplos arquivos de imagem**
5. Clicar "Salvar"
6. As imagens serão salvas no banco de dados

### Para editar imagens de um produto existente:
1. Clicar no ícone de edição (✏️)
2. Ver as imagens atuais
3. Selecionar novas imagens (substitui as antigas)
4. Clicar "Salvar"

### No frontend:
- A primeira imagem do array é exibida na grade de produtos
- Se não houver imagem, mostra emoji 🌶️

---

## Mudanças de Compatibilidade

| Campo | Antes | Depois | Compatibilidade |
|-------|-------|--------|-----------------|
| `image` | String única | Deprecado | ✅ Mantido para fallback |
| `images` | Não existia | Array de URLs | ✅ Novo campo |
| Upload | Imagem única | Múltiplas imagens | ✅ Backward compatible |

---

## Validações Implementadas

✅ Campo `prodImageFile` aceita múltiplos arquivos  
✅ Upload em paralelo com `Promise.all()`  
✅ Tratamento de erros para cada upload  
✅ Toast de sucesso/erro após salvar  
✅ Exibição de imagens atuais ao editar  
✅ Fallback para emoji se imagem não carregar  

---

## Testing

Para testar a funcionalidade:

1. **Criar novo produto com imagens:**
   - Admin → Adicionar Produto → Selecionar múltiplas imagens → Salvar
   - Verificar no banco: `SELECT * FROM product_images WHERE product_id = X;`

2. **Editar imagens de produto existente:**
   - Admin → Editar Produto → Substituir imagens → Salvar
   - Verificar se as imagens antigas foram deletadas e novas salvas

3. **Visualizar na loja:**
   - Abrir index.html
   - Verificar se as imagens aparecem corretamente
   - Se não tiver imagem, deve mostrar 🌶️

---

## Arquivos Modificados

- ✅ `backend/migrations/08_create_product_images.sql` - Criado
- ✅ `backend/routes/products.js` - Atualizado
- ✅ `frontend/admin.js` - Atualizado
- ✅ `frontend/index.html` - Atualizado
