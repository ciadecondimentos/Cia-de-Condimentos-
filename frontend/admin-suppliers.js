// ==================== SUPPLIERS MANAGEMENT ====================

// Estado global dos fornecedores
const suppliersState = {
  currentSupplierId: null,
  suppliers: [],
  currentPurchases: [],
  filters: 'all'
};

// ===== HELPER FUNCTIONS FOR DATE HANDLING (from CRM) =====
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
// =========================================================

// GET: Listar fornecedores
async function loadSuppliers(filter = 'all') {
  try {
    const url = filter === 'all' 
      ? `${API_BASE}/suppliers`
      : `${API_BASE}/suppliers?filter=${filter}`;
    
    const response = await fetch(url);
    const suppliers = await response.json();
    
    suppliersState.suppliers = suppliers;
    suppliersState.filters = filter;
    renderSuppliersTable();
  } catch (error) {
    console.error('Erro ao carregar fornecedores:', error);
    showToast('Erro ao carregar fornecedores', 'error');
  }
}

// Renderizar tabela de fornecedores
function renderSuppliersTable() {
  const tbody = document.getElementById('suppliersTableBody');
  const filterValue = document.getElementById('suppliersFilterSelect')?.value || 'all';
  
  let html = '';

  if (suppliersState.suppliers.length === 0) {
    html = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: #aaa;">Nenhum fornecedor cadastrado</td></tr>`;
  } else {
    html = suppliersState.suppliers.map(supplier => {
      const debtAmount = supplier.stats?.pending || 0;
      const totalSpent = supplier.stats?.total_spent || 0;
      const isDebtor = debtAmount > 0;
      
      return `
        <tr>
          <td data-label="Empresa">
            <div class="prod-cell">
              <div style="font-weight: 700; color: var(--marrom);">
                ${supplier.company_name}
              </div>
              <div style="font-size: 11px; color: #aaa;">${supplier.city || 'N/A'}</div>
            </div>
          </td>
          <td data-label="Contato">${supplier.contact_name || 'N/A'}</td>
          <td data-label="Telefone">${supplier.phone || supplier.whatsapp || 'N/A'}</td>
          <td data-label="Situação" style="color: ${isDebtor ? '#e74c3c' : '#27ae60'}; font-weight: 700;">
            ${isDebtor ? '💔 Devedor' : '✓ Em dia'}
          </td>
          <td data-label="Total Comprado" style="text-align: right;">R$ ${parseFloat(totalSpent || 0).toFixed(2)}</td>
          <td data-label="Em Aberto" style="text-align: right; color: #e74c3c; font-weight: 700;">R$ ${parseFloat(debtAmount || 0).toFixed(2)}</td>
          <td data-label="Ações">
            <button class="btn btn-sm btn-ghost" onclick="openSupplierDetail(${supplier.id})" title="Ver detalhes">👁️</button>
            <button class="btn btn-sm btn-ghost" onclick="openEditSupplier(${supplier.id})" title="Editar">✏️</button>
            <button class="btn btn-sm btn-danger" onclick="deleteSupplier(${supplier.id})" title="Deletar" style="padding: 6px 10px;">🗑️</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  tbody.innerHTML = html;
}

// Abrir modal de novo fornecedor
function openAddSupplier() {
  const modal = document.getElementById('supplierModal');
  const title = document.getElementById('supplierModalTitle');
  const body = document.getElementById('supplierModalBody');

  title.textContent = '➕ Novo Fornecedor';

  body.innerHTML = `
    <div class="fg">
      <label>Nome da Empresa *</label>
      <input type="text" id="supplierCompanyName" placeholder="Empresa de Condimentos Ltda">
    </div>
    <div class="form-row-2">
      <div class="fg">
        <label>Contato</label>
        <input type="text" id="supplierContactName" placeholder="João Silva">
      </div>
      <div class="fg">
        <label>Email</label>
        <input type="email" id="supplierEmail" placeholder="contato@empresa.com">
      </div>
    </div>
    <div class="form-row-2">
      <div class="fg">
        <label>Telefone</label>
        <input type="text" id="supplierPhone" placeholder="(11) 98765-4321">
      </div>
      <div class="fg">
        <label>WhatsApp</label>
        <input type="text" id="supplierWhatsapp" placeholder="(11) 98765-4321">
      </div>
    </div>
    <div class="fg">
      <label>CNPJ</label>
      <input type="text" id="supplierCnpj" placeholder="00.000.000/0000-00">
    </div>
    <div class="fg">
      <label>Endereço Completo</label>
      <input type="text" id="supplierAddress" placeholder="Rua das Flores, 123">
    </div>
    <div class="form-row-2">
      <div class="fg">
        <label>Bairro</label>
        <input type="text" id="supplierNeighborhood" placeholder="Vila Mariana">
      </div>
      <div class="fg">
        <label>Cidade</label>
        <input type="text" id="supplierCity" placeholder="São Paulo">
      </div>
    </div>
    <div class="fg">
      <label>Observações</label>
      <textarea id="supplierObservations" placeholder="Anotações sobre o fornecedor..."></textarea>
    </div>
    <div class="control-group">
      <label style="margin: 0;">
        <input type="checkbox" id="supplierIsActive" style="width: auto; margin-right: 8px;" checked>
        <span>Fornecedor Ativo</span>
      </label>
    </div>
  `;

  modal.classList.add('open');
}

// Abrir modal de editar fornecedor
async function openEditSupplier(supplierId) {
  try {
    const response = await fetch(`${API_BASE}/suppliers/${supplierId}`);
    const data = await response.json();
    const supplier = data.supplier;

    const modal = document.getElementById('supplierModal');
    const title = document.getElementById('supplierModalTitle');
    const body = document.getElementById('supplierModalBody');

    title.textContent = '✏️ Editar Fornecedor';

    body.innerHTML = `
      <div class="fg">
        <label>Nome da Empresa *</label>
        <input type="text" id="supplierCompanyName" placeholder="Empresa de Condimentos Ltda" value="${supplier.company_name}">
      </div>
      <div class="form-row-2">
        <div class="fg">
          <label>Contato</label>
          <input type="text" id="supplierContactName" placeholder="João Silva" value="${supplier.contact_name || ''}">
        </div>
        <div class="fg">
          <label>Email</label>
          <input type="email" id="supplierEmail" placeholder="contato@empresa.com" value="${supplier.email || ''}">
        </div>
      </div>
      <div class="form-row-2">
        <div class="fg">
          <label>Telefone</label>
          <input type="text" id="supplierPhone" placeholder="(11) 98765-4321" value="${supplier.phone || ''}">
        </div>
        <div class="fg">
          <label>WhatsApp</label>
          <input type="text" id="supplierWhatsapp" placeholder="(11) 98765-4321" value="${supplier.whatsapp || ''}">
        </div>
      </div>
      <div class="fg">
        <label>CNPJ</label>
        <input type="text" id="supplierCnpj" placeholder="00.000.000/0000-00" value="${supplier.cnpj || ''}">
      </div>
      <div class="fg">
        <label>Endereço Completo</label>
        <input type="text" id="supplierAddress" placeholder="Rua das Flores, 123" value="${supplier.address || ''}">
      </div>
      <div class="form-row-2">
        <div class="fg">
          <label>Bairro</label>
          <input type="text" id="supplierNeighborhood" placeholder="Vila Mariana" value="${supplier.neighborhood || ''}">
        </div>
        <div class="fg">
          <label>Cidade</label>
          <input type="text" id="supplierCity" placeholder="São Paulo" value="${supplier.city || ''}">
        </div>
      </div>
      <div class="fg">
        <label>Observações</label>
        <textarea id="supplierObservations" placeholder="Anotações sobre o fornecedor...">${supplier.observations || ''}</textarea>
      </div>
      <div class="control-group">
        <label style="margin: 0;">
          <input type="checkbox" id="supplierIsActive" style="width: auto; margin-right: 8px;" ${supplier.is_active ? 'checked' : ''}>
          <span>Fornecedor Ativo</span>
        </label>
      </div>
    `;

    // Armazenar ID para salvar depois
    document.getElementById('supplierModal').dataset.supplierId = supplierId;
    modal.classList.add('open');
  } catch (error) {
    console.error('Erro ao carregar fornecedor:', error);
    showToast('Erro ao carregar fornecedor', 'error');
  }
}

// Fechar modal de fornecedor
function closeSupplierModal() {
  document.getElementById('supplierModal').classList.remove('open');
  delete document.getElementById('supplierModal').dataset.supplierId;
}

// Salvar fornecedor (novo ou editar)
async function saveSupplier() {
  const companyName = document.getElementById('supplierCompanyName').value.trim();
  
  if (!companyName) {
    showToast('Nome da empresa é obrigatório', 'warning');
    return;
  }

  const payload = {
    company_name: companyName,
    contact_name: document.getElementById('supplierContactName').value || null,
    email: document.getElementById('supplierEmail').value || null,
    phone: document.getElementById('supplierPhone').value || null,
    whatsapp: document.getElementById('supplierWhatsapp').value || null,
    cnpj: document.getElementById('supplierCnpj').value || null,
    address: document.getElementById('supplierAddress').value || null,
    neighborhood: document.getElementById('supplierNeighborhood').value || null,
    city: document.getElementById('supplierCity').value || null,
    observations: document.getElementById('supplierObservations').value || null,
    is_active: document.getElementById('supplierIsActive').checked
  };

  const supplierId = document.getElementById('supplierModal').dataset.supplierId;
  const method = supplierId ? 'PUT' : 'POST';
  const url = supplierId 
    ? `${API_BASE}/suppliers/${supplierId}`
    : `${API_BASE}/suppliers`;

  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.error || 'Erro ao salvar');
    }

    showToast(supplierId ? 'Fornecedor atualizado!' : 'Fornecedor criado!', 'success');
    closeSupplierModal();
    loadSuppliers(suppliersState.filters);
  } catch (error) {
    console.error('Erro ao salvar fornecedor:', error);
    showToast(`Erro ao salvar fornecedor: ${error.message}`, 'error');
  }
}

// Deletar fornecedor
async function deleteSupplier(supplierId) {
  if (!confirm('Tem certeza que deseja deletar este fornecedor? Isso também deletará todo o histórico de compras.')) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/suppliers/${supplierId}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('Erro ao deletar');

    showToast('Fornecedor deletado com sucesso', 'success');
    loadSuppliers(suppliersState.filters);
  } catch (error) {
    console.error('Erro ao deletar fornecedor:', error);
    showToast('Erro ao deletar fornecedor', 'error');
  }
}

// ==================== SUPPLIER DETAIL ====================

// Abrir detalhes do fornecedor
async function openSupplierDetail(supplierId) {
  try {
    const response = await fetch(`${API_BASE}/suppliers/${supplierId}`);
    const data = await response.json();
    const supplier = data.supplier;
    const purchases = data.purchases;
    const stats = data.stats;
    const periodStats = data.periodStats;

    const modal = document.getElementById('supplierDetailModal');
    const title = document.getElementById('supplierDetailModalTitle');
    const body = document.getElementById('supplierDetailModalBody');

    title.textContent = `📊 ${supplier.company_name}`;

    // Dashboard do fornecedor
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
        <div style="font-weight: 700; color: var(--marrom); margin-bottom: 12px;">📋 Informações do Fornecedor</div>
        <div style="font-size: 13px; color: #666;">
          ${supplier.address ? `<div style="margin-bottom: 8px;"><strong>Endereço:</strong> ${supplier.address}, ${supplier.neighborhood} - ${supplier.city}</div>` : ''}
          ${supplier.cnpj ? `<div style="margin-bottom: 8px;"><strong>CNPJ:</strong> ${supplier.cnpj}</div>` : ''}
          ${supplier.email ? `<div style="margin-bottom: 8px;"><strong>Email:</strong> <a href="mailto:${supplier.email}" style="color: var(--marrom); text-decoration: none;">${supplier.email}</a></div>` : ''}
          ${supplier.whatsapp ? `<div style="margin-bottom: 8px;"><strong>WhatsApp:</strong> <button class="btn btn-sm btn-secondary" onclick="window.open('https://wa.me/55${supplier.whatsapp.replace(/\\D/g, '')}', '_blank')" style="margin-left: 8px;">💬 Conversar</button></div>` : ''}
          ${supplier.phone ? `<div style="margin-bottom: 8px;"><strong>Telefone:</strong> ${supplier.phone}</div>` : ''}
          ${supplier.contact_name ? `<div style="margin-bottom: 8px;"><strong>Contato:</strong> ${supplier.contact_name}</div>` : ''}
          ${supplier.observations ? `<div style="margin-bottom: 8px;"><strong>Observações:</strong> ${supplier.observations}</div>` : ''}
        </div>
      </div>

      <div style="border-bottom: 2px solid #e8e0d4; margin-bottom: 16px; padding-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
        <h4 style="font-family: 'Playfair Display', serif; font-size: 15px; font-weight: 700; color: var(--marrom);">📦 Histórico de Compras</h4>
        <button class="btn btn-sm btn-primary" onclick="openAddSupplierPurchase(${supplierId})">+ Registrar Compra</button>
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
                <td style="padding: 8px;">${formatDateString(p.purchase_date)}</td>
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
                  <button class="btn btn-sm btn-ghost" onclick="openEditSupplierPurchase(${supplierId}, ${p.id})" title="Editar" style="padding: 4px 8px; font-size: 11px;">✏️</button>
                  <button class="btn btn-sm btn-danger" onclick="deleteSupplierPurchase(${supplierId}, ${p.id})" title="Deletar" style="padding: 4px 8px; font-size: 11px; margin-left: 4px;">🗑️</button>
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
    console.error('Erro ao abrir detalhes do fornecedor:', error);
    showToast('Erro ao carregar detalhes', 'error');
  }
}

// Fechar modal de detalhes
function closeSupplierDetailModal() {
  document.getElementById('supplierDetailModal').classList.remove('open');
}

// ==================== PURCHASES MANAGEMENT ====================

// Abrir modal para adicionar compra
function openAddSupplierPurchase(supplierId) {
  const modal = document.getElementById('supplierPurchaseModal');
  const title = document.getElementById('supplierPurchaseModalTitle');
  const body = document.getElementById('supplierPurchaseModalBody');

  title.textContent = '➕ Nova Compra';

  body.innerHTML = `
    <div class="fg">
      <label>Nome do Produto *</label>
      <input type="text" id="supplierProdName" placeholder="Ex: Pimenta Dedo de Moça - 500g">
    </div>
    <div class="form-row-3">
      <div class="fg">
        <label>Quantidade *</label>
        <input type="number" id="supplierProdQty" placeholder="1" min="1" step="1">
      </div>
      <div class="fg">
        <label>Valor Unitário (R$) *</label>
        <input type="number" id="supplierProdPrice" placeholder="0.00" min="0" step="0.01">
      </div>
      <div class="fg">
        <label>Total (R$)</label>
        <input type="number" id="supplierProdTotal" placeholder="0.00" disabled style="background: #f4f0ea;">
      </div>
    </div>
    <div class="form-row-2">
      <div class="fg">
        <label>Data da Compra *</label>
        <input type="date" id="supplierPurchaseDate" value="${getLocalDateString(new Date())}">
      </div>
      <div class="fg">
        <label>Forma de Pagamento</label>
        <select id="supplierPaymentMethod">
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
      <select id="supplierPaymentStatus">
        <option value="pendente">Pendente</option>
        <option value="pago">Pago</option>
        <option value="parcial">Parcial</option>
      </select>
    </div>
    <div class="fg">
      <label>Observações</label>
      <textarea id="supplierPurchaseNotes" placeholder="Anotações sobre esta compra..."></textarea>
    </div>
  `;

  // Calcular total automaticamente
  document.getElementById('supplierProdQty').addEventListener('input', calculateSupplierTotal);
  document.getElementById('supplierProdPrice').addEventListener('input', calculateSupplierTotal);

  document.getElementById('supplierPurchaseModal').dataset.supplierId = supplierId;
  modal.classList.add('open');
}

// Calcular total da compra
function calculateSupplierTotal() {
  const qty = parseFloat(document.getElementById('supplierProdQty').value) || 0;
  const price = parseFloat(document.getElementById('supplierProdPrice').value) || 0;
  const total = qty * price;
  document.getElementById('supplierProdTotal').value = total.toFixed(2);
}

// Abrir modal para editar compra
async function openEditSupplierPurchase(supplierId, purchaseId) {
  try {
    // Não temos endpoint específico, vamos carregar tudo de novo
    const response = await fetch(`${API_BASE}/suppliers/${supplierId}`);
    const data = await response.json();
    const purchase = data.purchases.find(p => p.id === purchaseId);

    if (!purchase) {
      showToast('Compra não encontrada', 'error');
      return;
    }

    const modal = document.getElementById('supplierPurchaseModal');
    const title = document.getElementById('supplierPurchaseModalTitle');
    const body = document.getElementById('supplierPurchaseModalBody');

    title.textContent = '✏️ Editar Compra';

    body.innerHTML = `
      <div class="fg">
        <label>Nome do Produto *</label>
        <input type="text" id="supplierProdName" placeholder="Ex: Pimenta Dedo de Moça - 500g" value="${purchase.product_name}">
      </div>
      <div class="form-row-3">
        <div class="fg">
          <label>Quantidade *</label>
          <input type="number" id="supplierProdQty" placeholder="1" min="1" step="1" value="${purchase.quantity}">
        </div>
        <div class="fg">
          <label>Valor Unitário (R$) *</label>
          <input type="number" id="supplierProdPrice" placeholder="0.00" min="0" step="0.01" value="${purchase.unit_price}">
        </div>
        <div class="fg">
          <label>Total (R$)</label>
          <input type="number" id="supplierProdTotal" placeholder="0.00" disabled style="background: #f4f0ea;" value="${parseFloat(purchase.total_price || 0).toFixed(2)}">
        </div>
      </div>
      <div class="form-row-2">
        <div class="fg">
          <label>Data da Compra *</label>
          <input type="date" id="supplierPurchaseDate" value="${(typeof purchase.purchase_date === 'string' ? purchase.purchase_date : purchase.purchase_date || '').split('T')[0]}">
        </div>
        <div class="fg">
          <label>Forma de Pagamento</label>
          <select id="supplierPaymentMethod">
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
        <select id="supplierPaymentStatus">
          <option value="pendente" ${purchase.payment_status === 'pendente' ? 'selected' : ''}>Pendente</option>
          <option value="pago" ${purchase.payment_status === 'pago' ? 'selected' : ''}>Pago</option>
          <option value="parcial" ${purchase.payment_status === 'parcial' ? 'selected' : ''}>Parcial</option>
        </select>
      </div>
      <div class="fg">
        <label>Observações</label>
        <textarea id="supplierPurchaseNotes" placeholder="Anotações sobre esta compra...">${purchase.notes || ''}</textarea>
      </div>
    `;

    // Calcular total automaticamente
    document.getElementById('supplierProdQty').addEventListener('input', calculateSupplierTotal);
    document.getElementById('supplierProdPrice').addEventListener('input', calculateSupplierTotal);

    document.getElementById('supplierPurchaseModal').dataset.supplierId = supplierId;
    document.getElementById('supplierPurchaseModal').dataset.purchaseId = purchaseId;
    modal.classList.add('open');
  } catch (error) {
    console.error('Erro ao carregar compra:', error);
    showToast('Erro ao carregar compra', 'error');
  }
}

// Fechar modal de compra
function closeSupplierPurchaseModal() {
  document.getElementById('supplierPurchaseModal').classList.remove('open');
  delete document.getElementById('supplierPurchaseModal').dataset.supplierId;
  delete document.getElementById('supplierPurchaseModal').dataset.purchaseId;
}

// Salvar compra
async function saveSupplierPurchase() {
  const productName = document.getElementById('supplierProdName').value.trim();
  const quantity = parseInt(document.getElementById('supplierProdQty').value);
  const unitPrice = parseFloat(document.getElementById('supplierProdPrice').value);
  const purchaseDate = document.getElementById('supplierPurchaseDate').value;

  if (!productName || !quantity || !unitPrice || !purchaseDate) {
    showToast('Preench todos os campos obrigatórios', 'warning');
    return;
  }

  const supplierId = document.getElementById('supplierPurchaseModal').dataset.supplierId;
  const purchaseId = document.getElementById('supplierPurchaseModal').dataset.purchaseId;

  const payload = {
    product_name: productName,
    quantity,
    unit_price: unitPrice,
    purchase_date: purchaseDate,
    payment_method: document.getElementById('supplierPaymentMethod').value || null,
    payment_status: document.getElementById('supplierPaymentStatus').value || 'pendente',
    notes: document.getElementById('supplierPurchaseNotes').value || null
  };

  const method = purchaseId ? 'PUT' : 'POST';
  const url = purchaseId
    ? `${API_BASE}/suppliers/${supplierId}/purchases/${purchaseId}`
    : `${API_BASE}/suppliers/${supplierId}/purchases`;

  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error('Erro ao salvar');

    showToast(purchaseId ? 'Compra atualizada!' : 'Compra registrada!', 'success');
    closeSupplierPurchaseModal();
    
    // Recarregar detalhes do fornecedor
    openSupplierDetail(supplierId);
  } catch (error) {
    console.error('Erro ao salvar compra:', error);
    showToast('Erro ao salvar compra', 'error');
  }
}

// Deletar compra
async function deleteSupplierPurchase(supplierId, purchaseId) {
  if (!confirm('Deseja deletar esta compra?')) {
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE}/suppliers/${supplierId}/purchases/${purchaseId}`,
      { method: 'DELETE' }
    );

    if (!response.ok) throw new Error('Erro ao deletar');

    showToast('Compra deletada com sucesso', 'success');
    
    // Recarregar detalhes do fornecedor
    openSupplierDetail(supplierId);
  } catch (error) {
    console.error('Erro ao deletar compra:', error);
    showToast('Erro ao deletar compra', 'error');
  }
}

// ==================== FILTER & SEARCH ====================

function filterSuppliers(filter) {
  loadSuppliers(filter);
}

function searchSuppliers(query) {
  if (!query.trim()) {
    renderSuppliersTable();
    return;
  }

  const filtered = suppliersState.suppliers.filter(s => 
    s.company_name.toLowerCase().includes(query.toLowerCase()) ||
    s.contact_name?.toLowerCase().includes(query.toLowerCase()) ||
    s.phone?.includes(query) ||
    s.city?.toLowerCase().includes(query.toLowerCase())
  );

  const tbody = document.getElementById('suppliersTableBody');
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #aaa;">Nenhum fornecedor encontrado</td></tr>';
    return;
  }

  let html = filtered.map(supplier => {
    const debtAmount = supplier.stats?.pending || 0;
    const totalSpent = supplier.stats?.total_spent || 0;
    const isDebtor = debtAmount > 0;
    
    return `
      <tr>
        <td>
          <div class="prod-cell">
            <div style="font-weight: 700; color: var(--marrom);">
              ${supplier.company_name}
            </div>
            <div style="font-size: 11px; color: #aaa;">${supplier.city || 'N/A'}</div>
          </div>
        </td>
        <td>${supplier.contact_name || 'N/A'}</td>
        <td>${supplier.phone || supplier.whatsapp || 'N/A'}</td>
        <td style="color: ${isDebtor ? '#e74c3c' : '#27ae60'}; font-weight: 700;">
          ${isDebtor ? '💔 Devedor' : '✓ Em dia'}
        </td>
        <td style="text-align: right;">R$ ${parseFloat(totalSpent || 0).toFixed(2)}</td>
        <td style="text-align: right; color: #e74c3c; font-weight: 700;">R$ ${parseFloat(debtAmount || 0).toFixed(2)}</td>
        <td>
          <button class="btn btn-sm btn-ghost" onclick="openSupplierDetail(${supplier.id})" title="Ver detalhes">👁️</button>
          <button class="btn btn-sm btn-ghost" onclick="openEditSupplier(${supplier.id})" title="Editar">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="deleteSupplier(${supplier.id})" title="Deletar" style="padding: 6px 10px;">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = html;
}

// Inicializar fornecedores quando a página for carregada
function initializeSuppliers() {
  loadSuppliers('all');
}
