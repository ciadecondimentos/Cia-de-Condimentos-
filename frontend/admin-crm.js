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
          <input type="date" id="crmBirthday" value="${customer.birthday ? customer.birthday.split('T')[0] : ''}">
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

  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error('Erro ao salvar');

    showToast(customerId ? 'Cliente atualizado!' : 'Cliente criado!', 'success');
    closeCrmCustomerModal();
    loadCrmCustomers(crmState.filters);
  } catch (error) {
    console.error('Erro ao salvar cliente:', error);
    showToast('Erro ao salvar cliente', 'error');
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
          ${customer.birthday ? `<div style="margin-bottom: 8px;"><strong>Aniversário:</strong> ${new Date(customer.birthday).toLocaleDateString('pt-BR')}</div>` : ''}
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
      html += `
        <table style="width: 100%; font-size: 12px;">
          <thead>
            <tr style="background: #f4f0ea;">
              <th style="text-align: left; padding: 10px 8px;">Data</th>
              <th style="text-align: left; padding: 10px 8px;">Produto</th>
              <th style="text-align: center; padding: 10px 8px;">Qty</th>
              <th style="text-align: right; padding: 10px 8px;">Unitário</th>
              <th style="text-align: right; padding: 10px 8px;">Total</th>
              <th style="text-align: center; padding: 10px 8px;">Pagamento</th>
              <th style="text-align: center; padding: 10px 8px;">Status</th>
              <th style="text-align: center; padding: 10px 8px;">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${purchases.map(p => `
              <tr style="border-bottom: 1px solid #f4f0ea;">
                <td style="padding: 8px;">${new Date(p.purchase_date).toLocaleDateString('pt-BR')}</td>
                <td style="padding: 8px; font-weight: 700; color: var(--marrom);">${p.product_name}</td>
                <td style="padding: 8px; text-align: center;">${p.quantity}</td>
                <td style="padding: 8px; text-align: right;">R$ ${parseFloat(p.unit_price).toFixed(2)}</td>
                <td style="padding: 8px; text-align: right; font-weight: 700; color: var(--vermelho);">R$ ${parseFloat(p.total_price).toFixed(2)}</td>
                <td style="padding: 8px; text-align: center; font-size: 11px;">${p.payment_method || '-'}</td>
                <td style="padding: 8px; text-align: center;">
                  <span class="status-pill s-${p.payment_status?.toLowerCase() || 'pendente'}" style="font-size: 10px;">
                    ${p.payment_status === 'pago' ? '✓' : p.payment_status === 'parcial' ? '◐' : '○'} ${p.payment_status || 'pendente'}
                  </span>
                </td>
                <td style="padding: 8px; text-align: center;">
                  <button class="btn btn-sm btn-ghost" onclick="openEditCrmPurchase(${customerId}, ${p.id})" title="Editar" style="padding: 4px 8px; font-size: 11px;">✏️</button>
                  <button class="btn btn-sm btn-danger" onclick="deleteCrmPurchase(${customerId}, ${p.id})" title="Deletar" style="padding: 4px 8px; font-size: 11px; margin-left: 4px;">🗑️</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
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

// ==================== PURCHASES MANAGEMENT ====================

// Abrir modal para adicionar compra
function openAddCrmPurchase(customerId) {
  const modal = document.getElementById('crmPurchaseModal');
  const title = document.getElementById('crmPurchaseModalTitle');
  const body = document.getElementById('crmPurchaseModalBody');

  title.textContent = '➕ Nova Compra';

  body.innerHTML = `
    <div class="fg">
      <label>Nome do Produto *</label>
      <input type="text" id="crmProdName" placeholder="Ex: Pimenta Dedo de Moça - 500g">
    </div>
    <div class="form-row-3">
      <div class="fg">
        <label>Quantidade *</label>
        <input type="number" id="crmProdQty" placeholder="1" min="1" step="1">
      </div>
      <div class="fg">
        <label>Valor Unitário (R$) *</label>
        <input type="number" id="crmProdPrice" placeholder="0.00" min="0" step="0.01">
      </div>
      <div class="fg">
        <label>Total (R$)</label>
        <input type="number" id="crmProdTotal" placeholder="0.00" disabled style="background: #f4f0ea;">
      </div>
    </div>
    <div class="form-row-2">
      <div class="fg">
        <label>Data da Compra *</label>
        <input type="date" id="crmPurchaseDate" value="${new Date().toISOString().split('T')[0]}">
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
      <textarea id="crmPurchaseNotes" placeholder="Anotações sobre esta compra..."></textarea>
    </div>
  `;

  // Calcular total automaticamente
  document.getElementById('crmProdQty').addEventListener('input', calculateCrmTotal);
  document.getElementById('crmProdPrice').addEventListener('input', calculateCrmTotal);

  document.getElementById('crmPurchaseModal').dataset.customerId = customerId;
  modal.classList.add('open');
}

// Calcular total da compra
function calculateCrmTotal() {
  const qty = parseFloat(document.getElementById('crmProdQty').value) || 0;
  const price = parseFloat(document.getElementById('crmProdPrice').value) || 0;
  const total = qty * price;
  document.getElementById('crmProdTotal').value = total.toFixed(2);
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
          <input type="number" id="crmProdQty" placeholder="1" min="1" step="1" value="${purchase.quantity}">
        </div>
        <div class="fg">
          <label>Valor Unitário (R$) *</label>
          <input type="number" id="crmProdPrice" placeholder="0.00" min="0" step="0.01" value="${purchase.unit_price}">
        </div>
        <div class="fg">
          <label>Total (R$)</label>
          <input type="number" id="crmProdTotal" placeholder="0.00" disabled style="background: #f4f0ea;" value="${purchase.total_price.toFixed(2)}">
        </div>
      </div>
      <div class="form-row-2">
        <div class="fg">
          <label>Data da Compra *</label>
          <input type="date" id="crmPurchaseDate" value="${purchase.purchase_date.split('T')[0]}">
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
    document.getElementById('crmProdQty').addEventListener('input', calculateCrmTotal);
    document.getElementById('crmProdPrice').addEventListener('input', calculateCrmTotal);

    document.getElementById('crmPurchaseModal').dataset.customerId = customerId;
    document.getElementById('crmPurchaseModal').dataset.purchaseId = purchaseId;
    modal.classList.add('open');
  } catch (error) {
    console.error('Erro ao carregar compra:', error);
    showToast('Erro ao carregar compra', 'error');
  }
}

// Fechar modal de compra
function closeCrmPurchaseModal() {
  document.getElementById('crmPurchaseModal').classList.remove('open');
  delete document.getElementById('crmPurchaseModal').dataset.customerId;
  delete document.getElementById('crmPurchaseModal').dataset.purchaseId;
}

// Salvar compra
async function saveCrmPurchase() {
  const productName = document.getElementById('crmProdName').value.trim();
  const quantity = parseInt(document.getElementById('crmProdQty').value);
  const unitPrice = parseFloat(document.getElementById('crmProdPrice').value);
  const purchaseDate = document.getElementById('crmPurchaseDate').value;

  if (!productName || !quantity || !unitPrice || !purchaseDate) {
    showToast('Preench todos os campos obrigatórios', 'warning');
    return;
  }

  const customerId = document.getElementById('crmPurchaseModal').dataset.customerId;
  const purchaseId = document.getElementById('crmPurchaseModal').dataset.purchaseId;

  const payload = {
    product_name: productName,
    quantity,
    unit_price: unitPrice,
    purchase_date: purchaseDate,
    payment_method: document.getElementById('crmPaymentMethod').value || null,
    payment_status: document.getElementById('crmPaymentStatus').value || 'pendente',
    notes: document.getElementById('crmPurchaseNotes').value || null
  };

  const method = purchaseId ? 'PUT' : 'POST';
  const url = purchaseId
    ? `${API_BASE}/crm/customers/${customerId}/purchases/${purchaseId}`
    : `${API_BASE}/crm/customers/${customerId}/purchases`;

  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error('Erro ao salvar');

    showToast(purchaseId ? 'Compra atualizada!' : 'Compra registrada!', 'success');
    closeCrmPurchaseModal();
    
    // Recarregar detalhes do cliente
    openCrmCustomerDetail(customerId);
  } catch (error) {
    console.error('Erro ao salvar compra:', error);
    showToast('Erro ao salvar compra', 'error');
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

// Inicializar CRM quando a página for carregada
function initializeCrm() {
  loadCrmCustomers('all');
}
