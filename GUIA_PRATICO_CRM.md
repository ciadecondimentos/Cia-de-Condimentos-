# 👥 GUIA PRÁTICO - CENTRAL DE CLIENTES

## 🎯 CENÁRIOS PRÁTICOS DE USO

### CENÁRIO 1: Novo Cliente VIP

**Situação:** João Silva, cliente importante que sempre compra grandes quantidades

**Passo 1: Acessar CRM**
```
1. Ir para http://localhost:3000/admin
2. Clicar em "Central de Clientes" (👥) na sidebar
3. Clicar em "+ Novo Cliente"
```

**Passo 2: Preencher Formulário**
```
Nome Completo *:        João Silva
Telefone:               (11) 98765-4321
WhatsApp:               (11) 98765-4321
Endereço:               Rua das Flores, 123
Bairro:                 Vila Mariana
Cidade:                 São Paulo
Aniversário:            15/03
Limite de Crédito:      R$ 10.000,00
☑ Cliente VIP
Observações:            Cliente desde 2020, grande volume
```

**Passo 3: Salvar**
```
Clicar em "💾 Salvar Cliente"
Sistema exibe: "Cliente criado!"
Volta para lista de clientes
```

**Resultado:**
```
Tabela mostra:
Cliente: João Silva ⭐
Contato: (11) 98765-4321
Situação: VIP ⭐
Total: R$ 0 (novo)
Em Aberto: R$ 0
Compras: 0
```

---

### CENÁRIO 2: Registrar Primeira Compra

**Situação:** João faz seu primeiro pedido

**Passo 1: Abrir Detalhes do Cliente**
```
1. Na tabela de clientes, clicar no ícone 👁️ ao lado de João Silva
2. Abre modal com dashboard dele
```

**Passo 2: Ver Dashboard Inicial**
```
Modal mostra:
├─ Total Comprado: R$ 0
├─ Número de Compras: 0
├─ Total Pago: R$ 0
├─ Em Aberto: R$ 0
├─ Ticket Médio: -
├─ Este Mês: R$ 0
└─ Este Ano: R$ 0

Informações:
├─ Endereço: Rua das Flores, 123, Vila Mariana - São Paulo
├─ WhatsApp: 💬 Conversar
└─ Status: ⭐ VIP

Histórico de Compras: (vazio)
```

**Passo 3: Registrar Compra**
```
1. Clicar em "+ Registrar Compra"
2. Preencher formulário:

Produto *:              Pimenta Dedo de Moça 500g
Quantidade *:           10
Valor Unitário (R$) *:  15.00
Total (R$):             [150.00] (automático)
Data da Compra *:       15/05/2026
Forma de Pagamento:     PIX
Status do Pagamento:    Pago
Observações:            Primeira compra, chegou rápido
```

**Passo 4: Salvar Compra**
```
Clicar em "💾 Salvar Compra"
Sistema exibe: "Compra registrada!"
Modal se fecha
```

**Passo 5: Ver Resultado**
```
Abre novamente detalhes do cliente, agora mostra:

Total Comprado: R$ 150.00 ✨
Número de Compras: 1
Total Pago: R$ 150.00 ✓
Em Aberto: R$ 0.00
Ticket Médio: R$ 150.00
Este Mês: R$ 150.00
Este Ano: R$ 150.00

Histórico:
Data     | Produto              | Qtd | Unitário | Total  | Pagamento | Status | Ações
---------|----------------------|-----|----------|--------|-----------|--------|-------
15/05/26 | Pimenta Dedo de Mo...| 10  | R$ 15.00 |R$ 150 | PIX       | Pago   | ✏️ 🗑️
```

---

### CENÁRIO 3: Cliente com Compra Pendente

**Situação:** Maria compra mas não paga imediatamente

**Passo 1: Registrar Compra Pendente**
```
Cliente: Maria Santos

Produto: Sal Grosso 1kg
Quantidade: 20
Valor Unitário: R$ 8.00
Total: R$ 160.00
Data: 14/05/2026
Pagamento: Crediário
Status: PENDENTE ← Importante!
```

**Resultado na Tabela:**
```
Cliente: Maria Santos
Contato: (11) 91234-5678
Situação: 💔 Devedor ← Status mudou!
Total: R$ 160.00
Em Aberto: R$ 160.00 ← Mostra dívida
Compras: 1
```

**Passo 2: Verificar Dashboard**
```
Maria Santos - Dashboard

Total Pago: R$ 0.00
Em Aberto: R$ 160.00 ← Destaque em amarelo
Status: Adimplente (aguardando pagamento)

Histórico:
Data     | Produto        | Qtd | Unitário | Total    | Pagamento | Status   | Ações
---------|----------------|-----|----------|----------|-----------|----------|-------
14/05/26 | Sal Grosso 1kg | 20  | R$ 8.00  | R$ 160   | Crediário | Pendente | ✏️ 🗑️
```

---

### CENÁRIO 4: Cliente Paga Parcialmente

**Situação:** Maria paga metade da dívida

**Passo 1: Editar Compra**
```
1. No histórico do cliente, clicar em ✏️ na compra
2. Abre modal com dados da compra
3. Mudar Status de "Pendente" para "Parcial"
4. Clicar em "💾 Salvar Compra"
```

**Resultado Automático:**
```
Banco de dados:
├─ payment_status = "parcial"
└─ Sistema recalcula:
   - Total Pago: R$ 80.00
   - Em Aberto: R$ 80.00

Tabela atualiza:
Maria Santos
├─ Situação: 💔 Devedor (ainda tem saldo)
├─ Total: R$ 160.00
└─ Em Aberto: R$ 80.00
```

---

### CENÁRIO 5: Cliente Inativo

**Situação:** Pedro não compra há 2 meses

**Passo 1: Marcar como Inativo**
```
1. Clicar em ✏️ ao lado de Pedro
2. Marcar checkbox "Cliente Inativo"
3. Clicar em "💾 Salvar Cliente"
```

**Passo 2: Filtrar Inativos**
```
1. Ir para lista de clientes
2. Usar filtro: [Todos Clientes ▼]
3. Selecionar: "❌ Clientes Inativos"
4. Mostra apenas clientes marcados como inativos
```

**Resultado:**
```
Tabela mostra apenas:
Pedro Santos | ... | Inativo | ...
```

---

### CENÁRIO 6: Buscar e Contatar pelo WhatsApp

**Situação:** Admin precisa conversar com cliente sobre pendência

**Passo 1: Buscar Cliente**
```
1. Na barra de busca, digitar "Maria"
2. Sistema filtra em tempo real
3. Resultado: Maria Santos

OU

1. Digitar telefone: "11 9123"
2. Resultado: Maria Santos
```

**Passo 2: Contatar pelo WhatsApp**
```
1. Clicar em 👁️ para abrir detalhes de Maria
2. Na seção "Informações", clicar em 💬 Conversar
3. Abre automaticamente WhatsApp:
   https://wa.me/5511912345678
4. WhatsApp abre com conversa aberta
5. Admin pode enviar: "Olá Maria, você tem uma compra de R$ 80 pendente..."
```

---

### CENÁRIO 7: Análise - Clientes VIP

**Situação:** Admin quer enviar brinde apenas para VIPs

**Passo 1: Filtrar VIPs**
```
1. Clicar em filtro [Todos Clientes ▼]
2. Selecionar: "⭐ Clientes VIP"
3. Tabela mostra apenas: João Silva, Roberto Santos, etc
```

**Passo 2: Ver Detalhes**
```
Para cada VIP:
1. Clicar em 👁️
2. Ver total gasto
3. Ver frequência de compra
4. Anotar observações privadas

Exemplo:
João Silva
├─ Total Gasto: R$ 5.430,00
├─ Este Ano: R$ 2.100,00
├─ Compras: 15
├─ Frequência: 1/mês
└─ Anotações: "Sempre compra no fim do mês"
```

---

### CENÁRIO 8: Análise - Devedores

**Situação:** Admin precisa cobrar clientes em atraso

**Passo 1: Ver Devedores**
```
1. Filtro: "💔 Clientes Devedores"
2. Tabela mostra automaticamente clientes com "Em Aberto" > 0
```

**Resultado:**
```
Cliente     | Contato | Situação | Total    | Em Aberto | Compras | Ações
------------|---------|----------|----------|-----------|---------|-------
Maria       | 119123  | Devedor  | R$ 1.200 | R$ 320    | 5       | 👁️ ✏️ 🗑️
Pedro       | 119456  | Devedor  | R$ 800   | R$ 450    | 3       | 👁️ ✏️ 🗑️
Ana         | 119789  | Devedor  | R$ 2.100 | R$ 1.100  | 8       | 👁️ ✏️ 🗑️
```

**Passo 2: Contatar Devedor**
```
1. Clicar em 👁️ na linha de Maria
2. Ver detalhes da dívida
3. Clicar em 💬 Conversar no WhatsApp
4. Enviar: "Olá Maria, você tem R$ 320 em aberto. Podemos agendar o pagamento?"
```

---

### CENÁRIO 9: Adicionar Observação Estratégica

**Situação:** Admin quer anotar padrão de cliente

**Passo 1: Editar Cliente**
```
1. Clicar em ✏️ ao lado de João Silva
2. Descer até campo "Observações"
3. Digitar: "Cliente costuma comprar no fim do mês, sempre traz lista pronta"
4. Clicar em "💾 Salvar Cliente"
```

**Resultado:**
```
Próxima vez que admin abrir detalhe de João:
├─ Dashboard com estatísticas
├─ Informações (incluindo observação)
├─ 📝 "Cliente costuma comprar no fim do mês..."
└─ Histórico de compras
```

---

### CENÁRIO 10: Relatório Rápido - Ticket Médio

**Situação:** Admin quer saber ticket médio por cliente

**Passo 1: Usar Filtro "Todos Clientes"**
```
1. Manter em "Todos Clientes"
2. Ver tabela com todos
3. Clicar em 👁️ de cada cliente
```

**Informação Disponível:**
```
Cada cliente mostra:
├─ Total Comprado: R$ X
├─ Número de Compras: Y
├─ Ticket Médio: R$ (X ÷ Y) ← Automático!
├─ Este Mês: R$ Z
└─ Este Ano: R$ W
```

---

## 🔄 FLUXO TÍPICO DE UM DIA

### Manhã
```
1. Abrir painel admin
2. Clicar em "Central de Clientes"
3. Ver clientes inativos → "❌ Clientes Inativos"
4. Contatar para reativar: 💬 WhatsApp
```

### Meio do dia
```
1. Novo cliente chega → "+ Novo Cliente"
2. Preencher dados
3. Registrar primeira compra → "+ Registrar Compra"
4. Marcar como VIP se necessário
```

### Tarde
```
1. Cliente liga para pedir desconto
2. Buscar na barra: nome ou telefone
3. Abrir detalhes (👁️)
4. Ver anotações privadas
5. Tomar decisão informada
```

### Final do dia
```
1. Filtrar devedores: "💔 Clientes Devedores"
2. Enviar WhatsApp de cobrança educada
3. Atualizar status de pagamentos recebidos
4. Pronto!
```

---

## 📊 EXEMPLOS DE RELATÓRIOS FÁCEIS

### Quem comprou este mês?
```
1. Ver tabela de "Todos Clientes"
2. Buscar manualmente
3. OU abrir detalhes e ver "Este Mês: R$ X"
```

### Qual é o cliente mais valioso?
```
1. Filtro "Todos Clientes"
2. Ordenar: clicar em "Total Gasto" (quando implementar)
3. Ver primeiro da lista
```

### Quem está devendo?
```
1. Filtro: "💔 Clientes Devedores"
2. Todos listados
```

### Quem são os VIPs?
```
1. Filtro: "⭐ Clientes VIP"
2. Todos listados
```

### Quanto cada cliente deve?
```
1. Coluna "Em Aberto" na tabela
2. Ou abrir detalhes (👁️) e ver "Valor em Aberto"
```

---

## ⚠️ ERROS COMUNS E SOLUÇÕES

### Erro 1: "Não vejo o CRM na sidebar"
```
Solução:
1. Fazer refresh: F5
2. Limpar cache: Ctrl+Shift+Delete
3. Verificar se admin.html foi salvo corretamente
```

### Erro 2: "Clico em + Novo Cliente e não abre modal"
```
Solução:
1. Abrir console: F12
2. Ver se tem erro de JavaScript
3. Verificar se admin-crm.js foi carregado
4. Refresh da página
```

### Erro 3: "Salvei cliente mas não aparece na lista"
```
Solução:
1. Fazer refresh: F5
2. Verificar console para erros na API
3. Confirmar se banco de dados está rodando
4. Verificar DATABASE_URL
```

### Erro 4: "Total calculado está errado"
```
Solução:
1. Editar compra (✏️)
2. Mudar quantidade ou preço
3. Salvar novamente
4. O sistema recalcula automaticamente
```

---

## 💡 DICAS E TRUQUES

### Dica 1: Use observações para lembrar padrões
```
"Cliente paga sempre na 2ª semana"
"Pedir desconto em >50 unidades"
"Entrega extra R$ 50"
```

### Dica 2: Organize VIPs para atenção especial
```
Clientes que gastam muito:
1. Filtro "⭐ VIPs"
2. Contato regular pelo WhatsApp
3. Oferecer produtos em primeira mão
```

### Dica 3: Use o WhatsApp para confirmar detalhe
```
Antes de registrar compra grande:
1. Ver anotações do cliente
2. Conversar via 💬
3. Confirmar quantidade/preço
4. Registrar depois
```

### Dica 4: Revise regularmente o status
```
Semanal:
1. Ver devedores "💔"
2. Conversar: "Você recebeu nossa nota?"
3. Atualizar status de pagamentos

Mensal:
1. Ver "🆕 Clientes Novos"
2. Oferecer desconto para 2ª compra
```

---

**Pronto para começar! 🚀**
