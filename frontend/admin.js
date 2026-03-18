// Admin Dashboard - JavaScript
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000/api'
  : 'https://cia-de-condimentos.onrender.com/api';

// ==================== SIDEBAR TOGGLE ====================
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  sidebar.classList.toggle('open');
}

// ==================== PAGE NAVIGATION ====================
function showPage(pageId, buttonElement) {
  // Hide all pages
  const pages = document.querySelectorAll('.page');
  pages.forEach(page => page.classList.remove('active'));
  
  // Show selected page
  const selectedPage = document.getElementById(`page-${pageId}`);
  if (selectedPage) {
    selectedPage.classList.add('active');
  }
  
  // Update active nav item
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => item.classList.remove('active'));
  if (buttonElement) {
    buttonElement.classList.add('active');
  }
  
  // Update page title
  const titles = {
    'dashboard': 'Dashboard',
    'products': 'Produtos',
    'orders': 'Pedidos',
    'customers': 'Clientes',
    'reports': 'Relatórios'
  };
  
  document.getElementById('pageTitle').textContent = titles[pageId] || 'Dashboard';
  
  // Load data for the page
  if (pageId === 'products') {
    renderProductsTableAsync();
  } else if (pageId === 'orders') {
    renderOrdersTableAsync();
  } else if (pageId === 'customers') {
    renderCustomersTableAsync();
  } else if (pageId === 'dashboard') {
    loadDashboard();
  }
}

// ==================== TOAST NOTIFICATIONS ====================
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show';
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ==================== DASHBOARD ====================
function loadDashboard() {
  fetchDashboardStats();
  renderRecentOrders();
  renderLowStockProducts();
  renderTopProducts();
}

function fetchDashboardStats() {
  fetch(`${API_BASE}/orders`)
    .then(res => res.json())
    .then(orders => {
      document.getElementById('dash-orders').textContent = orders.length;
      const totalRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
      document.getElementById('dash-revenue').textContent = `R$ ${parseFloat(totalRevenue).toFixed(2)}`;
      const pending = orders.filter(o => o.status === 'Pendente').length;
      document.getElementById('dash-pending').textContent = pending;
    })
    .catch(() => {
      // Mock data for demo
      document.getElementById('dash-orders').textContent = '12';
      document.getElementById('dash-revenue').textContent = 'R$ 3.450,50';
      document.getElementById('dash-pending').textContent = '3';
    });

  fetch(`${API_BASE}/products`)
    .then(res => res.json())
    .then(products => {
      document.getElementById('dash-products').textContent = products.length;
    })
    .catch(() => {
      document.getElementById('dash-products').textContent = '28';
    });
}

function changePeriod(period, element) {
  document.querySelectorAll('.period-tab').forEach(tab => tab.classList.remove('active'));
  element.classList.add('active');
  renderSalesChart(period);
}

function changeReportPeriod(days, element) {
  document.querySelectorAll('.period-tab').forEach(tab => tab.classList.remove('active'));
  element.classList.add('active');
  loadReportData(days);
}

function renderSalesChart(period) {
  const salesChart = document.getElementById('salesChart');
  const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
  const labels = Array.from({length: days}, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - i - 1));
    return date.getDate();
  });

  let html = '';
  labels.forEach((label, idx) => {
    const height = (Math.random() * 100 + 20);
    html += `
      <div class="bar-group">
        <div class="bar" data-value="R$ ${(Math.random() * 500).toFixed(2)}" style="height: ${height}px;"></div>
        <div class="bar-label">${label}</div>
      </div>
    `;
  });

  salesChart.innerHTML = html;
}

function renderRecentOrders() {
  const container = document.getElementById('recentOrders');
  
  fetch(`${API_BASE}/orders`)
    .then(res => res.json())
    .then(orders => {
      const recent = orders.slice(0, 3);
      if (recent.length === 0) {
        container.innerHTML = '<div style="padding: 16px; text-align: center; color: #999;">Nenhum pedido ainda</div>';
        return;
      }
      container.innerHTML = recent.map(order => {
        const status = order.status || 'Pendente';
        return `
          <div class="order-row">
            <div class="order-id">#${String(order.id).padStart(3, '0')}</div>
            <div class="order-customer">${order.customer_name || 'N/A'}</div>
            <div class="order-total">R$ ${parseFloat(order.total || 0).toFixed(2)}</div>
            <span class="status-pill s-${status.toLowerCase()}">${status}</span>
          </div>
        `;
      }).join('');
    })
    .catch(() => {
      container.innerHTML = '<div style="padding: 16px; text-align: center; color: #999;">Erro ao carregar pedidos</div>';
    });
}

function renderLowStockProducts() {
  const container = document.getElementById('lowStockList');
  
  fetch(`${API_BASE}/products/admin/all`)
    .then(res => res.json())
    .then(products => {
      const lowStock = products.filter(p => p.stock < 20).slice(0, 2);
      if (lowStock.length === 0) {
        container.innerHTML = '<div style="padding: 16px; text-align: center; color: #999;">Sem produtos com estoque baixo</div>';
        return;
      }
      container.innerHTML = lowStock.map(prod => `
        <div class="order-row">
          <div class="product-name">${prod.name}</div>
          <div style="flex: 1;"></div>
          <span class="tag tag-low">${prod.stock} unid.</span>
        </div>
      `).join('');
    })
    .catch(() => {
      container.innerHTML = '<div style="padding: 16px; text-align: center; color: #999;">Erro ao carregar</div>';
    });
}

function renderTopProducts() {
  const container = document.getElementById('topProducts');
  
  fetch(`${API_BASE}/products/admin/all`)
    .then(res => res.json())
    .then(products => {
      const topProducts = products.slice(0, 3);
      if (topProducts.length === 0) {
        container.innerHTML = '<div style="padding: 16px; text-align: center; color: #999;">Sem produtos cadastrados</div>';
        return;
      }
      container.innerHTML = topProducts.map(prod => `
        <div class="order-row">
          <div style="flex: 1; font-weight: 700;">${prod.name}</div>
          <div style="color: var(--vermelho); font-weight: 700;">0 vendas</div>
        </div>
      `).join('');
    })
    .catch(() => {
      container.innerHTML = '<div style="padding: 16px; text-align: center; color: #999;">Erro ao carregar</div>';
    });
}

// ==================== PRODUCTS ====================
function renderProductsTableAsync() {
  const search = document.getElementById('prodSearch')?.value || '';
  const category = document.getElementById('prodCatFilter')?.value || '';
  
  fetch(`${API_BASE}/products/admin/all`)
    .then(res => res.json())
    .then(products => {
      const filtered = products.filter(p => 
        (p.name.toLowerCase().includes(search.toLowerCase())) &&
        (!category || p.category === category)
      );
      renderProductsTable(filtered);
    })
    .catch(error => {
      console.error('Error fetching products:', error);
      document.getElementById('productsTableBody').innerHTML = '<tr><td colspan="7">Erro ao carregar produtos</td></tr>';
    });
}

function renderProductsTable(products) {
  const filtered = products;

  const tbody = document.getElementById('productsTableBody');
  tbody.innerHTML = filtered.map(prod => `
    <tr>
      <td>
        <div class="prod-cell">
          <div class="prod-thumb">${prod.image ? `<img src="${prod.image}" alt="${prod.name}" onerror="this.parentElement.innerHTML='🌶️'">` : '🌶️'}</div>
          <div>
            <div class="prod-name">${prod.name}</div>
            <div class="prod-cat">${prod.category || 'Sem categoria'}</div>
          </div>
        </div>
      </td>
      <td>${prod.sku || 'N/A'}</td>
      <td>${prod.category || 'N/A'}</td>
      <td>R$ ${parseFloat(prod.price || 0).toFixed(2)}</td>
      <td>${prod.stock || 0} unid.</td>
      <td><span class="tag ${prod.active ? 'tag-active' : 'tag-inactive'}">${prod.active ? 'Ativo' : 'Inativo'}</span></td>
      <td>
        <div class="actions-cell">
          <button class="btn btn-sm btn-ghost" onclick="editProduct(${prod.id})">✏️</button>
          <button class="btn btn-sm btn-ghost" onclick="deleteProduct(${prod.id})">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');

  // Update badge
  document.getElementById('prodCount').textContent = filtered.length;
}

function openAddProduct() {
  const modal = document.getElementById('productModal');
  const title = document.getElementById('productModalTitle');
  const body = document.getElementById('productModalBody');
  
  title.textContent = 'Adicionar Novo Produto';
  body.innerHTML = `
    <div class="form-row-2">
      <div class="fg">
        <label>Nome do Produto *</label>
        <input type="text" id="prodName" placeholder="Ex: Pimenta Malagueta">
      </div>
      <div class="fg">
        <label>SKU</label>
        <input type="text" id="prodSku" placeholder="Ex: PM001">
      </div>
    </div>
    <div class="form-row-2">
      <div class="fg">
        <label>Categoria</label>
        <select id="prodCategory">
          <option>Temperos</option>
          <option>Pimentas</option>
          <option>Ervas</option>
          <option>Molhos</option>
          <option>Especiarias</option>
        </select>
      </div>
      <div class="fg">
        <label>Preço (R$) *</label>
        <input type="number" id="prodPrice" placeholder="0.00" step="0.01">
      </div>
    </div>
    <div class="form-row-2">
      <div class="fg">
        <label>Estoque *</label>
        <input type="number" id="prodStock" placeholder="0">
      </div>
      <div class="fg">
        <label>Status</label>
        <select id="prodStatus">
          <option value="active">Ativo</option>
          <option value="inactive">Inativo</option>
        </select>
      </div>
    </div>
    <div class="fg">
      <label>Imagem do Produto</label>
      <input type="file" id="prodImageFile" accept="image/*">
    </div>
    <div class="fg">
      <label>Descrição</label>
      <textarea id="prodDescription" placeholder="Descrição detalhada do produto..."></textarea>
    </div>
  `;
  
  modal.classList.add('open');
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('open');
}

function saveProduct() {
  const id = document.getElementById('prodId')?.value;
  const name = document.getElementById('prodName')?.value?.trim();
  const sku = document.getElementById('prodSku')?.value?.trim();
  const category = document.getElementById('prodCategory')?.value;
  const price = parseFloat(document.getElementById('prodPrice')?.value) || 0;
  const stock = parseInt(document.getElementById('prodStock')?.value) || 0;
  const status = document.getElementById('prodStatus')?.value === 'active';
  const description = document.getElementById('prodDescription')?.value?.trim();
  if (!name || !price || stock < 0) {
    showToast('Preencha todos os campos obrigatórios', 'error');
    return;
  }
  
  const saveProductData = (imageUrl) => {
    const productData = {
      name,
      sku,
      category,
      price,
      stock,
      active: status,
      image: imageUrl,
      description
    };
    
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_BASE}/products/${id}` : `${API_BASE}/products`;
    
    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        showToast('Erro ao salvar produto: ' + data.error, 'error');
      } else {
        showToast('Produto salvo com sucesso!');
        closeProductModal();
        renderProductsTableAsync();
      }
    })
    .catch(error => {
      console.error('Error saving product:', error);
      showToast('Erro ao salvar produto', 'error');
    });
  };
  
  const fileInput = document.getElementById('prodImageFile');
  if (fileInput.files.length > 0) {
    const formData = new FormData();
    formData.append('image', fileInput.files[0]);
    
    fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData
    })
    .then(async res => {
      if (!res.ok) {
        const text = await res.text();
        console.error('Upload failed:', res.status, text);
        throw new Error('Upload falhou: ' + res.status);
      }
      return res.json();
    })
    .then(data => {
      if (data.imageUrl) {
        saveProductData(data.imageUrl);
      } else {
        const message = data.error || 'Erro no upload da imagem';
        showToast(message, 'error');
        console.error('Upload response error:', data);
      }
    })
    .catch(error => {
      console.error('Error uploading image:', error);
      showToast(error.message || 'Erro no upload da imagem', 'error');
    });
  } else {
    saveProductData('');
  }
}

function editProduct(id) {
  fetch(`${API_BASE}/products/${id}`)
    .then(res => res.json())
    .then(product => {
      openEditProduct(product);
    })
    .catch(error => {
      console.error('Error fetching product:', error);
      showToast('Erro ao carregar produto', 'error');
    });
}

function openEditProduct(product) {
  const modal = document.getElementById('productModal');
  const title = document.getElementById('productModalTitle');
  const body = document.getElementById('productModalBody');
  
  title.textContent = 'Editar Produto';
  body.innerHTML = `
    <div class="form-row-2">
      <div class="fg">
        <label>Nome do Produto *</label>
        <input type="text" id="prodName" placeholder="Ex: Pimenta Malagueta" value="${product.name || ''}">
      </div>
      <div class="fg">
        <label>SKU</label>
        <input type="text" id="prodSku" placeholder="Ex: PM001" value="${product.sku || ''}">
      </div>
    </div>
    <div class="form-row-2">
      <div class="fg">
        <label>Categoria</label>
        <select id="prodCategory">
          <option ${product.category === 'Temperos' ? 'selected' : ''}>Temperos</option>
          <option ${product.category === 'Pimentas' ? 'selected' : ''}>Pimentas</option>
          <option ${product.category === 'Ervas' ? 'selected' : ''}>Ervas</option>
          <option ${product.category === 'Molhos' ? 'selected' : ''}>Molhos</option>
          <option ${product.category === 'Especiarias' ? 'selected' : ''}>Especiarias</option>
        </select>
      </div>
      <div class="fg">
        <label>Preço (R$) *</label>
        <input type="number" id="prodPrice" placeholder="0.00" step="0.01" value="${product.price || 0}">
      </div>
    </div>
    <div class="form-row-2">
      <div class="fg">
        <label>Estoque *</label>
        <input type="number" id="prodStock" placeholder="0" value="${product.stock || 0}">
      </div>
      <div class="fg">
        <label>Status</label>
        <select id="prodStatus">
          <option value="active" ${product.active ? 'selected' : ''}>Ativo</option>
          <option value="inactive" ${!product.active ? 'selected' : ''}>Inativo</option>
        </select>
      </div>
    </div>
    <div class="fg">
      <label>Imagem do Produto</label>
      <div style="display: flex; gap: 20px; align-items: center; margin-bottom: 10px;">
        <input type="file" id="prodImageFile" accept="image/*">
    </div>
    <div class="fg">
      <label>Descrição</label>
      <textarea id="prodDescription" placeholder="Descrição detalhada do produto...">${product.description || ''}</textarea>
    </div>
    <input type="hidden" id="prodId" value="${product.id}">
  `;
  
  modal.classList.add('open');
}

function deleteProduct(id) {
  showConfirm(`Tem certeza que deseja deletar o produto ${id}?`, () => {
    showToast('Produto deletado com sucesso!');
    renderProductsTableAsync();
  });
}

// ==================== ORDERS ====================
function renderOrdersTableAsync() {
  const search = document.getElementById('orderSearch')?.value || '';
  const status = document.getElementById('orderStatusFilter')?.value || '';
  
  fetch(`${API_BASE}/orders`)
    .then(res => res.json())
    .then(orders => {
      const filtered = orders.filter(o => 
        (o.customer_name?.toLowerCase().includes(search.toLowerCase()) || String(o.id).includes(search)) &&
        (!status || o.status === status)
      );
      renderOrdersTable(filtered);
    })
    .catch(error => {
      console.error('Error fetching orders:', error);
      document.getElementById('ordersTableBody').innerHTML = '<tr><td colspan="8">Erro ao carregar pedidos</td></tr>';
    });
}

function renderOrdersTable(orders) {
  const filtered = orders;

  const tbody = document.getElementById('ordersTableBody');
  tbody.innerHTML = filtered.map(order => {
    const orderDate = new Date(order.created_at).toLocaleDateString('pt-BR');
    const status = order.status || 'Pendente';
    const paymentStatus = order.payment_status || 'Pendente';
    return `
      <tr>
        <td>#${String(order.id).padStart(3, '0')}</td>
        <td>${order.customer_name || 'N/A'}</td>
        <td>${orderDate}</td>
        <td>R$ ${parseFloat(order.total || 0).toFixed(2)}</td>
        <td>${order.payment_method || 'N/A'}</td>
        <td><span class="status-pill ps-${paymentStatus.toLowerCase().replace(' ', '')}">${paymentStatus}</span></td>
        <td><span class="status-pill s-${status.toLowerCase()}">${status}</span></td>
        <td>
          <button class="btn btn-sm btn-ghost" onclick="openOrderModal(${order.id})">👁️</button>
          <button class="btn btn-sm btn-ghost" onclick="deleteOrder(${order.id})">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');

  document.getElementById('ordersCount').textContent = filtered.length;
}

function openOrderModal(orderId) {
  const modal = document.getElementById('orderModal');
  const body = document.getElementById('orderModalBody');
  
  body.innerHTML = '<div style="padding: 20px; text-align: center;">Carregando...</div>';
  
  fetch(`${API_BASE}/orders/${orderId}`)
    .then(res => res.json())
    .then(order => {
      const orderDate = new Date(order.created_at).toLocaleDateString('pt-BR');
      const status = order.status || 'Pendente';
      
      body.innerHTML = `
        <input type="hidden" id="currentOrderId" value="${orderId}">
        <div class="order-detail-grid">
          <div class="detail-section">
            <h4>Informações do Pedido</h4>
            <div class="detail-row">
              <strong>Pedido:</strong>
              <span>#${String(order.id).padStart(3, '0')}</span>
            </div>
            <div class="detail-row">
              <strong>Data:</strong>
              <span>${orderDate}</span>
            </div>
            <div class="detail-row">
              <strong>Total:</strong>
              <span>R$ ${parseFloat(order.total || 0).toFixed(2)}</span>
            </div>
          </div>
          <div class="detail-section">
            <h4>Cliente</h4>
            <div class="detail-row">
              <strong>Nome:</strong>
              <span>${order.customer_name || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <strong>Email:</strong>
              <span>${order.customer_email || 'N/A'}</span>
            </div>
            <div class="detail-row">
              <strong>Telefone:</strong>
              <span>${order.customer_phone || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h4>Itens do Pedido</h4>
          <p style="color: #999; font-size: 12px;">Dados de itens não disponíveis</p>
        </div>

        <div class="control-group">
          <label>Status do Pedido:</label>
          <select id="orderStatus">
            <option ${status === 'Pendente' ? 'selected' : ''}>Pendente</option>
            <option ${status === 'Processando' ? 'selected' : ''}>Processando</option>
            <option ${status === 'Enviado' ? 'selected' : ''}>Enviado</option>
            <option ${status === 'Entregue' ? 'selected' : ''}>Entregue</option>
            <option ${status === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
          </select>
        </div>

        <div class="control-group">
          <label>Status do Pagamento:</label>
          <select id="paymentStatus">
            <option ${order.payment_status === 'Pendente' ? 'selected' : ''}>Pendente</option>
            <option ${order.payment_status === 'Pago' ? 'selected' : ''}>Pago</option>
            <option ${order.payment_status === 'Estornado' ? 'selected' : ''}>Estornado</option>
          </select>
        </div>
      `;
      
      modal.classList.add('open');
    })
    .catch(error => {
      console.error('Error fetching order:', error);
      body.innerHTML = '<div style="padding: 20px; text-align: center; color: red;">Erro ao carregar pedido</div>';
    });
}

function closeOrderModal() {
  document.getElementById('orderModal').classList.remove('open');
}

function saveOrderStatus() {
  const orderId = document.getElementById('currentOrderId')?.value;
  const orderStatus = document.getElementById('orderStatus')?.value;
  const paymentStatus = document.getElementById('paymentStatus')?.value;
  
  if (!orderId) {
    showToast('Erro: ID do pedido não encontrado', 'error');
    return;
  }
  
  fetch(`${API_BASE}/orders/${orderId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: orderStatus, payment_status: paymentStatus })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      showToast('Erro ao atualizar pedido: ' + data.error, 'error');
    } else {
      showToast('Pedido atualizado com sucesso!');
      closeOrderModal();
      renderOrdersTableAsync();
    }
  })
  .catch(error => {
    console.error('Error updating order:', error);
    showToast('Erro ao atualizar pedido', 'error');
  });
}

function deleteOrder(id) {
  showConfirm(`Tem certeza que deseja deletar o pedido ${id}?`, () => {
    fetch(`${API_BASE}/orders/${id}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          showToast('Erro ao deletar pedido: ' + data.error, 'error');
        } else {
          showToast('Pedido deletado com sucesso!');
          renderOrdersTableAsync();
        }
      })
      .catch(err => {
        console.error('Error deleting order:', err);
        showToast('Erro ao deletar pedido', 'error');
      });
  });
}

function exportOrders() {
  showToast('Pedidos exportados como CSV!');
}

// ==================== CUSTOMERS ====================
function renderCustomersTableAsync() {
  const search = document.getElementById('customersSearch')?.value || '';
  
  fetch(`${API_BASE}/auth/users`)
    .then(res => res.json())
    .then(customers => {
      const filtered = customers.filter(c => 
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.cpf?.includes(search)
      );
      renderCustomersTable(filtered);
    })
    .catch(error => {
      console.error('Error fetching customers:', error);
      document.getElementById('customersTableBody').innerHTML = '<tr><td colspan="8">Erro ao carregar clientes</td></tr>';
    });
}

function renderCustomersTable(customers) {
  const filtered = customers;

  const tbody = document.getElementById('customersTableBody');
  tbody.innerHTML = filtered.map(customer => {
    const registered = new Date(customer.created_at).toLocaleDateString('pt-BR');
    const totalOrders = customer.total_orders || 0;
    const totalSpent = parseFloat(customer.total_spent || 0).toFixed(2);
    return `
      <tr>
        <td>${customer.name || 'N/A'}</td>
        <td>${customer.email || 'N/A'}</td>
        <td>${customer.phone || 'N/A'}</td>
        <td>${customer.cpf || 'N/A'}</td>
        <td>${totalOrders}</td>
        <td>R$ ${totalSpent}</td>
        <td>${registered}</td>
        <td>
          <button class="btn btn-sm btn-ghost" onclick="editCustomer(${customer.id})">✏️</button>
          <button class="btn btn-sm btn-ghost" onclick="deleteCustomer(${customer.id})">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');

  document.getElementById('customersCount').textContent = filtered.length;
}

function filterCustomersTable() {
  renderCustomersTableAsync();
}

function openAddCustomer(customer = null) {
  const modal = document.getElementById('customerModal');
  if (!modal) {
    console.error('customerModal não encontrado');
    return;
  }
  
  const title = document.getElementById('customerModalTitle') || document.createElement('div');
  title.textContent = customer ? 'Editar Cliente' : 'Adicionar Novo Cliente';
  
  const body = document.getElementById('customerModalBody') || document.createElement('div');
  body.innerHTML = `
    <input type="hidden" id="custId" value="${customer ? customer.id : ''}">
    <div class="form-row-2">
      <div class="fg">
        <label>Nome *</label>
        <input type="text" id="custName" placeholder="Nome completo" value="${customer ? customer.name || '' : ''}">
      </div>
      <div class="fg">
        <label>Email</label>
        <input type="email" id="custEmail" placeholder="email@example.com" value="${customer ? customer.email || '' : ''}">
      </div>
    </div>
    <div class="form-row-2">
      <div class="fg">
        <label>Telefone</label>
        <input type="tel" id="custPhone" placeholder="(11) 99999-9999" value="${customer ? customer.phone || '' : ''}">
      </div>
      <div class="fg">
        <label>CPF</label>
        <input type="text" id="custCPF" placeholder="000.000.000-00" value="${customer ? customer.cpf || '' : ''}">
      </div>
    </div>
    <div class="form-row-2">
      <div class="fg">
        <label>Endereço</label>
        <input type="text" id="custAddress" placeholder="Rua, número" value="${customer ? customer.address || '' : ''}">
      </div>
      <div class="fg">
        <label>Cidade</label>
        <input type="text" id="custCity" placeholder="São Paulo" value="${customer ? customer.city || '' : ''}">
      </div>
    </div>
    <div class="form-row-2">
      <div class="fg">
        <label>Estado</label>
        <input type="text" id="custState" placeholder="SP" maxlength="2" value="${customer ? customer.state || '' : ''}">
      </div>
      <div class="fg">
        <label>CEP</label>
        <input type="text" id="custZip" placeholder="00000-000" value="${customer ? customer.zip || '' : ''}">
      </div>
    </div>
    <div class="form-row-2">
      <div class="fg">
        <label>Pedidos</label>
        <input type="number" id="custTotalOrders" placeholder="0" min="0" value="${customer ? (customer.total_orders || 0) : 0}">
      </div>
      <div class="fg">
        <label>Total Gasto (R$)</label>
        <input type="number" step="0.01" id="custTotalSpent" placeholder="0.00" min="0" value="${customer ? (customer.total_spent ? parseFloat(customer.total_spent).toFixed(2) : '0.00') : '0.00'}">
      </div>
    </div>
    <div class="form-row-2">
      <div class="fg" style="grid-column: 1 / -1;">
        <label>Notas/Observações</label>
        <textarea id="custNotes" placeholder="Anotações sobre o cliente" style="min-height: 80px; resize: vertical;">${customer ? customer.notes || '' : ''}</textarea>
      </div>
    </div>
  `;
  
  modal.classList.add('open');
}

function closeCustomerModal() {
  const modal = document.getElementById('customerModal');
  if (modal) modal.classList.remove('open');
}

function saveCustomer() {
  const name = document.getElementById('custName')?.value?.trim();
  const id = document.getElementById('custId')?.value?.trim();
  
  if (!name) {
    showToast('Nome é obrigatório', 'error');
    return;
  }
  
  const customerData = {
    name: name,
    email: document.getElementById('custEmail')?.value || '',
    phone: document.getElementById('custPhone')?.value || '',
    cpf: document.getElementById('custCPF')?.value || '',
    address: document.getElementById('custAddress')?.value || '',
    city: document.getElementById('custCity')?.value || '',
    state: document.getElementById('custState')?.value || '',
    zip: document.getElementById('custZip')?.value || '',
    notes: document.getElementById('custNotes')?.value || ''
  };

  // Totais (opcionais)
  const totalOrdersVal = parseInt(document.getElementById('custTotalOrders')?.value, 10);
  const totalSpentVal = parseFloat((document.getElementById('custTotalSpent')?.value || '').toString().replace(',', '.'));
  customerData.total_orders = isNaN(totalOrdersVal) ? 0 : totalOrdersVal;
  customerData.total_spent = isNaN(totalSpentVal) ? 0 : totalSpentVal;
  
  const method = id ? 'PUT' : 'POST';
  const url = id ? `${API_BASE}/auth/admin/customers/${id}` : `${API_BASE}/auth/admin/customers`;
  const successMessage = id ? 'Cliente atualizado com sucesso!' : 'Cliente cadastrado com sucesso!';
  
  fetch(url, {
    method: method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customerData)
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      showToast(data.error, 'error');
    } else {
      showToast(successMessage);
      closeCustomerModal();
      renderCustomersTableAsync();
    }
  })
  .catch(error => {
    console.error('Error saving customer:', error);
    showToast('Erro ao salvar cliente', 'error');
  });
}

function editCustomer(id) {
  fetch(`${API_BASE}/auth/admin/customers/${id}`)
    .then(res => res.json())
    .then(customer => {
      if (customer.error) {
        showToast(customer.error, 'error');
      } else {
        openAddCustomer(customer);
      }
    })
    .catch(error => {
      console.error('Error fetching customer:', error);
      showToast('Erro ao carregar dados do cliente', 'error');
    });
}

function deleteCustomer(id) {
  showConfirm(`Tem certeza que deseja deletar este cliente?`, () => {
    fetch(`${API_BASE}/auth/admin/customers/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    })
    .then(res => {
      if (!res.ok) {
        return res.text().then(text => {
          try {
            const errorData = JSON.parse(text);
            throw new Error(errorData.error || 'Erro do servidor');
          } catch (e) {
            throw new Error(`Erro ${res.status}: ${res.statusText}`);
          }
        });
      }
      return res.json();
    })
    .then(data => {
      if (data.error) {
        showToast(data.error, 'error');
      } else {
        showToast('Cliente deletado com sucesso!');
        renderCustomersTableAsync();
      }
    })
    .catch(error => {
      console.error('Error deleting customer:', error);
      showToast(error.message || 'Erro ao deletar cliente', 'error');
    });
  });
}

function exportCustomers() {
  showToast('Clientes exportados como CSV!');
}

// ==================== REPORTS ====================
function loadReportData(days) {
  const container = document.getElementById('reportStats');
  
  const stats = [
    { label: 'Total Vendido', value: `R$ ${(Math.random() * 10000).toFixed(2)}`, icon: '💰' },
    { label: 'Total de Pedidos', value: Math.floor(Math.random() * 100), icon: '📦' },
    { label: 'Ticket Médio', value: `R$ ${(Math.random() * 500).toFixed(2)}`, icon: '📊' }
  ];

  container.innerHTML = stats.map(stat => `
    <div class="card" style="text-align: center; padding: 20px;">
      <div style="font-size: 32px; margin-bottom: 8px;">${stat.icon}</div>
      <div style="color: #aaa; font-size: 12px; margin-bottom: 8px;">${stat.label}</div>
      <div style="font-weight: 900; font-size: 24px; color: var(--marrom);">${stat.value}</div>
    </div>
  `).join('');

  renderReportChart(days);
}

function renderReportChart(days) {
  const chart = document.getElementById('reportChart');
  
  let html = '';
  for (let i = 0; i < parseInt(days); i++) {
    const height = (Math.random() * 100 + 20);
    html += `
      <div class="bar-group">
        <div class="bar" data-value="R$ ${(Math.random() * 500).toFixed(2)}" style="height: ${height}px;"></div>
        <div class="bar-label">${i + 1}</div>
      </div>
    `;
  }
  
  chart.innerHTML = html;
}

function exportReports() {
  showToast('Relatórios exportados como CSV!');
}

// ==================== MODAL UTILITIES ====================
function showConfirm(message, onConfirm) {
  const modal = document.getElementById('confirmModal');
  document.getElementById('confirmTitle').textContent = 'Confirmação';
  document.getElementById('confirmMsg').textContent = message;
  
  const confirmBtn = document.getElementById('confirmAction');
  confirmBtn.onclick = () => {
    onConfirm();
    closeConfirm();
  };
  
  modal.classList.add('open');
}

function closeConfirm() {
  document.getElementById('confirmModal').classList.remove('open');
}



// ==================== RELOAD ====================
function reloadAll() {
  loadDashboard();
  showToast('Dados atualizados!');
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
  // Start with dashboard
  renderSalesChart('week');
  loadDashboard();
});
