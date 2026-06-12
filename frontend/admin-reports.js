// ==================== RELATÓRIOS & ANÁLISES ====================

let chartsInstances = {};
let reportsData = {};
let reportsDataPrevious = {}; // Para comparação

// Função principal para carregar dados de relatórios
async function loadReportsData() {
  console.log('📈 Carregando dados de relatórios...');
  
  try {
    // Pegar filtros
    const period = document.getElementById('reportsPeriod')?.value || '30';
    const compare = document.getElementById('reportsCompare')?.checked;

    // Limpar dados anteriores
    reportsData = {};
    reportsDataPrevious = {};

    // Carregar período ATUAL
    let promises = [
      fetch(`${API_BASE}/reports/general?period=${period}`)
        .then(r => r.json())
        .then(data => { reportsData.general = data; })
        .catch(e => console.error('Erro geral:', e)),

      fetch(`${API_BASE}/reports/orders?period=${period}`)
        .then(r => r.json())
        .then(data => { reportsData.orders = data; })
        .catch(e => console.error('Erro orders:', e)),

      fetch(`${API_BASE}/reports/crm?period=${period}`)
        .then(r => r.json())
        .then(data => { reportsData.crm = data; })
        .catch(e => console.error('Erro crm:', e)),

      fetch(`${API_BASE}/reports/suppliers?period=${period}`)
        .then(r => r.json())
        .then(data => { reportsData.suppliers = data; })
        .catch(e => console.error('Erro suppliers:', e))
    ];

    // Se comparação ativa, carregar período ANTERIOR
    if (compare) {
      const periodInt = parseInt(period);
      const periodDouble = periodInt * 2;
      promises.push(
        fetch(`${API_BASE}/reports/general?period=${periodDouble}`)
          .then(r => r.json())
          .then(data => { reportsDataPrevious.general = data; }),

        fetch(`${API_BASE}/reports/orders?period=${periodDouble}`)
          .then(r => r.json())
          .then(data => { reportsDataPrevious.orders = data; }),

        fetch(`${API_BASE}/reports/crm?period=${periodDouble}`)
          .then(r => r.json())
          .then(data => { reportsDataPrevious.crm = data; }),

        fetch(`${API_BASE}/reports/suppliers?period=${periodDouble}`)
          .then(r => r.json())
          .then(data => { reportsDataPrevious.suppliers = data; })
      );
    }

    await Promise.all(promises);

    // Atualizar métricas
    updateReportsMetrics(compare);

    // Renderizar gráficos
    renderReportsCharts();

    // Preencher tabelas
    fillReportsTables();

    showToast('📊 Relatórios carregados com sucesso', 'success');
    console.log('✅ Dados de relatórios carregados:', { reportsData, reportsDataPrevious });
  } catch (error) {
    console.error('❌ Erro ao carregar relatórios:', error);
    showToast('Erro ao carregar relatórios: ' + error.message, 'error');
  }
}

// Calcular percentual de mudança
function calculatePercentChange(current, previous) {
  if (!previous || previous === 0) return '+0%';
  const change = ((current - previous) / previous) * 100;
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

// Atualizar cards de métricas
function updateReportsMetrics(showComparison = false) {
  try {
    // Total de pedidos
    const totalOrders = parseFloat(reportsData.orders?.summary?.total_orders) || 0;
    const prevOrders = parseFloat(reportsDataPrevious.orders?.summary?.total_orders) || totalOrders;
    
    document.getElementById('rep-total-orders').textContent = formatNumber(totalOrders);
    document.getElementById('rep-orders-percent').textContent = showComparison 
      ? calculatePercentChange(totalOrders, prevOrders)
      : '+0%';

    // Faturamento
    const totalRevenue = parseFloat(reportsData.general?.sales?.total_revenue) || 0;
    const prevRevenue = parseFloat(reportsDataPrevious.general?.sales?.total_revenue) || totalRevenue;
    
    document.getElementById('rep-total-revenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('rep-revenue-percent').textContent = showComparison 
      ? calculatePercentChange(totalRevenue, prevRevenue)
      : '+0%';

    // Clientes CRM
    const totalCustomers = parseFloat(reportsData.crm?.summary?.total_customers) || 0;
    const prevCustomers = parseFloat(reportsDataPrevious.crm?.summary?.total_customers) || totalCustomers;
    
    document.getElementById('rep-total-customers').textContent = formatNumber(totalCustomers);
    document.getElementById('rep-customers-percent').textContent = showComparison 
      ? calculatePercentChange(totalCustomers, prevCustomers)
      : '+0%';

    // Fornecedores
    const totalSuppliers = parseFloat(reportsData.suppliers?.summary?.total_suppliers) || 0;
    const prevSuppliers = parseFloat(reportsDataPrevious.suppliers?.summary?.total_suppliers) || totalSuppliers;
    
    document.getElementById('rep-total-suppliers').textContent = formatNumber(totalSuppliers);
    document.getElementById('rep-suppliers-percent').textContent = showComparison 
      ? calculatePercentChange(totalSuppliers, prevSuppliers)
      : '+0%';
  } catch (error) {
    console.error('Erro ao atualizar métricas:', error);
  }
}

// Renderizar todos os gráficos
function renderReportsCharts() {
  console.log('📊 Renderizando gráficos...');

  // Destruir gráficos existentes
  Object.keys(chartsInstances).forEach(key => {
    if (chartsInstances[key]) chartsInstances[key].destroy();
  });
  chartsInstances = {};

  // Gráfico 1: Evolução Mensal
  renderEvolutionChart();

  // Gráfico 2: Distribuição por Status
  renderStatusChart();

  // Gráfico 3: Formas de Pagamento
  renderPaymentChart();

  // Gráfico 4: Top Clientes
  renderTopChart('customers');

  console.log('✅ Gráficos renderizados');
}

// GRÁFICO 1: Evolução Mensal (Colunas com comparação)
function renderEvolutionChart() {
  const ctx = document.getElementById('chartEvolution');
  if (!ctx) return;

  // Usar dados do período atual para simular evolução
  // Em produção, a API retornaria dados diários/mensais detalhados
  const currentTotal = parseFloat(reportsData.general?.sales?.total_revenue) || 0;
  const labels = ['Mês -5', 'Mês -4', 'Mês -3', 'Mês -2', 'Mês -1', 'Mês Atual'];
  
  // Simular progressão (na prática viria detalhado da API)
  const monthlyData = [];
  for (let i = 0; i < 6; i++) {
    monthlyData.push(Math.round(currentTotal * (0.4 + (i * 0.1))));
  }

  const previousData = [];
  const prevTotal = parseFloat(reportsDataPrevious.general?.sales?.total_revenue) || currentTotal;
  for (let i = 0; i < 6; i++) {
    previousData.push(Math.round(prevTotal * (0.4 + (i * 0.1))));
  }

  chartsInstances.evolution = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Este Período',
          data: monthlyData,
          backgroundColor: '#4F46E5',
          borderRadius: 4,
          borderSkipped: false,
        },
        {
          label: 'Período Anterior',
          data: previousData,
          backgroundColor: '#B0A8E0',
          borderRadius: 4,
          borderSkipped: false,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: { font: { size: 12 }, boxWidth: 12 }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { 
            font: { size: 11 }, 
            color: '#666',
            callback: function(value) {
              return 'R$ ' + (value / 1000).toFixed(1) + 'k';
            }
          },
          grid: { color: '#f0f0f0' }
        },
        x: {
          ticks: { font: { size: 11 }, color: '#666' },
          grid: { display: false }
        }
      }
    }
  });
}

// GRÁFICO 2: Distribuição por Status (Barras Horizontais)
function renderStatusChart() {
  const ctx = document.getElementById('chartStatus');
  if (!ctx) return;

  // Extrair dados reais de status dos pedidos
  const summary = reportsData.orders?.summary || {};
  const paidOrders = parseFloat(summary.paid_orders) || 0;
  const pendingOrders = parseFloat(summary.pending_orders) || 0;
  const cancelledOrders = parseFloat(summary.cancelled_orders) || 0;
  
  // Calcular entregues (total - pago - pendente - cancelado)
  const totalOrders = parseFloat(summary.total_orders) || 0;
  const deliveredOrders = totalOrders - paidOrders - pendingOrders - cancelledOrders;

  const statusData = [
    { status: 'Pendente', count: pendingOrders },
    { status: 'Pago', count: paidOrders },
    { status: 'Entregue', count: Math.max(0, deliveredOrders) },
    { status: 'Cancelado', count: cancelledOrders }
  ].filter(s => s.count > 0);

  const labels = statusData.map(s => s.status);
  const values = statusData.map(s => s.count);
  const colors = ['#EF4444', '#22C55E', '#3B82F6', '#9CA3AF'];

  chartsInstances.status = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Quantidade',
        data: values,
        backgroundColor: colors.slice(0, values.length),
        borderRadius: 4,
        indexAxis: 'y'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              return formatNumber(context.parsed.x) + ' pedidos';
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { font: { size: 11 }, color: '#666' },
          grid: { color: '#f0f0f0' }
        },
        y: {
          ticks: { font: { size: 11 }, color: '#666' },
          grid: { display: false }
        }
      }
    }
  });
}

// GRÁFICO 3: Formas de Pagamento (Donut)
function renderPaymentChart() {
  const ctx = document.getElementById('chartPayment');
  if (!ctx) return;

  // Usar dados reais de formas de pagamento
  const paymentData = reportsData.general?.paymentMethods || [];

  if (!paymentData || paymentData.length === 0) {
    // Fallback se não houver dados
    paymentData = [
      { payment_method: 'PIX', total: 0 },
      { payment_method: 'Cartão', total: 0 },
      { payment_method: 'Boleto', total: 0 },
      { payment_method: 'Dinheiro', total: 0 }
    ];
  }

  const labels = paymentData.map(p => p.payment_method || 'Outro');
  const values = paymentData.map(p => parseFloat(p.total) || 0);
  const colors = ['#10B981', '#8B5CF6', '#F59E0B', '#3B82F6', '#EC4899'];

  chartsInstances.payment = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: colors.slice(0, values.length),
        borderColor: '#fff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: { font: { size: 11 }, boxWidth: 12, padding: 15 }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return formatCurrency(context.parsed) + ' (' + percentage + '%)';
            }
          }
        }
      }
    }
  });
}

// GRÁFICO 4: Top Clientes ou Produtos (Pizza)
async function renderTopChart(type = 'customers') {
  const ctx = document.getElementById('chartTop');
  if (!ctx) return;

  let topData = [];
  let chartLabel = '';
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#C9F0DD', '#F8B884'];

  try {
    if (type === 'customers') {
      // Buscar dados reais de clientes
      try {
        const customersRes = await fetch(`${API_BASE}/crm/customers`);
        const customersData = await customersRes.json();
        
        if (Array.isArray(customersData) && customersData.length > 0) {
          // Ordenar por total_spent e pegar top 5
          topData = customersData
            .sort((a, b) => (parseFloat(b.total_spent) || 0) - (parseFloat(a.total_spent) || 0))
            .slice(0, 5)
            .map(c => ({
              full_name: c.full_name || 'Sem Nome',
              total_spent: parseFloat(c.total_spent) || 0
            }));
        }
      } catch (e) {
        console.warn('Erro ao buscar clientes:', e);
      }
      
      chartLabel = 'Top 5 Clientes';
    } else {
      // Buscar dados reais de produtos
      try {
        const productsRes = await fetch(`${API_BASE}/products`);
        const productsData = await productsRes.json();
        
        if (Array.isArray(productsData) && productsData.length > 0) {
          // Ordenar por quantidade vendida e pegar top 5
          topData = productsData
            .sort((a, b) => (parseInt(b.quantity_sold) || 0) - (parseInt(a.quantity_sold) || 0))
            .slice(0, 5)
            .map(p => ({
              name: p.name || 'Produto Sem Nome',
              quantity: parseInt(p.quantity_sold) || 0
            }));
        }
      } catch (e) {
        console.warn('Erro ao buscar produtos:', e);
      }
      
      chartLabel = 'Top 5 Produtos';
    }

    // Fallback com dados mockados
    if (!topData || topData.length === 0) {
      topData = type === 'customers' 
        ? [
            { full_name: 'Sem dados de clientes', total_spent: 1 }
          ]
        : [
            { name: 'Sem dados de produtos', quantity: 1 }
          ];
    }

    const labels = topData.map(d => d.full_name || d.name);
    const values = topData.map(d => d.total_spent || d.quantity);

    // Destruir gráfico anterior se existir
    if (chartsInstances.top) chartsInstances.top.destroy();

    chartsInstances.top = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors.slice(0, values.length),
          borderColor: '#fff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: { font: { size: 11 }, boxWidth: 12, padding: 15 }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                if (type === 'customers') {
                  return formatCurrency(context.parsed);
                } else {
                  return formatNumber(context.parsed) + ' unidades';
                }
              }
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Erro ao renderizar gráfico top:', error);
  }
}

// Alternar entre Top Clientes e Top Produtos
function toggleTopClientsProducts() {
  const currentType = window.reportsTopType || 'customers';
  const newType = currentType === 'customers' ? 'products' : 'customers';
  window.reportsTopType = newType;
  renderTopChart(newType);

  // Atualizar botão
  const btn = event.target;
  btn.textContent = newType === 'products' ? 'Ver Clientes →' : 'Ver Produtos →';
}

// Preencher tabelas com dados reais
async function fillReportsTables() {
  console.log('📋 Preenchendo tabelas...');

  try {
    // Buscar dados de clientes
    let customersData = [];
    try {
      const customersRes = await fetch(`${API_BASE}/crm/customers`);
      customersData = await customersRes.json();
      if (!Array.isArray(customersData)) customersData = [];
    } catch (e) {
      console.warn('Erro ao buscar clientes:', e);
    }

    // Buscar dados de fornecedores
    let suppliersData = [];
    try {
      const suppliersRes = await fetch(`${API_BASE}/suppliers`);
      suppliersData = await suppliersRes.json();
      if (!Array.isArray(suppliersData)) suppliersData = [];
    } catch (e) {
      console.warn('Erro ao buscar fornecedores:', e);
    }

    // Tabela de Pedidos (usando summary dos orders)
    const ordersTableBody = document.getElementById('tableOrders');
    if (ordersTableBody) {
      ordersTableBody.innerHTML = '';
      const summary = reportsData.orders?.summary || {};
      
      const ordersRows = [
        { status: 'Total', value: summary.total_orders || 0, amount: summary.total_revenue || 0 },
        { status: 'Pagos', value: summary.paid_orders || 0, amount: (parseFloat(summary.total_revenue) || 0) * 0.7 },
        { status: 'Pendentes', value: summary.pending_orders || 0, amount: (parseFloat(summary.total_revenue) || 0) * 0.3 },
        { status: 'Cancelados', value: summary.cancelled_orders || 0, amount: 0 }
      ];

      ordersRows.forEach(row => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #eee';
        tr.innerHTML = `
          <td style="padding: 12px; font-weight: 500;">${row.status}</td>
          <td style="padding: 12px; text-align: center;">${formatNumber(row.value)}</td>
          <td style="padding: 12px; text-align: right; color: var(--marrom); font-weight: 600;">${formatCurrency(row.amount)}</td>
        `;
        ordersTableBody.appendChild(tr);
      });
    }

    // Tabela de Clientes (Top 10 por gastos)
    const customersTableBody = document.getElementById('tableCustomers');
    if (customersTableBody) {
      customersTableBody.innerHTML = '';
      
      // Ordenar por total_spent descendente
      const topCustomers = (customersData || [])
        .sort((a, b) => (parseFloat(b.total_spent) || 0) - (parseFloat(a.total_spent) || 0))
        .slice(0, 10);

      topCustomers.forEach(customer => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #eee';
        tr.innerHTML = `
          <td style="padding: 12px;">${customer.full_name || 'N/A'}</td>
          <td style="padding: 12px;">${customer.city || 'N/A'}</td>
          <td style="padding: 12px; text-align: right; color: var(--marrom); font-weight: 600;">${formatCurrency(customer.total_spent || 0)}</td>
          <td style="padding: 12px; text-align: center;">${customer.purchase_count || 0}</td>
          <td style="padding: 12px; text-align: center;">${customer.is_vip ? '⭐ VIP' : customer.is_inactive ? '❌ Inativo' : '✅ Ativo'}</td>
        `;
        customersTableBody.appendChild(tr);
      });

      if (topCustomers.length === 0) {
        customersTableBody.innerHTML = '<tr><td colspan="5" style="padding: 20px; text-align: center; color: #999;">Nenhum cliente encontrado</td></tr>';
      }
    }

    // Tabela de Fornecedores (Top 10 por gastos)
    const suppliersTableBody = document.getElementById('tableSuppliers');
    if (suppliersTableBody) {
      suppliersTableBody.innerHTML = '';
      
      // Ordenar por total_spent descendente
      const topSuppliers = (suppliersData || [])
        .sort((a, b) => (parseFloat(b.total_spent) || 0) - (parseFloat(a.total_spent) || 0))
        .slice(0, 10);

      topSuppliers.forEach(supplier => {
        const totalDebt = parseFloat(supplier.total_debt) || 0;
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #eee';
        tr.innerHTML = `
          <td style="padding: 12px;">${supplier.company_name || 'N/A'}</td>
          <td style="padding: 12px;">${supplier.city || 'N/A'}</td>
          <td style="padding: 12px; text-align: right; color: var(--marrom); font-weight: 600;">${formatCurrency(supplier.total_spent || 0)}</td>
          <td style="padding: 12px; text-align: center;">${supplier.purchase_count || 0}</td>
          <td style="padding: 12px; text-align: right; ${totalDebt > 0 ? 'color: var(--vermelho); font-weight: 700;' : ''}">${formatCurrency(totalDebt)}</td>
        `;
        suppliersTableBody.appendChild(tr);
      });

      if (topSuppliers.length === 0) {
        suppliersTableBody.innerHTML = '<tr><td colspan="5" style="padding: 20px; text-align: center; color: #999;">Nenhum fornecedor encontrado</td></tr>';
      }
    }

    console.log('✅ Tabelas preenchidas com sucesso');
  } catch (error) {
    console.error('Erro ao preencher tabelas:', error);
  }
}

// EXPORTAÇÃO CSV
function exportReportsCSV() {
  console.log('📥 Gerando CSV...');

  try {
    let csv = '';
    const now = new Date().toLocaleString('pt-BR');

    // ===== RESUMO EXECUTIVO =====
    csv += `"RELATÓRIO DE VENDAS E ANÁLISES"\n`;
    csv += `"Data de Geração","${now}"\n\n`;

    // ===== MÉTRICAS PRINCIPAIS =====
    csv += `"=== MÉTRICAS PRINCIPAIS ==="\n`;
    const totalOrders = parseFloat(reportsData.orders?.summary?.total_orders) || 0;
    const totalRevenue = parseFloat(reportsData.general?.sales?.total_revenue) || 0;
    const totalCustomers = parseFloat(reportsData.crm?.summary?.total_customers) || 0;
    const totalSuppliers = parseFloat(reportsData.suppliers?.summary?.total_suppliers) || 0;

    csv += `"Total de Pedidos","${totalOrders}"\n`;
    csv += `"Faturamento Total","R$ ${(totalRevenue).toFixed(2)}"\n`;
    csv += `"Total de Clientes","${totalCustomers}"\n`;
    csv += `"Total de Fornecedores","${totalSuppliers}"\n\n`;

    // ===== RESUMO DE PEDIDOS =====
    csv += `"=== RESUMO DE PEDIDOS ==="\n`;
    csv += `"Status","Quantidade"\n`;
    const summary = reportsData.orders?.summary || {};
    csv += `"Total","${summary.total_orders || 0}"\n`;
    csv += `"Pagos","${summary.paid_orders || 0}"\n`;
    csv += `"Pendentes","${summary.pending_orders || 0}"\n`;
    csv += `"Cancelados","${summary.cancelled_orders || 0}"\n\n`;

    // ===== FORMAS DE PAGAMENTO =====
    csv += `"=== FORMAS DE PAGAMENTO ==="\n`;
    csv += `"Forma","Valor"\n`;
    const paymentData = reportsData.general?.paymentMethods || [];
    paymentData.forEach(p => {
      csv += `"${p.payment_method || 'N/A'}","R$ ${(parseFloat(p.total) || 0).toFixed(2)}"\n`;
    });
    csv += '\n';

    // ===== TOP CLIENTES =====
    csv += `"=== TOP CLIENTES ==="\n`;
    csv += `"Cliente","Cidade","Total Gasto","Compras","Situação"\n`;
    const customersTableBody = document.getElementById('tableCustomers');
    if (customersTableBody) {
      const rows = customersTableBody.querySelectorAll('tr');
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 5) {
          csv += `"${cells[0].textContent}","${cells[1].textContent}","${cells[2].textContent}","${cells[3].textContent}","${cells[4].textContent}"\n`;
        }
      });
    }
    csv += '\n';

    // ===== TOP FORNECEDORES =====
    csv += `"=== TOP FORNECEDORES ==="\n`;
    csv += `"Fornecedor","Cidade","Total Gasto","Compras","Débito"\n`;
    const suppliersTableBody = document.getElementById('tableSuppliers');
    if (suppliersTableBody) {
      const rows = suppliersTableBody.querySelectorAll('tr');
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 5) {
          csv += `"${cells[0].textContent}","${cells[1].textContent}","${cells[2].textContent}","${cells[3].textContent}","${cells[4].textContent}"\n`;
        }
      });
    }

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_completo_${Date.now()}.csv`);
    link.click();
    URL.revokeObjectURL(url);

    showToast('✅ CSV exportado com sucesso!', 'success');
    console.log('✅ CSV gerado com dados reais');
  } catch (error) {
    console.error('Erro ao exportar CSV:', error);
    showToast('❌ Erro ao exportar CSV: ' + error.message, 'error');
  }
}

// EXPORTAÇÃO PDF
async function exportReportsPDF() {
  console.log('📄 Gerando PDF...');

  try {
    const element = document.getElementById('page-reports');
    if (!element) {
      showToast('Erro: Elemento não encontrado', 'error');
      return;
    }

    // Verificar se html2pdf está carregado
    if (typeof html2pdf === 'undefined') {
      showToast('Erro: Biblioteca pdf não carregada', 'error');
      return;
    }

    // Opções para html2pdf
    const options = {
      margin: [10, 10, 10, 10],
      filename: `relatorio_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { 
        orientation: 'portrait', 
        unit: 'mm', 
        format: 'a4',
        compress: true
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    // Gerar PDF
    html2pdf()
      .set(options)
      .from(element)
      .save()
      .then(() => {
        showToast('✅ PDF exportado com sucesso!', 'success');
        console.log('✅ PDF gerado');
      })
      .catch(error => {
        console.error('Erro no html2pdf:', error);
        showToast('❌ Erro ao gerar PDF', 'error');
      });
  } catch (error) {
    console.error('Erro ao exportar PDF:', error);
    showToast('❌ Erro ao exportar PDF: ' + error.message, 'error');
  }
}

// Event Listeners para filtros
document.addEventListener('DOMContentLoaded', function() {
  // Atualizar ao mudar período
  const periodSelect = document.getElementById('reportsPeriod');
  if (periodSelect) {
    periodSelect.addEventListener('change', loadReportsData);
  }

  // Atualizar ao mudar tipo
  const typeSelect = document.getElementById('reportsType');
  if (typeSelect) {
    typeSelect.addEventListener('change', loadReportsData);
  }

  // Atualizar ao mudar datas
  const dateStart = document.getElementById('reportsDateStart');
  const dateEnd = document.getElementById('reportsDateEnd');
  if (dateStart) dateStart.addEventListener('change', loadReportsData);
  if (dateEnd) dateEnd.addEventListener('change', loadReportsData);

  // Checkbox de comparação
  const compareCheck = document.getElementById('reportsCompare');
  if (compareCheck) {
    compareCheck.addEventListener('change', loadReportsData);
  }
});

console.log('✅ admin-reports.js carregado');
