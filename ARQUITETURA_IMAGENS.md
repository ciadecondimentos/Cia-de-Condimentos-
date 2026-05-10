# Arquitetura do Sistema de Imagens

## 📊 Diagrama de Fluxo

```
┌─────────────────────────────────────────────────────────────┐
│                   ADMIN PANEL (admin.js)                    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
           Selecionar múltiplos arquivos
                          │
                          ▼
        ┌────────────────────────────────┐
        │   Upload Paralelo de Imagens   │
        │  (múltiplos POST /api/upload)  │
        └────────────────────────────────┘
                          │
                ┌─────────┴─────────┐
                ▼                   ▼
        Imagem 1.jpg      Imagem 2.jpg
        (URL 1)           (URL 2)
                │                   │
                └─────────┬─────────┘
                          ▼
            Array de URLs: [URL1, URL2, ...]
                          │
                          ▼
        ┌────────────────────────────────┐
        │   POST /api/products (com      │
        │   array "images")              │
        └────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    BANCO DE DADOS                           │
├─────────────────────────────────────────────────────────────┤
│  Tabela: products                                           │
│  ├─ id: 1                                                   │
│  ├─ name: "Pimenta Malagueta"                               │
│  ├─ price: 15.50                                            │
│  └─ ...                                                     │
│                                                             │
│  Tabela: product_images                                    │
│  ├─ id: 1, product_id: 1, image_url: "/uploads/img1.jpg"  │
│  ├─ id: 2, product_id: 1, image_url: "/uploads/img2.jpg"  │
│  └─ id: 3, product_id: 1, image_url: "/uploads/img3.jpg"  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                 API (products.js)                           │
├─────────────────────────────────────────────────────────────┤
│  GET /api/products (retorna com images[])                  │
│  GET /api/products/:id (retorna com images[])              │
│  POST /api/products (cria com images[])                    │
│  PUT /api/products/:id (atualiza images[])                 │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              FRONTEND LOJA (index.html)                     │
├─────────────────────────────────────────────────────────────┤
│  Produtos com images[0] = primeira imagem                  │
│  Se sem imagem → mostra emoji 🌶️                           │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │   CLIENTE    │
                   │   (browser)  │
                   └─────────────┘
```

---

## 📈 Estrutura de Dados

### Antes (sem solução)
```json
{
  "id": 1,
  "name": "Pimenta Malagueta",
  "image": "/uploads/single-image.jpg",  ← Apenas uma imagem
  "price": 15.50
}
```

### Depois (com solução)
```json
{
  "id": 1,
  "name": "Pimenta Malagueta",
  "images": [                             ← Array de múltiplas
    "/uploads/img1.jpg",                    imagens
    "/uploads/img2.jpg",
    "/uploads/img3.jpg"
  ],
  "price": 15.50
}
```

---

## 🗄️ Estrutura do Banco de Dados

### Relação entre tabelas

```
┌──────────────────────────┐
│       products           │
├──────────────────────────┤
│ id (PK)                  │
│ name                     │
│ category                 │
│ price                    │  ◄─────────┐
│ stock                    │            │ 1:N
│ description              │            │
│ image (deprecado)        │            │
│ active                   │            │
│ ...                      │            │
└──────────────────────────┘            │
                                        │
                          ┌─────────────┘
                          │
┌──────────────────────────┐
│   product_images         │
├──────────────────────────┤
│ id (PK)                  │
│ product_id (FK)  ────────┘
│ image_url                │
│ display_order            │
│ created_at               │
└──────────────────────────┘
```

---

## 🔄 Fluxo de Operações

### 1️⃣ CRIAR NOVO PRODUTO COM IMAGENS
```
Admin Painel
    │
    ▼
Preencher formulário + selecionar 3 imagens
    │
    ▼
POST /api/upload (img1) ─→ /uploads/abc123.jpg
POST /api/upload (img2) ─→ /uploads/def456.jpg
POST /api/upload (img3) ─→ /uploads/ghi789.jpg
    │
    ▼ (paralelo)
POST /api/products {
  name: "Pimenta",
  images: [
    "/uploads/abc123.jpg",
    "/uploads/def456.jpg",
    "/uploads/ghi789.jpg"
  ]
}
    │
    ▼ (backend)
INSERT INTO products (name, ...) RETURNING id = 5
INSERT INTO product_images (product_id: 5, image_url: "/uploads/abc123.jpg", display_order: 0)
INSERT INTO product_images (product_id: 5, image_url: "/uploads/def456.jpg", display_order: 1)
INSERT INTO product_images (product_id: 5, image_url: "/uploads/ghi789.jpg", display_order: 2)
    │
    ▼
✅ Sucesso! Produto criado com 3 imagens
```

### 2️⃣ EDITAR IMAGENS DE PRODUTO EXISTENTE
```
Admin Painel
    │
    ▼
Clicar em editar produto ID=5
    │
    ▼
GET /api/products/5 ─→ Retorna com images[3]
    │
    ▼
Mostrar as 3 imagens atuais
Selecionar 2 novas imagens
    │
    ▼
POST /api/upload (nova1) ─→ /uploads/xyz111.jpg
POST /api/upload (nova2) ─→ /uploads/xyz222.jpg
    │
    ▼
PUT /api/products/5 {
  images: [
    "/uploads/xyz111.jpg",
    "/uploads/xyz222.jpg"
  ]
}
    │
    ▼ (backend)
DELETE FROM product_images WHERE product_id = 5
INSERT INTO product_images (product_id: 5, image_url: "/uploads/xyz111.jpg", display_order: 0)
INSERT INTO product_images (product_id: 5, image_url: "/uploads/xyz222.jpg", display_order: 1)
    │
    ▼
✅ Sucesso! Produto atualizado com 2 imagens (antigas deletadas)
```

### 3️⃣ VISUALIZAR PRODUTO NA LOJA
```
Cliente acessa loja
    │
    ▼
GET /api/products (retorna todos com images[])
    │
    ▼ (frontend)
Para cada produto:
  if (product.images.length > 0)
    image_src = product.images[0]  ← Usa primeira imagem
  else
    image_src = emoji 🌶️
    │
    ▼
Renderiza grid com imagens
    │
    ▼
✅ Cliente vê os produtos com suas imagens!
```

---

## 📌 Pontos Chave da Implementação

### ✅ Múltiplas imagens por produto
- Novo modelo de dados com tabela separada
- Relação 1:N entre produtos e imagens

### ✅ Upload paralelo
- Envia múltiplos arquivos simultaneamente
- `Promise.all()` sincroniza os uploads

### ✅ Ordem de imagens
- Campo `display_order` permite controlar sequência
- Preparado para galeria futura

### ✅ Integridade referencial
- Foreign key garante que imagens só existem para produtos válidos
- Deleção em cascata limpa imagens quando produto é deletado

### ✅ Backward compatibility
- Campo `image` mantido (deprecado)
- Fallback para dados antigos funciona
- Nenhum dado existente foi perdido

### ✅ Graceful degradation
- Se imagem não carregar → mostra emoji
- Se produto sem imagem → mostra emoji
- Erro em uma imagem não quebra resto

---

## 🎯 Benefícios da Solução

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Imagens por produto** | 1 (string) | Múltiplas (array) |
| **Persistência** | ❌ Inconsistente | ✅ Confiável |
| **Escalabilidade** | Limitada | Ilimitada |
| **Ordem de imagens** | Não | Sim (`display_order`) |
| **Backup de imagens** | Campo único | Tabela dedicada |
| **Performance queries** | Média | Otimizada (índices) |
| **Integridade de dados** | Fraca | Forte (FK, cascata) |

---

## 🔧 Tecnologias Utilizadas

- **Banco:** PostgreSQL com migrations SQL
- **API:** Express.js com rotas REST
- **Frontend:** JavaScript vanilla + Fetch API
- **Upload:** Multer + Cloudinary/Disk Storage
- **Padrão:** Array normalization + Foreign keys
