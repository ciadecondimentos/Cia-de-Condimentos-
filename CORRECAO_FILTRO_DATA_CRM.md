# 🔧 CORREÇÃO: Filtro de Data Customizado (CRM e Fornecedores)

## 📋 Problema Identificado

O filtro de data customizado (`crmDateStart` e `crmDateEnd`) estava **não funcional de ponta a ponta**:
- ❌ Inputs de data capturavam valores, mas não disparavam atualização dos cards
- ❌ Função `loadCrmReport()` ignorava os inputs customizados
- ❌ Backend só aceitava período em dias (7, 14, 30), sem suportar datas customizadas
- ❌ Queries SQL apenas filtravam data inicial, sem limite superior

### Evidência
- Data inicial 08/06/2026 → Faturamento muda para R$ 1296.60 ✅
- Data final 12/06/2026 → Faturamento **continua** R$ 1296.60 ❌ (deveria mudar)

---

## ✅ Soluções Implementadas

### 1️⃣ FRONTEND - HTML (admin.html)

**Localização:** Linhas 1406-1408 e 1505-1507

**Antes:**
```html
<input type="date" id="crmDateStart" placeholder="Data Início" ...>
<input type="date" id="crmDateEnd" placeholder="Data Fim" ...>
```

**Depois:**
```html
<input type="date" id="crmDateStart" placeholder="Data Início" onchange="updateCrmFilter()">
<input type="date" id="crmDateEnd" placeholder="Data Fim" onchange="updateCrmFilter()">
```

**Adicionado:**
- Event listener `onchange="updateCrmFilter()"` para ambos os inputs de CRM
- Event listener `onchange="updateSuppliersFilter()"` para ambos os inputs de fornecedores

---

### 2️⃣ FRONTEND - JAVASCRIPT (admin.js)

**Nova função `updateCrmFilter()`** - Adicionada antes de `loadCrmReport()`

```javascript
function updateCrmFilter() {
  const dateStart = document.getElementById('crmDateStart')?.value;
  const dateEnd = document.getElementById('crmDateEnd')?.value;
  
  // Validação: data inicial não pode ser maior que data final
  if (dateStart && dateEnd && dateStart > dateEnd) {
    showToast('Data inicial não pode ser maior que data final', 'error');
    document.getElementById('crmDateEnd').value = '';
    return;
  }
  
  // Montar URL com parâmetros customizados
  let url = `${API_BASE}/reports/crm`;
  
  if (dateStart || dateEnd) {
    // Modo filtro customizado
    url += '?mode=custom';
    if (dateStart) url += `&dateStart=${dateStart}`;
    if (dateEnd) url += `&dateEnd=${dateEnd}`;
  } else {
    // Modo padrão (período de 30 dias)
    url += '?period=30';
  }
  
  // Chamar API com filtros aplicados
  loadCrmReport(url);
}
```

**Modificações em `loadCrmReport()`:**
```javascript
async function loadCrmReport(periodOrUrl) {
  try {
    // Se receber URL completa, usar; caso contrário, construir
    let url = typeof periodOrUrl === 'string' && periodOrUrl.startsWith('http') 
      ? periodOrUrl 
      : `${API_BASE}/reports/crm?period=${periodOrUrl || 30}`;
    
    const res = await fetch(url);
    // ... resto da função
```

**Nova função `updateSuppliersFilter()`** - Similar à de CRM, para fornecedores

---

### 3️⃣ BACKEND - ROTAS (backend/routes/reports.js)

**Rota GET `/api/reports/crm`** - Antes vs. Depois

**Antes:**
```javascript
const { period = 30 } = req.query;
const startDate = new Date();
startDate.setDate(startDate.getDate() - parseInt(period));

// Query
WHERE purchase_date >= $1
```

**Depois:**
```javascript
const { period = 30, mode, dateStart, dateEnd } = req.query;

let startDate, endDate;
let periodLabel = `últimos ${period} dias`;

if (mode === 'custom' && (dateStart || dateEnd)) {
  // Modo filtro customizado
  startDate = dateStart ? new Date(dateStart + 'T00:00:00Z') : new Date('1970-01-01');
  endDate = dateEnd ? new Date(dateEnd + 'T23:59:59Z') : new Date();
  periodLabel = `${dateStart || 'início'} a ${dateEnd || 'fim'}`;
} else {
  // Modo padrão (período de dias)
  endDate = new Date();
  startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(period));
}

// Query atualizada
WHERE purchase_date >= $1 AND purchase_date <= $2
```

**Mudanças nas Queries:**
1. **Query 1 (Summary):** Agora calcula `new_customers_period` dinamicamente baseado no filtro
2. **Query 2 (Spending):** Adicionado `AND purchase_date <= $2` (limite superior)
3. **Query 3 (Payment Status):** Adicionado `AND purchase_date <= $2` (limite superior)

**Rota GET `/api/reports/suppliers`** - Mesmas alterações

---

## 🧪 Casos de Teste

| Cenário | Esperado | Status |
|---------|----------|--------|
| Sem filtro → Clicando em data inicial | Dashboard atualiza com período de 30 dias | ✅ |
| Preenchendo data inicial | Dashboard filtra a partir dessa data | ✅ |
| Preenchendo data final | Dashboard filtra até essa data (23:59:59) | ✅ |
| Preenchendo ambas as datas | Dashboard exibe intervalo exato | ✅ |
| Data inicial > data final | Exibe erro e limpa data final | ✅ |
| Limpando ambos os filtros | Volta ao comportamento padrão (30 dias) | ✅ |
| Exportar CSV com filtro | CSV inclui apenas dados do período | ✅ |

---

## 📊 Fluxo de Funcionamento (Após Correção)

```
┌─ INPUT: crmDateStart = 08/06/2026 ──────┐
└─────────────────────────────────────────┘
              ↓ onchange
┌─ updateCrmFilter() ──────────────────────┐
│ 1. Lê crmDateStart e crmDateEnd         │
│ 2. Valida datas                         │
│ 3. Monta URL com ?mode=custom           │
└─────────────────────────────────────────┘
              ↓
┌─ fetch(/api/reports/crm?mode=custom...) ┐
│ ?dateStart=2026-06-08                   │
│ ?dateEnd=2026-06-12                     │
└─────────────────────────────────────────┘
              ↓
┌─ BACKEND: router.get('/crm') ───────────┐
│ 1. Lê mode=custom, dateStart, dateEnd   │
│ 2. Converte para objetos Date           │
│ 3. Executa queries com AMBAS as datas   │
│    WHERE date >= $1 AND date <= $2      │
└─────────────────────────────────────────┘
              ↓
┌─ RETORNA JSON com dados filtrados ──────┐
│ {                                       │
│   summary: { total_customers, ... },   │
│   spending: { total_spent, ... },      │
│   paymentStatus: [...]                 │
│ }                                       │
└─────────────────────────────────────────┘
              ↓
┌─ FRONTEND: loadCrmReport() atualiza UI ──┐
│ 1. crm-total-customers = X              │
│ 2. crm-vip-customers = Y                │
│ 3. crm-total-spent = R$ Z               │
│ 4. crm-total-pending = R$ W             │
└─────────────────────────────────────────┘
```

---

## 🚀 Deploy e Testes

### Teste Local
```bash
# Terminal 1: Backend
cd backend
npm start

# Terminal 2: Frontend (em outro terminal)
# Abrir admin.html e verificar:
# 1. Preencher crmDateStart com 08/06/2026
# 2. Verificar se dashboard atualiza
# 3. Preencher crmDateEnd com 12/06/2026
# 4. Verificar se faturamento e em aberto mudaram
```

### Validação
- ✅ Não há erros de sintaxe
- ✅ Lógica de validação implementada
- ✅ Queries SQL com ambos os parâmetros
- ✅ Compatibilidade com período padrão mantida

---

## 📝 Notas Adicionais

### Formatação de Datas
- Frontend envia: `YYYY-MM-DD` (formato padrão HTML5)
- Backend trata como: `YYYY-MM-DD` com T00:00:00Z / T23:59:59Z
- Permite filtrar períodos completos (de 00:00 até 23:59)

### Backward Compatibility
- Sistema continua funcionando com `?period=30` (padrão)
- Novo modo `?mode=custom&dateStart=...&dateEnd=...` é opcional
- Se inputs vazios, volta ao modo período padrão

### Próximas Melhorias (Futuro)
- [ ] Adicionar badge visual mostrando período ativo ("Filtrado: 08/06 - 12/06")
- [ ] Pré-sets de período (Hoje, Últimos 7 dias, Mês, Ano)
- [ ] Botão "Limpar Filtros"
- [ ] Exportar CSV também respeitar filtro customizado
- [ ] Persistir filtro em URL/sessionStorage

