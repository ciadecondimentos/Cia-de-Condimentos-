// ==================== RELATÓRIOS & ANÁLISES ====================

let chartsInstances = {};
let reportsData = {};

// Função principal para carregar dados de relatórios
async function loadReportsData() {
  console.log('📈 Carregando dados de relatórios...');
  
  try {
    // Pegar filtros
    const dateStart = document.getElementById('reportsDateStart')?.value;
    const dateEnd = document.getElementById('reportsDateEnd')?.value;
    const period = document.getElementById('reportsPeriod')?.value || '30';
    const reportType = document.getElementById('reportsType')?.value || 'all';
    const compare = document.getElementById('reportsCompare')?.checked;

    // Construir URLs
    let promises = [];
    
    // Sempre carregar dados de pedidos
    promises.push(
      fetch(`${API_BASE}/reports/orders?period=${period}`)
        .then(r => r.json())
        .then(data => { reportsData.orders = data; })
    );

    // Sempre carregar dados de CRM
    promises.push(
      fetch(`${API_BASE}/reports/crm?period=${period}`)
        .then(r => r.json())
        .then(data => { reportsData.crm = data; })
    );

    // Sempre carregar dados de fornecedores
    promises.push(
      fetch(`${API_BASE}/reports/suppliers?period=${period}`)
        .then(r => r.json())
        .then(data => { reportsData.suppliers = data; })
    );

    await Promise.all(promises);

    // Atualizar métricas
    updateReportsMetrics();

    // Renderizar gráficos
    renderReportsCharts();

    // Preencher tabelas
    fillReportsTables();

    console.log('✅ Dados de relatórios carregados com sucesso');
  } catch (error) {
    console.error('❌ Erro ao carregar relatórios:', error);
    showToast('Erro ao carregar relatórios', 'error');
  }
}

// Atualizar cards de métricas
function updateReportsMetrics() {
  try {
    // Total de pedidos
    const totalOrders = reportsData.orders?.summary?.total_orders || 0;
    document.getElementById('rep-total-orders').textContent = formatNumber(totalOrders);
    document.getElementById('rep-orders-percent').textContent = '+15%'; // Mockado por enquanto

    // Faturamento
    const totalRevenue = reportsData.orders?.summary?.total_revenue || 0;
    document.getElementById('rep-total-revenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('rep-revenue-percent').textContent = '+22%';

    // Clientes CRM
    const totalCustomers = reportsData.crm?.summary?.total_customers || 0;
    document.getElementById('rep-total-customers').textContent = formatNumber(totalCustomers);
    document.getElementById('rep-customers-percent').textContent = '+8%';

    // Fornecedores
    const totalSuppliers = reportsData.suppliers?.summary?.total_suppliers || 0;
    document.getElementById('rep-total-suppliers').textContent = formatNumber(totalSuppliers);
    document.getElementById('rep-suppliers-percent').textContent = '-2%';
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

// GRÁFICO 1: Evolução Mensal (Colunas)
function renderEvolutionChart() {
  const ctx = document.getElementById('chartEvolution');
  if (!ctx) return;

  const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
  const data = [2200, 1500, 3200, 2800, 4100, 5500];
  const dataPrevious = [1800, 1200, 2500, 2100, 3200, 4000];

  chartsInstances.evolution = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Este Período',
          data: data,
          backgroundColor: '#4F46E5',
          borderRadius: 4,
          borderSkipped: false,
        },
        {
          label: 'Período Anterior',
          data: dataPrevious,
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
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { font: { size: 11 }, color: '#666' },
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

  const statusData = reportsData.orders?.byStatus || [
    { status: 'Pendente', count: 5 },
    { status: 'Pago', count: 12 },
    { status: 'Entregue', count: 8 },
    { status: 'Cancelado', count: 2 }
  ];

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
        backgroundColor: colors,
        borderRadius: 4,
        indexAxis: 'y'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      indexAxis: 'y',
      plugins: {
        legend: { display: false }
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

  const paymentData = reportsData.orders?.byPaymentMethod || [
    { payment_method: 'PIX', total: 8500 },
    { payment_method: 'Cartão', total: 6200 },
    { payment_method: 'Boleto', total: 3100 },
    { payment_method: 'Dinheiro', total: 1200 }
  ];

  const labels = paymentData.map(p => p.payment_method);
  const values = paymentData.map(p => p.total);
  const colors = ['#10B981', '#8B5CF6', '#F59E0B', '#3B82F6'];

  chartsInstances.payment = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
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
        }
      }
    }
  });
}

// GRÁFICO 4: Top Clientes ou Produtos (Pizza)
function renderTopChart(type = 'customers') {
  const ctx = document.getElementById('chartTop');
  if (!ctx) return;

  let topData = [];
  let chartLabel = '';
  let colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];

  if (type === 'customers') {
    topData = reportsData.crm?.topCustomers?.slice(0, 5) || [
      { full_name: 'Cliente A', total_spent: 5000 },
      { full_name: 'Cliente B', total_spent: 3500 },
      { full_name: 'Cliente C', total_spent: 2800 },
      { full_name: 'Cliente D', total_spent: 1900 },
      { full_name: 'Outros', total_spent: 1200 }
    ];
    chartLabel = 'Top Clientes';
  } else {
    topData = [
      { name: 'Produto A', quantity: 150 },
      { name: 'Produto B', quantity: 120 },
      { name: 'Produto C', quantity: 95 },
      { name: 'Produto D', quantity: 70 },
      { name: 'Outros', quantity: 50 }
    ];
    chartLabel = 'Top Produtos';
  }

  const labels = topData.map(d => d.full_name || d.name);
  const values = topData.map(d => d.total_spent || d.quantity);

  chartsInstances.top = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
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
        }
      }
    }
  });
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

// Preencher tabelas
function fillReportsTables() {
  console.log('📋 Preenchendo tabelas...');

  // Tabela de Pedidos
  const ordersTableBody = document.getElementById('tableOrders');
  if (ordersTableBody && reportsData.orders?.topCustomers) {
    ordersTableBody.innerHTML = '';
    // Aqui você pode adicionar as linhas da tabela
    ordersTableBody.innerHTML = '<tr><td colspan="6" style="padding: 20px; text-align: center; color: #666;">Dados carregados com sucesso</td></tr>';
  }

  // Tabela de Clientes
  const customersTableBody = document.getElementById('tableCustomers');
  if (customersTableBody && reportsData.crm?.topCustomers) {
    customersTableBody.innerHTML = '';
    reportsData.crm.topCustomers.slice(0, 10).forEach(customer => {
      const row = document.createElement('tr');
      row.style.borderBottom = '1px solid #eee';
      row.innerHTML = `
        <td style="padding: 12px;">${customer.full_name || 'N/A'}</td>
        <td style="padding: 12px;">${customer.city || 'N/A'}</td>
        <td style="padding: 12px; text-align: right;">${formatCurrency(customer.total_spent || 0)}</td>
        <td style="padding: 12px; text-align: center;">${customer.purchase_count || 0}</td>
        <td style="padding: 12px;">${customer.vip_customer ? '⭐ VIP' : 'Regular'}</td>
      `;
      customersTableBody.appendChild(row);
    });
  }

  // Tabela de Fornecedores
  const suppliersTableBody = document.getElementById('tableSuppliers');
  if (suppliersTableBody && reportsData.suppliers?.topSuppliers) {
    suppliersTableBody.innerHTML = '';
    reportsData.suppliers.topSuppliers.slice(0, 10).forEach(supplier => {
      const row = document.createElement('tr');
      row.style.borderBottom = '1px solid #eee';
      row.innerHTML = `
        <td style="padding: 12px;">${supplier.company_name || 'N/A'}</td>
        <td style="padding: 12px;">${supplier.city || 'N/A'}</td>
        <td style="padding: 12px; text-align: right;">${formatCurrency(supplier.total_spent || 0)}</td>
        <td style="padding: 12px; text-align: center;">${supplier.purchase_count || 0}</td>
        <td style="padding: 12px; text-align: right; color: var(--vermelho); font-weight: 700;">${formatCurrency(supplier.total_debt || 0)}</td>
      `;
      suppliersTableBody.appendChild(row);
    });
  }

  console.log('✅ Tabelas preenchidas');
}

// EXPORTAÇÃO CSV
function exportReportsCSV() {
  console.log('📥 Gerando CSV...');

  try {
    let csv = '';
    const now = new Date().toLocaleString('pt-BR');

    // Cabeçalho
    csv += `RELATÓRIO DE PEDIDOS, DATA GERAÇÃO: ${now}\n`;
    csv += `ID,Data,Cliente,Status,Valor,Forma Pagamento\n`;
    
    // Dados (mockado - em produção viria do reportsData)
    csv += '1,2026-06-01,Cliente A,Pago,R$ 1.500,PIX\n';
    csv += '2,2026-06-02,Cliente B,Entregue,R$ 2.300,Cartão\n';
    csv += '\n\nRELATÓRIO DE CLIENTES (CRM),\n';
    csv += `Cliente,Cidade,Total Gasto,Compras,Situação\n`;
    
    // Dados de clientes
    if (reportsData.crm?.topCustomers) {
      reportsData.crm.topCustomers.forEach(c => {
        csv += `${c.full_name},${c.city || 'N/A'},${c.total_spent || 0},${c.purchase_count || 0},${c.vip_customer ? 'VIP' : 'Regular'}\n`;
      });
    }

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_${Date.now()}.csv`);
    link.click();

    showToast('CSV exportado com sucesso!', 'success');
    console.log('✅ CSV gerado');
  } catch (error) {
    console.error('Erro ao exportar CSV:', error);
    showToast('Erro ao exportar CSV', 'error');
  }
}

// EXPORTAÇÃO PDF
async function exportReportsPDF() {
  console.log('📄 Gerando PDF...');

  try {
    const element = document.getElementById('page-reports');
    const now = new Date().toLocaleString('pt-BR');

    // Opções para html2pdf
    const options = {
      margin: 10,
      filename: `relatorio_${Date.now()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };

    // Gerar PDF (html2pdf está no CDN)
    if (typeof html2pdf !== 'undefined') {
      html2pdf().set(options).from(element).save();
      showToast('PDF exportado com sucesso!', 'success');
      console.log('✅ PDF gerado');
    } else {
      throw new Error('html2pdf não carregado');
    }
  } catch (error) {
    console.error('Erro ao exportar PDF:', error);
    showToast('Erro ao exportar PDF. Tente novamente.', 'error');
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
