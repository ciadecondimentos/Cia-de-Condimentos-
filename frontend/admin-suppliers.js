// ==================== SUPPLIERS MANAGEMENT ====================

// Estado global dos fornecedores
const suppliersState = {
  currentSupplierId: null,
  suppliers: [],
  currentPurchases: [],
  filters: 'all'
};

// Estado para rastrear produtos selecionados e quantidades
let suppliersSelectedProducts = {};

// ===== HELPER FUNCTIONS FOR DATE HANDLING (from CRM) =====
// Helper: Converter valor para número seguramente
function safeNumber(value) {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

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
      // Agrupar compras por data (mesma lógica do CRM)
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
      
      sortedDates.forEach(dateKey => {
        const dateItems = purchasesByDate[dateKey];
        const dateFormatted = formatDateString(dateKey);
        
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

        html += `
          <div style="background: #ffffff; border: 1px solid #e8e0d4; border-radius: 8px; padding: 16px; margin-bottom: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <!-- Cabeçalho do Card -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 2px solid #f4f0ea;">
              <div>
                <div style="font-size: 13px; font-weight: 700; color: var(--marrom);">📅 ${dateFormatted}</div>
                <div style="font-size: 11px; color: #999; margin-top: 4px;">
                  ${dateItems.length} produto${dateItems.length !== 1 ? 's' : ''} • ${dayQty} unidade${dayQty !== 1 ? 's' : ''}
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 16px; font-weight: 900; color: var(--vermelho);">R$ ${dayTotal.toFixed(2)}</div>
                <span class="status-pill s-${dayStatus}" style="font-size: 10px; margin-top: 4px; display: inline-block;">
                  ${dayStatus === 'pago' ? '✓ PAGO' : dayStatus === 'parcial' ? '◐ PARCIAL' : '○ PENDENTE'}
                </span>
              </div>
            </div>

            <!-- Produtos do dia -->
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${dateItems.map(item => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f4f0ea;">
                  <div style="flex: 1;">
                    <div style="font-weight: 700; color: var(--marrom); font-size: 12px;">${item.product_name}</div>
                    <div style="font-size: 10px; color: #999; margin-top: 2px;">
                      ${item.quantity} unid. × R$ ${parseFloat(item.unit_price).toFixed(2)}
                      ${item.payment_method ? ` • ${item.payment_method}` : ''}
                    </div>
                  </div>
                  <div style="text-align: right; margin-left: 12px;">
                    <div style="font-weight: 700; color: var(--vermelho); font-size: 12px;">R$ ${parseFloat(item.total_price).toFixed(2)}</div>
                  </div>
                  <div style="margin-left: 12px;">
                    <button class="btn btn-sm btn-ghost" onclick="openEditSupplierPurchase(${supplierId}, ${item.id})" title="Editar" style="padding: 4px 8px; font-size: 11px;">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteSupplierPurchase(${supplierId}, ${item.id})" title="Deletar" style="padding: 4px 8px; font-size: 11px; margin-left: 4px;">🗑️</button>
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
    console.error('Erro ao abrir detalhes do fornecedor:', error);
    showToast('Erro ao carregar detalhes', 'error');
  }
}

// Fechar modal de detalhes
function closeSupplierDetailModal() {
  document.getElementById('supplierDetailModal').classList.remove('open');
}

// ==================== PURCHASES MANAGEMENT ====================

// Alternar seleção de produto e exibir/ocultar campo de quantidade
function toggleSupplierProduct(productId, productName, productPrice) {
  const checkbox = document.getElementById(`supplierProd-${productId}`);
  const qtyContainer = document.getElementById(`supplierProdQty-${productId}-container`);

  if (checkbox.checked) {
    suppliersSelectedProducts[productId] = {
      id: productId,
      name: productName,
      price: productPrice,
      quantity: 1
    };
    qtyContainer.style.display = 'inline-flex';
  } else {
    delete suppliersSelectedProducts[productId];
    qtyContainer.style.display = 'none';
  }

  calculateSupplierGrandTotal();
}

// Calcular total geral de toda a compra
function calculateSupplierGrandTotal() {
  let grandTotal = 0;

  Object.values(suppliersSelectedProducts).forEach(product => {
    const qtyInput = document.getElementById(`supplierProdQty-${product.id}`);
    const quantity = parseInt(qtyInput.value) || 0;
    const subtotal = quantity * product.price;

    // Atualizar subtotal do produto
    const subtotalSpan = document.getElementById(`supplierProdSubtotal-${product.id}`);
    if (subtotalSpan) {
      subtotalSpan.textContent = `R$ ${subtotal.toFixed(2)}`;
    }

    // Adicionar ao total geral
    suppliersSelectedProducts[product.id].quantity = quantity;
    grandTotal += subtotal;
  });

  // Atualizar display do total geral
  const grandTotalSpan = document.getElementById('supplierGrandTotal');
  if (grandTotalSpan) {
    grandTotalSpan.textContent = grandTotal.toFixed(2);
  }
}

// ==================== PURCHASES MODAL ====================

// Abrir modal para adicionar compra (com múltiplos produtos)
async function openAddSupplierPurchase(supplierId) {
  const modal = document.getElementById('supplierPurchaseModal');
  const title = document.getElementById('supplierPurchaseModalTitle');
  const body = document.getElementById('supplierPurchaseModalBody');

  title.textContent = '➕ Registrar Compra';
  suppliersSelectedProducts = {}; // Limpar seleção anterior

  try {
    // Carregar produtos do banco
    const response = await fetch(`${API_BASE}/products/admin/all`);
    const products = await response.json();

    let productsHtml = products.map(p => `
      <div style="display: flex; align-items: center; gap: 12px; padding: 10px; border: 1px solid #e0e0e0; border-radius: 6px; margin-bottom: 10px; background: #fafafa;" class="supplier-product-item" data-product-name="${p.name.toLowerCase()}" data-product-id="${p.id}">
        <input type="checkbox" id="supplierProd-${p.id}" data-product-id="${p.id}" data-product-name="${p.name}" data-product-price="${p.price}" onchange="toggleSupplierProduct(${p.id}, '${p.name}', ${p.price})">
        <div style="flex: 1;">
          <label for="supplierProd-${p.id}" style="cursor: pointer; font-weight: 600; margin-bottom: 4px; display: block;">${p.name}</label>
          <span style="font-size: 12px; color: #666;">R$ ${parseFloat(p.price).toFixed(2)}</span>
        </div>
        <div style="display: none;" id="supplierProdQty-${p.id}-container" class="supplier-qty-container">
          <div style="display: flex; align-items: center; gap: 6px;">
            <button onclick="decrementQty('supplierProdQty-${p.id}')" class="btn btn-sm" style="min-width: 36px; padding: 6px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-weight: 600;">−</button>
            <input type="number" id="supplierProdQty-${p.id}" placeholder="Qtd" min="1" step="1" value="1" onchange="calculateSupplierGrandTotal()" oninput="calculateSupplierGrandTotal()" style="width: 50px; text-align: center; padding: 6px; border: 1px solid #ddd; border-radius: 4px; background: #fff;">
            <button onclick="incrementQty('supplierProdQty-${p.id}')" class="btn btn-sm" style="min-width: 36px; padding: 6px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-weight: 600;">+</button>
            <span id="supplierProdSubtotal-${p.id}" style="margin-left: 10px; font-weight: 700; color: #2c3e50;">R$ ${parseFloat(p.price).toFixed(2)}</span>
          </div>
        </div>
      </div>
    `).join('');

    body.innerHTML = `
      <div style="margin-bottom: 15px;">
        <label style="font-weight: 600; display: block; margin-bottom: 8px;">🔍 Pesquisar Produtos</label>
        <input type="text" id="supplierProductSearch" placeholder="Digite o nome do produto..." style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
        <div style="font-size: 12px; color: #999; margin-top: 4px;" id="supplierSearchResults">Mostrando ${products.length} produto(s)</div>
      </div>

      <div style="max-height: 400px; overflow-y: auto; margin-bottom: 20px;">
        <div style="margin-bottom: 15px;">
          <label style="font-weight: 600; display: block; margin-bottom: 10px;">📦 Selecione os Produtos *</label>
          <div id="supplierProductsList">
            ${productsHtml}
          </div>
        </div>
      </div>

      <div style="background: #f0f4f8; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 2px solid #3498db;">
        <div style="font-size: 14px; color: #666; margin-bottom: 8px;">Total da Compra:</div>
        <div style="font-size: 24px; font-weight: 700; color: #2c3e50;">R$ <span id="supplierGrandTotal">0.00</span></div>
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

      <div class="form-row-2">
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
          <textarea id="supplierPurchaseNotes" placeholder="Anotações sobre estas compras..."></textarea>
        </div>
      </div>
    `;

    // Adicionar evento de busca
    document.getElementById('supplierProductSearch').addEventListener('input', (e) => {
      filterSupplierProducts(e.target.value, products.length);
    });

    document.getElementById('supplierPurchaseModal').dataset.supplierId = supplierId;
    delete document.getElementById('supplierPurchaseModal').dataset.purchaseId;
    modal.classList.add('open');
  } catch (error) {
    console.error('Erro ao carregar produtos:', error);
    showToast('Erro ao carregar produtos', 'error');
  }
}

// Filtrar produtos por busca
function filterSupplierProducts(query, totalProducts) {
  const items = document.querySelectorAll('.supplier-product-item');
  let visibleCount = 0;

  items.forEach(item => {
    const productName = item.dataset.productName || '';
    const matches = productName.includes(query.toLowerCase());
    item.style.display = matches ? 'flex' : 'none';
    if (matches) visibleCount++;
  });

  // Atualizar contador de resultados
  const searchResults = document.getElementById('supplierSearchResults');
  if (searchResults) {
    if (query.trim()) {
      searchResults.textContent = `${visibleCount} de ${totalProducts} produto(s) encontrado(s)`;
    } else {
      searchResults.textContent = `Mostrando ${totalProducts} produto(s)`;
    }
  }
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
          <div style="display: flex; align-items: center; gap: 6px;">
            <button onclick="decrementQty('supplierProdQty')" class="btn btn-sm" style="min-width: 36px; padding: 6px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-weight: 600;">−</button>
            <input type="number" id="supplierProdQty" placeholder="1" min="1" step="1" value="${purchase.quantity}" style="width: 50px; text-align: center; padding: 6px; border: 1px solid #ddd; border-radius: 4px; background: #fff;">
            <button onclick="incrementQty('supplierProdQty')" class="btn btn-sm" style="min-width: 36px; padding: 6px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-weight: 600;">+</button>
          </div>
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
  suppliersSelectedProducts = {}; // Limpar seleção
}

// Salvar compra(s)
async function saveSupplierPurchase() {
  const purchaseId = document.getElementById('supplierPurchaseModal').dataset.purchaseId;

  // Se está editando uma compra individual
  if (purchaseId) {
    const productName = document.getElementById('supplierProdName').value.trim();
    const quantity = parseInt(document.getElementById('supplierProdQty').value);
    const unitPrice = parseFloat(document.getElementById('supplierProdPrice').value);
    const purchaseDate = document.getElementById('supplierPurchaseDate').value;

    if (!productName || !quantity || !unitPrice || !purchaseDate) {
      showToast('Preencha todos os campos obrigatórios', 'warning');
      return;
    }

    const supplierId = document.getElementById('supplierPurchaseModal').dataset.supplierId;

    const payload = {
      product_name: productName,
      quantity,
      unit_price: unitPrice,
      purchase_date: purchaseDate,
      payment_method: document.getElementById('supplierPaymentMethod').value || null,
      payment_status: document.getElementById('supplierPaymentStatus').value || 'pendente',
      notes: document.getElementById('supplierPurchaseNotes').value || null
    };

    try {
      const response = await fetch(
        `${API_BASE}/suppliers/${supplierId}/purchases/${purchaseId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) throw new Error('Erro ao atualizar');

      showToast('Compra atualizada!', 'success');
      closeSupplierPurchaseModal();
      openSupplierDetail(supplierId);
      // Atualizar dashboards automaticamente
      if (typeof loadDashboard === 'function') loadDashboard();
    } catch (error) {
      console.error('Erro ao atualizar compra:', error);
      showToast('Erro ao atualizar compra', 'error');
    }
    return;
  }

  // Se está registrando nova(s) compra(s) com múltiplos produtos
  if (Object.keys(suppliersSelectedProducts).length === 0) {
    showToast('Selecione pelo menos um produto', 'warning');
    return;
  }

  const purchaseDate = document.getElementById('supplierPurchaseDate').value;
  if (!purchaseDate) {
    showToast('Selecione a data da compra', 'warning');
    return;
  }

  const supplierId = document.getElementById('supplierPurchaseModal').dataset.supplierId;
  const paymentMethod = document.getElementById('supplierPaymentMethod').value || null;
  const paymentStatus = document.getElementById('supplierPaymentStatus').value || 'pendente';
  const notes = document.getElementById('supplierPurchaseNotes').value || null;

  try {
    // Salvar cada produto selecionado como uma compra separada
    const savePromises = Object.values(suppliersSelectedProducts).map(product => {
      const payload = {
        product_name: product.name,
        quantity: product.quantity,
        unit_price: product.price,
        purchase_date: purchaseDate,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        notes: notes
      };

      return fetch(
        `${API_BASE}/suppliers/${supplierId}/purchases`,
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

    const totalProducts = Object.keys(suppliersSelectedProducts).length;
    showToast(`✓ ${totalProducts} compra(s) registrada(s) com sucesso!`, 'success');
    closeSupplierPurchaseModal();
    openSupplierDetail(supplierId);
    // Atualizar dashboards automaticamente
    if (typeof loadDashboard === 'function') loadDashboard();
  } catch (error) {
    console.error('Erro ao salvar compras:', error);
    showToast('Erro ao registrar compras', 'error');
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
    // Atualizar dashboards automaticamente
    if (typeof loadDashboard === 'function') loadDashboard();
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
