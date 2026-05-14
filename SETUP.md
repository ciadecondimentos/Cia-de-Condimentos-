# 📋 Setup e Configuração - Cia de Condimentos

## Status do Projeto

✅ **Concluído:**
- Logo embedded como Base64 (funciona em admin e cliente)
- Encoding UTF-8 corrigido em todos os arquivos
- Campo "Marca" fixo como readonly "Cia. Condimentos e Especiarias"
- API Backend criada com rotas CRUD para produtos
- Frontend admin.html atualizado para usar API
- Frontend index.html refatorado e todas as funções criadas
- Arquivo .env criado
- Script de migração criado

⏳ **Próximos Passos:**

### 1. Requisitos do Sistema
Certifique-se de ter instalado:
- **Node.js** (v14+)
- **PostgreSQL** (v12+)
- **npm** (vem com Node.js)

### 2. Configurar PostgreSQL

No Windows com PostgreSQL instalado:
```powershell
# Abra o PostgreSQL
psql -U postgres

# Crie o banco de dados
CREATE DATABASE cia_condimentos;

# Saiba o nome do usuário PostgreSQL (geralmente é 'postgres')
# E confirme a senha padrão (pode ser a que você configurou na instalação)

# Saia
\q
```

### 3. Instalar Dependências do Backend

```powershell
cd .\backend\
npm install
```

### 4. Executar Migrations

```powershell
npm run migrate
```

✅ Se tudo correr bem, você verá: "✅ Migration executada com sucesso!"

### 5. Iniciar o Backend

```powershell
npm start
```

✅ Se tudo correr bem, você verá: "Server listening on port 3000"

### 6. Abrir o Frontend

Abra em seu navegador:
- **Admin Panel:** `frontend/admin.html`
- **Client Site:** `frontend/index.html`

## Como Funciona Agora

### Admin Panel (admin.html)
1. Cria um novo produto
2. Clica em "Salvar"
3. Produto é enviado via API (`POST /api/products`)
4. Produto é salvo no banco de dados PostgreSQL
5. Produto aparece na tabela de produtos

### Client Site (index.html)
1. Ao carregar a página, a função `renderProducts()` é chamada
2. Busca produtos na API (`GET /api/products`)
3. Exibe todo os produtos ativos
4. Cliente pode filtrar por categoria
5. Cliente pode adicionar ao carrinho e fazer pedido

## Estrutura de Dados

### Tabela: products
```
- id (INT) - Identificador único
- name (VARCHAR) - Nome do produto
- category (VARCHAR) - Categoria (Temperos, Pimentas, Ervas, Molhos, Especiarias)
- price (DECIMAL) - Preço
- stock (INT) - Quantidade em estoque
- description (TEXT) - Descrição
- image (LONGTEXT) - URL ou Base64 da imagem
- barcode (VARCHAR) - Código de barras
- cod (VARCHAR) - Código do Produto
- weight (VARCHAR) - Peso
- origin (VARCHAR) - Origem
- brand (VARCHAR) - Sempre "Cia. Condimentos e Especiarias"
- expiry (VARCHAR) - Data de validade
- active (BOOLEAN) - Ativo ou não
- created_at (TIMESTAMP) - Data de criação
- updated_at (TIMESTAMP) - Data de atualização
```

## Endpoints da API

### Produtos (GET)
```
GET /api/products
→ Retorna apenas produtos ativos

GET /api/products/admin/all
→ Retorna todos os produtos (admin)
```

### Produtos (POST)
```
POST /api/products
Body: {
  name: "string",
  category: "string",
  price: number,
  stock: number,
  description: "string",
  image: "string (URL or Base64)",
  barcode: "string",
  cod: "string",
  weight: "string",
  origin: "string",
  expiry: "string",
  active: boolean
}
```

### Produtos (PUT)
```
PUT /api/products/:id
Body: { /* campos a atualizar */ }
```

### Produtos (DELETE)
```
DELETE /api/products/:id
```

## Troubleshooting

### "Erro de conexão com banco de dados"
- Confirme que PostgreSQL está rodando
- Verifique as credenciais no arquivo `.env`
- Certifique-se que o banco `cia_condimentos` existe

### "Erro 404 na API"
- Confirme que o backend está rodando (`npm start`)
- Verifique se a porta 3000 está disponível

### "Produtos não aparecem no site"
- Verifique se a migration foi executada (`npm run migrate` no backend)
- Confirme no painel admin se há produtos cadastrados
- Abra o DevTools (F12) e veja se há erros no console

### "Campo de marca não está fixo"
- Recarregue o admin.html
- O campo deve estar readonly e com valor "Cia. Condimentos e Especiarias"

## Fluxo Completo de Teste

1. ✅ PostgreSQL está rodando
2. ✅ Backend foi iniciado (`npm start`)
3. ✅ Abra admin.html
4. ✅ Crie um novo produto
5. ✅ Clique em "Salvar"
6. ✅ Veja o produto aparecer na tabela
7. ✅ Abra index.html em outro abas/janela
8. ✅ Produto deve aparecer automaticamente
9. ✅ Teste o filtro por categoria
10. ✅ Adicione produto ao carrinho
11. ✅ Finalize o pedido

## Notas Importantes

- O campo "Marca" é sempre "Cia. Condimentos e Especiarias" e não pode ser alterado
- As imagens devem ser URLs válidas ou Base64
- O logo está embedded no HTML como Base64 (2.4MB)
- A autenticação de usuários é feita via localStorage (sha256)
- Pedidos são salvos em localStorage
