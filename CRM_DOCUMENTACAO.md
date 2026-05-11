# 📋 CENTRAL DE CLIENTES - DOCUMENTAÇÃO COMPLETA

## ✅ Implementação Realizada

A **Central de Clientes** foi implementada como um módulo completamente isolado no painel administrativo. Isso inclui:

### 1. **Estrutura de Banco de Dados (SQL)**

#### Tabela `crm_customers`
```sql
- id: Chave primária
- full_name: Nome completo (obrigatório)
- phone: Telefone
- whatsapp: WhatsApp
- address: Endereço completo
- neighborhood: Bairro
- city: Cidade
- observations: Anotações privadas
- is_vip: Cliente VIP (boolean)
- birthday: Aniversário (opcional)
- credit_limit: Limite de crédito editável (R$)
- is_inactive: Cliente inativo (boolean)
- created_at: Data de cadastro automática
- updated_at: Atualização automática
```

#### Tabela `crm_purchases`
```sql
- id: Chave primária
- customer_id: Referência ao cliente (chave estrangeira)
- product_name: Nome do produto
- quantity: Quantidade
- unit_price: Valor unitário
- total_price: Valor total (calculado automaticamente)
- purchase_date: Data da compra
- payment_method: Forma de pagamento
- payment_status: Status (pendente, pago, parcial)
- notes: Observações sobre a compra
- created_at: Data de criação
- updated_at: Data de atualização
```

### 2. **API REST Completa** (`/backend/routes/crm.js`)

#### Endpoints de Clientes
- `GET /api/crm/customers` - Listar clientes com filtros
  - Filtros disponíveis: `filter=vip`, `filter=debtors`, `filter=inactive`, `filter=new`
  - Busca: `search=termo`
  - Ordenação: `sortBy=name|recent|spent|debt`

- `GET /api/crm/customers/:id` - Obter cliente com histórico e estatísticas

- `POST /api/crm/customers` - Criar novo cliente

- `PUT /api/crm/customers/:id` - Atualizar cliente

- `DELETE /api/crm/customers/:id` - Deletar cliente (também deleta compras)

#### Endpoints de Compras
- `GET /api/crm/customers/:id/purchases` - Listar compras do cliente

- `POST /api/crm/customers/:id/purchases` - Registrar nova compra

- `PUT /api/crm/customers/:id/purchases/:purchaseId` - Atualizar compra

- `DELETE /api/crm/customers/:id/purchases/:purchaseId` - Deletar compra

### 3. **Interface Administrativa** 

#### Arquivo: `frontend/admin-crm.js`
Funções JavaScript completas para:
- Listar clientes com filtros inteligentes
- Criar, editar e deletar clientes
- Visualizar dashboard individual do cliente
- Registrar compras manuais
- Calcular estatísticas automaticamente
- Gerar links diretos para WhatsApp

#### Arquivo: `frontend/admin.html` (modificado)
- Nova seção no sidebar: **"Central de Clientes"** (ícone 👥)
- Integração com modais reutilizáveis
- Interface responsiva e profissional
- Segue padrão visual existente

### 4. **Funcionalidades Principais**

#### ✨ Cadastro Completo de Clientes
- Nome completo
- Telefone e WhatsApp
- Endereço, Bairro, Cidade
- Observações privadas
- Status VIP (marcação com ⭐)
- Aniversário (opcional)
- Data de cadastro automática
- Limite de crédito editável

#### 📊 Histórico de Compras por Cliente
- Registrar compras manuais
- Nome do produto
- Quantidade e valor unitário
- Valor total calculado automaticamente
- Data da compra
- Forma de pagamento (dinheiro, cartão, PIX, etc)
- Status de pagamento (pendente, pago, parcial)
- Editar e deletar compras

#### 💰 Controle Financeiro Automático
Para cada cliente, o sistema calcula:
- Total já gasto
- Valor em aberto
- Identificação de devedores/adimplentes
- Ticket médio
- Total comprado no mês
- Total comprado no ano
- Última compra (data)
- Limite de crédito

#### 🔍 Lista Inteligente com Filtros
- Todos os clientes
- ⭐ Clientes VIP
- 💔 Clientes devedores (com valor em aberto)
- ❌ Clientes inativos
- 🆕 Clientes novos (últimos 30 dias)
- Busca por nome, telefone ou cidade

#### 💬 Integração com WhatsApp
- Botão "Conversar no WhatsApp" nos detalhes do cliente
- Abre automaticamente a conversa com o número cadastrado
- Funciona com links `wa.me`

#### 📈 Dashboard Individual do Cliente
Mostra:
- Total comprado (valor)
- Número de compras
- Total pago (valor)
- Valor em aberto
- Ticket médio
- Total comprado neste mês
- Total comprado neste ano
- Informações completas (endereço, contato, etc)
- Histórico de todas as compras

---

## 🚀 COMO USAR

### **Acessar a Central de Clientes**
1. Abrir o painel administrativo
2. Clicar em "Central de Clientes" (👥) na sidebar
3. A interface carregará a lista de clientes

### **Cadastrar um Novo Cliente**
1. Clicar no botão "+ Novo Cliente"
2. Preencher os dados:
   - Nome completo (obrigatório)
   - Telefone e WhatsApp (opcionais)
   - Endereço completo, Bairro, Cidade
   - Aniversário (opcional)
   - Limite de crédito
   - Marcar como VIP se necessário
3. Adicionar observações privadas
4. Clicar em "💾 Salvar Cliente"

### **Editar Cliente**
1. Clicar no ícone "✏️" na tabela de clientes
2. Modificar os dados necessários
3. Clicar em "💾 Salvar Cliente"

### **Ver Detalhes do Cliente**
1. Clicar no ícone "👁️" na tabela
2. Abre modal com:
   - Dashboard com estatísticas
   - Informações completas
   - Histórico de compras
   - Botão para conversar no WhatsApp

### **Registrar uma Compra**
1. Abrir detalhes do cliente
2. Clicar em "+ Registrar Compra"
3. Preencher:
   - Nome do produto
   - Quantidade e valor unitário (total calcula automaticamente)
   - Data da compra
   - Forma de pagamento
   - Status (pendente, pago, parcial)
4. Clicar em "💾 Salvar Compra"

### **Editar Compra**
1. Abrir detalhes do cliente
2. Clicar no ícone "✏️" na compra desejada
3. Modificar dados
4. Clicar em "💾 Salvar Compra"

### **Filtrar Clientes**
1. Usar o dropdown "Todos Clientes" para:
   - Ver apenas VIPs
   - Ver apenas devedores
   - Ver apenas inativos
   - Ver apenas novos clientes

### **Buscar Cliente**
1. Digitar na barra de busca:
   - Nome do cliente
   - Número de telefone
   - Cidade

---

## 🔒 SEGURANÇA E ISOLAMENTO

✅ **Completamente isolado do resto do sistema:**
- Não afeta a loja pública
- Não modifica nenhuma tabela existente
- Usa apenas as novas tabelas `crm_customers` e `crm_purchases`
- API separada em `/api/crm`

✅ **Dados privados:**
- Campo "observações" visível apenas no admin
- Não aparece em nenhuma parte pública
- Histórico de compras é privado

✅ **Sem efeitos colaterais:**
- Função 100% manual (admin controla tudo)
- Não sincroniza com pedidos automáticos
- Não interfere com sistema de pagamentos
- Não afeta estoque ou disponibilidade

---

## 📁 ARQUIVOS MODIFICADOS/CRIADOS

### Criados:
- `backend/migrations/11_create_crm_customers.sql` - Tabela de clientes
- `backend/migrations/12_create_crm_purchases.sql` - Tabela de compras
- `backend/routes/crm.js` - API completa
- `frontend/admin-crm.js` - JavaScript da interface

### Modificados:
- `backend/index.js` - Integrado novo módulo CRM
- `frontend/admin.html` - Adicionado nova seção
- `frontend/admin.js` - Adicionado rota de navegação

---

## 🔧 SETUP & INSTALAÇÃO

### **Pré-requisitos:**
- Node.js instalado
- PostgreSQL rodando
- Variável `DATABASE_URL` configurada

### **Passos:**

1. **Navegar para a pasta do backend:**
   ```bash
   cd backend
   ```

2. **Instalar dependências (se necessário):**
   ```bash
   npm install
   ```

3. **Executar as migrations:**
   ```bash
   npm run migrate
   ```

4. **Iniciar o servidor:**
   ```bash
   npm start
   ```

5. **Acessar o admin:**
   ```
   http://localhost:3000/admin
   ```

6. **Acessar a Central de Clientes:**
   - Clicar no item "Central de Clientes" (👥) na sidebar

---

## 📊 EXEMPLOS DE USO

### Exemplo 1: Cliente VIP com limite de crédito
```
Nome: João Silva
Telefone: (11) 98765-4321
Endereço: Rua das Flores, 123 - Vila Mariana - São Paulo
VIP: ✓ Marcado
Limite de Crédito: R$ 5.000,00
Observações: "Cliente desde 2020, sempre paga no prazo"
```

### Exemplo 2: Registrar compra
```
Produto: Pimenta Dedo de Moça - 500g
Quantidade: 10
Valor Unitário: R$ 15,00
Total: R$ 150,00 (automático)
Data: 15/05/2026
Pagamento: PIX
Status: Pago
```

### Exemplo 3: Filtrar devedores
```
Filtro: "Devedores"
Resultado: Mostra apenas clientes com valor em aberto
Ação: Clicar para ver detalhes e conversar no WhatsApp
```

---

## 🎯 RECURSOS AVANÇADOS

### Relatórios que o sistema gera automaticamente:

1. **Clientes por categoria:**
   - VIPs
   - Devedores
   - Inativos
   - Novos (30 últimos dias)

2. **Estatísticas por cliente:**
   - Total gasto (período completo)
   - Valor em aberto
   - Média de gasto por compra
   - Frequência de compra
   - Data da última compra

3. **Cálculos automáticos:**
   - Total de compras = soma de todas as compras do cliente
   - Valor em aberto = soma de compras com status pendente ou parcial
   - Ticket médio = total gasto ÷ número de compras
   - Status: adimplente se valor em aberto = 0

---

## ⚠️ NOTAS IMPORTANTES

1. **Dados completamente independentes:**
   - Clientes CRM são diferentes de clientes da loja
   - Compras manuais não afetam estoque
   - Não sincroniza com pedidos automáticos

2. **Deletar cliente deleta histórico:**
   - Ao deletar um cliente, todas as suas compras são deletadas
   - Ação é permanente (confirma antes)

3. **Limites de crédito são informativos:**
   - O sistema não bloqueia compra se passar do limite
   - É apenas um campo de referência para o admin

4. **Observações privadas:**
   - São visíveis apenas no painel admin
   - Podem conter informações sensíveis

---

## 🧪 TESTES

Para testar a funcionalidade completa:

1. Cadastrar 5 clientes (alguns VIP, alguns normais)
2. Registrar compras para cada um com diferentes status
3. Marcar alguns como inativos
4. Testar os filtros
5. Editar e deletar algumas informações
6. Verificar se os cálculos estão corretos
7. Clicar em "Conversar no WhatsApp" para verificar o link

---

## 📞 SUPORTE

Se encontrar problemas:

1. Verifique se as migrations foram executadas
2. Confirme se o banco de dados está acessível
3. Abra o console do navegador (F12) para ver erros
4. Verifique os logs do servidor (node.js)

---

**Sistema implementado com sucesso! ✅**
