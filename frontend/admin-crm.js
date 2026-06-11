// ==================== CRM CLIENTS MANAGEMENT ====================

// Helper: Converter valor para número seguramente
function safeNumber(value) {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

// Helper: Formatar valor monetário seguramente
function formatMoney(value) {
  return `R$ ${safeNumber(value).toFixed(2)}`;
}

// Estado global do CRM
const crmState = {
  currentCustomerId: null,
  customers: [],
  currentPurchases: [],
  filters: 'all',
  activePix: null,  // ✅ NOVO: Rastrear PIX ativo
  dateStart: null,  // ✅ Data início do filtro
  dateEnd: null     // ✅ Data fim do filtro
};

// GET: Listar clientes
async function loadCrmCustomers(filter = 'all') {
  try {
    const url = filter === 'all' 
      ? `${API_BASE}/crm/customers`
      : `${API_BASE}/crm/customers?filter=${filter}`;
    
    console.log('📥 Carregando clientes de:', url);
    const response = await fetch(url);
    const customers = await response.json();
    
    console.log('✅ Clientes recebidos:', customers.length);
    if (customers.length > 0) {
      console.log('   Exemplo:', customers[0]);
    }
    
    crmState.customers = customers;
    crmState.filters = filter;
    renderCrmCustomersTable();
    updateCrmDashboard(); // Atualizar métricas do dashboard
  } catch (error) {
    console.error('❌ Erro ao carregar clientes:', error);
    showToast('Erro ao carregar clientes', 'error');
  }
}

// Atualizar dashboard com métricas globais do CRM
function updateCrmDashboard() {
  const customers = crmState.customers;
  console.log('🔄 updateCrmDashboard() chamada');
  console.log('   Clientes na memória:', customers.length);
  
  // Calcular métricas
  let totalCustomers = customers.length;
  let vipCustomers = customers.filter(c => c.is_vip).length;
  let totalPaid = 0;
  let totalPending = 0;
  
  customers.forEach(c => {
    const stats = c.stats || {};
    const paid = safeNumber(stats.paid || 0);
    const pending = safeNumber(stats.pending || 0);
    totalPaid += paid;
    totalPending += pending;
  });
  
  console.log('📊 Métricas calculadas:');
  console.log('   Total clientes:', totalCustomers);
  console.log('   VIP:', vipCustomers);
  console.log('   Total pago:', totalPaid);
  console.log('   Total pendente:', totalPending);
  
  // Atualizar TODOS os elementos com essas classes (pode haver múltiplos)
  const totalCustomersEls = document.querySelectorAll('.crm-stat-total-customers');
  const vipCustomersEls = document.querySelectorAll('.crm-stat-vip-customers');
  const totalSpentEls = document.querySelectorAll('.crm-stat-total-spent');
  const totalPendingEls = document.querySelectorAll('.crm-stat-total-pending');
  
  console.log('🎯 Elementos encontrados:');
  console.log('   Total de clientes (instâncias):', totalCustomersEls.length);
  console.log('   VIP (instâncias):', vipCustomersEls.length);
  console.log('   Total gasto (instâncias):', totalSpentEls.length);
  console.log('   Total pendente (instâncias):', totalPendingEls.length);
  
  // Atualizar total de clientes
  totalCustomersEls.forEach(el => {
    el.textContent = totalCustomers;
  });
  if (totalCustomersEls.length > 0) console.log('✅ Atualizado: total-customers =', totalCustomers);
  
  // Atualizar clientes VIP
  vipCustomersEls.forEach(el => {
    el.textContent = vipCustomers;
  });
  if (vipCustomersEls.length > 0) console.log('✅ Atualizado: vip-customers =', vipCustomers);
  
  // Atualizar total gasto
  const spentFormatted = formatMoney(totalPaid);
  totalSpentEls.forEach(el => {
    el.textContent = spentFormatted;
  });
  if (totalSpentEls.length > 0) console.log('✅ Atualizado: total-spent =', spentFormatted);
  
  // Atualizar total pendente
  const pendingFormatted = formatMoney(totalPending);
  totalPendingEls.forEach(el => {
    el.textContent = pendingFormatted;
  });
  if (totalPendingEls.length > 0) console.log('✅ Atualizado: total-pending =', pendingFormatted);
}

// Renderizar tabela de clientes
function renderCrmCustomersTable() {
  const tbody = document.getElementById('crmCustomersTableBody');
  const filterValue = document.getElementById('crmFilterSelect')?.value || 'all';
  
  let html = '';

  if (crmState.customers.length === 0) {
    html = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: #aaa;">Nenhum cliente cadastrado</td></tr>`;
  } else {
    html = crmState.customers.map(customer => {
      const debtAmount = customer.stats?.pending || 0;
      const totalSpent = customer.stats?.total_spent || 0;
      const isDebtor = debtAmount > 0;
      
      return `
        <tr>
          <td data-label="Cliente">
            <div class="prod-cell">
              <div style="font-weight: 700; color: ${customer.is_vip ? 'var(--vermelho)' : 'var(--marrom)'};">
                ${customer.full_name}
                ${customer.is_vip ? ' ⭐' : ''}
              </div>
              <div style="font-size: 11px; color: #aaa;">${customer.city || 'N/A'}</div>
            </div>
          </td>
          <td data-label="Contato">${customer.phone || customer.whatsapp || 'N/A'}</td>
          <td data-label="Situação" style="color: ${isDebtor ? '#e74c3c' : '#27ae60'}; font-weight: 700;">
            ${isDebtor ? '💔 Devedor' : '✓ Adimplente'}
          </td>
          <td data-label="Total Gasto" style="text-align: right;">${formatMoney(totalSpent)}</td>
          <td data-label="Em Aberto" style="text-align: right; color: #e74c3c; font-weight: 700;">${formatMoney(debtAmount)}</td>
          <td data-label="Compras">${customer.stats?.total_purchases || 0} compras</td>
          <td data-label="Ações">
            <button class="btn btn-sm btn-ghost" onclick="openCrmCustomerDetail(${customer.id})" title="Ver detalhes">👁️</button>
            <button class="btn btn-sm btn-ghost" onclick="openEditCrmCustomer(${customer.id})" title="Editar">✏️</button>
            <button class="btn btn-sm btn-danger" onclick="deleteCrmCustomer(${customer.id})" title="Deletar" style="padding: 6px 10px;">🗑️</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  tbody.innerHTML = html;
}

// Abrir modal de novo cliente
function openAddCrmCustomer() {
  const modal = document.getElementById('crmCustomerModal');
  const title = document.getElementById('crmCustomerModalTitle');
  const body = document.getElementById('crmCustomerModalBody');

  title.textContent = '➕ Novo Cliente';

  body.innerHTML = `
    <div class="fg">
      <label>Nome Completo *</label>
      <input type="text" id="crmFullName" placeholder="João Silva Santos">
    </div>
    <div class="form-row-2">
      <div class="fg">
        <label>Telefone</label>
        <input type="text" id="crmPhone" placeholder="(11) 98765-4321">
      </div>
      <div class="fg">
        <label>WhatsApp</label>
        <input type="text" id="crmWhatsapp" placeholder="(11) 98765-4321">
      </div>
    </div>
    <div class="fg">
      <label>Endereço Completo</label>
      <input type="text" id="crmAddress" placeholder="Rua das Flores, 123">
    </div>
    <div class="form-row-2">
      <div class="fg">
        <label>Bairro</label>
        <input type="text" id="crmNeighborhood" placeholder="Vila Mariana">
      </div>
      <div class="fg">
        <label>Cidade</label>
        <input type="text" id="crmCity" placeholder="São Paulo">
      </div>
    </div>
    <div class="form-row-2">
      <div class="fg">
        <label>Aniversário</label>
        <input type="date" id="crmBirthday">
      </div>
      <div class="fg">
        <label>Limite de Crédito (R$)</label>
        <input type="number" id="crmCreditLimit" placeholder="0" step="0.01">
      </div>
    </div>
    <div class="fg">
      <label>Observações</label>
      <textarea id="crmObservations" placeholder="Anotações sobre o cliente..."></textarea>
    </div>
    <div class="control-group">
      <label style="margin: 0;">
        <input type="checkbox" id="crmIsVip" style="width: auto; margin-right: 8px;">
        <span>Cliente VIP</span>
      </label>
    </div>
  `;

  modal.classList.add('open');
}

// Abrir modal de editar cliente
async function openEditCrmCustomer(customerId) {
  try {
    const response = await fetch(`${API_BASE}/crm/customers/${customerId}`);
    const data = await response.json();
    const customer = data.customer;

    const modal = document.getElementById('crmCustomerModal');
    const title = document.getElementById('crmCustomerModalTitle');
    const body = document.getElementById('crmCustomerModalBody');

    title.textContent = '✏️ Editar Cliente';

    body.innerHTML = `
      <div class="fg">
        <label>Nome Completo *</label>
        <input type="text" id="crmFullName" placeholder="João Silva Santos" value="${customer.full_name}">
      </div>
      <div class="form-row-2">
        <div class="fg">
          <label>Telefone</label>
          <input type="text" id="crmPhone" placeholder="(11) 98765-4321" value="${customer.phone || ''}">
        </div>
        <div class="fg">
          <label>WhatsApp</label>
          <input type="text" id="crmWhatsapp" placeholder="(11) 98765-4321" value="${customer.whatsapp || ''}">
        </div>
      </div>
      <div class="fg">
        <label>Endereço Completo</label>
        <input type="text" id="crmAddress" placeholder="Rua das Flores, 123" value="${customer.address || ''}">
      </div>
      <div class="form-row-2">
        <div class="fg">
          <label>Bairro</label>
          <input type="text" id="crmNeighborhood" placeholder="Vila Mariana" value="${customer.neighborhood || ''}">
        </div>
        <div class="fg">
          <label>Cidade</label>
          <input type="text" id="crmCity" placeholder="São Paulo" value="${customer.city || ''}">
        </div>
      </div>
      <div class="form-row-2">
        <div class="fg">
          <label>Aniversário</label>
          <input type="date" id="crmBirthday" value="${customer.birthday ? (typeof customer.birthday === 'string' ? customer.birthday : customer.birthday).split('T')[0] : ''}">
        </div>
        <div class="fg">
          <label>Limite de Crédito (R$)</label>
          <input type="number" id="crmCreditLimit" placeholder="0" step="0.01" value="${customer.credit_limit || 0}">
        </div>
      </div>
      <div class="fg">
        <label>Observações</label>
        <textarea id="crmObservations" placeholder="Anotações sobre o cliente...">${customer.observations || ''}</textarea>
      </div>
      <div class="control-group">
        <label style="margin: 0;">
          <input type="checkbox" id="crmIsVip" style="width: auto; margin-right: 8px;" ${customer.is_vip ? 'checked' : ''}>
          <span>Cliente VIP</span>
        </label>
      </div>
      <div class="control-group" style="margin-top: 12px;">
        <label style="margin: 0;">
          <input type="checkbox" id="crmIsInactive" style="width: auto; margin-right: 8px;" ${customer.is_inactive ? 'checked' : ''}>
          <span>Cliente Inativo</span>
        </label>
      </div>
    `;

    // Armazenar ID para salvar depois
    document.getElementById('crmCustomerModal').dataset.customerId = customerId;
    modal.classList.add('open');
  } catch (error) {
    console.error('Erro ao carregar cliente:', error);
    showToast('Erro ao carregar cliente', 'error');
  }
}

// Fechar modal de cliente
function closeCrmCustomerModal() {
  document.getElementById('crmCustomerModal').classList.remove('open');
  delete document.getElementById('crmCustomerModal').dataset.customerId;
}

// Salvar cliente (novo ou editar)
async function saveCrmCustomer() {
  const fullName = document.getElementById('crmFullName').value.trim();
  
  if (!fullName) {
    showToast('Nome completo é obrigatório', 'warning');
    return;
  }

  const payload = {
    full_name: fullName,
    phone: document.getElementById('crmPhone').value || null,
    whatsapp: document.getElementById('crmWhatsapp').value || null,
    address: document.getElementById('crmAddress').value || null,
    neighborhood: document.getElementById('crmNeighborhood').value || null,
    city: document.getElementById('crmCity').value || null,
    birthday: document.getElementById('crmBirthday').value || null,
    credit_limit: parseFloat(document.getElementById('crmCreditLimit').value) || 0,
    observations: document.getElementById('crmObservations').value || null,
    is_vip: document.getElementById('crmIsVip').checked,
    is_inactive: document.getElementById('crmIsInactive')?.checked || false
  };

  const customerId = document.getElementById('crmCustomerModal').dataset.customerId;
  const method = customerId ? 'PUT' : 'POST';
  const url = customerId 
    ? `${API_BASE}/crm/customers/${customerId}`
    : `${API_BASE}/crm/customers`;

  console.log('Salvando cliente:', { method, url, payload, customerId });

  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Erro do servidor:', errorData);
      throw new Error(errorData.detail || errorData.error || 'Erro ao salvar');
    }

    showToast(customerId ? 'Cliente atualizado!' : 'Cliente criado!', 'success');
    closeCrmCustomerModal();
    loadCrmCustomers(crmState.filters);
  } catch (error) {
    console.error('Erro ao salvar cliente:', error);
    showToast(`Erro ao salvar cliente: ${error.message}`, 'error');
  }
}

// Deletar cliente
async function deleteCrmCustomer(customerId) {
  if (!confirm('Tem certeza que deseja deletar este cliente? Isso também deletará todo o histórico de compras.')) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/crm/customers/${customerId}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('Erro ao deletar');

    showToast('Cliente deletado com sucesso', 'success');
    loadCrmCustomers(crmState.filters);
  } catch (error) {
    console.error('Erro ao deletar cliente:', error);
    showToast('Erro ao deletar cliente', 'error');
  }
}

// ==================== CUSTOMER DETAIL ====================

// Abrir detalhes do cliente
async function openCrmCustomerDetail(customerId) {
  try {
    // ✅ Armazenar customer ID atual para polling usar depois
    crmState.currentCustomerId = customerId;
    
    const response = await fetch(`${API_BASE}/crm/customers/${customerId}`);
    const data = await response.json();
    const customer = data.customer;
    const purchases = data.purchases;
    const stats = data.stats;
    const periodStats = data.periodStats;

    const modal = document.getElementById('crmDetailModal');
    const title = document.getElementById('crmDetailModalTitle');
    const body = document.getElementById('crmDetailModalBody');

    title.textContent = `📊 ${customer.full_name}`;

    // Dashboard do cliente
    const monthRevenue = safeNumber(periodStats?.this_month || 0);
    const yearRevenue = safeNumber(periodStats?.this_year || 0);
    const avgTicket = safeNumber(stats?.average_ticket || 0);
    const pendingAmount = safeNumber(stats?.pending || 0);
    const paidAmount = safeNumber(stats?.paid || 0);
    
    let html = `
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px;">
        <div style="background: #f0e8d0; padding: 16px; border-radius: 8px; border-left: 4px solid var(--vermelho);">
          <div style="font-size: 11px; color: #999; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Total Comprado</div>
          <div style="font-size: 24px; font-weight: 900; color: var(--marrom); margin-top: 8px;">${formatMoney(stats?.total_spent || 0)}</div>
        </div>
        <div style="background: #f0e8d0; padding: 16px; border-radius: 8px; border-left: 4px solid var(--amarelo);">
          <div style="font-size: 11px; color: #999; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Número de Compras</div>
          <div style="font-size: 24px; font-weight: 900; color: var(--marrom); margin-top: 8px;">${stats?.total_purchases || 0}</div>
        </div>
        <div style="background: #d4edda; padding: 16px; border-radius: 8px; border-left: 4px solid #27ae60;">
          <div style="font-size: 11px; color: #999; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Pago</div>
          <div style="font-size: 24px; font-weight: 900; color: #27ae60; margin-top: 8px;">${formatMoney(paidAmount)}</div>
        </div>
        <div style="background: #fff3cd; padding: 16px; border-radius: 8px; border-left: 4px solid #f39c12;">
          <div style="font-size: 11px; color: #999; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Em Aberto</div>
          <div style="font-size: 24px; font-weight: 900; color: #f39c12; margin-top: 8px;">${formatMoney(pendingAmount)}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px;">
        <div style="background: #f4f0ea; padding: 12px; border-radius: 6px; text-align: center;">
          <div style="font-size: 24px; font-weight: 900; color: var(--marrom);">${formatMoney(avgTicket)}</div>
          <div style="font-size: 10px; color: #999; text-transform: uppercase; font-weight: 700; margin-top: 4px;">Ticket Médio</div>
        </div>
        <div style="background: #f4f0ea; padding: 12px; border-radius: 6px; text-align: center;">
          <div style="font-size: 24px; font-weight: 900; color: var(--marrom);">${formatMoney(monthRevenue)}</div>
          <div style="font-size: 10px; color: #999; text-transform: uppercase; font-weight: 700; margin-top: 4px;">Este Mês</div>
        </div>
        <div style="background: #f4f0ea; padding: 12px; border-radius: 6px; text-align: center;">
          <div style="font-size: 24px; font-weight: 900; color: var(--marrom);">${formatMoney(yearRevenue)}</div>
          <div style="font-size: 10px; color: #999; text-transform: uppercase; font-weight: 700; margin-top: 4px;">Este Ano</div>
        </div>
      </div>

      <div style="background: #f0e8d0; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
        <div style="font-weight: 700; color: var(--marrom); margin-bottom: 12px;">📋 Informações do Cliente</div>
        <div style="font-size: 13px; color: #666;">
          ${customer.address ? `<div style="margin-bottom: 8px;"><strong>Endereço:</strong> ${customer.address}, ${customer.neighborhood} - ${customer.city}</div>` : ''}
          ${customer.whatsapp ? `<div style="margin-bottom: 8px;"><strong>WhatsApp:</strong> <button class="btn btn-sm btn-secondary" onclick="window.open('https://wa.me/55${customer.whatsapp.replace(/\\D/g, '')}', '_blank')" style="margin-left: 8px;">💬 Conversar</button></div>` : ''}
          ${customer.phone ? `<div style="margin-bottom: 8px;"><strong>Telefone:</strong> ${customer.phone}</div>` : ''}
          ${customer.birthday ? `<div style="margin-bottom: 8px;"><strong>Aniversário:</strong> ${formatDateString(customer.birthday)}</div>` : ''}
          ${customer.is_vip ? `<div style="margin-bottom: 8px;"><strong>Status:</strong> ⭐ Cliente VIP</div>` : ''}
          ${customer.credit_limit > 0 ? `<div style="margin-bottom: 8px;"><strong>Limite de Crédito:</strong> ${formatMoney(customer.credit_limit)}</div>` : ''}
          ${customer.observations ? `<div style="margin-bottom: 8px;"><strong>Observações:</strong> ${customer.observations}</div>` : ''}
        </div>
      </div>

      <div style="border-bottom: 2px solid #e8e0d4; margin-bottom: 16px; padding-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
        <h4 style="font-family: 'Playfair Display', serif; font-size: 15px; font-weight: 700; color: var(--marrom);">📦 Histórico de Compras</h4>
        <button class="btn btn-sm btn-primary" onclick="openAddCrmPurchase(${customerId})">+ Registrar Compra</button>
      </div>
    `;

    if (purchases.length === 0) {
      html += '<div style="text-align: center; padding: 20px; color: #aaa;">Nenhuma compra registrada</div>';
    } else {
      // Agrupar compras por data
      const purchasesByDate = {};
      purchases.forEach(p => {
        const dateKey = p.purchase_date;
        if (!purchasesByDate[dateKey]) {
          purchasesByDate[dateKey] = [];
        }
        purchasesByDate[dateKey].push(p);
      });

      // Renderizar cards agrupados por data (em ordem decrescente)
      const sortedDates = Object.keys(purchasesByDate).sort().reverse();
      let cardIndex = 0;
      
      sortedDates.forEach(dateKey => {
        const dateItems = purchasesByDate[dateKey];
        const dateFormatted = formatDateString(dateKey);
        const orderId = `order_${customerId}_${cardIndex}`;
        cardIndex++;
        
        // Calcular totais deste dia
        let dayTotal = 0;
        let dayQty = 0;
        dateItems.forEach(item => {
          dayTotal += parseFloat(item.total_price);
          dayQty += item.quantity;
        });

        // Status mais crítico do dia (pendente > parcial > pago)
        let dayStatus = 'pago';
        if (dateItems.some(p => p.payment_status === 'pendente')) {
          dayStatus = 'pendente';
        } else if (dateItems.some(p => p.payment_status === 'parcial')) {
          dayStatus = 'parcial';
        }

        // Verificar se há PIX pendente neste dia
        const hasPixPending = dateItems.some(p => p.payment_method === 'pix' && p.payment_status === 'pendente');

        // Armazenar dados do pedido globalmente
        // Extrair IDs das compras para relacionar com PIX
        const purchaseIds = dateItems.map(p => p.id);
        
        crmOrdersData[orderId] = {
          customerName: customer.full_name,
          customerWhatsApp: customer.whatsapp,
          purchaseDate: dateFormatted,
          products: dateItems,
          dayTotal: dayTotal,
          dayStatus: dayStatus,
          purchaseIds: purchaseIds  // Array de IDs das compras do CRM
        };

        html += `
          <div style="background: #ffffff; border: 1px solid #e8e0d4; border-radius: 8px; padding: 16px; margin-bottom: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <!-- Cabeçalho do Card - Responsivo -->
            <div class="crm-purchase-header">
              <div style="flex: 1;">
                <div style="font-size: 13px; font-weight: 700; color: var(--marrom);">📅 ${dateFormatted}</div>
                <div style="font-size: 11px; color: #999; margin-top: 4px;">
                  ${dateItems.length} produto${dateItems.length !== 1 ? 's' : ''} • ${dayQty} unidade${dayQty !== 1 ? 's' : ''}
                </div>
              </div>
              <div style="text-align: right; margin-right: 16px;">
                <div style="font-size: 16px; font-weight: 900; color: var(--vermelho);">${formatMoney(dayTotal)}</div>
                <span class="status-pill s-${dayStatus}" style="font-size: 10px; margin-top: 4px; display: inline-block;">
                  ${dayStatus === 'pago' ? '✓ PAGO' : dayStatus === 'parcial' ? '◐ PARCIAL' : '○ PENDENTE'}
                </span>
              </div>
            </div>

            <!-- Botões - Responsivos -->
            <div class="crm-purchase-buttons">
              <button class="btn btn-sm btn-secondary" onclick="openEditCrmPurchaseBulk(${customerId}, '${dateKey}')" 
                      title="Editar compra completa" 
                      style="flex: 1; margin-right: 8px;">
                ✏️ EDITAR
              </button>
              <button class="btn btn-sm btn-success" onclick="sendOrderViaWhatsApp('${orderId}')" 
                      title="Enviar pedido via WhatsApp" 
                      style="flex: 1; margin-right: 8px;">
                📱 WHATSAPP
              </button>
              ${hasPixPending ? 
                `<button class="btn btn-sm btn-primary" onclick="generateCrmPixQrCode('${orderId}')" 
                        title="Gerar Código PIX" 
                        style="flex: 1; margin-right: 8px;">
                  💳 PIX
                </button>` 
                : ''}
            </div>

            <!-- Produtos do dia -->
            <div style="margin-top: 16px;">
              ${dateItems.map((p, idx) => `
                <div class="crm-purchase-item" style="${idx < dateItems.length - 1 ? 'border-bottom: 1px solid #f4f0ea;' : ''}">
                  <div class="crm-product-info">
                    <div style="font-weight: 600; color: var(--marrom);">
                      ${p.product_name}
                      <span style="font-weight: 400; color: #999;"> (${p.quantity}x)</span>
                    </div>
                    <div style="font-size: 11px; color: #999; margin-top: 4px;">
                      ${p.payment_method ? `${p.payment_method}` : 'Não especificado'}
                      ${p.payment_status && p.payment_status !== dayStatus ? ` • ${p.payment_status}` : ''}
                    </div>
                  </div>
                  <div class="crm-product-price">
                    <div style="font-size: 12px; color: #666;">
                      ${formatMoney(p.unit_price)} × ${p.quantity}
                    </div>
                    <div style="font-weight: 700; color: var(--vermelho); margin-top: 2px;">
                      ${formatMoney(p.total_price)}
                    </div>
                  </div>
                  <div class="crm-product-actions">
                    <button class="btn btn-sm btn-ghost" onclick="openEditCrmPurchase(${customerId}, ${p.id})" title="Editar" style="padding: 4px 8px; font-size: 12px;">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCrmPurchase(${customerId}, ${p.id})" title="Deletar" style="padding: 4px 8px; font-size: 12px;">🗑️</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      });
    }

    body.innerHTML = html;
    modal.classList.add('open');
  } catch (error) {
    console.error('Erro ao abrir detalhes do cliente:', error);
    showToast('Erro ao carregar detalhes', 'error');
  }
}

// Fechar modal de detalhes
function closeCrmDetailModal() {
  document.getElementById('crmDetailModal').classList.remove('open');
}

// ==================== PIX QR CODE GENERATION ====================

// Variável para armazenar dados do PIX gerado
let crmCurrentPixData = null;
let crmCurrentOrderId = null;
let crmPixPollingInterval = null;
let crmPixTimeoutHandle = null;
let crmPixFabCounterInterval = null;

// Gerar QR code PIX para pedido do CRM
async function generateCrmPixQrCode(orderId) {
  if (!orderId || !crmOrdersData[orderId]) {
    showToast('Erro: Pedido não encontrado', 'error');
    return;
  }

  const orderData = crmOrdersData[orderId];
  
  // Abrir modal de carregamento
  const modal = document.getElementById('crmPixQrModal');
  if (modal) modal.classList.add('open');
  
  // Atualizar informações do cliente e valor
  document.getElementById('crmPixClientName').textContent = orderData.customerName;
  document.getElementById('crmPixAmount').textContent = formatMoney(orderData.dayTotal);
  document.getElementById('crmPixQrCode').innerHTML = '⏳ Gerando QR Code...';
  document.getElementById('crmPixCode').value = '';
  
  crmCurrentOrderId = orderId;
  
  try {
    console.log('📝 Gerando PIX para CRM...', { amount: orderData.dayTotal, purchaseIds: orderData.purchaseIds });
    
    // Usar o primeiro purchase_id como crm_purchase_id (ou poderia agrupar todos em uma compra agregada)
    const crm_purchase_id = orderData.purchaseIds && orderData.purchaseIds.length > 0 ? orderData.purchaseIds[0] : null;
    
    // Chamar API de pagamento PIX (mesma do site)
    const response = await fetch(API_BASE + '/payments/pix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: null,
        amount: orderData.dayTotal,
        description: 'Pagamento - Cia de Condimentos (Pedido Admin)',
        payerEmail: 'admin@condimentos.com',
        payerPhone: orderData.customerWhatsApp || '',
        crm_purchase_id: crm_purchase_id,  // ✅ ID da compra CRM
        customer_name: orderData.customerName  // ✅ NOVO: Nome do cliente
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao gerar PIX');
    }

    const pixData = await response.json();
    console.log('✅ PIX gerado com sucesso:', pixData);
    
    // Armazenar dados do PIX
    crmCurrentPixData = {
      mp_payment_id: pixData.mp_payment_id,
      qr_code: pixData.qr_code,
      qr_code_base64: pixData.qr_code_base64,
      status: pixData.status,
      amount: pixData.amount,
      expires_at: pixData.expires_at,
      expires_in_seconds: pixData.expires_in_seconds,
      // ✅ NOVO: Salvar também dados do cliente para restauração
      customerName: orderData.customerName,
      customerWhatsApp: orderData.customerWhatsApp
    };

    // Exibir QR code
    const qrCodeDiv = document.getElementById('crmPixQrCode');
    if (pixData.qr_code_base64) {
      qrCodeDiv.innerHTML = `<img src="data:image/png;base64,${pixData.qr_code_base64}" style="width: 100%; height: auto; border-radius: 8px;">`;
    } else {
      qrCodeDiv.innerHTML = '❌ Erro ao carregar QR Code';
    }

    // Exibir código PIX
    const pixCodeInput = document.getElementById('crmPixCode');
    if (pixData.qr_code) {
      pixCodeInput.value = pixData.qr_code;
    }

    showToast('✅ Código PIX gerado com sucesso!', 'success');

    // ✅ NOVO: Salvar PIX em localStorage
    saveCrmPixToStorage();

    // ✅ NOVO: Iniciar polling automático para verificar se o PIX foi pago
    startCrmPixPolling(pixData.mp_payment_id, orderData);
    
  } catch (error) {
    console.error('❌ Erro ao gerar PIX:', error);
    showToast(`Erro ao gerar PIX: ${error.message}`, 'error');
    document.getElementById('crmPixQrCode').innerHTML = `❌ ${error.message}`;
  }
}

// ✅ NOVO: Função para fazer polling do status do PIX
async function startCrmPixPolling(pixPaymentId, orderData) {
  // Limpar polling anterior se existir
  if (crmPixPollingInterval) {
    clearInterval(crmPixPollingInterval);
  }
  if (crmPixTimeoutHandle) {
    clearTimeout(crmPixTimeoutHandle);
  }

  // ✅ Mostrar FAB PIX
  showCrmPixFab();

  console.log('🔄 Iniciando polling do PIX por 1 hora:', pixPaymentId);
  console.log('💰 Dados do pedido:', orderData);
  let pollCount = 0;
  const maxPolls = 720; // 1 hora (720 × 5 segundos)

  crmPixPollingInterval = setInterval(async () => {
    pollCount++;
    
    try {
      const statusResponse = await fetch(`${API_BASE}/payments/status/${pixPaymentId}`);
      const statusData = await statusResponse.json();
      
      console.log(`⏱️  [Poll ${pollCount}/720] Status PIX: ${statusData.status} | Response:`, statusData);

      if (statusData.status === 'approved') {
        console.log('✅✅✅ PIX CONFIRMADO! Processando confirmação...');
        console.log('📊 Dados da confirmação:', statusData);
        
        // Parar polling
        clearInterval(crmPixPollingInterval);
        crmPixPollingInterval = null;
        if (crmPixTimeoutHandle) clearTimeout(crmPixTimeoutHandle);

        // ✅ Parar sincronização com backend
        stopCrmPixBackendSync();
        
        // ✅ Esconder FAB PIX
        hideCrmPixFab();
        
        // ✅ Limpar PIX do localStorage
        clearCrmPixFromStorage();
        
        // Mostrar mensagem de sucesso
        showToast('✅ Pagamento confirmado! Atualizando histórico...', 'success');

        // Fechar modal após 2 segundos
        setTimeout(() => {
          closeCrmPixQrModal();
          
          // Recarregar histórico do cliente para atualizar status
          const customerId = crmState.currentCustomerId;
          if (customerId) {
            console.log('🔄 Recarregando detalhes do cliente...');
            openCrmCustomerDetail(customerId);
          }
        }, 2000);
      } else if (statusData.status === 'pending') {
        console.log(`⏳ Status ainda pendente (Poll ${pollCount}/720)`);
      } else if (statusData.status === 'processing') {
        console.log(`⚙️  Status processando (Poll ${pollCount}/720)`);
      } else {
        console.log(`⚠️  Status inesperado: ${statusData.status} (Poll ${pollCount}/720)`);
      }

      // Log de debug: mostrar progresso a cada 50 polls
      if (pollCount % 50 === 0) {
        console.log(`📈 Progresso do polling: ${pollCount}/720 (${(pollCount/720*100).toFixed(1)}%) - Status: ${statusData.status}`);
      }

      if (pollCount >= maxPolls) {
        console.log('⏰ Expiração: PIX expirou após 1 hora (720 polls × 5s)');
        clearInterval(crmPixPollingInterval);
        crmPixPollingInterval = null;
        
        // ✅ Parar sincronização com backend
        stopCrmPixBackendSync();
        
        // ✅ Esconder FAB PIX
        hideCrmPixFab();
        
        // ✅ Limpar PIX do localStorage
        clearCrmPixFromStorage();
        
        showToast('⏰ Código PIX expirou. Gere um novo se necessário.', 'warning');
      }
    } catch (error) {
      console.warn(`⚠️  Erro ao verificar status (Poll ${pollCount}):`, error.message);
      console.warn('🔍 Stack:', error.stack);
    }
  }, 5000); // Verificar a cada 5 segundos

  // ✅ Iniciar contador de expiração
  startCrmPixExpirationCounter(crmCurrentPixData.expires_at);
}

// ✅ Função para atualizar contador de tempo até expiração
function startCrmPixExpirationCounter(expiresAt) {
  let expirationInterval;
  
  // ✅ Também atualizar FAB counter
  updateCrmPixFabCounter(expiresAt);
  
  const updateCounter = () => {
    const now = new Date();
    const expireDate = new Date(expiresAt);
    const secondsLeft = Math.floor((expireDate - now) / 1000);
    
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    
    const counterEl = document.getElementById('crmPixExpireCounter');
    if (counterEl) {
      if (secondsLeft > 0) {
        counterEl.textContent = `${minutes}m ${seconds}s`;
        counterEl.style.background = secondsLeft > 300 ? '#fff3cd' : '#ffe6e6';
        counterEl.style.color = secondsLeft > 300 ? '#000' : '#d32f2f';
      } else {
        counterEl.textContent = 'EXPIRADO';
        counterEl.style.background = '#ffcdd2';
        counterEl.style.color = '#d32f2f';
        clearInterval(expirationInterval);
      }
    }
  };
  
  // Atualizar imediatamente
  updateCounter();
  
  // Atualizar a cada segundo
  expirationInterval = setInterval(updateCounter, 1000);
}

// Fechar modal de PIX QR code (apenas minimiza, não cancela o PIX)
function closeCrmPixQrModal() {
  const modal = document.getElementById('crmPixQrModal');
  if (modal) modal.classList.remove('open');
  
  // ⚠️ NÃO pausar polling! O PIX continua válido por 1 hora
  // mesmo que o modal seja fechado
  
  // Apenas limpar referências da modal
  crmCurrentOrderId = null;
  // NÃO limpar crmCurrentPixData para permitir verificação contínua
}

// Copiar código PIX para clipboard
function copyCrmPixCode() {
  const input = document.getElementById('crmPixCode');
  if (!input.value) {
    showToast('Nenhum código PIX para copiar', 'warning');
    return;
  }
  
  input.select();
  document.execCommand('copy');
  showToast('✅ Código PIX copiado!', 'success');
}

// Baixar QR Code como imagem
function downloadCrmPixQrCode() {
  if (!crmCurrentPixData || !crmCurrentPixData.qr_code_base64) {
    showToast('❌ QR Code não disponível', 'error');
    return;
  }

  try {
    // Converter base64 para blob
    const byteCharacters = atob(crmCurrentPixData.qr_code_base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });

    // Criar link de download
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-code-pix-${new Date().getTime()}.png`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    showToast('✅ QR Code baixado com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao baixar QR Code:', error);
    showToast('Erro ao baixar QR Code', 'error');
  }
}

// Enviar PIX via WhatsApp
function sendCrmPixViaWhatsApp() {
  if (!crmCurrentOrderId || !crmOrdersData[crmCurrentOrderId] || !crmCurrentPixData) {
    showToast('Erro: Dados de PIX não encontrados', 'error');
    return;
  }

  const orderData = crmOrdersData[crmCurrentOrderId];
  const whatsapp = orderData.customerWhatsApp?.replace(/\D/g, '') || '';
  
  if (!whatsapp) {
    showToast('❌ Cliente não tem WhatsApp cadastrado', 'error');
    return;
  }

  try {
    // Pegar a imagem do QR code
    const qrImage = document.querySelector('#crmPixQrCode img');
    
    if (qrImage && qrImage.src) {
      // Converter imagem para blob para copiar para clipboard
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob(async (blob) => {
          try {
            // Tentar copiar a imagem para clipboard (suporta navegadores modernos)
            await navigator.clipboard.write([
              new ClipboardItem({
                'image/png': blob
              })
            ]);
            console.log('✅ Imagem QR Code copiada para clipboard');
          } catch (clipboardErr) {
            console.log('ℹ️ Clipboard para imagem não suportado, continue com o texto');
          }
          
          // Preparar mensagem com código PIX
          const message = `Olá! 👋\n\nGostaria de compartilhar o código PIX para o seu pagamento.\n\n💰 *Valor:* R$ ${orderData.dayTotal.toFixed(2)}\n📅 *Data:* ${orderData.purchaseDate}\n\n*Código PIX:*\n${crmCurrentPixData.qr_code}\n\nEscaneie o QR code acima ou copie e cole o código na seu banco para efetuar o pagamento.`;
          
          // Abrir WhatsApp
          const whatsappUrl = `https://wa.me/55${whatsapp}?text=${encodeURIComponent(message)}`;
          window.open(whatsappUrl, '_blank');
          
          showToast('✅ WhatsApp aberto! A imagem foi copiada (cole com Ctrl+V)', 'success');
        }, 'image/png');
      };
      
      img.onerror = () => {
        // Se não conseguir carregar a imagem, enviar apenas o texto
        const message = `Olá! 👋\n\nGostaria de compartilhar o código PIX para o seu pagamento.\n\n💰 *Valor:* R$ ${orderData.dayTotal.toFixed(2)}\n📅 *Data:* ${orderData.purchaseDate}\n\n*Código PIX:*\n${crmCurrentPixData.qr_code}\n\nEscaneie o QR code acima ou copie e cole o código na seu banco para efetuar o pagamento.`;
        const whatsappUrl = `https://wa.me/55${whatsapp}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        showToast('✅ WhatsApp aberto com código PIX!', 'success');
      };
      
      img.src = qrImage.src;
    } else {
      // Se não houver imagem no DOM, enviar apenas o texto
      const message = `Olá! 👋\n\nGostaria de compartilhar o código PIX para o seu pagamento.\n\n💰 *Valor:* R$ ${orderData.dayTotal.toFixed(2)}\n📅 *Data:* ${orderData.purchaseDate}\n\n*Código PIX:*\n${crmCurrentPixData.qr_code}\n\nEscaneie o QR code acima ou copie e cole o código na seu banco para efetuar o pagamento.`;
      const whatsappUrl = `https://wa.me/55${whatsapp}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      showToast('✅ WhatsApp aberto com código PIX!', 'success');
    }
  } catch (error) {
    console.error('Erro ao enviar via WhatsApp:', error);
    showToast('Erro ao processar', 'error');
  }
}

// ==================== FLOATING ACTION BUTTON (FAB) PIX ====================

// ✅ Sincronizar PIX com backend (para múltiplos dispositivos)
let crmPixSyncInterval = null;

async function syncCrmPixFromBackend() {
  try {
    const response = await fetch(API_BASE + '/payments/pix/active');
    const data = await response.json();

    if (data.active && data.pix) {
      // PIX ativo no backend
      const pixData = data.pix;
      
      // ✅ NUNCA sobrescrever um PIX já ativo
      // Se já há um PIX em crmCurrentPixData, manter o mesmo durante a 1 hora
      if (!crmCurrentPixData) {
        // Só sincronizar se NÃO houver PIX ativo
        console.log('🔄 Sincronizando PIX do backend (nenhum ativo):', pixData.mp_payment_id);
        
        // Restaurar PIX do backend
        crmCurrentPixData = {
          ...pixData,
          orderId: pixData.crm_purchase_id || crmCurrentOrderId,
          customerName: pixData.customer_name,
          customerWhatsApp: ''  // Não retorna do backend por segurança
        };
        
        // Salvar em localStorage
        saveCrmPixToStorage();
        
        // Mostrar FAB
        showCrmPixFab();
        updateCrmPixFabCounter(pixData.expires_at);
        
        // Reiniciar polling
        startCrmPixPolling(pixData.mp_payment_id, { dayTotal: pixData.amount });
        
        console.log('✅ PIX sincronizado do backend e restaurado');
      } else if (crmCurrentPixData.mp_payment_id === pixData.mp_payment_id) {
        // Mesmo PIX, apenas verificar se foi confirmado ou expirou
        console.log('ℹ️  Mesmo PIX ativo, mantendo:', crmCurrentPixData.mp_payment_id);
      } else {
        // PIX diferente no backend, mas já temos um ativo
        // NÃO sobrescrever! Manter o PIX local até expirar/confirmar
        console.log('⚠️  PIX diferente no backend, mas mantendo o atual:', crmCurrentPixData.mp_payment_id);
      }
    } else if (crmCurrentPixData) {
      // Backend diz que não há PIX, mas frontend tem
      console.log('⏰ PIX expirou ou foi confirmado no backend');
      hideCrmPixFab();
      clearCrmPixFromStorage();
    }
  } catch (error) {
    console.warn('⚠️  Erro ao sincronizar PIX do backend:', error.message);
  }
}

// ✅ Iniciar sincronização periódica com backend (a cada 30 segundos)
function startCrmPixBackendSync() {
  if (crmPixSyncInterval) clearInterval(crmPixSyncInterval);
  
  // Sincronizar imediatamente
  syncCrmPixFromBackend();
  
  // Depois a cada 30 segundos
  crmPixSyncInterval = setInterval(syncCrmPixFromBackend, 30000);
  console.log('🔄 Sincronização backend iniciada (a cada 30s)');
}

// ✅ Parar sincronização com backend
function stopCrmPixBackendSync() {
  if (crmPixSyncInterval) {
    clearInterval(crmPixSyncInterval);
    crmPixSyncInterval = null;
    console.log('⏹️  Sincronização backend parada');
  }
}

// ✅ Listener para storage events (sincronização entre abas)
function setupCrmPixStorageListener() {
  window.addEventListener('storage', (event) => {
    if (event.key === 'crmActivePix') {
      console.log('📲 Storage event detectado (outra aba modificou PIX)');
      
      if (event.newValue) {
        try {
          const pixData = JSON.parse(event.newValue);
          console.log('✅ PIX detectado do storage event:', pixData.mp_payment_id);
          
          // ✅ NUNCA sobrescrever um PIX já ativo
          if (!crmCurrentPixData) {
            // Nenhum PIX ativo, sincronizar
            console.log('🔄 Sincronizando PIX de outra aba (nenhum ativo)');
            crmCurrentPixData = pixData;
            crmCurrentOrderId = pixData.orderId;
            
            // Mostrar FAB
            showCrmPixFab();
            updateCrmPixFabCounter(pixData.expires_at);
            
            // Preencher modal se estiver aberta
            fillCrmPixModalWithData();
            
            // Reiniciar polling
            startCrmPixPolling(pixData.mp_payment_id, { dayTotal: pixData.amount });
          } else if (crmCurrentPixData.mp_payment_id === pixData.mp_payment_id) {
            // Mesmo PIX, apenas sincronizar dados se mudou
            console.log('ℹ️  Mesmo PIX de outra aba, sincronizando dados:', crmCurrentPixData.mp_payment_id);
            crmCurrentPixData = pixData;
            fillCrmPixModalWithData();
          } else {
            // PIX diferente em outra aba, mas já temos um ativo
            // NÃO sobrescrever! A outra aba gerou um novo PIX, mas mantemos o nosso
            console.log('⚠️  Outra aba gerou PIX diferente, mantendo o atual:', crmCurrentPixData.mp_payment_id);
          }
        } catch (error) {
          console.warn('❌ Erro ao processar storage event:', error);
        }
      } else {
        // localStorage foi limpado de outra aba
        console.log('🗑️  PIX foi removido de outra aba');
        crmCurrentPixData = null;
        hideCrmPixFab();
      }
    }
  });
  console.log('👂 Storage listener configurado (sincronização entre abas)');
}

// ✅ Salvar PIX ativo em localStorage
function saveCrmPixToStorage() {
  if (crmCurrentPixData && crmCurrentOrderId) {
    const pixData = {
      ...crmCurrentPixData,
      orderId: crmCurrentOrderId,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem('crmActivePix', JSON.stringify(pixData));
    console.log('💾 PIX salvo em localStorage:', pixData.mp_payment_id);
  }
}

// ✅ Carregar PIX do localStorage
function loadCrmPixFromStorage() {
  try {
    const stored = localStorage.getItem('crmActivePix');
    if (!stored) return null;
    
    const pixData = JSON.parse(stored);
    console.log('📂 PIX carregado do localStorage:', pixData.mp_payment_id);
    return pixData;
  } catch (error) {
    console.warn('❌ Erro ao carregar PIX do localStorage:', error);
    return null;
  }
}

// ✅ Limpar PIX do localStorage
function clearCrmPixFromStorage() {
  localStorage.removeItem('crmActivePix');
  console.log('🗑️  PIX removido do localStorage');
}

// ✅ Verificar PIX ao abrir a página (sincronizar com backend)
async function checkCrmPixOnPageLoad() {
  console.log('🔍 Verificando PIX ao carregar página...');
  
  // Primeiro, tentar sincronizar com backend
  try {
    const response = await fetch(API_BASE + '/payments/pix/active');
    const data = await response.json();

    if (data.active && data.pix) {
      // PIX ativo no backend
      console.log('✅ PIX ativo encontrado no backend:', data.pix.mp_payment_id);
      
      crmCurrentPixData = {
        ...data.pix,
        orderId: data.pix.crm_purchase_id,
        customerName: data.pix.customer_name,
        customerWhatsApp: ''  // Não retorna do backend por segurança
      };
      crmCurrentOrderId = data.pix.crm_purchase_id;
      
      // Salvar em localStorage
      saveCrmPixToStorage();
      
      // Mostrar FAB
      showCrmPixFab();
      updateCrmPixFabCounter(data.pix.expires_at);
      
      // Reiniciar polling
      startCrmPixPolling(data.pix.mp_payment_id, { dayTotal: data.pix.amount });
      
      showToast('✅ Pagamento anterior restaurado. Aguardando confirmação...', 'info');
      return;
    } else {
      console.log('ℹ️  Nenhum PIX ativo no backend');
    }
  } catch (error) {
    console.warn('⚠️  Erro ao sincronizar com backend:', error.message);
    // Continuar com localStorage como fallback
  }

  // Fallback: tentar carregar do localStorage
  const pixData = loadCrmPixFromStorage();
  if (!pixData) return;

  const now = new Date();
  const expiresAt = new Date(pixData.expires_at);

  // Se expirou
  if (now > expiresAt) {
    console.log('⏰ PIX expirou');
    clearCrmPixFromStorage();
    showToast('⏰ O PIX gerado anteriormente expirou. Gere um novo pagamento.', 'warning');
    return;
  }

  // Restaurar dados do PIX
  crmCurrentPixData = pixData;
  crmCurrentOrderId = pixData.orderId;

  console.log('✅ PIX restaurado do localStorage:', pixData.mp_payment_id);

  // Mostrar FAB com contador
  showCrmPixFab();
  updateCrmPixFabCounter(pixData.expires_at);

  // Reiniciar polling para verificar confirmação
  startCrmPixPolling(pixData.mp_payment_id, {
    dayTotal: pixData.amount
  });

  showToast('✅ Pagamento anterior restaurado. Aguardando confirmação...', 'info');
}

// ✅ Mostrar FAB quando há PIX ativo
function showCrmPixFab() {
  const fab = document.getElementById('fabPixButton');
  if (fab) {
    fab.classList.add('active');
    console.log('💳 FAB PIX mostrado');
  }
}

// ✅ Esconder FAB quando PIX expira ou é pago
function hideCrmPixFab() {
  const fab = document.getElementById('fabPixButton');
  if (fab) {
    fab.classList.remove('active');
    console.log('❌ FAB PIX escondido');
  }
  
  // Limpar intervals do FAB
  if (crmPixFabCounterInterval) {
    clearInterval(crmPixFabCounterInterval);
    crmPixFabCounterInterval = null;
  }
}

// ✅ Atualizar contador no FAB
function updateCrmPixFabCounter(expiresAt) {
  const counterEl = document.getElementById('fabPixCounter');
  if (!counterEl) return;
  
  // Limpar interval anterior se existir
  if (crmPixFabCounterInterval) {
    clearInterval(crmPixFabCounterInterval);
  }
  
  const updateCounter = () => {
    const now = new Date();
    const expireDate = new Date(expiresAt);
    const secondsLeft = Math.floor((expireDate - now) / 1000);
    
    if (secondsLeft <= 0) {
      counterEl.textContent = 'EXPIRADO';
      counterEl.style.background = '#ffcdd2';
      counterEl.style.color = '#d32f2f';
      hideCrmPixFab();
      clearInterval(crmPixFabCounterInterval);
      crmPixFabCounterInterval = null;
      showToast('⏰ PIX expirou', 'warning');
      return;
    }
    
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    counterEl.textContent = `${minutes}m ${String(seconds).padStart(2, '0')}s`;
    
    // Mudar cor se faltam menos de 5 minutos
    if (secondsLeft <= 300) {
      counterEl.style.background = '#ffe6e6';
      counterEl.style.color = '#d32f2f';
    } else {
      counterEl.style.background = 'rgba(255, 255, 255, 0.2)';
      counterEl.style.color = 'white';
    }
  };
  
  // Atualizar imediatamente
  updateCounter();
  
  // Atualizar a cada segundo
  crmPixFabCounterInterval = setInterval(updateCounter, 1000);
}

// ✅ Abrir modal do QR code PIX ao clicar no FAB
function openCrmPixQrModalFromFab() {
  if (!crmCurrentPixData || !crmCurrentOrderId) {
    showToast('Erro: PIX não encontrado', 'error');
    return;
  }
  
  const modal = document.getElementById('crmPixQrModal');
  if (modal) {
    modal.classList.add('open');
    console.log('📱 Modal PIX aberta pelo FAB');
  }
  
  // ✅ NOVO: Preencher modal com dados salvos
  fillCrmPixModalWithData();
}

// ✅ Preencher modal com dados do PIX salvo
function fillCrmPixModalWithData() {
  if (!crmCurrentPixData) return;
  
  // Preencher cliente e valor
  const clientNameEl = document.getElementById('crmPixClientName');
  if (clientNameEl) {
    clientNameEl.textContent = crmCurrentPixData.customerName || 'Cliente';
  }
  
  const amountEl = document.getElementById('crmPixAmount');
  if (amountEl) {
    if (crmCurrentPixData.amount) {
      amountEl.textContent = formatMoney(crmCurrentPixData.amount);
    } else {
      amountEl.textContent = 'R$ 0,00';
    }
  }
  
  // Preencher QR code
  const qrCodeDiv = document.getElementById('crmPixQrCode');
  if (qrCodeDiv) {
    if (crmCurrentPixData.qr_code_base64) {
      qrCodeDiv.innerHTML = `<img src="data:image/png;base64,${crmCurrentPixData.qr_code_base64}" style="width: 100%; height: auto; border-radius: 8px;">`;
      console.log('✅ QR Code carregado na modal');
    } else {
      qrCodeDiv.innerHTML = '⚠️ QR Code não disponível';
    }
  }
  
  // Preencher código PIX
  const pixCodeInput = document.getElementById('crmPixCode');
  if (pixCodeInput) {
    if (crmCurrentPixData.qr_code) {
      pixCodeInput.value = crmCurrentPixData.qr_code;
      console.log('✅ Código PIX carregado na modal');
    } else {
      pixCodeInput.value = '';
      console.warn('⚠️ Código PIX não disponível');
    }
  }
}

// ==================== PURCHASES MANAGEMENT ====================

// Estado para rastrear produtos selecionados e quantidades
let crmSelectedProducts = {};

// Helper: Função para obter data local em formato YYYY-MM-DD (sem timezone)
function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: Converter data string (YYYY-MM-DD) para exibição local sem timezone issues
function formatDateString(dateString) {
  if (!dateString) return '';
  // Se vier no formato YYYY-MM-DD, usar diretamente
  if (dateString.includes('T')) {
    dateString = dateString.split('T')[0];
  }
  const [year, month, day] = dateString.split('-');
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
}

// Estado global para armazenar dados de pedidos
let crmOrdersData = {};

// Helper: Enviar pedido via WhatsApp
function sendOrderViaWhatsApp(orderId) {
  const orderData = crmOrdersData[orderId];
  
  if (!orderData) {
    showToast('Erro ao recuperar dados do pedido', 'error');
    return;
  }

  const { customerName, customerWhatsApp, purchaseDate, products, dayTotal, dayStatus } = orderData;

  if (!customerWhatsApp) {
    showToast('Cliente não possui WhatsApp cadastrado', 'warning');
    return;
  }

  // Formatar a mensagem de forma profissional
  let message = `*PEDIDO DE COMPRA*\n\n`;
  message += `*Cliente:* ${customerName}\n`;
  message += `*Data do Pedido:* ${purchaseDate}\n`;
  message += `*Status do Pagamento:* ${dayStatus === 'pago' ? 'Pago' : dayStatus === 'parcial' ? 'Parcial' : 'Pendente'}\n\n`;
  
  message += `*Produtos:*\n`;
  products.forEach(p => {
    message += `• ${p.product_name}\n`;
    message += `  Qtd: ${p.quantity} | ${formatMoney(p.unit_price)} | Total: ${formatMoney(p.total_price)}\n`;
  });
  
  message += `\n*Total da Compra:* R$ ${dayTotal.toFixed(2)}\n`;
  message += `\n_Pedido enviado via Cia de Condimentos - Administrador_`;

  // Limpar WhatsApp: remover caracteres especiais e garantir formato correto
  const cleanWhatsApp = customerWhatsApp.replace(/\D/g, '');
  const whatsAppUrl = `https://wa.me/55${cleanWhatsApp}?text=${encodeURIComponent(message)}`;
  
  console.log('Enviando para WhatsApp:', cleanWhatsApp);
  console.log('Mensagem:', message);
  window.open(whatsAppUrl, '_blank');
}

// Abrir modal para adicionar compra (com múltiplos produtos)
async function openAddCrmPurchase(customerId) {
  const modal = document.getElementById('crmPurchaseModal');
  const title = document.getElementById('crmPurchaseModalTitle');
  const body = document.getElementById('crmPurchaseModalBody');

  title.textContent = '➕ Registrar Compra';
  crmSelectedProducts = {}; // Limpar seleção anterior

  try {
    // Carregar produtos do banco
    const response = await fetch(`${API_BASE}/products/admin/all`);
    const products = await response.json();

    let productsHtml = products.map(p => `
      <div style="display: flex; align-items: center; gap: 12px; padding: 10px; border: 1px solid #e0e0e0; border-radius: 6px; margin-bottom: 10px; background: #fafafa;" class="crm-product-item" data-product-name="${p.name.toLowerCase()}" data-product-id="${p.id}">
        <input type="checkbox" id="crmProd-${p.id}" data-product-id="${p.id}" data-product-name="${p.name}" data-product-price="${p.price}" onchange="toggleCrmProduct(${p.id}, '${p.name}', ${p.price})">
        <div style="flex: 1;">
          <label for="crmProd-${p.id}" style="cursor: pointer; font-weight: 600; margin-bottom: 4px; display: block;">${p.name}</label>
          <span style="font-size: 12px; color: #666;">R$ ${parseFloat(p.price).toFixed(2)}</span>
        </div>
        <div style="display: none;" id="crmProdQty-${p.id}-container" class="crm-qty-container">
          <div style="display: flex; align-items: center; gap: 6px;">
            <button onclick="decrementQty('crmProdQty-${p.id}')" class="btn btn-sm" style="min-width: 36px; padding: 6px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-weight: 600;">−</button>
            <input type="number" id="crmProdQty-${p.id}" placeholder="Qtd" min="1" step="1" value="1" onchange="calculateCrmGrandTotal()" oninput="calculateCrmGrandTotal()" style="width: 50px; text-align: center; padding: 6px; border: 1px solid #ddd; border-radius: 4px; background: #fff;">
            <button onclick="incrementQty('crmProdQty-${p.id}')" class="btn btn-sm" style="min-width: 36px; padding: 6px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-weight: 600;">+</button>
            <span id="crmProdSubtotal-${p.id}" style="margin-left: 10px; font-weight: 700; color: #2c3e50;">${formatMoney(p.price)}</span>
          </div>
        </div>
      </div>
    `).join('');

    body.innerHTML = `
      <div style="margin-bottom: 15px;">
        <label style="font-weight: 600; display: block; margin-bottom: 8px;">🔍 Pesquisar Produtos</label>
        <input type="text" id="crmProductSearch" placeholder="Digite o nome do produto..." style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
        <div style="font-size: 12px; color: #999; margin-top: 4px;" id="crmSearchResults">Mostrando ${products.length} produto(s)</div>
      </div>

      <div style="max-height: 400px; overflow-y: auto; margin-bottom: 20px;">
        <div style="margin-bottom: 15px;">
          <label style="font-weight: 600; display: block; margin-bottom: 10px;">📦 Selecione os Produtos *</label>
          <div id="crmProductsList">
            ${productsHtml}
          </div>
        </div>
      </div>

      <div style="background: #f0f4f8; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 2px solid #3498db;">
        <div style="font-size: 14px; color: #666; margin-bottom: 8px;">Total da Compra:</div>
        <div style="font-size: 24px; font-weight: 700; color: #2c3e50;">R$ <span id="crmGrandTotal">0.00</span></div>
      </div>

      <div class="form-row-2">
        <div class="fg">
          <label>Data da Compra *</label>
          <input type="date" id="crmPurchaseDate" value="${getLocalDateString(new Date())}">
        </div>
        <div class="fg">
          <label>Forma de Pagamento</label>
          <select id="crmPaymentMethod">
            <option value="">Não especificado</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="cartão-débito">Cartão - Débito</option>
            <option value="cartão-crédito">Cartão - Crédito</option>
            <option value="pix">PIX</option>
            <option value="cheque">Cheque</option>
            <option value="crediário">Crediário</option>
            <option value="outro">Outro</option>
          </select>
        </div>
      </div>

      <div class="fg">
        <label>Status do Pagamento</label>
        <select id="crmPaymentStatus">
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
          <option value="parcial">Parcial</option>
        </select>
      </div>

      <div class="fg">
        <label>Observações</label>
        <textarea id="crmPurchaseNotes" placeholder="Anotações sobre estas compras..."></textarea>
      </div>
    `;

    // Adicionar evento de busca
    document.getElementById('crmProductSearch').addEventListener('input', (e) => {
      filterCrmProducts(e.target.value, products.length);
    });

    document.getElementById('crmPurchaseModal').dataset.customerId = customerId;
    delete document.getElementById('crmPurchaseModal').dataset.purchaseId;
    modal.classList.add('open');
  } catch (error) {
    console.error('Erro ao carregar produtos:', error);
    showToast('Erro ao carregar produtos', 'error');
  }
}

// Alternar seleção de produto e exibir/ocultar campo de quantidade
function toggleCrmProduct(productId, productName, productPrice) {
  const checkbox = document.getElementById(`crmProd-${productId}`);
  const qtyContainer = document.getElementById(`crmProdQty-${productId}-container`);

  if (checkbox.checked) {
    crmSelectedProducts[productId] = {
      id: productId,
      name: productName,
      price: productPrice,
      quantity: 1
    };
    qtyContainer.style.display = 'inline-flex';
  } else {
    delete crmSelectedProducts[productId];
    qtyContainer.style.display = 'none';
  }

  calculateCrmGrandTotal();
}

// Calcular total geral de toda a compra
function calculateCrmGrandTotal() {
  let grandTotal = 0;

  Object.values(crmSelectedProducts).forEach(product => {
    const qtyInput = document.getElementById(`crmProdQty-${product.id}`);
    const quantity = parseInt(qtyInput.value) || 0;
    const subtotal = quantity * product.price;

    // Atualizar subtotal do produto
    const subtotalSpan = document.getElementById(`crmProdSubtotal-${product.id}`);
    if (subtotalSpan) {
      subtotalSpan.textContent = `R$ ${subtotal.toFixed(2)}`;
    }

    // Adicionar ao total geral
    crmSelectedProducts[product.id].quantity = quantity;
    grandTotal += subtotal;
  });

  // Atualizar display do total geral
  const grandTotalSpan = document.getElementById('crmGrandTotal');
  if (grandTotalSpan) {
    grandTotalSpan.textContent = grandTotal.toFixed(2);
  }
}

// Filtrar produtos por busca
function filterCrmProducts(query, totalProducts) {
  const items = document.querySelectorAll('.crm-product-item');
  let visibleCount = 0;

  items.forEach(item => {
    const productName = item.dataset.productName || '';
    const matches = productName.includes(query.toLowerCase());
    item.style.display = matches ? 'flex' : 'none';
    if (matches) visibleCount++;
  });

  // Atualizar contador de resultados
  const searchResults = document.getElementById('crmSearchResults');
  if (searchResults) {
    if (query.trim()) {
      searchResults.textContent = `${visibleCount} de ${totalProducts} produto(s) encontrado(s)`;
    } else {
      searchResults.textContent = `Mostrando ${totalProducts} produto(s)`;
    }
  }
}

// ============ EDITAR COMPRA COMPLETA (MÚLTIPLOS PRODUTOS) - CRM ============

// Abrir modal para editar todos os produtos de uma data no CRM
async function openEditCrmPurchaseBulk(customerId, purchaseDate) {
  try {
    const response = await fetch(`${API_BASE}/crm/customers/${customerId}`);
    const data = await response.json();
    const purchases = data.purchases || [];
    
    // Filtrar apenas os produtos desta data
    const dateItems = purchases.filter(p => p.purchase_date === purchaseDate);
    
    if (dateItems.length === 0) {
      showToast('Nenhum produto encontrado para esta data', 'error');
      return;
    }

    const modal = document.getElementById('crmPurchaseModal');
    const title = document.getElementById('crmPurchaseModalTitle');
    const body = document.getElementById('crmPurchaseModalBody');

    title.textContent = '✏️ Editar Compra Completa';

    // Gerar HTML para cada produto
    let productsHtml = '';
    let totalGeral = 0;
    
    dateItems.forEach((item, index) => {
      const itemTotal = safeNumber(item.total_price);
      totalGeral += itemTotal;
      
      productsHtml += `
        <div class="bulk-purchase-item" data-product-id="${item.id}" style="background: #f9f7f3; padding: 16px; border-radius: 8px; margin-bottom: 12px; border: 1px solid #e8e0d4;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
            <div class="fg">
              <label style="font-size: 11px;">Nome do Produto</label>
              <input type="text" class="bulk-product-name" placeholder="Ex: Pimenta - 500g" value="${item.product_name}" style="font-size: 12px;">
            </div>
            <div class="fg">
              <label style="font-size: 11px;">Quantidade</label>
              <div style="display: flex; align-items: center; gap: 4px;">
                <button onclick="decrementQty('crm-bulk-qty-${item.id}')" class="btn btn-sm" style="min-width: 32px; padding: 4px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 11px;">−</button>
                <input type="number" id="crm-bulk-qty-${item.id}" class="bulk-quantity" placeholder="1" min="1" step="1" value="${item.quantity}" style="width: 50px; text-align: center; padding: 4px; border: 1px solid #ddd; border-radius: 4px; background: #fff; font-size: 12px;">
                <button onclick="incrementQty('crm-bulk-qty-${item.id}')" class="btn btn-sm" style="min-width: 32px; padding: 4px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 11px;">+</button>
              </div>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="fg">
              <label style="font-size: 11px;">Valor Unitário (R$)</label>
              <input type="number" class="bulk-unit-price" placeholder="0.00" min="0" step="0.01" value="${safeNumber(item.unit_price).toFixed(2)}" style="font-size: 12px;">
            </div>
            <div class="fg">
              <label style="font-size: 11px;">Total (R$)</label>
              <input type="number" id="crm-bulk-total-${item.id}" class="bulk-total" placeholder="0.00" disabled style="background: #f4f0ea; font-size: 12px;" value="${itemTotal.toFixed(2)}">
            </div>
          </div>
        </div>
      `;
    });

    // Formas de pagamento (compartilhada para toda a compra)
    const firstItem = dateItems[0];
    
    body.innerHTML = `
      <div style="max-height: 60vh; overflow-y: auto;">
        <div style="margin-bottom: 20px; padding: 12px; background: #f0e8d0; border-radius: 8px; border-left: 4px solid var(--vermelho);">
          <div style="font-size: 11px; color: #999; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; margin-bottom: 8px;">Informações da Compra</div>
          <div style="font-size: 14px; font-weight: 700; color: var(--marrom);">
            📅 ${formatDateString(purchaseDate)} 
            <span style="font-size: 12px; color: #999; margin-left: 12px;">${dateItems.length} produto${dateItems.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <h4 style="font-size: 12px; font-weight: 700; color: var(--marrom); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px;">📦 Produtos</h4>
        ${productsHtml}

        <div style="background: #f0e8d0; padding: 12px; border-radius: 8px; margin: 20px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <div style="font-size: 11px; color: #999; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Forma de Pagamento</div>
            <select id="crmBulkPaymentMethod" style="margin-top: 6px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; width: 100%;">
              <option value="">Não especificado</option>
              <option value="dinheiro" ${firstItem.payment_method === 'dinheiro' ? 'selected' : ''}>Dinheiro</option>
              <option value="cartão-débito" ${firstItem.payment_method === 'cartão-débito' ? 'selected' : ''}>Cartão - Débito</option>
              <option value="cartão-crédito" ${firstItem.payment_method === 'cartão-crédito' ? 'selected' : ''}>Cartão - Crédito</option>
              <option value="pix" ${firstItem.payment_method === 'pix' ? 'selected' : ''}>PIX</option>
              <option value="cheque" ${firstItem.payment_method === 'cheque' ? 'selected' : ''}>Cheque</option>
              <option value="crediário" ${firstItem.payment_method === 'crediário' ? 'selected' : ''}>Crediário</option>
              <option value="outro" ${firstItem.payment_method === 'outro' ? 'selected' : ''}>Outro</option>
            </select>
          </div>
          <div>
            <div style="font-size: 11px; color: #999; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Status do Pagamento</div>
            <select id="crmBulkPaymentStatus" style="margin-top: 6px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; width: 100%;">
              <option value="pendente" ${firstItem.payment_status === 'pendente' ? 'selected' : ''}>Pendente</option>
              <option value="pago" ${firstItem.payment_status === 'pago' ? 'selected' : ''}>Pago</option>
              <option value="parcial" ${firstItem.payment_status === 'parcial' ? 'selected' : ''}>Parcial</option>
            </select>
          </div>
        </div>

        <div class="fg">
          <label>Observações</label>
          <textarea id="crmBulkPurchaseNotes" placeholder="Anotações sobre esta compra..." style="font-size: 12px;">${firstItem.notes || ''}</textarea>
        </div>

        <div style="background: #fff3cd; padding: 12px; border-radius: 8px; margin-top: 16px; border: 1px solid #ffc107;">
          <div style="font-size: 11px; color: #999; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Total da Compra</div>
          <div id="crmBulkTotalGeral" style="font-size: 24px; font-weight: 900; color: var(--vermelho); margin-top: 6px;">R$ ${totalGeral.toFixed(2)}</div>
        </div>
      </div>
    `;

    // Adicionar event listeners para cálculos
    const bulkItems = document.querySelectorAll('.bulk-purchase-item');
    bulkItems.forEach(item => {
      const qtyInput = item.querySelector('.bulk-quantity');
      const priceInput = item.querySelector('.bulk-unit-price');
      
      qtyInput.addEventListener('input', calculateCrmBulkTotal);
      qtyInput.addEventListener('change', calculateCrmBulkTotal);
      priceInput.addEventListener('input', calculateCrmBulkTotal);
      priceInput.addEventListener('change', calculateCrmBulkTotal);
    });

    document.getElementById('crmPurchaseModal').dataset.customerId = customerId;
    document.getElementById('crmPurchaseModal').dataset.purchaseDate = purchaseDate;
    document.getElementById('crmPurchaseModal').dataset.isBulk = 'true';
    modal.classList.add('open');
  } catch (error) {
    console.error('Erro ao abrir compra para edição em lote:', error);
    showToast('Erro ao carregar compra', 'error');
  }
}

// Calcular total geral da compra em lote (CRM)
function calculateCrmBulkTotal() {
  let totalGeral = 0;
  
  const bulkItems = document.querySelectorAll('.bulk-purchase-item');
  bulkItems.forEach(item => {
    const qtyInput = item.querySelector('.bulk-quantity');
    const priceInput = item.querySelector('.bulk-unit-price');
    const totalInput = item.querySelector('.bulk-total');
    
    const qty = parseFloat(qtyInput.value) || 0;
    const price = parseFloat(priceInput.value) || 0;
    const itemTotal = qty * price;
    
    if (totalInput) {
      totalInput.value = itemTotal.toFixed(2);
    }
    
    totalGeral += itemTotal;
  });
  
  const totalGeralEl = document.getElementById('crmBulkTotalGeral');
  if (totalGeralEl) {
    totalGeralEl.textContent = `R$ ${totalGeral.toFixed(2)}`;
  }
}

// Abrir modal para editar compra
async function openEditCrmPurchase(customerId, purchaseId) {
  try {
    // Não temos endpoint específico, vamos carregar tudo de novo
    const response = await fetch(`${API_BASE}/crm/customers/${customerId}`);
    const data = await response.json();
    const purchase = data.purchases.find(p => p.id === purchaseId);

    if (!purchase) {
      showToast('Compra não encontrada', 'error');
      return;
    }

    const modal = document.getElementById('crmPurchaseModal');
    const title = document.getElementById('crmPurchaseModalTitle');
    const body = document.getElementById('crmPurchaseModalBody');

    title.textContent = '✏️ Editar Compra';

    body.innerHTML = `
      <div class="fg">
        <label>Nome do Produto *</label>
        <input type="text" id="crmProdName" placeholder="Ex: Pimenta Dedo de Moça - 500g" value="${purchase.product_name}">
      </div>
      <div class="form-row-3">
        <div class="fg">
          <label>Quantidade *</label>
          <div style="display: flex; align-items: center; gap: 6px;">
            <button onclick="decrementQty('crmProdQty')" class="btn btn-sm" style="min-width: 36px; padding: 6px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-weight: 600;">−</button>
            <input type="number" id="crmProdQty" placeholder="1" min="1" step="1" value="${purchase.quantity}" style="width: 50px; text-align: center; padding: 6px; border: 1px solid #ddd; border-radius: 4px; background: #fff;">
            <button onclick="incrementQty('crmProdQty')" class="btn btn-sm" style="min-width: 36px; padding: 6px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-weight: 600;">+</button>
          </div>
        </div>
        <div class="fg">
          <label>Valor Unitário (R$) *</label>
          <input type="number" id="crmProdPrice" placeholder="0.00" min="0" step="0.01" value="${purchase.unit_price}">
        </div>
        <div class="fg">
          <label>Total (R$)</label>
          <input type="number" id="crmProdTotal" placeholder="0.00" disabled style="background: #f4f0ea;" value="${safeNumber(purchase.total_price || 0).toFixed(2)}">
        </div>
      </div>
      <div class="form-row-2">
        <div class="fg">
          <label>Data da Compra *</label>
          <input type="date" id="crmPurchaseDate" value="${(typeof purchase.purchase_date === 'string' ? purchase.purchase_date : purchase.purchase_date || '').split('T')[0]}">
        </div>
        <div class="fg">
          <label>Forma de Pagamento</label>
          <select id="crmPaymentMethod">
            <option value="">Não especificado</option>
            <option value="dinheiro" ${purchase.payment_method === 'dinheiro' ? 'selected' : ''}>Dinheiro</option>
            <option value="cartão-débito" ${purchase.payment_method === 'cartão-débito' ? 'selected' : ''}>Cartão - Débito</option>
            <option value="cartão-crédito" ${purchase.payment_method === 'cartão-crédito' ? 'selected' : ''}>Cartão - Crédito</option>
            <option value="pix" ${purchase.payment_method === 'pix' ? 'selected' : ''}>PIX</option>
            <option value="cheque" ${purchase.payment_method === 'cheque' ? 'selected' : ''}>Cheque</option>
            <option value="crediário" ${purchase.payment_method === 'crediário' ? 'selected' : ''}>Crediário</option>
            <option value="outro" ${purchase.payment_method === 'outro' ? 'selected' : ''}>Outro</option>
          </select>
        </div>
      </div>
      <div class="fg">
        <label>Status do Pagamento</label>
        <select id="crmPaymentStatus">
          <option value="pendente" ${purchase.payment_status === 'pendente' ? 'selected' : ''}>Pendente</option>
          <option value="pago" ${purchase.payment_status === 'pago' ? 'selected' : ''}>Pago</option>
          <option value="parcial" ${purchase.payment_status === 'parcial' ? 'selected' : ''}>Parcial</option>
        </select>
      </div>
      <div class="fg">
        <label>Observações</label>
        <textarea id="crmPurchaseNotes" placeholder="Anotações sobre esta compra...">${purchase.notes || ''}</textarea>
      </div>
    `;

    // Calcular total automaticamente
    document.getElementById('crmProdQty').addEventListener('input', calculateCrmTotalSingleProduct);
    document.getElementById('crmProdPrice').addEventListener('input', calculateCrmTotalSingleProduct);

    document.getElementById('crmPurchaseModal').dataset.customerId = customerId;
    document.getElementById('crmPurchaseModal').dataset.purchaseId = purchaseId;
    modal.classList.add('open');
  } catch (error) {
    console.error('Erro ao carregar compra:', error);
    showToast('Erro ao carregar compra', 'error');
  }
}

// Calcular total para edição de compra única
function calculateCrmTotalSingleProduct() {
  const qty = parseFloat(document.getElementById('crmProdQty').value) || 0;
  const price = parseFloat(document.getElementById('crmProdPrice').value) || 0;
  const total = qty * price;
  document.getElementById('crmProdTotal').value = total.toFixed(2);
}
// Fechar modal de compra
function closeCrmPurchaseModal() {
  document.getElementById('crmPurchaseModal').classList.remove('open');
  delete document.getElementById('crmPurchaseModal').dataset.customerId;
  delete document.getElementById('crmPurchaseModal').dataset.purchaseId;
  delete document.getElementById('crmPurchaseModal').dataset.purchaseDate;
  delete document.getElementById('crmPurchaseModal').dataset.isBulk;
  crmSelectedProducts = {}; // Limpar seleção
}

// Salvar compra(s)
async function saveCrmPurchase() {
  const purchaseId = document.getElementById('crmPurchaseModal').dataset.purchaseId;
  const isBulk = document.getElementById('crmPurchaseModal').dataset.isBulk === 'true';

  // Se está editando múltiplos produtos de uma compra (edição em lote)
  if (isBulk) {
    const customerId = document.getElementById('crmPurchaseModal').dataset.customerId;
    const purchaseDate = document.getElementById('crmPurchaseModal').dataset.purchaseDate;
    const paymentMethod = document.getElementById('crmBulkPaymentMethod').value || null;
    const paymentStatus = document.getElementById('crmBulkPaymentStatus').value || 'pendente';
    const notes = document.getElementById('crmBulkPurchaseNotes').value || null;

    try {
      const bulkItems = document.querySelectorAll('.bulk-purchase-item');
      const updatePromises = [];

      bulkItems.forEach(item => {
        const productId = item.dataset.productId;
        const productName = item.querySelector('.bulk-product-name').value.trim();
        const quantity = parseInt(item.querySelector('.bulk-quantity').value) || 0;
        const unitPrice = parseFloat(item.querySelector('.bulk-unit-price').value) || 0;

        if (!productName || !quantity || !unitPrice) {
          throw new Error('Preencha todos os campos dos produtos');
        }

        const payload = {
          product_name: productName,
          quantity,
          unit_price: unitPrice,
          purchase_date: purchaseDate,
          payment_method: paymentMethod,
          payment_status: paymentStatus,
          notes: notes
        };

        updatePromises.push(
          fetch(
            `${API_BASE}/crm/customers/${customerId}/purchases/${productId}`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            }
          )
        );
      });

      const responses = await Promise.all(updatePromises);
      const allSuccess = responses.every(r => r.ok);

      if (!allSuccess) {
        throw new Error('Erro ao atualizar algumas compras');
      }

      showToast(`✓ ${bulkItems.length} produto(s) atualizado(s) com sucesso!`, 'success');
      closeCrmPurchaseModal();
      openCrmCustomerDetail(customerId);
      // Recarregar lista de clientes para atualizar dashboard com novos valores de pagamento
      loadCrmCustomers(crmState.filters);
      if (typeof loadDashboard === 'function') loadDashboard();
    } catch (error) {
      console.error('Erro ao atualizar compras em lote:', error);
      showToast(error.message || 'Erro ao atualizar compras', 'error');
    }
    return;
  }

  // Se está editando uma compra individual
  if (purchaseId) {
    const productName = document.getElementById('crmProdName').value.trim();
    const quantity = parseInt(document.getElementById('crmProdQty').value);
    const unitPrice = parseFloat(document.getElementById('crmProdPrice').value);
    const purchaseDate = document.getElementById('crmPurchaseDate').value;

    if (!productName || !quantity || !unitPrice || !purchaseDate) {
      showToast('Preencha todos os campos obrigatórios', 'warning');
      return;
    }

    const customerId = document.getElementById('crmPurchaseModal').dataset.customerId;

    const payload = {
      product_name: productName,
      quantity,
      unit_price: unitPrice,
      purchase_date: purchaseDate,
      payment_method: document.getElementById('crmPaymentMethod').value || null,
      payment_status: document.getElementById('crmPaymentStatus').value || 'pendente',
      notes: document.getElementById('crmPurchaseNotes').value || null
    };

    console.log('Frontend - Editando compra, data:', purchaseDate);
    console.log('Frontend - Payload para editar:', payload);

    try {
      const response = await fetch(
        `${API_BASE}/crm/customers/${customerId}/purchases/${purchaseId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) throw new Error('Erro ao atualizar');

      showToast('Compra atualizada!', 'success');
      closeCrmPurchaseModal();
      openCrmCustomerDetail(customerId);
      // Recarregar lista de clientes para atualizar dashboard com novos valores de pagamento
      loadCrmCustomers(crmState.filters);
      // Atualizar dashboards automaticamente
      if (typeof loadDashboard === 'function') loadDashboard();
    } catch (error) {
      console.error('Erro ao atualizar compra:', error);
      showToast('Erro ao atualizar compra', 'error');
    }
    return;
  }

  // Se está registrando nova(s) compra(s) com múltiplos produtos
  if (Object.keys(crmSelectedProducts).length === 0) {
    showToast('Selecione pelo menos um produto', 'warning');
    return;
  }

  const purchaseDate = document.getElementById('crmPurchaseDate').value;
  if (!purchaseDate) {
    showToast('Selecione a data da compra', 'warning');
    return;
  }

  console.log('Frontend - Data do date picker (nova compra):', purchaseDate);

  const customerId = document.getElementById('crmPurchaseModal').dataset.customerId;
  const paymentMethod = document.getElementById('crmPaymentMethod').value || null;
  const paymentStatus = document.getElementById('crmPaymentStatus').value || 'pendente';
  const notes = document.getElementById('crmPurchaseNotes').value || null;

  try {
    // Salvar cada produto selecionado como uma compra separada
    const savePromises = Object.values(crmSelectedProducts).map(product => {
      const payload = {
        product_name: product.name,
        quantity: product.quantity,
        unit_price: product.price,
        purchase_date: purchaseDate,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        notes: notes
      };

      console.log('Frontend - Enviando payload:', payload);

      return fetch(
        `${API_BASE}/crm/customers/${customerId}/purchases`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );
    });

    const responses = await Promise.all(savePromises);
    const allSuccess = responses.every(r => r.ok);

    if (!allSuccess) {
      throw new Error('Erro ao salvar algumas compras');
    }

    const totalProducts = Object.keys(crmSelectedProducts).length;
    showToast(`✓ ${totalProducts} compra(s) registrada(s) com sucesso!`, 'success');
    closeCrmPurchaseModal();
    openCrmCustomerDetail(customerId);
    // Recarregar lista de clientes para atualizar dashboard com novos valores de pagamento
    loadCrmCustomers(crmState.filters);
    // Atualizar dashboards automaticamente
    if (typeof loadDashboard === 'function') loadDashboard();
  } catch (error) {
    console.error('Erro ao salvar compras:', error);
    showToast('Erro ao registrar compras', 'error');
  }
}

// Deletar compra
async function deleteCrmPurchase(customerId, purchaseId) {
  if (!confirm('Deseja deletar esta compra?')) {
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE}/crm/customers/${customerId}/purchases/${purchaseId}`,
      { method: 'DELETE' }
    );

    if (!response.ok) throw new Error('Erro ao deletar');

    showToast('Compra deletada com sucesso', 'success');
    
    // Recarregar detalhes do cliente
    openCrmCustomerDetail(customerId);
    // Recarregar lista de clientes para atualizar dashboard com novos valores de pagamento
    loadCrmCustomers(crmState.filters);
    // Atualizar dashboards automaticamente
    if (typeof loadDashboard === 'function') loadDashboard();
  } catch (error) {
    console.error('Erro ao deletar compra:', error);
    showToast('Erro ao deletar compra', 'error');
  }
}

// ==================== FILTER & SEARCH ====================

function filterCrmCustomers(filter) {
  loadCrmCustomers(filter);
}

function searchCrmCustomers(query) {
  if (!query.trim()) {
    renderCrmCustomersTable();
    return;
  }

  const filtered = crmState.customers.filter(c => 
    c.full_name.toLowerCase().includes(query.toLowerCase()) ||
    c.phone?.includes(query) ||
    c.city?.toLowerCase().includes(query.toLowerCase())
  );

  const tbody = document.getElementById('crmCustomersTableBody');
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #aaa;">Nenhum cliente encontrado</td></tr>';
    return;
  }

  let html = filtered.map(customer => {
    const debtAmount = customer.stats?.pending || 0;
    const totalSpent = customer.stats?.total_spent || 0;
    const isDebtor = debtAmount > 0;
    
    return `
      <tr>
        <td>
          <div class="prod-cell">
            <div style="font-weight: 700; color: ${customer.is_vip ? 'var(--vermelho)' : 'var(--marrom)'};">
              ${customer.full_name}
              ${customer.is_vip ? ' ⭐' : ''}
            </div>
            <div style="font-size: 11px; color: #aaa;">${customer.city || 'N/A'}</div>
          </div>
        </td>
        <td>${customer.phone || customer.whatsapp || 'N/A'}</td>
        <td style="color: ${isDebtor ? '#e74c3c' : '#27ae60'}; font-weight: 700;">
          ${isDebtor ? '💔 Devedor' : '✓ Adimplente'}
        </td>
        <td style="text-align: right;">${formatMoney(totalSpent)}</td>
        <td style="text-align: right; color: #e74c3c; font-weight: 700;">${formatMoney(debtAmount)}</td>
        <td>${customer.stats?.total_purchases || 0} compras</td>
        <td>
          <button class="btn btn-sm btn-ghost" onclick="openCrmCustomerDetail(${customer.id})" title="Ver detalhes">👁️</button>
          <button class="btn btn-sm btn-ghost" onclick="openEditCrmCustomer(${customer.id})" title="Editar">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="deleteCrmCustomer(${customer.id})" title="Deletar" style="padding: 6px 10px;">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = html;
}

function filterCrmByDate() {
  const dateStart = document.getElementById('crmDateStart')?.value;
  const dateEnd = document.getElementById('crmDateEnd')?.value;
  
  crmState.dateStart = dateStart;
  crmState.dateEnd = dateEnd;
  
  // Recalcular dashboard com as datas selecionadas
  updateCrmDashboardByDateRange();
  
  if (!dateStart && !dateEnd) {
    renderCrmCustomersTable();
    return;
  }
  
  renderCrmCustomersTable();
}

// ✅ NOVO: Atualizar dashboard baseado no filtro de data
function updateCrmDashboardByDateRange() {
  const startDate = crmState.dateStart ? new Date(crmState.dateStart) : null;
  const endDate = crmState.dateEnd ? new Date(crmState.dateEnd + 'T23:59:59') : null;
  
  let totalSpent = 0;
  let totalPending = 0;
  
  // Filtrar dados baseado no período selecionado
  crmState.customers.forEach(customer => {
    // Se nenhuma data foi selecionada, usar totais completos
    if (!startDate && !endDate) {
      totalSpent += safeNumber(customer.stats?.total_spent || 0);
      totalPending += safeNumber(customer.stats?.pending || 0);
    } else {
      // Filtrar compras por período
      const purchases = customer.purchases || [];
      
      // Calcular totais baseado nas compras filtradas
      purchases.forEach(p => {
        const pDate = new Date(p.purchase_date);
        const afterStart = !startDate || pDate >= startDate;
        const beforeEnd = !endDate || pDate <= endDate;
        
        if (afterStart && beforeEnd) {
          // Adiciona o valor TOTAL ao faturamento
          totalSpent += safeNumber(p.total_price || 0);
          
          // Se está pendente/parcial, também conta como em aberto
          if (p.payment_status === 'pendente' || p.payment_status === 'parcial') {
            totalPending += safeNumber(p.total_price || 0);
          }
        }
      });
    }
  });
  
  // Atualizar cartões do dashboard
  document.getElementById('crm-total-spent').textContent = formatMoney(totalSpent);
  document.getElementById('crm-total-pending').textContent = formatMoney(totalPending);
}

// Inicializar CRM quando a página for carregada
function initializeCrm() {
  // ✅ NOVO: Configurar listeners para sincronização entre abas
  setupCrmPixStorageListener();
  
  // ✅ NOVO: Verificar PIX ao carregar página (sincronizar com backend)
  checkCrmPixOnPageLoad();
  
  // ✅ NOVO: Iniciar sincronização periódica com backend (múltiplos dispositivos)
  startCrmPixBackendSync();
  
  loadCrmCustomers('all');
}

// ✅ Parar sincronização ao fechar página
window.addEventListener('beforeunload', () => {
  stopCrmPixBackendSync();
});

// ✅ NOVO: Inicializar CRM automaticamente quando a página carrega
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeCrm);
} else {
  // Se o DOM já foi carregado, chamar diretamente
  initializeCrm();
}
