// ==================== CRM CLIENTS MANAGEMENT ====================

// Estado global do CRM
const crmState = {
  currentCustomerId: null,
  customers: [],
  currentPurchases: [],
  filters: 'all'
};

// GET: Listar clientes
async function loadCrmCustomers(filter = 'all') {
  try {
    const url = filter === 'all' 
      ? `${API_BASE}/crm/customers`
      : `${API_BASE}/crm/customers?filter=${filter}`;
    
    const response = await fetch(url);
    const customers = await response.json();
    
    crmState.customers = customers;
    crmState.filters = filter;
    renderCrmCustomersTable();
  } catch (error) {
    console.error('Erro ao carregar clientes:', error);
    showToast('Erro ao carregar clientes', 'error');
  }
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
          <td data-label="Total Gasto" style="text-align: right;">R$ ${parseFloat(totalSpent || 0).toFixed(2)}</td>
          <td data-label="Em Aberto" style="text-align: right; color: #e74c3c; font-weight: 700;">R$ ${parseFloat(debtAmount || 0).toFixed(2)}</td>
          <td data-label="Compras">${customer.stats?.total_purchases || 0} compras</td>
          <td data-label="Ações">
            <button class="btn btn-sm btn-ghost" onclick="openCrmCustomerDetail(${customer.id})" title="Ver detalhes">👁️</button>
            <button class="btn btn-sm btn-ghost" onclick="openEditCrmCustomerComplete(${customer.id})" title="Editar tudo de uma vez" style="color: #d97706; font-weight: bold;">🔧</button>
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
    const monthRevenue = periodStats?.this_month || 0;
    const yearRevenue = periodStats?.this_year || 0;
    const avgTicket = stats?.average_ticket || 0;
    const pendingAmount = stats?.pending || 0;
    const paidAmount = stats?.paid || 0;
    
    let html = `
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px;">
        <div style="background: #f0e8d0; padding: 16px; border-radius: 8px; border-left: 4px solid var(--vermelho);">
          <div style="font-size: 11px; color: #999; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Total Comprado</div>
          <div style="font-size: 24px; font-weight: 900; color: var(--marrom); margin-top: 8px;">R$ ${parseFloat(stats?.total_spent || 0).toFixed(2)}</div>
        </div>
        <div style="background: #f0e8d0; padding: 16px; border-radius: 8px; border-left: 4px solid var(--amarelo);">
          <div style="font-size: 11px; color: #999; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Número de Compras</div>
          <div style="font-size: 24px; font-weight: 900; color: var(--marrom); margin-top: 8px;">${stats?.total_purchases || 0}</div>
        </div>
        <div style="background: #d4edda; padding: 16px; border-radius: 8px; border-left: 4px solid #27ae60;">
          <div style="font-size: 11px; color: #999; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Pago</div>
          <div style="font-size: 24px; font-weight: 900; color: #27ae60; margin-top: 8px;">R$ ${parseFloat(paidAmount).toFixed(2)}</div>
        </div>
        <div style="background: #fff3cd; padding: 16px; border-radius: 8px; border-left: 4px solid #f39c12;">
          <div style="font-size: 11px; color: #999; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Em Aberto</div>
          <div style="font-size: 24px; font-weight: 900; color: #f39c12; margin-top: 8px;">R$ ${parseFloat(pendingAmount).toFixed(2)}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px;">
        <div style="background: #f4f0ea; padding: 12px; border-radius: 6px; text-align: center;">
          <div style="font-size: 24px; font-weight: 900; color: var(--marrom);">R$ ${parseFloat(avgTicket).toFixed(2)}</div>
          <div style="font-size: 10px; color: #999; text-transform: uppercase; font-weight: 700; margin-top: 4px;">Ticket Médio</div>
        </div>
        <div style="background: #f4f0ea; padding: 12px; border-radius: 6px; text-align: center;">
          <div style="font-size: 24px; font-weight: 900; color: var(--marrom);">R$ ${parseFloat(monthRevenue).toFixed(2)}</div>
          <div style="font-size: 10px; color: #999; text-transform: uppercase; font-weight: 700; margin-top: 4px;">Este Mês</div>
        </div>
        <div style="background: #f4f0ea; padding: 12px; border-radius: 6px; text-align: center;">
          <div style="font-size: 24px; font-weight: 900; color: var(--marrom);">R$ ${parseFloat(yearRevenue).toFixed(2)}</div>
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
          ${customer.credit_limit > 0 ? `<div style="margin-bottom: 8px;"><strong>Limite de Crédito:</strong> R$ ${parseFloat(customer.credit_limit).toFixed(2)}</div>` : ''}
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
        crmOrdersData[orderId] = {
          customerName: customer.full_name,
          customerWhatsApp: customer.whatsapp,
          purchaseDate: dateFormatted,
          products: dateItems,
          dayTotal: dayTotal,
          dayStatus: dayStatus
        };

        html += `
          <div style="background: #ffffff; border: 1px solid #e8e0d4; border-radius: 8px; padding: 16px; margin-bottom: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); cursor: pointer; transition: all 0.3s ease;" onclick="openCrmPurchaseDayModal('${orderId}', ${customerId}, '${dateKey}')" onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1); transform: translateY(-2px)'" onmouseout="this.style.boxShadow='0 2px 4px rgba(0,0,0,0.05); transform: translateY(0)'" style="cursor: pointer;">
            <!-- Cabeçalho do Card - RESPONSIVO -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 2px solid #f4f0ea; flex-wrap: wrap; gap: 12px;">
              <div style="flex: 1; min-width: 120px;">
                <div style="font-size: 13px; font-weight: 700; color: var(--marrom);">📅 ${dateFormatted}</div>
                <div style="font-size: 11px; color: #999; margin-top: 4px;">
                  ${dateItems.length} produto${dateItems.length !== 1 ? 's' : ''} • ${dayQty} unidade${dayQty !== 1 ? 's' : ''}
                </div>
              </div>
              <div style="text-align: right; flex: 1; min-width: 100px;">
                <div style="font-size: 16px; font-weight: 900; color: var(--vermelho);">R$ ${dayTotal.toFixed(2)}</div>
                <span class="status-pill s-${dayStatus}" style="font-size: 10px; margin-top: 4px; display: inline-block;">
                  ${dayStatus === 'pago' ? '✓ PAGO' : dayStatus === 'parcial' ? '◐ PARCIAL' : '○ PENDENTE'}
                </span>
              </div>
              <div style="width: 100%; display: flex; gap: 8px; flex-wrap: wrap;">
                <button class="btn btn-sm btn-success" onclick="event.stopPropagation(); sendOrderViaWhatsApp('${orderId}')" 
                        title="Enviar pedido via WhatsApp" 
                        style="flex: 1; min-width: 140px; padding: 8px 12px; white-space: nowrap; background: #25d366 !important; color: white !important; border: none !important;">
                  ENVIAR PARA O WHATSAPP
                </button>
                <button class="btn btn-sm btn-warning" onclick="event.stopPropagation(); openEditCrmPurchaseDay('${orderId}', ${customerId}, '${dateKey}'); return false;" 
                        title="Editar compra" 
                        style="flex: 1; min-width: 140px; padding: 8px 12px; white-space: nowrap; background: #f39c12 !important; color: white !important; border: none !important;">
                  ✏️ EDITAR COMPRA
                </button>
                ${hasPixPending ? 
                  `<button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); generateCrmPixQrCode('${orderId}')" 
                          title="Gerar Código PIX" 
                          style="flex: 1; min-width: 140px; padding: 8px 12px; white-space: nowrap;">
                    💳 GERAR CÓDIGO PIX
                  </button>` 
                  : ''}
              </div>
            </div>

            <!-- Produtos do dia -->
            <div style="space-y: 8px;">
              ${dateItems.map((p, idx) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; ${idx < dateItems.length - 1 ? 'border-bottom: 1px solid #f4f0ea;' : ''}">
                  <div style="flex: 1;">
                    <div style="font-weight: 600; color: var(--marrom); margin-bottom: 4px;">
                      ${p.product_name}
                      <span style="font-weight: 400; color: #999;"> (${p.quantity}x)</span>
                    </div>
                    <div style="font-size: 11px; color: #999;">
                      ${p.payment_method ? `${p.payment_method}` : 'Não especificado'}
                      ${p.payment_status && p.payment_status !== dayStatus ? ` • ${p.payment_status}` : ''}
                    </div>
                  </div>
                  <div style="text-align: right; min-width: 120px;">
                    <div style="font-size: 12px; color: #666;">
                      R$ ${parseFloat(p.unit_price).toFixed(2)} × ${p.quantity}
                    </div>
                    <div style="font-weight: 700; color: var(--vermelho); margin-top: 2px;">
                      R$ ${parseFloat(p.total_price).toFixed(2)}
                    </div>
                  </div>
                  <div style="display: flex; gap: 4px; margin-left: 12px;" onclick="event.stopPropagation();">
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

// ==================== EDITAR CLIENTE COMPLETO ====================

// Abrir modal de editar cliente completo (com todos os campos em uma tela)
async function openEditCrmCustomerComplete(customerId) {
  try {
    const response = await fetch(`${API_BASE}/crm/customers/${customerId}`);
    const data = await response.json();
    const customer = data.customer;

    // Criar ou obter modal de edição completa
    let modal = document.getElementById('crmEditCompleteModal');
    if (!modal) {
      document.body.insertAdjacentHTML('beforeend', `
        <div id="crmEditCompleteModal" class="modal-overlay" style="display: none;">
          <div class="modal" style="max-width: 90%; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 24px 32px; border-bottom: 2px solid #e8e0d4; background: linear-gradient(135deg, var(--marrom) 0%, #8B4513 100%); color: white; border-radius: 12px 12px 0 0;">
              <h2 id="crmEditCompleteTitle" style="margin: 0; font-size: 24px; font-weight: 900;">Editar Cliente Completo</h2>
              <button onclick="closeCrmEditCompleteModal()" style="background: transparent; border: none; color: white; font-size: 24px; cursor: pointer;">✕</button>
            </div>
            <div id="crmEditCompleteBody" style="padding: 24px 32px;"></div>
            <div style="padding: 24px 32px; border-top: 2px solid #e8e0d4; display: flex; gap: 12px; justify-content: flex-end;">
              <button onclick="closeCrmEditCompleteModal()" class="btn btn-secondary">Cancelar</button>
              <button onclick="saveCrmCustomerFromComplete()" class="btn btn-primary">💾 Salvar Alterações</button>
            </div>
          </div>
        </div>
      `);
      modal = document.getElementById('crmEditCompleteModal');
    }

    const body = document.getElementById('crmEditCompleteBody');
    const title = document.getElementById('crmEditCompleteTitle');
    
    title.textContent = `🔧 Editar ${customer.full_name}`;

    body.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">
        <!-- Coluna 1: Informações Básicas -->
        <div>
          <h4 style="font-size: 14px; font-weight: 700; color: var(--marrom); margin-top: 0; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1px;">👤 Informações Básicas</h4>
          
          <div class="fg" style="margin-bottom: 16px;">
            <label>Nome Completo *</label>
            <input type="text" id="ecFullName" placeholder="João Silva Santos" value="${customer.full_name}" style="font-size: 16px; padding: 12px;">
          </div>
          
          <div class="fg" style="margin-bottom: 16px;">
            <label>Aniversário</label>
            <input type="date" id="ecBirthday" value="${customer.birthday ? (typeof customer.birthday === 'string' ? customer.birthday : customer.birthday).split('T')[0] : ''}" style="font-size: 16px; padding: 12px;">
          </div>

          <div style="background: #f0e8d0; padding: 12px; border-radius: 6px; border-left: 4px solid var(--marrom);">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; margin: 0;">
              <input type="checkbox" id="ecIsVip" ${customer.is_vip ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
              <span style="font-weight: 600;">Cliente VIP ⭐</span>
            </label>
          </div>

          <div style="background: #fff3cd; padding: 12px; border-radius: 6px; border-left: 4px solid #f39c12; margin-top: 12px;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; margin: 0;">
              <input type="checkbox" id="ecIsInactive" ${customer.is_inactive ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
              <span style="font-weight: 600;">Cliente Inativo</span>
            </label>
          </div>
        </div>

        <!-- Coluna 2: Contato -->
        <div>
          <h4 style="font-size: 14px; font-weight: 700; color: var(--marrom); margin-top: 0; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1px;">📞 Contato</h4>
          
          <div class="fg" style="margin-bottom: 16px;">
            <label>Telefone</label>
            <input type="text" id="ecPhone" placeholder="(11) 98765-4321" value="${customer.phone || ''}" style="font-size: 16px; padding: 12px;">
          </div>

          <div class="fg" style="margin-bottom: 16px;">
            <label>WhatsApp</label>
            <input type="text" id="ecWhatsapp" placeholder="(11) 98765-4321" value="${customer.whatsapp || ''}" style="font-size: 16px; padding: 12px;">
          </div>
        </div>

        <!-- Coluna 3: Endereço -->
        <div>
          <h4 style="font-size: 14px; font-weight: 700; color: var(--marrom); margin-top: 0; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1px;">🏠 Endereço</h4>
          
          <div class="fg" style="margin-bottom: 16px;">
            <label>Endereço Completo</label>
            <input type="text" id="ecAddress" placeholder="Rua das Flores, 123" value="${customer.address || ''}" style="font-size: 16px; padding: 12px;">
          </div>

          <div class="fg" style="margin-bottom: 16px;">
            <label>Bairro</label>
            <input type="text" id="ecNeighborhood" placeholder="Vila Mariana" value="${customer.neighborhood || ''}" style="font-size: 16px; padding: 12px;">
          </div>

          <div class="fg">
            <label>Cidade</label>
            <input type="text" id="ecCity" placeholder="São Paulo" value="${customer.city || ''}" style="font-size: 16px; padding: 12px;">
          </div>
        </div>

        <!-- Coluna 4: Crédito e Observações -->
        <div>
          <h4 style="font-size: 14px; font-weight: 700; color: var(--marrom); margin-top: 0; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1px;">💰 Crédito</h4>
          
          <div class="fg" style="margin-bottom: 16px;">
            <label>Limite de Crédito (R$)</label>
            <input type="number" id="ecCreditLimit" placeholder="0" step="0.01" value="${customer.credit_limit || 0}" style="font-size: 16px; padding: 12px;">
          </div>
        </div>

        <!-- Observações em coluna cheia -->
      </div>

      <div style="margin-top: 24px;">
        <h4 style="font-size: 14px; font-weight: 700; color: var(--marrom); margin-top: 0; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1px;">📝 Observações</h4>
        <textarea id="ecObservations" placeholder="Anotações sobre o cliente..." style="width: 100%; height: 100px; font-size: 14px; padding: 12px; border: 1px solid #e8e0d4; border-radius: 6px; font-family: 'Courier New', monospace;">${customer.observations || ''}</textarea>
      </div>
    `;

    // Armazenar ID para salvar depois
    modal.dataset.customerId = customerId;
    modal.classList.add('open');
  } catch (error) {
    console.error('Erro ao carregar cliente:', error);
    showToast('Erro ao carregar cliente', 'error');
  }
}

function closeCrmEditCompleteModal() {
  const modal = document.getElementById('crmEditCompleteModal');
  if (modal) modal.classList.remove('open');
}

async function saveCrmCustomerFromComplete() {
  const modal = document.getElementById('crmEditCompleteModal');
  const customerId = modal.dataset.customerId;

  const fullName = document.getElementById('ecFullName').value.trim();
  
  if (!fullName) {
    showToast('Nome completo é obrigatório', 'warning');
    return;
  }

  const payload = {
    full_name: fullName,
    phone: document.getElementById('ecPhone').value || null,
    whatsapp: document.getElementById('ecWhatsapp').value || null,
    address: document.getElementById('ecAddress').value || null,
    neighborhood: document.getElementById('ecNeighborhood').value || null,
    city: document.getElementById('ecCity').value || null,
    birthday: document.getElementById('ecBirthday').value || null,
    credit_limit: parseFloat(document.getElementById('ecCreditLimit').value) || 0,
    observations: document.getElementById('ecObservations').value || null,
    is_vip: document.getElementById('ecIsVip').checked,
    is_inactive: document.getElementById('ecIsInactive').checked
  };

  try {
    const response = await fetch(`${API_BASE}/crm/customers/${customerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.error || 'Erro ao salvar');
    }

    showToast('✅ Cliente atualizado com sucesso!', 'success');
    closeCrmEditCompleteModal();
    loadCrmCustomers(crmState.filters);
  } catch (error) {
    console.error('Erro ao salvar cliente:', error);
    showToast(`Erro ao salvar cliente: ${error.message}`, 'error');
  }
}

// ==================== VISUALIZAR COMPRAS DO DIA ====================

// Abrir modal para visualizar/editar compras do dia
async function openCrmPurchaseDayModal(orderId, customerId, purchaseDate) {
  try {
    const response = await fetch(`${API_BASE}/crm/customers/${customerId}`);
    const data = await response.json();
    const customer = data.customer;
    const purchases = data.purchases || [];

    // Filtrar compras do dia
    const dayPurchases = purchases.filter(p => p.purchase_date === purchaseDate);
    
    if (!dayPurchases.length) {
      showToast('Nenhuma compra encontrada para este dia', 'warning');
      return;
    }

    // Criar ou obter modal
    let modal = document.getElementById('crmPurchaseDayModal');
    if (!modal) {
      document.body.insertAdjacentHTML('beforeend', `
        <div id="crmPurchaseDayModal" class="modal-overlay" style="display: none;">
          <div class="modal" style="max-width: 90%; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 24px 32px; border-bottom: 2px solid #e8e0d4; background: linear-gradient(135deg, var(--verde) 0%, #27a745 100%); color: white; border-radius: 12px 12px 0 0;">
              <h2 id="crmPurchaseDayTitle" style="margin: 0; font-size: 24px; font-weight: 900;">Compras do Dia</h2>
              <button onclick="closeCrmPurchaseDayModal()" style="background: transparent; border: none; color: white; font-size: 24px; cursor: pointer;">✕</button>
            </div>
            <div id="crmPurchaseDayBody" style="padding: 24px 32px;"></div>
            <div style="padding: 24px 32px; border-top: 2px solid #e8e0d4; display: flex; gap: 12px; justify-content: flex-end;">
              <button onclick="closeCrmPurchaseDayModal()" class="btn btn-secondary">Fechar</button>
            </div>
          </div>
        </div>
      `);
      modal = document.getElementById('crmPurchaseDayModal');
    }

    const body = document.getElementById('crmPurchaseDayBody');
    const title = document.getElementById('crmPurchaseDayTitle');
    
    const dateFormatted = formatDateString(purchaseDate);
    title.textContent = `📦 Compras de ${customer.full_name} - ${dateFormatted}`;

    let dayTotal = 0;
    let dayQty = 0;
    dayPurchases.forEach(p => {
      dayTotal += parseFloat(p.total_price || 0);
      dayQty += p.quantity || 0;
    });

    let html = `
      <div style="background: #f0f8f0; padding: 16px; border-radius: 8px; border-left: 4px solid var(--verde); margin-bottom: 24px;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
          <div>
            <div style="font-size: 11px; color: #666; text-transform: uppercase; font-weight: 700;">👤 Cliente</div>
            <div style="font-size: 16px; font-weight: 900; color: var(--marrom); margin-top: 4px;">${customer.full_name}</div>
          </div>
          <div>
            <div style="font-size: 11px; color: #666; text-transform: uppercase; font-weight: 700;">📅 Data</div>
            <div style="font-size: 16px; font-weight: 900; color: var(--marrom); margin-top: 4px;">${dateFormatted}</div>
          </div>
          <div>
            <div style="font-size: 11px; color: #666; text-transform: uppercase; font-weight: 700;">📊 Qtd Produtos</div>
            <div style="font-size: 16px; font-weight: 900; color: var(--marrom); margin-top: 4px;">${dayPurchases.length} item(ns)</div>
          </div>
          <div>
            <div style="font-size: 11px; color: #666; text-transform: uppercase; font-weight: 700;">📦 Unidades</div>
            <div style="font-size: 16px; font-weight: 900; color: var(--marrom); margin-top: 4px;">${dayQty} un</div>
          </div>
          <div style="background: white; padding: 12px; border-radius: 6px; border-left: 4px solid var(--vermelho);">
            <div style="font-size: 11px; color: #666; text-transform: uppercase; font-weight: 700;">💰 Total do Dia</div>
            <div style="font-size: 18px; font-weight: 900; color: var(--vermelho); margin-top: 4px;">R$ ${dayTotal.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <h4 style="font-size: 14px; font-weight: 700; color: var(--marrom); margin: 24px 0 16px 0; text-transform: uppercase; letter-spacing: 1px;">Itens do Dia</h4>

      <div style="display: grid; gap: 12px;">
        ${dayPurchases.map((p, idx) => {
          const statusColor = p.payment_status === 'pago' ? '#27ae60' : p.payment_status === 'parcial' ? '#f39c12' : '#e74c3c';
          const statusText = p.payment_status === 'pago' ? '✓ PAGO' : p.payment_status === 'parcial' ? '◐ PARCIAL' : '○ PENDENTE';
          
          return `
            <div style="background: white; border: 2px solid #e8e0d4; border-radius: 8px; padding: 16px; display: grid; grid-template-columns: 1fr auto; gap: 16px; align-items: start;">
              <div>
                <div style="font-size: 14px; font-weight: 700; color: var(--marrom); margin-bottom: 8px;">${p.product_name}</div>
                <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
                  <strong>Quantidade:</strong> ${p.quantity} un<br>
                  <strong>Preço Unitário:</strong> R$ ${parseFloat(p.unit_price).toFixed(2)}<br>
                  <strong>Método de Pagamento:</strong> ${p.payment_method || 'Não especificado'}<br>
                  <strong>Status:</strong> <span style="color: ${statusColor}; font-weight: 700;">${statusText}</span>
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 18px; font-weight: 900; color: var(--vermelho); margin-bottom: 12px;">R$ ${parseFloat(p.total_price).toFixed(2)}</div>
                <div style="display: flex; flex-direction: column; gap: 6px;">
                  <button class="btn btn-sm btn-secondary" onclick="openEditCrmPurchase(${customerId}, ${p.id})" style="white-space: nowrap;">✏️ Editar</button>
                  <button class="btn btn-sm btn-danger" onclick="deleteCrmPurchase(${customerId}, ${p.id}); closeCrmPurchaseDayModal();" style="white-space: nowrap;">🗑️ Deletar</button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    body.innerHTML = html;
    modal.classList.add('open');
  } catch (error) {
    console.error('Erro ao carregar compras do dia:', error);
    showToast('Erro ao carregar compras', 'error');
  }
}

function closeCrmPurchaseDayModal() {
  const modal = document.getElementById('crmPurchaseDayModal');
  if (modal) modal.classList.remove('open');
}

// ==================== EDITAR COMPRA COMPLETA ====================

async function openEditCrmPurchaseDay(orderId, customerId, purchaseDate) {
  try {
    const response = await fetch(`${API_BASE}/crm/customers/${customerId}`);
    const data = await response.json();
    const customer = data.customer;
    const purchases = data.purchases || [];

    // Filtrar compras do dia
    const dayPurchases = purchases.filter(p => p.purchase_date === purchaseDate);
    
    if (!dayPurchases.length) {
      showToast('Nenhuma compra encontrada para este dia', 'warning');
      return;
    }

    // Calcular totais do dia
    let dayTotal = 0;
    dayPurchases.forEach(p => {
      dayTotal += parseFloat(p.total_price || 0);
    });

    // Criar ou obter modal
    let modal = document.getElementById('crmEditPurchaseDayModal');
    if (!modal) {
      document.body.insertAdjacentHTML('beforeend', `
        <div id="crmEditPurchaseDayModal" class="modal-overlay" style="display: none;">
          <div class="modal" style="max-width: 90%; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 24px 32px; border-bottom: 2px solid #e8e0d4; background: linear-gradient(135deg, #f39c12 0%, #d97706 100%); color: white; border-radius: 12px 12px 0 0;">
              <h2 id="crmEditPurchaseDayTitle" style="margin: 0; font-size: 24px; font-weight: 900;">✏️ Editar Compra do Dia</h2>
              <button onclick="closeCrmEditPurchaseDayModal()" style="background: transparent; border: none; color: white; font-size: 24px; cursor: pointer;">✕</button>
            </div>
            <div id="crmEditPurchaseDayBody" style="padding: 24px 32px;"></div>
            <div style="padding: 24px 32px; border-top: 2px solid #e8e0d4; display: flex; gap: 12px; justify-content: flex-end;">
              <button onclick="closeCrmEditPurchaseDayModal()" class="btn btn-secondary">Cancelar</button>
              <button onclick="saveCrmEditPurchaseDay('${orderId}', '${purchaseDate}', ${customerId})" class="btn btn-success">💾 Salvar Alterações</button>
            </div>
          </div>
        </div>
      `);
      modal = document.getElementById('crmEditPurchaseDayModal');
    }

    const body = document.getElementById('crmEditPurchaseDayBody');
    const title = document.getElementById('crmEditPurchaseDayTitle');
    
    const dateFormatted = formatDateString(purchaseDate);
    title.textContent = `✏️ Editar Compra - ${customer.full_name} (${dateFormatted})`;

    // Determinar status geral do dia
    let dayStatus = 'pago';
    if (dayPurchases.some(p => p.payment_status === 'pendente')) {
      dayStatus = 'pendente';
    } else if (dayPurchases.some(p => p.payment_status === 'parcial')) {
      dayStatus = 'parcial';
    }

    // Montar HTML da modal de edição
    let html = `
      <div style="background: #fff9f0; padding: 16px; border-radius: 8px; border-left: 4px solid #f39c12; margin-bottom: 24px;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
          <div>
            <div style="font-size: 11px; color: #666; text-transform: uppercase; font-weight: 700;">👤 Cliente</div>
            <div style="font-size: 16px; font-weight: 900; color: var(--marrom); margin-top: 4px;">${customer.full_name}</div>
          </div>
          <div>
            <div style="font-size: 11px; color: #666; text-transform: uppercase; font-weight: 700;">📅 Data</div>
            <div style="font-size: 16px; font-weight: 900; color: var(--marrom); margin-top: 4px;">${dateFormatted}</div>
          </div>
          <div>
            <div style="font-size: 11px; color: #666; text-transform: uppercase; font-weight: 700;">📊 Qtd Produtos</div>
            <div style="font-size: 16px; font-weight: 900; color: var(--marrom); margin-top: 4px;">${dayPurchases.length} item(ns)</div>
          </div>
          <div style="background: white; padding: 12px; border-radius: 6px; border-left: 4px solid var(--vermelho);">
            <div style="font-size: 11px; color: #666; text-transform: uppercase; font-weight: 700;">💰 Total do Dia</div>
            <div style="font-size: 18px; font-weight: 900; color: var(--vermelho); margin-top: 4px;">R$ ${dayTotal.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <h4 style="font-size: 14px; font-weight: 700; color: var(--marrom); margin: 24px 0 16px 0; text-transform: uppercase; letter-spacing: 1px;">⚙️ Configurações da Compra</h4>

      <div style="display: grid; gap: 16px; margin-bottom: 24px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div>
            <label for="editDayPaymentStatus" style="display: block; font-size: 12px; font-weight: 700; color: #666; text-transform: uppercase; margin-bottom: 8px;">Status de Pagamento</label>
            <select id="editDayPaymentStatus" style="width: 100%; padding: 10px; border: 2px solid #e8e0d4; border-radius: 6px; font-size: 14px; font-weight: 600; color: var(--marrom);">
              <option value="pendente" ${dayStatus === 'pendente' ? 'selected' : ''}>○ PENDENTE</option>
              <option value="parcial" ${dayStatus === 'parcial' ? 'selected' : ''}>◐ PARCIAL</option>
              <option value="pago" ${dayStatus === 'pago' ? 'selected' : ''}>✓ PAGO</option>
            </select>
          </div>
          <div>
            <label for="editDayPaymentMethod" style="display: block; font-size: 12px; font-weight: 700; color: #666; text-transform: uppercase; margin-bottom: 8px;">Método de Pagamento Padrão</label>
            <select id="editDayPaymentMethod" style="width: 100%; padding: 10px; border: 2px solid #e8e0d4; border-radius: 6px; font-size: 14px; font-weight: 600; color: var(--marrom);">
              <option value="">-- Selecionar --</option>
              <option value="dinheiro">💵 Dinheiro</option>
              <option value="cartao">💳 Cartão</option>
              <option value="pix">📱 PIX</option>
              <option value="cheque">✓ Cheque</option>
            </select>
          </div>
        </div>

        <div>
          <label for="editDayNotes" style="display: block; font-size: 12px; font-weight: 700; color: #666; text-transform: uppercase; margin-bottom: 8px;">Observações/Notas</label>
          <textarea id="editDayNotes" style="width: 100%; padding: 10px; border: 2px solid #e8e0d4; border-radius: 6px; font-size: 14px; min-height: 80px; font-family: inherit;" placeholder="Adicione notas sobre esta compra..."></textarea>
        </div>
      </div>

      <h4 style="font-size: 14px; font-weight: 700; color: var(--marrom); margin: 24px 0 16px 0; text-transform: uppercase; letter-spacing: 1px;">📦 Produtos da Compra</h4>

      <div style="display: grid; gap: 12px;">
        ${dayPurchases.map((p, idx) => {
          const statusColor = p.payment_status === 'pago' ? '#27ae60' : p.payment_status === 'parcial' ? '#f39c12' : '#e74c3c';
          const statusText = p.payment_status === 'pago' ? '✓ PAGO' : p.payment_status === 'parcial' ? '◐ PARCIAL' : '○ PENDENTE';
          
          return `
            <div style="background: white; border: 2px solid #e8e0d4; border-radius: 8px; padding: 16px; display: grid; grid-template-columns: 1fr auto; gap: 16px; align-items: start;">
              <div>
                <div style="font-size: 14px; font-weight: 700; color: var(--marrom); margin-bottom: 8px;">${p.product_name}</div>
                <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
                  <strong>Quantidade:</strong> ${p.quantity} un<br>
                  <strong>Preço Unitário:</strong> R$ ${parseFloat(p.unit_price).toFixed(2)}<br>
                  <strong>Método de Pagamento:</strong> ${p.payment_method || 'Não especificado'}<br>
                  <strong>Status:</strong> <span style="color: ${statusColor}; font-weight: 700;">${statusText}</span>
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 18px; font-weight: 900; color: var(--vermelho); margin-bottom: 12px;">R$ ${parseFloat(p.total_price).toFixed(2)}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <input type="hidden" id="editDayOrderId" value="${orderId}">
      <input type="hidden" id="editDayCustomerId" value="${customerId}">
      <input type="hidden" id="editDayPurchaseDate" value="${purchaseDate}">
    `;

    body.innerHTML = html;
    modal.classList.add('open');
  } catch (error) {
    console.error('Erro ao carregar dados para edição:', error);
    showToast('Erro ao carregar dados para edição', 'error');
  }
}

function closeCrmEditPurchaseDayModal() {
  const modal = document.getElementById('crmEditPurchaseDayModal');
  if (modal) modal.classList.remove('open');
}

async function saveCrmEditPurchaseDay(orderId, purchaseDate, customerId) {
  try {
    const paymentStatus = document.getElementById('editDayPaymentStatus')?.value;
    const paymentMethod = document.getElementById('editDayPaymentMethod')?.value;
    const notes = document.getElementById('editDayNotes')?.value;

    if (!paymentStatus) {
      showToast('Por favor, selecione um status de pagamento', 'warning');
      return;
    }

    // Buscar todas as compras do dia
    const response = await fetch(`${API_BASE}/crm/customers/${customerId}`);
    const data = await response.json();
    const purchases = data.purchases || [];
    const dayPurchases = purchases.filter(p => p.purchase_date === purchaseDate);

    // Atualizar cada compra do dia com o novo status/método
    const updatePromises = dayPurchases.map(purchase => {
      const updateData = {
        payment_status: paymentStatus
      };

      // Só atualizar método de pagamento se foi selecionado
      if (paymentMethod) {
        updateData.payment_method = paymentMethod;
      }

      // Só atualizar notas se houver
      if (notes) {
        updateData.notes = notes;
      }

      return fetch(`${API_BASE}/crm/customers/${customerId}/purchases/${purchase.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
    });

    await Promise.all(updatePromises);

    showToast('✅ Compra atualizada com sucesso!');
    closeCrmEditPurchaseDayModal();
    
    // Recarregar os dados do CRM
    openCrmCustomerDetail(customerId);
  } catch (error) {
    console.error('Erro ao salvar alterações:', error);
    showToast('Erro ao salvar alterações: ' + error.message, 'error');
  }
}

// ==================== PIX QR CODE GENERATION ====================

// Variável para armazenar dados do PIX gerado
let crmCurrentPixData = null;
let crmCurrentOrderId = null;

// Variáveis para polling de pagamento no CRM
let crmPaymentPollingInterval = null;
let crmPaymentPollingTimeout = null;
let crmPaymentPollingAttempts = 0;
let crmPaymentPollingFailures = 0;
let crmPaymentPollingStartTime = null;
let crmPaymentPollingInterval_ms = 2000; // Começa a cada 2s

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
  document.getElementById('crmPixAmount').textContent = `R$ ${orderData.dayTotal.toFixed(2)}`;
  document.getElementById('crmPixQrCode').innerHTML = '⏳ Gerando QR Code...';
  document.getElementById('crmPixCode').value = '';
  
  crmCurrentOrderId = orderId;
  
  try {
    console.log('📝 Gerando PIX para CRM...', { amount: orderData.dayTotal });
    
    // Chamar API de pagamento PIX (mesma do site)
    const response = await fetch(API_BASE + '/payments/pix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: null,
        amount: orderData.dayTotal,
        description: 'Pagamento - Cia de Condimentos (Pedido Admin)',
        payerEmail: 'admin@condimentos.com',
        payerPhone: orderData.customerWhatsApp || ''
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
      amount: pixData.amount
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
    
    // ✅ NOVO: Iniciar polling automático de confirmação
    console.log('🔄 Iniciando polling automático de confirmação PIX...');
    startCrmPaymentPolling();
    
  } catch (error) {
    console.error('❌ Erro ao gerar PIX:', error);
    showToast(`Erro ao gerar PIX: ${error.message}`, 'error');
    document.getElementById('crmPixQrCode').innerHTML = `❌ ${error.message}`;
  }
}

// Fechar modal de PIX QR code
function closeCrmPixQrModal() {
  const modal = document.getElementById('crmPixQrModal');
  if (modal) modal.classList.remove('open');
  
  // ✅ NOVO: Parar polling quando fecha modal
  stopCrmPaymentPolling();
  
  crmCurrentPixData = null;
  crmCurrentOrderId = null;
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
    message += `  Qtd: ${p.quantity} | R$ ${parseFloat(p.unit_price).toFixed(2)} | Total: R$ ${parseFloat(p.total_price).toFixed(2)}\n`;
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
            <span id="crmProdSubtotal-${p.id}" style="margin-left: 10px; font-weight: 700; color: #2c3e50;">R$ ${parseFloat(p.price).toFixed(2)}</span>
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
          <input type="number" id="crmProdTotal" placeholder="0.00" disabled style="background: #f4f0ea;" value="${parseFloat(purchase.total_price || 0).toFixed(2)}">
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
  crmSelectedProducts = {}; // Limpar seleção
}

// Salvar compra(s)
async function saveCrmPurchase() {
  const purchaseId = document.getElementById('crmPurchaseModal').dataset.purchaseId;

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
        <td style="text-align: right;">R$ ${parseFloat(totalSpent || 0).toFixed(2)}</td>
        <td style="text-align: right; color: #e74c3c; font-weight: 700;">R$ ${parseFloat(debtAmount || 0).toFixed(2)}</td>
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

// ==================== CRM DASHBOARD ====================

// Carregar e exibir dashboards dos clientes
function loadCrmDashboard() {
  if (!crmState.customers || crmState.customers.length === 0) {
    // Se os clientes não estão carregados, carregar primeiro
    fetch(`${API_BASE}/crm/customers`)
      .then(res => res.json())
      .then(customers => {
        crmState.customers = customers;
        renderCrmDashboard(customers);
      })
      .catch(error => {
        console.error('Erro ao carregar clientes para dashboard:', error);
        renderCrmDashboardEmpty();
      });
  } else {
    renderCrmDashboard(crmState.customers);
  }
}

function renderCrmDashboard(customers) {
  // Calcular estatísticas
  const totalCustomers = customers.length;
  const vipCustomers = customers.filter(c => c.is_vip).length;
  const totalSpent = customers.reduce((sum, c) => sum + (parseFloat(c.stats?.total_spent || 0)), 0);
  const totalPending = customers.reduce((sum, c) => sum + (parseFloat(c.stats?.pending || 0)), 0);

  // Atualizar os elementos do dashboard
  document.getElementById('crm-total-customers').textContent = totalCustomers.toString();
  document.getElementById('crm-vip-customers').textContent = vipCustomers.toString();
  document.getElementById('crm-total-spent').textContent = `R$ ${totalSpent.toFixed(2)}`;
  document.getElementById('crm-total-pending').textContent = `R$ ${totalPending.toFixed(2)}`;
}

function renderCrmDashboardEmpty() {
  document.getElementById('crm-total-customers').textContent = '0';
  document.getElementById('crm-vip-customers').textContent = '0';
  document.getElementById('crm-total-spent').textContent = 'R$ 0,00';
  document.getElementById('crm-total-pending').textContent = 'R$ 0,00';
}

// Inicializar CRM quando a página for carregada
function initializeCrm() {
  loadCrmCustomers('all');
  loadCrmDashboard();
}

// ==================== POLLING DE PAGAMENTO PIX NO CRM ====================

function startCrmPaymentPolling() {
  if (!crmCurrentPixData || !crmCurrentPixData.mp_payment_id) {
    console.warn('⚠️  Dados de polling não disponíveis');
    return;
  }
  
  // Reset das variáveis
  crmPaymentPollingAttempts = 0;
  crmPaymentPollingFailures = 0;
  crmPaymentPollingStartTime = Date.now();
  crmPaymentPollingInterval_ms = 2000; // Começar a cada 2 segundos
  
  console.log('⏱️  INICIANDO POLLING DE PAGAMENTO PIX NO CRM');
  console.log('   ID do pagamento:', crmCurrentPixData.mp_payment_id);
  console.log('   Intervalo inicial:', crmPaymentPollingInterval_ms + 'ms');
  
  // Limpar polling anterior se existir
  stopCrmPaymentPolling();
  
  // Fazer primeira verificação imediatamente
  checkCrmPaymentStatus();
  
  // Iniciar novo polling com intervalo adaptativo
  crmPaymentPollingInterval = setInterval(function() {
    checkCrmPaymentStatus();
  }, crmPaymentPollingInterval_ms);
  
  // Timeout de 30 minutos
  crmPaymentPollingTimeout = setTimeout(function() {
    console.warn('⚠️  TIMEOUT: Polling alcançou 30 minutos sem confirmação');
    stopCrmPaymentPolling();
    showToast('⏱️  Tempo limite atingido. Se você já pagou, o pagamento será processado em breve.', 'warning');
  }, 30 * 60 * 1000);
}

function stopCrmPaymentPolling() {
  if (crmPaymentPollingInterval) {
    clearInterval(crmPaymentPollingInterval);
    crmPaymentPollingInterval = null;
  }
  
  if (crmPaymentPollingTimeout) {
    clearTimeout(crmPaymentPollingTimeout);
    crmPaymentPollingTimeout = null;
  }
  
  if (crmPaymentPollingStartTime) {
    const duration = Math.round((Date.now() - crmPaymentPollingStartTime) / 1000);
    console.log('✓ Polling interrompido - Duração:', duration + 's', '- Tentativas:', crmPaymentPollingAttempts);
  } else {
    console.log('✓ Polling de pagamento interrompido');
  }
}

function checkCrmPaymentStatus() {
  if (!crmCurrentPixData || !crmCurrentPixData.mp_payment_id) return;
  
  crmPaymentPollingAttempts++;
  const attemptNumber = crmPaymentPollingAttempts;
  const elapsed = Math.round((Date.now() - crmPaymentPollingStartTime) / 1000);
  
  console.log(`\n📊 [POLLING CRM] Tentativa #${attemptNumber} (${elapsed}s decorridos) - Intervalo: ${crmPaymentPollingInterval_ms}ms`);
  
  // Verificar status no Mercado Pago
  fetch(API_BASE + '/payments/status/' + crmCurrentPixData.mp_payment_id, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000 // 10 segundos de timeout
  })
  .then(function(response) {
    if (response.ok) {
      return response.json();
    }
    throw new Error('Status: ' + response.status);
  })
  .then(function(paymentData) {
    console.log('✅ Resposta recebida - Status:', paymentData.status);
    
    // Reset de falhas ao receber resposta bem-sucedida
    crmPaymentPollingFailures = 0;
    crmPaymentPollingInterval_ms = 2000; // Voltar ao intervalo normal
    
    // Se pagamento foi aprovado
    if (paymentData.status === 'approved') {
      console.log('✅ ✅ ✅ PAGAMENTO APROVADO NO CRM! Mostrando confirmação...');
      stopCrmPaymentPolling();
      showCrmPaymentConfirmedModal(paymentData);
      return;
    }
    
    // Se ainda está pendente, log informativo
    if (paymentData.status === 'pending') {
      console.log('⏳ Pagamento ainda pendente - aguardando confirmação...');
    }
    
    // Outros status
    if (paymentData.status === 'rejected') {
      console.warn('❌ Pagamento rejeitado');
      stopCrmPaymentPolling();
      showToast('❌ Pagamento foi rejeitado. Tente novamente ou use outro método de pagamento.', 'error');
      return;
    }
    
    if (paymentData.status === 'cancelled') {
      console.warn('⛔ Pagamento cancelado');
      stopCrmPaymentPolling();
      showToast('⛔ Pagamento foi cancelado.', 'warning');
      return;
    }
  })
  .catch(function(error) {
    crmPaymentPollingFailures++;
    console.warn(`❌ Erro ao verificar status (Falha #${crmPaymentPollingFailures}):`, error.message);
    
    // Aumentar intervalo após falhas (backoff exponencial)
    if (crmPaymentPollingFailures >= 3) {
      // Após 3 falhas, aumentar intervalo progressivamente
      crmPaymentPollingInterval_ms = Math.min(crmPaymentPollingInterval_ms * 1.5, 10000);
      console.warn(`⚠️  Aumentando intervalo para ${crmPaymentPollingInterval_ms}ms (falhas: ${crmPaymentPollingFailures})`);
      
      // Atualizar intervalo do setInterval
      if (crmPaymentPollingInterval) {
        clearInterval(crmPaymentPollingInterval);
        crmPaymentPollingInterval = setInterval(function() {
          checkCrmPaymentStatus();
        }, crmPaymentPollingInterval_ms);
      }
    }
    
    // Se muitas falhas, mostrar aviso
    if (crmPaymentPollingFailures === 5) {
      console.warn('⚠️  Múltiplas falhas ao conectar. Verifique sua conexão...');
    }
  });
}

function showCrmPaymentConfirmedModal(paymentData) {
  console.log('🎉 Mostrando modal de confirmação de pagamento no CRM...');
  
  // Fechar modal anterior
  const pixQrModal = document.getElementById('crmPixQrModal');
  if (pixQrModal) {
    pixQrModal.classList.remove('open');
  }
  
  // Criar modal de confirmação se não existir
  if (!document.getElementById('crmPaymentConfirmedModal')) {
    createCrmPaymentConfirmedModal();
  }
  
  const modal = document.getElementById('crmPaymentConfirmedModal');
  if (modal) {
    // Atualizar informações
    const orderId = document.getElementById('crmConfirmedOrderId');
    if (orderId && crmCurrentOrderId) {
      orderId.textContent = crmCurrentOrderId;
    }
    
    const amount = document.getElementById('crmConfirmedAmount');
    if (amount && crmCurrentPixData && crmCurrentPixData.amount) {
      const amountValue = parseFloat(crmCurrentPixData.amount) || 0;
      const amountFormatted = 'R$ ' + amountValue.toFixed(2).replace('.', ',');
      amount.textContent = amountFormatted;
    }
    
    // Mostrar modal
    modal.classList.add('open');
    showToast('✅ Pagamento confirmado com sucesso!', 'success');
  }
}

function createCrmPaymentConfirmedModal() {
  if (document.getElementById('crmPaymentConfirmedModal')) {
    return;
  }
  
  const html = `
    <div id="crmPaymentConfirmedModal" class="modal-overlay" style="display: none;">
      <div class="modal" style="max-width: 90%; max-height: 90vh; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
        <div style="background: linear-gradient(135deg, var(--verde) 0%, #27a745 100%); color: white; padding: 32px 24px; text-align: center; border-radius: 12px 12px 0 0;">
          <div style="font-size: 60px; margin-bottom: 16px; animation: bounce 0.6s;">✅</div>
          <h2 style="margin: 0; font-size: 24px; font-weight: 900;">Pagamento Confirmado!</h2>
          <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.95;">O pagamento PIX foi processado com sucesso</p>
        </div>
        <div style="padding: 24px; text-align: center; background: white;">
          <p style="margin: 0 0 16px 0; font-size: 14px; color: #666;">
            <strong>Pedido:</strong> #<span id="crmConfirmedOrderId">-</span>
          </p>
          <p style="margin: 0 0 24px 0; font-size: 18px; color: var(--verde); font-weight: 700;">
            <span id="crmConfirmedAmount">R$ 0,00</span>
          </p>
          <div style="background: #f0f8f0; padding: 12px; border-radius: 8px; margin: 16px 0; border-left: 4px solid var(--verde);">
            <small style="color: #666;">✅ <strong>Seu pagamento foi registrado no sistema.</strong> Você será notificado em breve.</small>
          </div>
          <button onclick="closeCrmPaymentConfirmedModal()" style="background: var(--verde); color: white; border: none; padding: 12px 32px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 16px; min-height: 44px;">
            Fechar
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', html);
}

function closeCrmPaymentConfirmedModal() {
  const modal = document.getElementById('crmPaymentConfirmedModal');
  if (modal) {
    modal.classList.remove('open');
  }
  
  // Recarregar dados do CRM
  loadCrmCustomers('all');
  loadCrmDashboard();
}
