// ==================== RELATÓRIOS & ANÁLISES - VERSÃO 3 (100% REAL - REFATORADO) ====================

let chartsInstances = {};
let reportsData = {};
let currentReportsPeriod = 30;

// API_BASE já definido em admin.js, reutilizar a mesma

function formatDateForInput(date) {
  return date.toISOString().split('T')[0];
}

function getPeriodRange(days) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  return {
    dateStart: formatDateForInput(start),
    dateEnd: formatDateForInput(end)
  };
}

function setReportsPeriod(days, button) {
  currentReportsPeriod = days;
  document.querySelectorAll('.reports-period-btn').forEach(btn => btn.classList.remove('active'));
  if (button) button.classList.add('active');
  loadReportsData(days);
}

// ==================== FORMATAR NÚMEROS ====================
function formatNumber(num) {
  return Math.round(num).toLocaleString('pt-BR');
}

function formatCurrency(num) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(num);
}

// ==================== CARREGAR DADOS DOS RELATÓRIOS ====================
async function loadReportsData(periodDays = currentReportsPeriod) {
  console.log('📈 Carregando dados de relatórios (versão refatorada)...');
  
  try {
    const { dateStart, dateEnd } = getPeriodRange(periodDays);
    currentReportsPeriod = periodDays;

    console.log(`📅 Período automático: ${dateStart} a ${dateEnd} (${periodDays} dias)`);

    // Chamar TODAS as APIs em paralelo
    const promises = [
      fetch(`${API_BASE}/reports/orders?dateStart=${dateStart}&dateEnd=${dateEnd}`).then(r => r.ok ? r.json() : Promise.reject(new Error(`Erro ${r.status}`))).then(data => { reportsData.orders = data; console.log('✅ Orders:', data); }),
      fetch(`${API_BASE}/reports/general?dateStart=${dateStart}&dateEnd=${dateEnd}`).then(r => r.ok ? r.json() : Promise.reject(new Error(`Erro ${r.status}`))).then(data => { reportsData.general = data; console.log('✅ General:', data); }),
      fetch(`${API_BASE}/reports/crm?dateStart=${dateStart}&dateEnd=${dateEnd}`).then(r => r.ok ? r.json() : Promise.reject(new Error(`Erro ${r.status}`))).then(data => { reportsData.crm = data; console.log('✅ CRM:', data); }),
      fetch(`${API_BASE}/reports/suppliers?dateStart=${dateStart}&dateEnd=${dateEnd}`).then(r => r.ok ? r.json() : Promise.reject(new Error(`Erro ${r.status}`))).then(data => { reportsData.suppliers = data; console.log('✅ Suppliers:', data); }),
      fetch(`${API_BASE}/reports/daily-sales?dateStart=${dateStart}&dateEnd=${dateEnd}`).then(r => r.ok ? r.json() : Promise.reject(new Error(`Erro ${r.status}`))).then(data => { reportsData.daily = data; console.log('✅ Daily Sales:', data); }),
      fetch(`${API_BASE}/reports/top-customers?dateStart=${dateStart}&dateEnd=${dateEnd}&limit=5`).then(r => r.ok ? r.json() : Promise.reject(new Error(`Erro ${r.status}`))).then(data => { reportsData.topCustomers = data; console.log('✅ Top Customers:', data); }),
      fetch(`${API_BASE}/reports/payment-summary?dateStart=${dateStart}&dateEnd=${dateEnd}`).then(r => r.ok ? r.json() : Promise.reject(new Error(`Erro ${r.status}`))).then(data => { reportsData.paymentSummary = data; console.log('✅ Payment Summary:', data); })
    ];

    console.log('⏳ Aguardando todos os dados...');
    await Promise.all(promises);

    console.log('📊 Verificando dados...');
    
    const hasOrders = (reportsData.orders?.summary?.total_orders || 0) > 0;
    const hasRevenue = parseFloat(reportsData.general?.sales?.total_revenue || 0) > 0;
    const hasCRM = (reportsData.crm?.totalPurchasesCount || 0) > 0;

    if (!hasOrders && !hasRevenue && !hasCRM) {
      showToast('⚠️ Nenhum dado encontrado para este período', 'warning');
    }

    updateReportsMetrics();
    renderReportsCharts();
    await fillReportsTables();

    showToast('✅ Relatórios atualizados com sucesso!', 'success');
    console.log('✅ Todos os dados carregados com sucesso');

  } catch (error) {
    console.error('❌ Erro ao carregar relatórios:', error);
    showToast('❌ Erro ao carregar relatórios: ' + error.message, 'error');
  }
}

// ==================== ATUALIZAR MÉTRICAS ====================
function updateReportsMetrics() {
  console.log('📊 Atualizando métricas...');

  // Total de Pedidos
  const totalOrders = parseFloat(reportsData.orders?.summary?.total_orders) || 0;
  const el1 = document.getElementById('rep-total-orders');
  if (el1) el1.textContent = formatNumber(totalOrders);

  // Faturamento
  const totalRevenue = parseFloat(reportsData.general?.sales?.total_revenue) || 0;
  const el2 = document.getElementById('rep-total-revenue');
  if (el2) el2.textContent = formatCurrency(totalRevenue);

  // Clientes CRM
  const totalCustomers = parseFloat(reportsData.crm?.summary?.total_customers) || 0;
  const el3 = document.getElementById('rep-total-customers');
  if (el3) el3.textContent = formatNumber(totalCustomers);

  // Fornecedores
  const totalSuppliers = parseFloat(reportsData.suppliers?.summary?.total_suppliers) || 0;
  const el4 = document.getElementById('rep-total-suppliers');
  if (el4) el4.textContent = formatNumber(totalSuppliers);

  // Total de Compras CRM
  const totalCRMPurchases = parseFloat(reportsData.crm?.totalPurchasesCount) || 0;
  const el5 = document.getElementById('rep-crm-purchases');
  if (el5) el5.textContent = formatNumber(totalCRMPurchases);

  console.log(`📊 Métricas: Pedidos=${totalOrders}, Revenue=${totalRevenue}, Clientes=${totalCustomers}, Fornecedores=${totalSuppliers}, Compras CRM=${totalCRMPurchases}`);
}

// ==================== RENDERIZAR GRÁFICOS COM DADOS REAIS ====================
function renderReportsCharts() {
  console.log('📊 Renderizando gráficos com dados reais...');

  Object.keys(chartsInstances).forEach(key => {
    if (chartsInstances[key]) chartsInstances[key].destroy();
  });
  chartsInstances = {};

  if (document.getElementById('chartEvolution')) renderEvolutionChart();
  if (document.getElementById('chartStatus')) renderStatusChart();
  if (document.getElementById('chartPayment')) renderPaymentChart();
  if (document.getElementById('chartTop')) renderTopChart();

  console.log('✅ Gráficos renderizados');
}

// GRÁFICO 1: Evolução Diária Real
function renderEvolutionChart() {
  const ctx = document.getElementById('chartEvolution');
  if (!ctx) return;

  const dailyData = reportsData.daily?.orders || [];

  if (!dailyData || dailyData.length === 0) {
    ctx.style.display = 'none';
    ctx.parentElement.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Sem dados de vendas</p>';
    return;
  }

  ctx.style.display = 'block';

  const labels = dailyData.map(d => {
    const date = new Date(d.date);
    return date.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' });
  });
  
  const revenues = dailyData.map(d => parseFloat(d.revenue) || 0);

  chartsInstances.evolution = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Faturamento Diário',
        data: revenues,
        borderColor: '#4F46E5',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#4F46E5'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: true, position: 'bottom' },
        tooltip: {
          callbacks: {
            label: (context) => 'R$ ' + context.parsed.y.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => 'R$ ' + (value / 1000).toFixed(0) + 'k'
          }
        }
      }
    }
  });
}

// GRÁFICO 2: Status dos Pedidos (Real)
function renderStatusChart() {
  const ctx = document.getElementById('chartStatus');
  if (!ctx) return;

  const summary = reportsData.orders?.summary || {};
  const paidOrders = parseFloat(summary.paid_orders) || 0;
  const pendingOrders = parseFloat(summary.pending_orders) || 0;
  const cancelledOrders = parseFloat(summary.cancelled_orders) || 0;
  const totalOrders = parseFloat(summary.total_orders) || 0;

  if (totalOrders === 0) {
    ctx.style.display = 'none';
    ctx.parentElement.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Sem pedidos</p>';
    return;
  }

  ctx.style.display = 'block';

  chartsInstances.status = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Pago', 'Pendente', 'Cancelado'],
      datasets: [{
        data: [paidOrders, pendingOrders, cancelledOrders],
        backgroundColor: ['#22C55E', '#FFA500', '#EF4444'],
        borderColor: '#fff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: (context) => context.label + ': ' + context.parsed + ' pedidos'
          }
        }
      }
    }
  });
}

// GRÁFICO 3: Formas de Pagamento (Real)
function renderPaymentChart() {
  const ctx = document.getElementById('chartPayment');
  if (!ctx) return;

  const paymentMethods = reportsData.paymentSummary?.paymentMethods || [];

  if (!paymentMethods || paymentMethods.length === 0) {
    ctx.style.display = 'none';
    ctx.parentElement.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Sem dados de pagamento</p>';
    return;
  }

  ctx.style.display = 'block';

  const labels = paymentMethods.map(m => m.method || 'Outro');
  const data = paymentMethods.map(m => parseFloat(m.total) || 0);
  const colors = ['#667EEA', '#764BA2', '#F093FB', '#4FD1C5', '#FF6B6B'];

  chartsInstances.payment = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Total por Forma de Pagamento',
        data: data,
        backgroundColor: colors.slice(0, labels.length),
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => formatCurrency(context.parsed.x)
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            callback: (value) => 'R$ ' + (value / 1000).toFixed(0) + 'k'
          }
        }
      }
    }
  });
}

// GRÁFICO 4: Top 5 Clientes (Real)
function renderTopChart() {
  const ctx = document.getElementById('chartTop');
  if (!ctx) return;

  const topCustomers = reportsData.topCustomers?.customers || [];

  if (!topCustomers || topCustomers.length === 0) {
    ctx.style.display = 'none';
    ctx.parentElement.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Sem dados de clientes</p>';
    return;
  }

  ctx.style.display = 'block';

  const labels = topCustomers.map(c => c.customer_name || 'N/A');
  const data = topCustomers.map(c => parseFloat(c.total_spent) || 0);
  const colors = ['#667EEA', '#764BA2', '#F093FB', '#4FD1C5', '#FFA500'];

  chartsInstances.top = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Total Gasto',
        data: data,
        backgroundColor: colors.slice(0, labels.length),
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => formatCurrency(context.parsed.x)
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            callback: (value) => 'R$ ' + (value / 1000).toFixed(0) + 'k'
          }
        }
      }
    }
  });
}

// ==================== PREENCHER TABELAS ====================
async function fillReportsTables() {
  console.log('📋 Preenchendo tabelas com dados reais...');

  // Tabela de Pedidos
  const ordersTable = document.getElementById('tableOrders');
  if (ordersTable && reportsData.orders?.summary?.total_orders > 0) {
    const topCustomers = reportsData.topCustomers?.customers || [];
    ordersTable.innerHTML = topCustomers
      .map(c => `
        <tr>
          <td data-label="Cliente">${c.customer_name || 'N/A'}</td>
          <td data-label="Pedidos">${c.orders || 0}</td>
          <td data-label="Total" style="text-align: right;">${formatCurrency(c.total_spent || 0)}</td>
        </tr>
      `)
      .join('') || '<tr><td colspan="3" style="text-align: center;">Sem dados</td></tr>';
  }

  // Tabela de Clientes CRM
  const customersTable = document.getElementById('tableCustomers');
  if (customersTable) {
    const crm = reportsData.crm || {};
    const html = `
      <tr>
        <td data-label="Total Clientes">${crm.summary?.total_customers || 0}</td>
        <td data-label="Clientes VIP">${crm.summary?.vip_customers || 0}</td>
        <td data-label="Clientes Ativos">${crm.summary?.active_customers || 0}</td>
        <td data-label="Novos Clientes" style="text-align: right;">${crm.summary?.new_customers_period || 0}</td>
      </tr>
    `;
    customersTable.innerHTML = html;
  }

  // Tabela de Fornecedores
  const suppliersTable = document.getElementById('tableSuppliers');
  if (suppliersTable) {
    const suppliers = reportsData.suppliers || {};
    const html = `
      <tr>
        <td data-label="Total Fornecedores">${suppliers.summary?.total_suppliers || 0}</td>
        <td data-label="Fornecedores Ativos">${suppliers.summary?.active_suppliers || 0}</td>
        <td data-label="Gastos" style="text-align: right;">${formatCurrency(suppliers.summary?.total_spent_suppliers || 0)}</td>
        <td data-label="Novos" style="text-align: right;">${suppliers.summary?.new_suppliers_period || 0}</td>
      </tr>
    `;
    suppliersTable.innerHTML = html;
  }

  console.log('✅ Tabelas preenchidas com dados reais');
}

// ==================== EXPORTAR CSV ====================
async function exportReportsCSV() {
  const { dateStart, dateEnd } = getPeriodRange(currentReportsPeriod);

  let csv = 'RELATÓRIO DE VENDAS - 100% REAL\n';
  csv += `Período: ${dateStart} a ${dateEnd}\n\n`;
  csv += `RESUMO,\n`;
  csv += `Total de Pedidos,${reportsData.orders?.summary?.total_orders || 0}\n`;
  csv += `Faturamento Total,R$ ${reportsData.general?.sales?.total_revenue || 0}\n`;
  csv += `Pedidos Pagos,${reportsData.orders?.summary?.paid_orders || 0}\n`;
  csv += `Pedidos Pendentes,${reportsData.orders?.summary?.pending_orders || 0}\n`;
  csv += `Total de Clientes CRM,${reportsData.crm?.summary?.total_customers || 0}\n`;
  csv += `Compras CRM,${reportsData.crm?.totalPurchasesCount || 0}\n`;
  csv += `Total de Fornecedores,${reportsData.suppliers?.summary?.total_suppliers || 0}\n`;

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relatorio_vendas_${dateStart}_${dateEnd}.csv`;
  a.click();

  showToast('✅ CSV exportado!', 'success');
}

// ==================== INICIALIZAÇÃO ====================
window.addEventListener('load', () => {
  console.log('🚀 Inicializando Dashboard de Relatórios (v3 - 100% Real)...');
  currentReportsPeriod = 30;
  setReportsPeriod(30, document.querySelector('.reports-period-btn[data-days="30"]'));
  console.log('✅ Dashboard inicializado e pronto para uso');
});
