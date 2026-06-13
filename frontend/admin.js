// Admin Dashboard - JavaScript
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000/api'
  : 'https://cia-de-condimentos.onrender.com/api';

const BACKEND_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'
  : 'https://cia-de-condimentos.onrender.com';

// Global variable to track current report period
let currentReportPeriod = '7';
let currentCrmPeriod = 30;

function getDateRangeForPeriod(days) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return {
    dateStart: start.toISOString().split('T')[0],
    dateEnd: end.toISOString().split('T')[0]
  };
}

// ==================== IMAGE URL HANDLER ====================
function getImageUrl(imageUrl) {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  return BACKEND_BASE + imageUrl;
}

// ==================== SIDEBAR TOGGLE ====================
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  sidebar.classList.toggle('open');
}

function closeSidebar() {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar.classList.contains('open')) {
    sidebar.classList.remove('open');
  }
}

// Close sidebar when clicking overlay
document.addEventListener('DOMContentLoaded', function() {
  const overlay = document.querySelector('.sidebar-overlay');
  if (overlay) {
    overlay.addEventListener('click', closeSidebar);
  }
});

// ==================== QUANTITY CONTROLS ====================
function incrementQty(inputId) {
  const input = document.getElementById(inputId);
  if (input) {
    const currentValue = parseInt(input.value) || 1;
    input.value = currentValue + 1;
    // Trigger change event for calculations
    input.dispatchEvent(new Event('change'));
    input.dispatchEvent(new Event('input'));
  }
}

function decrementQty(inputId) {
  const input = document.getElementById(inputId);
  if (input) {
    const currentValue = parseInt(input.value) || 1;
    if (currentValue > 1) {
      input.value = currentValue - 1;
      // Trigger change event for calculations
      input.dispatchEvent(new Event('change'));
      input.dispatchEvent(new Event('input'));
    }
  }
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
    'dashboard': 'Dashboard Pedidos',
    'products': 'Produtos',
    'orders': 'Pedidos',
    'promotions': 'Promoções',
    'customers': 'Clientes',
    'crm': 'Central de Clientes',
    'reports': 'Relatórios & Análises',
    'suppliers': 'Central de Fornecedores'
  };
  
  document.getElementById('pageTitle').textContent = titles[pageId] || 'Dashboard';
  
  // Close sidebar on mobile after navigation
  if (window.innerWidth <= 767) {
    closeSidebar();
  }
  
  // Load data for the page
  if (pageId === 'products') {
    renderProductsTableAsync();
  } else if (pageId === 'orders') {
    renderOrdersTableAsync();
  } else if (pageId === 'customers') {
    renderCustomersTableAsync();
  } else if (pageId === 'dashboard') {
    loadDashboard();
  } else if (pageId === 'promotions') {
    loadProductsForPromo();
    renderProductPromotionsAsync();
  } else if (pageId === 'crm') {
    initializeCrm();
  } else if (pageId === 'suppliers') {
    initializeSuppliers();
  } else if (pageId === 'reports') {
    loadReportsData();
  }
}

// ==================== TOAST NOTIFICATIONS ====================
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  
  // Define classes based on type
  let className = 'toast show';
  if (type === 'error') {
    className += ' toast-error';
  } else if (type === 'warning') {
    className += ' toast-warning';
  } else if (type === 'info') {
    className += ' toast-info';
  } else {
    className += ' toast-success';
  }
  
  toast.className = className;
  
  const duration = type === 'error' ? 5000 : (type === 'warning' ? 4000 : 3000);
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

// ==================== DASHBOARD ====================
function loadDashboard() {
  fetchDashboardStats();
  renderRecentOrders();
  renderLowStockProducts();
  renderTopProducts();
  // Atualizar gráfico de vendas com o período atual
  if (currentReportPeriod) {
    renderSalesChart(currentReportPeriod);
  } else {
    renderSalesChart('week');
  }
}

function fetchDashboardStats() {
  fetch(`${API_BASE}/orders`)
    .then(res => res.json())
    .then(orders => {
      document.getElementById('dash-orders').textContent = orders.length;
      // APENAS PEDIDOS PAGOS - dados reais para receita
      const totalRevenue = orders.filter(o => o.payment_status === 'Pago').reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
      document.getElementById('dash-revenue').textContent = `R$ ${parseFloat(totalRevenue).toFixed(2)}`;
      const pending = orders.filter(o => o.status === 'Pendente').length;
      document.getElementById('dash-pending').textContent = pending;
    })
    .catch(() => {
      document.getElementById('dash-orders').textContent = '0';
      document.getElementById('dash-revenue').textContent = 'R$ 0,00';
      document.getElementById('dash-pending').textContent = '0';
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
  currentReportPeriod = days;
  document.querySelectorAll('.period-tab').forEach(tab => tab.classList.remove('active'));
  element.classList.add('active');
  loadReportData(days);
}

async function renderSalesChart(period) {
  const salesChart = document.getElementById('salesChart');
  
  try {
    // Fetch paid orders only
    const ordersRes = await fetch(`${API_BASE}/orders`);
    if (!ordersRes.ok) throw new Error('Failed to fetch orders');
    
    const orders = await ordersRes.json();
    const paidOrders = orders.filter(o => o.payment_status === 'Pago');
    
    // Determine grouping by period
    const now = new Date();
    let groupedData = {};
    let labels = [];
    let maxSale = 1;
    
    if (period === 'week') {
      // Group by day for last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        groupedData[dateKey] = 0;
        labels.push(date.getDate());
      }
    } else if (period === 'month') {
      // Group by day for last 30 days
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        groupedData[dateKey] = 0;
        labels.push(date.getDate());
      }
    } else if (period === 'year') {
      // Group by month for last 12 months
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toISOString().substring(0, 7); // YYYY-MM
        groupedData[monthKey] = 0;
        labels.push(date.toLocaleString('pt-BR', { month: 'short' }).toUpperCase());
      }
    }
    
    // Group orders by period
    paidOrders.forEach(order => {
      let key;
      if (period === 'year') {
        key = order.created_at.substring(0, 7); // YYYY-MM
      } else {
        key = order.created_at.split('T')[0]; // YYYY-MM-DD
      }
      
      if (groupedData.hasOwnProperty(key)) {
        groupedData[key] += parseFloat(order.total || 0);
      }
    });
    
    // Get sorted data
    const sortedKeys = Object.keys(groupedData).sort();
    const salesData = sortedKeys.map(key => groupedData[key]);
    maxSale = Math.max(...salesData, 1);
    
    // Render bars
    let html = '';
    salesData.forEach((sales, idx) => {
      const height = (sales / maxSale) * 160 + 20;
      html += `
        <div class="bar-group" title="R$ ${sales.toFixed(2)}">
          <div class="bar" data-value="R$ ${sales.toFixed(2)}" style="height: ${height}px; background: linear-gradient(to top, var(--marrom), #d4a574);"></div>
          <div class="bar-label">${labels[idx]}</div>
        </div>
      `;
    });
    
    salesChart.innerHTML = html;
    
  } catch (error) {
    console.error('Error rendering sales chart:', error);
    salesChart.innerHTML = '<p style="color: #aaa; text-align: center; padding: 40px;">Erro ao carregar dados</p>';
  }
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
  
  // Buscar produtos e pedidos em paralelo
  Promise.all([
    fetch(`${API_BASE}/products/admin/all`).then(res => res.json()),
    fetch(`${API_BASE}/orders`).then(res => res.json())
  ])
  .then(([products, orders]) => {
    // Contar vendas por produto (apenas pedidos com pagamento confirmado = 'Pago')
    const salesByProduct = {};
    
    orders.forEach(order => {
      // Apenas contar vendas de pedidos onde payment_status === 'Pago'
      if (order.payment_status === 'Pago' && order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const productId = item.product_id;
          salesByProduct[productId] = (salesByProduct[productId] || 0) + item.quantity;
        });
      }
    });
    
    // Adicionar contagem de vendas aos produtos
    const productsWithSales = products.map(prod => ({
      ...prod,
      sales: salesByProduct[prod.id] || 0
    }));
    
    // Ordenar por vendas (decrescente)
    const topProducts = productsWithSales
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 3);
    
    if (topProducts.length === 0) {
      container.innerHTML = '<div style="padding: 16px; text-align: center; color: #999;">Sem vendas registradas</div>';
      return;
    }
    
    container.innerHTML = topProducts.map(prod => `
      <div class="order-row">
        <div style="flex: 1; font-weight: 700;">${prod.name}</div>
        <div style="color: var(--vermelho); font-weight: 700;">${prod.sales} ${prod.sales === 1 ? 'venda' : 'vendas'}</div>
      </div>
    `).join('');
  })
  .catch(err => {
    console.error('Erro ao carregar top produtos:', err);
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
  tbody.innerHTML = filtered.map(prod => {
    // Get first image from product_images, or fallback to image_url column
    let imageUrl = null;
    if (prod.images && prod.images.length > 0) {
      imageUrl = getImageUrl(prod.images[0]);
    } else if (prod.image_url) {
      imageUrl = getImageUrl(prod.image_url);
    }
    
    const imgHtml = imageUrl 
      ? `<img src="${imageUrl}" alt="${prod.name}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.parentElement.innerHTML='️'">` 
      : '️';
    
    return `
    <tr>
      <td data-label="Produto">
        <div class="prod-cell">
          <div class="prod-thumb">${imgHtml}</div>
          <div>
            <div class="prod-name">${prod.name}</div>
            <div class="prod-cat">${prod.category || 'Sem categoria'}</div>
          </div>
        </div>
      </td>
      <td data-label="COD">${prod.cod || 'N/A'}</td>
      <td data-label="Categoria">${prod.category || 'N/A'}</td>
      <td data-label="Preço">R$ ${parseFloat(prod.price || 0).toFixed(2)}</td>
      <td data-label="Estoque">${prod.stock || 0} unid.</td>
      <td data-label="Status"><span class="tag ${prod.active ? 'tag-active' : 'tag-inactive'}">${prod.active ? 'Ativo' : 'Inativo'}</span></td>
      <td data-label="Ações">
        <div class="actions-cell">
          <button class="btn btn-sm btn-ghost" onclick="editProduct(${prod.id})">✏️</button>
          <button class="btn btn-sm btn-ghost" onclick="deleteProduct(${prod.id})">🗑️</button>
        </div>
      </td>
    </tr>
  `;
  }).join('');

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
        <label>COD</label>
        <input type="text" id="prodCod" placeholder="Ex: PM001">
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
      <label>Imagens do Produto (múltiplos arquivos)</label>
      <input type="file" id="prodImageFile" accept="image/*" multiple onchange="updateFileList()">
      <div id="prodImageList" style="margin-top: 10px; font-size: 12px; color: #666;"></div>
    </div>
    <div class="fg">
      <label>Descrição</label>
      <textarea id="prodDescription" placeholder="Descrição detalhada do produto..."></textarea>
    </div>
  `;
  
  modal.classList.add('open');
}

function updateFileList() {
  const fileInput = document.getElementById('prodImageFile');
  const listDiv = document.getElementById('prodImageList');
  
  if (!fileInput || fileInput.files.length === 0) {
    listDiv.innerHTML = '';
    return;
  }
  
  let html = `<div style="margin-bottom: 15px;">
    <strong style="color: #27ae60; font-size: 14px;">✓ ${fileInput.files.length} arquivo(s) selecionado(s):</strong>
  </div>
  <div style="display: flex; gap: 12px; flex-wrap: wrap; border: 2px dashed #e0d8c8; padding: 15px; border-radius: 8px; background: #faf7f2;">
  `;
  
  // Criar previews das imagens
  for (let i = 0; i < fileInput.files.length; i++) {
    const file = fileInput.files[i];
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const imgPreview = document.getElementById(`preview-${i}`);
      if (imgPreview) {
        imgPreview.src = e.target.result;
      }
    };
    
    reader.readAsDataURL(file);
    
    html += `
      <div style="text-align: center; position: relative;">
        <div style="
          width: 100px; 
          height: 100px; 
          background: white; 
          border: 2px solid #e0d8c8;
          border-radius: 6px; 
          display: flex; 
          align-items: center; 
          justify-content: center;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        ">
          <img id="preview-${i}" style="max-width: 100%; max-height: 100%; object-fit: cover;" alt="Preview ${i + 1}">
        </div>
        <div style="
          margin-top: 8px; 
          font-size: 11px; 
          color: #666; 
          max-width: 110px;
          word-break: break-word;
          line-height: 1.3;
        ">
          <strong>${file.name}</strong><br>
          ${sizeMB} MB
        </div>
      </div>
    `;
  }
  
  html += `
  </div>
  <div style="margin-top: 12px; font-size: 11px; color: #888;">
    💡 Dica: As imagens aparecerão acima conforme forem selecionadas
  </div>
  `;
  
  listDiv.innerHTML = html;
  
  // Carregar as imagens novamente
  for (let i = 0; i < fileInput.files.length; i++) {
    const file = fileInput.files[i];
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const imgPreview = document.getElementById(`preview-${i}`);
      if (imgPreview) {
        imgPreview.src = e.target.result;
      }
    };
    
    reader.readAsDataURL(file);
  }
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('open');
}

function saveProduct() {
  const id = document.getElementById('prodId')?.value;
  const name = document.getElementById('prodName')?.value?.trim();
  const cod = document.getElementById('prodCod')?.value?.trim();
  const category = document.getElementById('prodCategory')?.value;
  const price = parseFloat(document.getElementById('prodPrice')?.value) || 0;
  const stock = parseInt(document.getElementById('prodStock')?.value) || 0;
  const status = document.getElementById('prodStatus')?.value === 'active';
  const description = document.getElementById('prodDescription')?.value?.trim();
  
  // Validações
  if (!name || name.length === 0) {
    showToast('Por favor, preencha o Nome do Produto', 'error');
    return;
  }
  
  if (price <= 0) {
    showToast('Por favor, preencha um Preço válido (maior que 0)', 'error');
    return;
  }
  
  if (stock < 0) {
    showToast('Por favor, preencha um Estoque válido (maior ou igual a 0)', 'error');
    return;
  }
  
  // Verificar se selecionou pelo menos uma imagem para novo produto
  const fileInput = document.getElementById('prodImageFile');
  if (!id && (!fileInput || fileInput.files.length === 0)) {
    showToast('⚠️ Aviso: Nenhuma imagem selecionada! Recomendamos adicionar imagens ao produto.', 'warning');
  }
  
  // Função para salvar produto no banco
  const saveProductToDB = (productToSave) => {
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_BASE}/products/${id}` : `${API_BASE}/products`;
    
    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productToSave)
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) {
        console.error('❌ Backend error response:', data);
        throw new Error(data.error || `HTTP error! status: ${res.status}`);
      }
      return data;
    })
    .then(data => {
      if (data.error) {
        showToast('Erro ao salvar produto: ' + data.error, 'error');
        console.error('API Error:', data);
      } else {
        showToast('✅ Produto salvo com sucesso!', 'success');
        closeProductModal();
        renderProductsTableAsync();
      }
    })
    .catch(error => {
      console.error('❌ Error saving product:', error);
      showToast('❌ Erro ao salvar produto: ' + error.message, 'error');
    });
  };
  
  // Preparar dados do produto
  const productData = {
    name,
    cod,
    category,
    price,
    stock,
    active: status,
    description
  };
  
  // ✅ NOVO: Upload com Cloudinary
  if (fileInput && fileInput.files.length > 0) {
    // Se é novo produto, primeiro salvar, depois fazer upload
    if (!id) {
      showToast('💾 Salvando produto...', 'info');
      
      // Salvar produto primeiro
      fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      })
      .then(res => res.json())
      .then(savedProduct => {
        if (savedProduct.error) {
          throw new Error(savedProduct.error);
        }
        
        // Agora fazer upload das imagens com o productId
        const productId = savedProduct.id;
        console.log('✅ Produto criado com ID:', productId);
        showToast('📤 Fazendo upload de ' + fileInput.files.length + ' imagem(ns)...', 'info');
        
        const uploadPromises = [];
        
        for (let i = 0; i < fileInput.files.length; i++) {
          const file = fileInput.files[i];
          console.log(`Upload arquivo ${i + 1}:`, file.name);
          
          const formData = new FormData();
          formData.append('image', file);
          formData.append('productId', productId);
          
          uploadPromises.push(
            fetch(`${API_BASE}/upload/product`, {
              method: 'POST',
              body: formData
            })
            .then(async res => {
              if (!res.ok) {
                const text = await res.text();
                console.error(`Upload file ${i + 1} failed:`, res.status, text);
                throw new Error(`Upload falhou para "${file.name}": ${res.status}`);
              }
              return res.json();
            })
            .then(data => {
              if (data.image_url) {
                console.log(`✅ Upload bem-sucedido arquivo ${i + 1}:`, data.image_url);
                return data.image_url;
              } else {
                throw new Error(data.error || `Erro no upload de "${file.name}"`);
              }
            })
          );
        }
        
        Promise.all(uploadPromises)
          .then(imageUrls => {
            console.log('✅ Todos os uploads concluídos. URLs:', imageUrls);
            
            // Salvar URLs na tabela product_images
            return fetch(`${API_BASE}/products/${productId}/images`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ images: imageUrls })
            })
            .then(res => res.json());
          })
          .then(result => {
            console.log('✅ Imagens registradas no banco:', result.images);
            showToast('✅ Produto criado e imagens enviadas!', 'success');
            closeProductModal();
            renderProductsTableAsync();
          })
          .catch(error => {
            console.error('Error uploading images:', error);
            showToast('⚠️ Produto criado, mas erro no upload de imagens: ' + error.message, 'warning');
            closeProductModal();
            renderProductsTableAsync();
          });
      })
      .catch(error => {
        console.error('Error creating product:', error);
        showToast('❌ Erro ao criar produto: ' + error.message, 'error');
      });
    } else {
      // Produto existente - apenas fazer upload de novas imagens
      showToast('📤 Fazendo upload de ' + fileInput.files.length + ' imagem(ns)...', 'info');
      
      const uploadPromises = [];
      
      for (let i = 0; i < fileInput.files.length; i++) {
        const file = fileInput.files[i];
        
        const formData = new FormData();
        formData.append('image', file);
        formData.append('productId', id);
        
        uploadPromises.push(
          fetch(`${API_BASE}/upload/product`, {
            method: 'POST',
            body: formData
          })
          .then(res => res.json())
          .then(data => {
            if (data.image_url) return data.image_url;
            throw new Error(data.error || 'Erro no upload');
          })
        );
      }
      
      Promise.all(uploadPromises)
        .then(imageUrls => {
          // Salvar URLs na tabela product_images
          return fetch(`${API_BASE}/products/${id}/images`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ images: imageUrls })
          })
          .then(res => res.json());
        })
        .then(result => {
          console.log('✅ Imagens registradas no banco:', result.images);
          showToast('✅ Imagens enviadas!', 'success');
          saveProductToDB(productData);
        })
        .catch(error => {
          showToast('❌ Erro no upload: ' + error.message, 'error');
        });
    }
  } else {
    // Sem imagens - apenas salvar produto
    saveProductToDB(productData);
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
  
  // Build images display with previews
  let imagesHtml = '';
  // Use product_images array if available, fallback to image_url column
  const productImages = (product.images && product.images.length > 0) ? product.images : (product.image_url ? [product.image_url] : []);
  
  if (productImages && productImages.length > 0) {
    imagesHtml = `
      <div style="margin-bottom: 15px;">
        <strong style="color: #c0392b; font-size: 13px;">📷 Imagens Atuais:</strong>
      </div>
      <div style="display: flex; gap: 12px; flex-wrap: wrap; border: 2px solid #e0d8c8; padding: 15px; border-radius: 8px; background: #fff9f5; margin-bottom: 12px;">
    `;
    
    productImages.forEach((img, idx) => {
      imagesHtml += `
        <div style="text-align: center; position: relative;">
          <div style="
            width: 100px; 
            height: 100px; 
            background: white; 
            border: 2px solid #e0d8c8;
            border-radius: 6px; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          ">
            <img src="${getImageUrl(img)}" style="max-width: 100%; max-height: 100%; object-fit: cover;" alt="Imagem ${idx + 1}" onerror="this.parentElement.innerHTML='❌'">
          </div>
          <div style="
            margin-top: 8px; 
            font-size: 10px; 
            color: #666; 
            max-width: 110px;
            word-break: break-word;
            line-height: 1.2;
          ">
            Imagem ${idx + 1}
          </div>
        </div>
      `;
    });
    
    imagesHtml += `
      </div>
      <div style="background: #fdf8f5; border-left: 4px solid #c0392b; padding: 10px 12px; margin-bottom: 12px; border-radius: 4px; font-size: 12px; color: #666;">
        ⚠️ <strong>Atenção:</strong> As novas imagens que selecionar SUBSTITUIRÃO as imagens acima
      </div>
    `;
  }
  
  body.innerHTML = `
    <div class="form-row-2">
      <div class="fg">
        <label>Nome do Produto *</label>
        <input type="text" id="prodName" placeholder="Ex: Pimenta Malagueta" value="${product.name || ''}">
      </div>
      <div class="fg">
        <label>COD</label>
        <input type="text" id="prodCod" placeholder="Ex: PM001" value="${product.cod || ''}">
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
      <label>Imagens do Produto (múltiplos arquivos)</label>
      ${imagesHtml}
      <input type="file" id="prodImageFile" accept="image/*" multiple onchange="updateFileList()" style="margin-top: 10px;">
      <div id="prodImageList" style="margin-top: 10px;"></div>
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
    fetch(`${API_BASE}/products/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    })
    .then(async res => {
      const data = await res.json();
      
      if (!res.ok) {
        // Extract detailed error message from server response
        let errorMessage = data.error || `HTTP error! status: ${res.status}`;
        
        if (data.details) {
          errorMessage += ` (${data.details})`;
        }
        
        console.error('Delete product error response:', {
          status: res.status,
          error: data.error,
          details: data.details,
          code: data.code
        });
        
        throw new Error(errorMessage);
      }
      
      return data;
    })
    .then(data => {
      showToast('✅ Produto deletado com sucesso!', 'success');
      renderProductsTableAsync();
    })
    .catch(error => {
      console.error('Error deleting product:', error);
      showToast('❌ ' + error.message, 'error');
    });
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
        <td data-label="Pedido">#${String(order.id).padStart(3, '0')}</td>
        <td data-label="Cliente">${order.customer_name || 'N/A'}</td>
        <td data-label="Data">${orderDate}</td>
        <td data-label="Total">R$ ${parseFloat(order.total || 0).toFixed(2)}</td>
        <td data-label="Pagamento">${order.payment_method || 'N/A'}</td>
        <td data-label="Status Pgto"><span class="status-pill ps-${paymentStatus.toLowerCase().replace(' ', '')}">${paymentStatus}</span></td>
        <td data-label="Status Pedido"><span class="status-pill s-${status.toLowerCase()}">${status}</span></td>
        <td data-label="Ações">
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
      const paymentMethod = order.payment || order.payment_method || 'Não informado';
      
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
          <label>Forma de Pagamento:</label>
          <select id="paymentMethod">
            <option ${paymentMethod === 'Dinheiro' ? 'selected' : ''}>Dinheiro</option>
            <option ${paymentMethod === 'Cartão' ? 'selected' : ''}>Cartão</option>
            <option ${paymentMethod === 'PIX' ? 'selected' : ''}>PIX</option>
            <option ${paymentMethod === 'Não informado' ? 'selected' : ''}>Não informado</option>
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
  const paymentMethod = document.getElementById('paymentMethod')?.value;
  
  if (!orderId) {
    showToast('Erro: ID do pedido não encontrado', 'error');
    return;
  }
  
  fetch(`${API_BASE}/orders/${orderId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      status: orderStatus, 
      payment_status: paymentStatus,
      payment_method: paymentMethod 
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      showToast('Erro ao atualizar pedido: ' + data.error, 'error');
    } else {
      showToast('Pedido atualizado com sucesso!');
      closeOrderModal();
      renderOrdersTableAsync();
      loadDashboard(); // Atualizar receita total quando status do pagamento muda
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
          loadDashboard(); // Atualizar receita total
          renderSalesChart(currentReportPeriod || 'week'); // Atualizar gráfico
        }
      })
      .catch(err => {
        console.error('Error deleting order:', err);
        showToast('Erro ao deletar pedido', 'error');
      });
  });
}

function deleteAllOrders() {
  showConfirm('⚠️ ATENÇÃO! Você deseja DELETAR TODOS os pedidos? Esta ação não pode ser desfeita!', () => {
    fetch(`${API_BASE}/orders/delete/all`, { method: 'DELETE' })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          showToast('Erro ao deletar pedidos: ' + data.error, 'error');
        } else {
          showToast(`✅ ${data.deleted || 0} pedidos deletados com sucesso!`);
          renderOrdersTableAsync();
          loadDashboard();
          // Atualizar gráfico de vendas
          renderSalesChart(currentReportPeriod || 'week');
        }
      })
      .catch(err => {
        console.error('Error deleting all orders:', err);
        showToast('Erro ao deletar pedidos', 'error');
      });
  });
}

function exportOrders() {
  // Buscar dados reais do servidor
  const search = document.getElementById('orderSearch')?.value || '';
  const statusFilter = document.getElementById('orderStatusFilter')?.value || '';
  const periodFilter = document.getElementById('exportPeriodFilter')?.value || '';
  
  fetch(`${API_BASE}/orders`)
    .then(res => res.json())
    .then(orders => {
      if (!orders || orders.length === 0) {
        showToast('Nenhum pedido para exportar', 'warning');
        return;
      }

      // Calcular data inicial baseado no período
      const now = new Date();
      let startDate = null;
      let periodLabel = 'Todos os pedidos';

      if (periodFilter) {
        const dayCount = parseInt(periodFilter);
        if (!isNaN(dayCount)) {
          startDate = new Date(now.getTime() - (dayCount * 24 * 60 * 60 * 1000));
          
          // Labels descritivos
          const labels = {
            '1': 'Últimas 24 horas',
            '3': 'Últimos 3 dias',
            '7': 'Última semana',
            '14': 'Últimos 14 dias',
            '30': 'Último mês',
            '60': 'Últimos 2 meses',
            '90': 'Último trimestre',
            '180': 'Último semestre',
            '365': 'Último ano'
          };
          
          periodLabel = labels[dayCount] || `Últimos ${dayCount} dias`;
        }
      }

      // Aplicar filtros
      const filtered = orders.filter(o => {
        const matchesSearch = o.customer_name?.toLowerCase().includes(search.toLowerCase()) || String(o.id).includes(search);
        const matchesStatus = !statusFilter || o.status === statusFilter;
        const matchesPeriod = !startDate || new Date(o.created_at) >= startDate;
        
        return matchesSearch && matchesStatus && matchesPeriod;
      });

      if (filtered.length === 0) {
        showToast('Nenhum pedido corresponde aos filtros aplicados', 'warning');
        return;
      }

      // Cabeçalhos CSV com dados reais
      const headers = ['Pedido', 'Cliente', 'Email', 'Telefone', 'Data', 'Total', 'Forma de Pagamento', 'Status Pagamento', 'Status Pedido'];
      
      // Linhas do CSV - dados reais do banco
      const rows = filtered.map(order => {
        const orderDate = new Date(order.created_at).toLocaleDateString('pt-BR');
        const orderNumber = String(order.id).padStart(3, '0');
        const status = order.status || 'Pendente';
        const paymentStatus = order.payment_status || 'Pendente';
        const paymentMethod = order.payment_method || 'N/A';
        const total = parseFloat(order.total || 0).toFixed(2);
        
        return [
          orderNumber,
          order.customer_name || 'N/A',
          order.customer_email || 'N/A',
          order.customer_phone || 'N/A',
          orderDate,
          total,
          paymentMethod,
          paymentStatus,
          status
        ];
      });

      // Criar conteúdo CSV com dados reais
      let csvContent = headers.join(',') + '\n';
      rows.forEach(row => {
        csvContent += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`.trim()).join(',') + '\n';
      });

      // Download do arquivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `Pedidos_${periodLabel}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast(`✅ ${filtered.length} pedido(s) exportado(s) (${periodLabel})!`);
    })
    .catch(error => {
      console.error('Error exporting orders:', error);
      showToast('❌ Erro ao exportar pedidos do banco de dados', 'error');
    });
}

// CUSTOMERS REMOVED - Clientes não precisam fazer cadastro/login para comprar

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

function setCrmPeriod(days, button) {
  currentCrmPeriod = days;
  document.querySelectorAll('.crm-period-btn').forEach(btn => btn.classList.remove('active'));
  if (button) button.classList.add('active');
  const { dateStart, dateEnd } = getDateRangeForPeriod(days);
  loadCrmReport(`${API_BASE}/reports/crm?dateStart=${dateStart}&dateEnd=${dateEnd}`);
}

function exportCustomers() {
  fetch(`${API_BASE}/crm/customers`)
    .then(res => res.json())
    .then(customers => {
      if (!customers || customers.length === 0) {
        showToast('Nenhum cliente para exportar', 'warning');
        return;
      }

      const now = new Date();
      const startDate = new Date(now.getTime() - currentCrmPeriod * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      const dateLabel = ` (${currentCrmPeriod} dias)`;
      
      // Prepare CSV headers
      const headers = ['Nome', 'Email', 'Telefone', 'CPF', 'Endereço', 'Cidade', 'Estado', 'CEP', 'Total de Pedidos', 'Faturamento', 'Notas'];
      
      // Prepare CSV rows - filtrar por data se aplicável
      const rows = customers
        .filter(customer => {
          const purchases = customer.purchases || [];
          return purchases.some(p => {
            const pDate = new Date(p.purchase_date);
            const afterStart = !startDate || pDate >= startDate;
            const beforeEnd = !endDate || pDate <= endDate;
            return afterStart && beforeEnd;
          });
        })
        .map(customer => {
          const purchases = customer.purchases || [];
          let totalPurchaseCount = 0;
          let totalSpent = 0;
          
          // Calcular totais apenas do período selecionado
          const purchaseDates = new Set();
          purchases.forEach(p => {
              const pDate = new Date(p.purchase_date);
              const afterStart = !startDate || pDate >= startDate;
              const beforeEnd = !endDate || pDate <= endDate;
              
              if (afterStart && beforeEnd) {
                purchaseDates.add(p.purchase_date);
                totalSpent += safeNumber(p.total_price || 0);
              }
            });
          totalPurchaseCount = purchaseDates.size;
          
          return [
            customer.full_name || customer.name || 'N/A',
            customer.email || 'N/A',
            customer.phone || 'N/A',
            customer.cpf || 'N/A',
            customer.address || 'N/A',
            customer.city || 'N/A',
            customer.state || 'N/A',
            customer.zip || 'N/A',
            totalPurchaseCount,
            totalSpent.toFixed(2),
            customer.notes || ''
          ];
        });

      if (rows.length === 0) {
        showToast('Nenhum cliente encontrado para esse período', 'warning');
        return;
      }

      // Create CSV content
      let csvContent = headers.join(',') + '\n';
      rows.forEach(row => {
        csvContent += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`.trim()).join(',') + '\n';
      });

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `Clientes_${new Date().toISOString().split('T')[0]}${dateLabel.replace(/\s/g, '').replace(/\(/g, '_').replace(/\)/g, '')}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast(`${rows.length} clientes exportados como CSV!`);
    })
    .catch(error => {
      console.error('Error exporting customers:', error);
      showToast('Erro ao exportar clientes', 'error');
    });
}

// ==================== REPORTS ====================
async function loadReportData(days) {
  try {
    // Fetch orders and products
    const [ordersRes, productsRes] = await Promise.all([
      fetch(`${API_BASE}/orders`),
      fetch(`${API_BASE}/products/admin/all`)
    ]);

    if (!ordersRes.ok || !productsRes.ok) {
      showToast('Erro ao carregar dados de relatórios', 'error');
      return;
    }

    const orders = await ordersRes.json();
    const products = await productsRes.json();

    // Create product map for category lookup
    const productMap = {};
    products.forEach(p => {
      productMap[p.id] = p;
    });

    // Filter orders by period (paid orders only)
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    const paidOrders = orders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= cutoffDate && order.payment_status === 'Pago';
    });

    // Calculate stats
    const totalSold = paidOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
    const totalOrders = paidOrders.length;
    const averageTicket = totalOrders > 0 ? totalSold / totalOrders : 0;

    // Update stats display
    const container = document.getElementById('reportStats');
    const stats = [
      { label: 'Total Vendido', value: `R$ ${totalSold.toFixed(2)}`, icon: '💰' },
      { label: 'Total de Pedidos', value: totalOrders, icon: '📦' },
      { label: 'Ticket Médio', value: `R$ ${averageTicket.toFixed(2)}`, icon: '📊' }
    ];

    container.innerHTML = stats.map(stat => `
      <div class="card" style="text-align: center; padding: 20px;">
        <div style="font-size: 32px; margin-bottom: 8px;">${stat.icon}</div>
        <div style="color: #aaa; font-size: 12px; margin-bottom: 8px;">${stat.label}</div>
        <div style="font-weight: 900; font-size: 24px; color: var(--marrom);">${stat.value}</div>
      </div>
    `).join('');

    // Render charts
    renderReportChart(days, paidOrders);
    renderCategoryReport(paidOrders, productMap);
    renderPaymentReport(paidOrders);

  } catch (error) {
    console.error('Error loading report data:', error);
    showToast('Erro ao carregar relatórios', 'error');
  }
}

function renderReportChart(days, orders) {
  const chart = document.getElementById('reportChart');
  const daysInt = parseInt(days);
  
  // Map of days of week
  const daysOfWeek = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  
  // Group sales by day
  const salesByDay = {};
  const now = new Date();
  
  for (let i = 0; i < daysInt; i++) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateKey = date.toISOString().split('T')[0];
    salesByDay[dateKey] = 0;
  }
  
  orders.forEach(order => {
    const dateKey = order.created_at.split('T')[0];
    if (salesByDay.hasOwnProperty(dateKey)) {
      salesByDay[dateKey] += parseFloat(order.total || 0);
    }
  });
  
  // Sort dates in ascending order (oldest to newest)
  const sortedDates = Object.keys(salesByDay).sort();
  const maxSale = Math.max(...Object.values(salesByDay), 1);
  
  let html = '';
  sortedDates.forEach((date, index) => {
    const sales = salesByDay[date];
    const height = (sales / maxSale) * 160 + 20; // Scale to chart height
    const dateObj = new Date(date);
    const dayNum = index + 1;
    const dayName = daysOfWeek[dayNum - 1];
    
    html += `
      <div class="bar-group" title="R$ ${sales.toFixed(2)}">
        <div style="text-align: center; font-size: 12px; color: var(--marrom); font-weight: 600; margin-bottom: 4px;">${dayName}</div>
        <div class="bar" data-value="R$ ${sales.toFixed(2)}" style="height: ${height}px; background: linear-gradient(to top, var(--marrom), #d4a574);"></div>
        <div class="bar-label">${dayNum}</div>
      </div>
    `;
  });
  
  chart.innerHTML = html;
}

function renderCategoryReport(orders, productMap) {
  const container = document.getElementById('categoryReport');
  
  // Group sales by category
  const salesByCategory = {};
  
  orders.forEach(order => {
    if (order.items) {
      order.items.forEach(item => {
        const product = productMap[item.product_id];
        const category = product ? (product.category || 'Sem categoria') : 'Desconhecido';
        const itemTotal = (item.quantity * item.price);
        
        if (!salesByCategory[category]) {
          salesByCategory[category] = 0;
        }
        salesByCategory[category] += itemTotal;
      });
    }
  });
  
  // Sort by sales
  const sortedCategories = Object.entries(salesByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5); // Top 5
  
  if (sortedCategories.length === 0) {
    container.innerHTML = '<p style="color: #aaa; text-align: center; padding: 20px;">Nenhuma venda neste período</p>';
    return;
  }
  
  const maxSale = Math.max(...sortedCategories.map(c => c[1]));
  
  let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';
  sortedCategories.forEach(([category, total]) => {
    const percentage = (total / maxSale) * 100;
    html += `
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="flex: 0 0 100px; font-size: 12px; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${category}</div>
        <div style="flex: 1; height: 24px; background: #f0e8d8; border-radius: 4px; overflow: hidden;">
          <div style="height: 100%; width: ${percentage}%; background: linear-gradient(to right, var(--marrom), #d4a574); transition: width 0.3s;"></div>
        </div>
        <div style="flex: 0 0 80px; text-align: right; font-weight: 600; color: var(--marrom);">R$ ${total.toFixed(2)}</div>
      </div>
    `;
  });
  html += '</div>';
  
  container.innerHTML = html;
}

function renderPaymentReport(orders) {
  const container = document.getElementById('paymentReport');
  
  // Group by payment method
  const paymentMethods = {};
  
  orders.forEach(order => {
    const method = order.payment_method || 'Desconhecido';
    if (!paymentMethods[method]) {
      paymentMethods[method] = { count: 0, total: 0 };
    }
    paymentMethods[method].count++;
    paymentMethods[method].total += parseFloat(order.total || 0);
  });
  
  const methodEmojis = {
    'PIX': '💳',
    'Cartão': '💳',
    'Dinheiro': '💵',
    'Boleto': '📄',
    'Desconhecido': '📦'
  };
  
  let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';
  Object.entries(paymentMethods).forEach(([method, data]) => {
    const emoji = methodEmojis[method] || '💰';
    html += `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f0e8d8;">
        <div>
          <div style="font-size: 12px; color: #999; margin-bottom: 2px;">${emoji} ${method}</div>
          <div style="font-size: 11px; color: #bbb;">${data.count} pedido${data.count !== 1 ? 's' : ''}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: 600; color: var(--marrom);">R$ ${data.total.toFixed(2)}</div>
          <div style="font-size: 11px; color: #999;">${((data.total / orders.reduce((s, o) => s + parseFloat(o.total || 0), 0)) * 100).toFixed(0)}%</div>
        </div>
      </div>
    `;
  });
  html += '</div>';
  
  container.innerHTML = html;
}

function exportReports() {
  // Use the current report period or default to 7
  const days = currentReportPeriod || '7';
  
  fetch(`${API_BASE}/orders`)
    .then(res => res.json())
    .then(async orders => {
      // Also fetch products for category mapping
      const productsRes = await fetch(`${API_BASE}/products`);
      const productsData = await productsRes.json();
      // Handle both array and object response formats
      const products = Array.isArray(productsData) ? productsData : (productsData.value || []);
      
      if (!orders || orders.length === 0) {
        showToast('Nenhum pedido para exportar', 'warning');
        return;
      }

      // Filter orders based on period
      const now = new Date();
      const daysInt = parseInt(days);
      const startDate = new Date(now.getTime() - daysInt * 24 * 60 * 60 * 1000);
      
      const filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate >= startDate && order.payment_status === 'Pago';
      });

      // Calculate statistics
      const totalSold = filteredOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
      const totalOrders = filteredOrders.length;
      const averageTicket = totalOrders > 0 ? totalSold / totalOrders : 0;

      // Create CSV content for summary
      let csvContent = 'RELATÓRIO DE VENDAS\n';
      csvContent += `Período: Últimos ${days} dias\n`;
      csvContent += `Data de Geração: ${new Date().toLocaleDateString('pt-BR')}\n\n`;
      
      csvContent += 'RESUMO EXECUTIVO\n';
      csvContent += `Total Vendido,R$ ${totalSold.toFixed(2)}\n`;
      csvContent += `Total de Pedidos,${totalOrders}\n`;
      csvContent += `Ticket Médio,R$ ${averageTicket.toFixed(2)}\n\n`;

      // Sales by category
      csvContent += 'VENDAS POR CATEGORIA\n';
      csvContent += 'Categoria,Total\n';
      
      const productMap = {};
      products.forEach(p => {
        productMap[p.id] = p;
      });

      const salesByCategory = {};
      filteredOrders.forEach(order => {
        if (order.items) {
          order.items.forEach(item => {
            const product = productMap[item.product_id];
            const category = product ? (product.category || 'Sem categoria') : 'Desconhecido';
            const itemTotal = (item.quantity * item.price);
            
            if (!salesByCategory[category]) {
              salesByCategory[category] = 0;
            }
            salesByCategory[category] += itemTotal;
          });
        }
      });

      const sortedCategories = Object.entries(salesByCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10); // Top 10 categories

      sortedCategories.forEach(([category, total]) => {
        csvContent += `"${category}",${total.toFixed(2)}\n`;
      });

      csvContent += '\n\nPEDIDOS NO PERÍODO\n';
      csvContent += 'Pedido,Cliente,Telefone,Data,Total,Forma de Pagamento,Status Pagamento,Status Pedido\n';

      filteredOrders.forEach(order => {
        const orderDate = new Date(order.created_at).toLocaleDateString('pt-BR');
        const orderNumber = String(order.id).padStart(3, '0');
        const status = order.status || 'Pendente';
        const paymentStatus = order.payment_status || 'Pendente';
        const paymentMethod = order.payment_method || 'N/A';
        const total = parseFloat(order.total || 0).toFixed(2);
        
        csvContent += `"${orderNumber}","${order.customer_name || 'N/A'}","${order.customer_phone || 'N/A'}","${orderDate}","${total}","${paymentMethod}","${paymentStatus}","${status}"\n`;
      });

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `Relatorio_Vendas_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast(`Relatório de ${days} dias exportado como CSV!`);
    })
    .catch(error => {
      console.error('Error exporting reports:', error);
      showToast('Erro ao exportar relatórios', 'error');
    });
}

// ==================== NEW REPORTS SYSTEM ====================

function initializeReports() {
  // Initialize with general report
  const firstTab = document.querySelector('.report-tab[data-tab="general"]');
  if (firstTab) {
    firstTab.classList.add('active');
  }
  const firstContent = document.getElementById('report-general');
  if (firstContent) {
    firstContent.style.display = 'block';
  }
  
  // Load all reports
  loadAllReports();
}

function showReportTab(tabName, element) {
  // Hide all tabs
  document.querySelectorAll('.report-tab-content').forEach(tab => {
    tab.style.display = 'none';
  });
  
  // Show selected tab
  const selectedTab = document.getElementById(`report-${tabName}`);
  if (selectedTab) {
    selectedTab.style.display = 'block';
  }
  
  // Update tab buttons
  document.querySelectorAll('.report-tab').forEach(btn => {
    btn.classList.remove('active');
  });
  if (element) {
    element.classList.add('active');
  }
  
  // Load data for the selected tab
  const period = document.getElementById('reportPeriod').value || '30';
  
  switch(tabName) {
    case 'general':
      loadGeneralReport(period);
      break;
    case 'orders':
      loadOrdersReport(period);
      break;
    case 'crm':
      loadCrmReport(period);
      break;
    case 'suppliers':
      loadSuppliersReport(period);
      break;
  }
}

function loadAllReports() {
  const period = document.getElementById('reportPeriod').value || '30';
  const activeTab = document.querySelector('.report-tab.active')?.getAttribute('data-tab') || 'general';
  
  loadGeneralReport(period);
  loadOrdersReport(period);
  loadCrmReport(period);
  loadSuppliersReport(period);
  
  showToast('Relatórios atualizados com sucesso!', 'success');
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(value);
}

// ==================== GENERAL REPORT ====================
async function loadGeneralReport(period) {
  try {
    const res = await fetch(`${API_BASE}/reports/general?period=${period}`);
    if (!res.ok) throw new Error('Failed to fetch general report');
    
    const data = await res.json();
    
    // Update stats (with null checks)
    const genTotalOrders = document.getElementById('gen-total-orders');
    if (genTotalOrders) genTotalOrders.textContent = formatNumber(data.sales.total_orders || 0);
    
    // Faturamento = Faturamento dos pedidos + Faturamento da central de clientes (CRM)
    const totalRevenue = (data.sales.total_revenue || 0) + (data.crm.total_spent_crm || 0);
    const genTotalRevenue = document.getElementById('gen-total-revenue');
    if (genTotalRevenue) genTotalRevenue.textContent = formatCurrency(totalRevenue);
    
    const genTotalCustomers = document.getElementById('gen-total-customers');
    if (genTotalCustomers) genTotalCustomers.textContent = formatNumber(data.crm.total_customers || 0);
    
    const genTotalSuppliers = document.getElementById('gen-total-suppliers');
    if (genTotalSuppliers) genTotalSuppliers.textContent = formatNumber(data.suppliers.total_suppliers || 0);
    
    const genTotalSpentCrm = document.getElementById('gen-total-spent-crm');
    if (genTotalSpentCrm) genTotalSpentCrm.textContent = formatCurrency(data.crm.total_spent_crm || 0);
    
    // Get pending payments from CRM payment status
    let totalPending = 0;
    if (data.crmPaymentStatus && Array.isArray(data.crmPaymentStatus)) {
      data.crmPaymentStatus.forEach(ps => {
        if (ps.payment_status === 'pendente' || ps.payment_status === 'pending' || ps.payment_status === 0) {
          totalPending += ps.total || 0;
        }
      });
    }
    const genTotalPendingCrm = document.getElementById('gen-total-pending-crm');
    if (genTotalPendingCrm) genTotalPendingCrm.textContent = formatCurrency(totalPending);
    
    // Payment methods (with null check)
    const paymentMethodsEl = document.getElementById('gen-payment-methods');
    if (paymentMethodsEl) {
      let paymentHtml = '<table style="width: 100%; border-collapse: collapse;"><tr style="border-bottom: 1px solid #ddd;"><th style="padding: 8px; text-align: left;">Forma de Pagamento</th><th style="padding: 8px; text-align: right;">Total</th></tr>';
      data.paymentMethods.forEach(pm => {
        paymentHtml += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px;">${pm.payment_method}</td><td style="padding: 8px; text-align: right;">${formatCurrency(pm.total)}</td></tr>`;
      });
      paymentHtml += '</table>';
      paymentMethodsEl.innerHTML = paymentHtml;
    }
    
    // Suppliers info (with null check)
    const suppliersInfoEl = document.getElementById('gen-suppliers-info');
    if (suppliersInfoEl) {
      let suppliersHtml = `<strong>Total Gasto com Fornecedores:</strong> ${formatCurrency(data.suppliers.total_spent_suppliers || 0)}<br>`;
      suppliersHtml += `<strong>Número de Fornecedores:</strong> ${data.suppliers.total_suppliers}`;
      suppliersInfoEl.innerHTML = suppliersHtml;
    }
    
  } catch (error) {
    console.error('Error loading general report:', error);
    showToast('Erro ao carregar relatório geral', 'error');
  }
}

// ==================== ORDERS REPORT ====================
async function loadOrdersReport(period) {
  try {
    const res = await fetch(`${API_BASE}/reports/orders?period=${period}`);
    if (!res.ok) throw new Error('Failed to fetch orders report');
    
    const data = await res.json();
    
    // Update stats (with null checks)
    const ordTotalOrders = document.getElementById('ord-total-orders');
    if (ordTotalOrders) ordTotalOrders.textContent = formatNumber(data.summary.total_orders || 0);
    
    const ordPaidOrders = document.getElementById('ord-paid-orders');
    if (ordPaidOrders) ordPaidOrders.textContent = formatNumber(data.summary.paid_orders || 0);
    
    const ordPendingOrders = document.getElementById('ord-pending-orders');
    if (ordPendingOrders) ordPendingOrders.textContent = formatNumber(data.summary.pending_orders || 0);
    
    const ordAverageTicket = document.getElementById('ord-average-ticket');
    if (ordAverageTicket) ordAverageTicket.textContent = formatCurrency(data.summary.average_ticket || 0);
    
    // Summary table (with null check)
    const summaryTableEl = document.getElementById('ord-summary-table');
    if (summaryTableEl) {
      let summaryHtml = '';
      summaryHtml += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px;">Total de Pedidos</td><td style="padding: 8px; text-align: right;">${formatNumber(data.summary.total_orders)}</td></tr>`;
      summaryHtml += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px;">Pedidos Pagos</td><td style="padding: 8px; text-align: right;">${formatNumber(data.summary.paid_orders)}</td></tr>`;
      summaryHtml += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px;">Pedidos Pendentes</td><td style="padding: 8px; text-align: right;">${formatNumber(data.summary.pending_orders)}</td></tr>`;
      summaryHtml += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px;">Pedidos Cancelados</td><td style="padding: 8px; text-align: right;">${formatNumber(data.summary.cancelled_orders)}</td></tr>`;
      summaryHtml += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px;">Receita Total</td><td style="padding: 8px; text-align: right;">${formatCurrency(data.summary.total_revenue)}</td></tr>`;
      summaryHtml += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px;">Ticket Médio</td><td style="padding: 8px; text-align: right;">${formatCurrency(data.summary.average_ticket)}</td></tr>`;
      summaryHtml += `<tr><td style="padding: 8px;">Frete Total</td><td style="padding: 8px; text-align: right;">${formatCurrency(data.summary.total_shipping)}</td></tr>`;
      summaryTableEl.innerHTML = summaryHtml;
    }
    
    // Status (with null check)
    const statusEl = document.getElementById('ord-by-status');
    if (statusEl) {
      let statusHtml = '<table style="width: 100%; border-collapse: collapse;"><tr style="border-bottom: 1px solid #ddd;"><th style="padding: 8px; text-align: left;">Status</th><th style="padding: 8px; text-align: right;">Quantidade</th></tr>';
      data.byStatus.forEach(s => {
        statusHtml += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px;">${s.status}</td><td style="padding: 8px; text-align: right;">${formatNumber(s.count)}</td></tr>`;
      });
      statusHtml += '</table>';
      statusEl.innerHTML = statusHtml;
    }
    
    // Payment methods (with null check)
    const paymentEl = document.getElementById('ord-payment-methods');
    if (paymentEl) {
      let paymentHtml = '<table style="width: 100%; border-collapse: collapse;"><tr style="border-bottom: 1px solid #ddd;"><th style="padding: 8px; text-align: left;">Forma de Pagamento</th><th style="padding: 8px; text-align: right;">Quantidade</th><th style="padding: 8px; text-align: right;">Receita</th></tr>';
      data.byPaymentMethod.forEach(pm => {
        paymentHtml += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px;">${pm.payment_method}</td><td style="padding: 8px; text-align: right;">${formatNumber(pm.count)}</td><td style="padding: 8px; text-align: right;">${formatCurrency(pm.total_revenue)}</td></tr>`;
      });
      paymentHtml += '</table>';
      paymentEl.innerHTML = paymentHtml;
    }
    
    // Top customers (with null check)
    const topCustomersEl = document.getElementById('ord-top-customers');
    if (topCustomersEl) {
      let customersHtml = '<table style="width: 100%; border-collapse: collapse;"><tr style="border-bottom: 1px solid #ddd;"><th style="padding: 8px; text-align: left;">Cliente</th><th style="padding: 8px; text-align: right;">Total Gasto</th></tr>';
      data.topCustomers.forEach(c => {
        customersHtml += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;" title="${c.customer_name}">${c.customer_name}</td><td style="padding: 8px; text-align: right;">${formatCurrency(c.total_spent)}</td></tr>`;
      });
      customersHtml += '</table>';
      topCustomersEl.innerHTML = customersHtml;
    }
    
  } catch (error) {
    console.error('Error loading orders report:', error);
    showToast('Erro ao carregar relatório de pedidos', 'error');
  }
}

// ==================== CRM REPORT ====================
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

async function loadCrmReport(periodOrUrl) {
  try {
    let url;
    if (typeof periodOrUrl === 'string' && periodOrUrl.startsWith('http')) {
      url = periodOrUrl;
    } else if (typeof periodOrUrl === 'string' && periodOrUrl.startsWith('?')) {
      url = `${API_BASE}/reports/crm${periodOrUrl}`;
    } else {
      url = `${API_BASE}/reports/crm?period=${periodOrUrl || 30}`;
    }
    
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch CRM report');
    
    const data = await res.json();
    
    // Update stats (with null checks)
    const crmTotalCustomers = document.getElementById('crm-total-customers');
    if (crmTotalCustomers) crmTotalCustomers.textContent = formatNumber(data.summary.total_customers || 0);
    
    const crmVipCustomers = document.getElementById('crm-vip-customers');
    if (crmVipCustomers) crmVipCustomers.textContent = formatNumber(data.summary.vip_customers || 0);
    
    const crmTotalSpent = document.getElementById('crm-total-spent');
    if (crmTotalSpent) crmTotalSpent.textContent = formatCurrency(data.spending.total_spent || 0);
    
    const crmTotalPending = document.getElementById('crm-total-pending');
    if (crmTotalPending) crmTotalPending.textContent = formatCurrency(data.paymentStatus.find(p => p.payment_status === 'pendente')?.total || 0);
    
    // Summary table (with null check)
    const summaryTableEl = document.getElementById('crm-summary-table');
    if (summaryTableEl) {
      let summaryHtml = '';
      summaryHtml += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px;">Total de Clientes</td><td style="padding: 8px; text-align: right;">${formatNumber(data.summary.total_customers)}</td></tr>`;
      summaryHtml += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px;">Clientes VIP</td><td style="padding: 8px; text-align: right;">${formatNumber(data.summary.vip_customers)}</td></tr>`;
      summaryHtml += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px;">Clientes Ativos</td><td style="padding: 8px; text-align: right;">${formatNumber(data.summary.active_customers)}</td></tr>`;
      summaryHtml += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px;">Novos no Período</td><td style="padding: 8px; text-align: right;">${formatNumber(data.summary.new_customers_period)}</td></tr>`;
      summaryHtml += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px;">Total Gasto</td><td style="padding: 8px; text-align: right;">${formatCurrency(data.spending.total_spent)}</td></tr>`;
      summaryHtml += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px;">Transações</td><td style="padding: 8px; text-align: right;">${formatNumber(data.spending.total_transactions)}</td></tr>`;
      summaryHtml += `<tr><td style="padding: 8px;">Transação Média</td><td style="padding: 8px; text-align: right;">${formatCurrency(data.spending.average_transaction)}</td></tr>`;
      summaryTableEl.innerHTML = summaryHtml;
    }
    
    // Payment status (with null check)
    const paymentStatusEl = document.getElementById('crm-payment-status');
    if (paymentStatusEl) {
      let paymentStatusHtml = '<table style="width: 100%; border-collapse: collapse;"><tr style="border-bottom: 1px solid #ddd;"><th style="padding: 8px; text-align: left;">Status</th><th style="padding: 8px; text-align: right;">Total</th></tr>';
      data.paymentStatus.forEach(ps => {
        paymentStatusHtml += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px;">${ps.payment_status}</td><td style="padding: 8px; text-align: right;">${formatCurrency(ps.total)}</td></tr>`;
      });
      paymentStatusHtml += '</table>';
      paymentStatusEl.innerHTML = paymentStatusHtml;
    }
    
    // Top customers (with null check)
    const topCustomersEl = document.getElementById('crm-top-customers');
    if (topCustomersEl) {
      let customersHtml = '<table style="width: 100%; border-collapse: collapse;"><tr style="border-bottom: 1px solid #ddd;"><th style="padding: 8px; text-align: left;">Cliente</th><th style="padding: 8px; text-align: right;">Total Gasto</th></tr>';
      data.topCustomers.forEach(c => {
        customersHtml += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;" title="${c.full_name}">${c.full_name}</td><td style="padding: 8px; text-align: right;">${formatCurrency(c.total_spent)}</td></tr>`;
      });
      customersHtml += '</table>';
      topCustomersEl.innerHTML = customersHtml;
    }
    
    // Debtors (with null check)
    const debtorsEl = document.getElementById('crm-debtors');
    if (debtorsEl) {
      let debtorsHtml = '<table style="width: 100%; border-collapse: collapse;"><tr style="border-bottom: 1px solid #ddd;"><th style="padding: 8px; text-align: left;">Cliente</th><th style="padding: 8px; text-align: right;">Débito</th></tr>';
      data.debtors.forEach(d => {
        debtorsHtml += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;" title="${d.full_name}">${d.full_name}</td><td style="padding: 8px; text-align: right; color: var(--vermelho); font-weight: 700;">${formatCurrency(d.total_debt)}</td></tr>`;
      });
      debtorsHtml += '</table>';
      debtorsEl.innerHTML = debtorsHtml;
    }
    
  } catch (error) {
    console.error('Error loading CRM report:', error);
    showToast('Erro ao carregar relatório de clientes', 'error');
  }
}

// ==================== SUPPLIERS REPORT ====================
function updateSuppliersFilter() {
  const dateStart = document.getElementById('suppliersDateStart')?.value;
  const dateEnd = document.getElementById('suppliersDateEnd')?.value;
  
  // Validação: data inicial não pode ser maior que data final
  if (dateStart && dateEnd && dateStart > dateEnd) {
    showToast('Data inicial não pode ser maior que data final', 'error');
    document.getElementById('suppliersDateEnd').value = '';
    return;
  }
  
  // Montar URL com parâmetros customizados
  let url = `${API_BASE}/reports/suppliers`;
  
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
  loadSuppliersReport(url);
}

async function loadSuppliersReport(periodOrUrl) {
  try {
    // Se receber URL completa, usar; caso contrário, construir
    let url = typeof periodOrUrl === 'string' && periodOrUrl.startsWith('http') 
      ? periodOrUrl 
      : `${API_BASE}/reports/suppliers?period=${periodOrUrl || 30}`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch suppliers report');
    
    const data = await res.json();
    
    // Update stats (with null checks)
    const supTotalSuppliers = document.getElementById('sup-total-suppliers');
    if (supTotalSuppliers) supTotalSuppliers.textContent = formatNumber(data.summary.total_suppliers || 0);
    
    const supActiveSuppliers = document.getElementById('sup-active-suppliers');
    if (supActiveSuppliers) supActiveSuppliers.textContent = formatNumber(data.summary.active_suppliers || 0);
    
    const supTotalSpent = document.getElementById('sup-total-spent');
    if (supTotalSpent) supTotalSpent.textContent = formatCurrency(data.spending.total_spent || 0);
    
    const supPendingDebt = document.getElementById('sup-pending-debt');
    if (supPendingDebt) supPendingDebt.textContent = formatCurrency(data.paymentStatus.find(p => p.payment_status === 'pendente')?.total || 0);
    
    // Summary table (with null check)
    const summaryTableEl = document.getElementById('sup-summary-table');
    if (summaryTableEl) {
      let summaryHtml = '';
      summaryHtml += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px;">Total de Fornecedores</td><td style="padding: 8px; text-align: right;">${formatNumber(data.summary.total_suppliers)}</td></tr>`;
      summaryHtml += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px;">Fornecedores Ativos</td><td style="padding: 8px; text-align: right;">${formatNumber(data.summary.active_suppliers)}</td></tr>`;
      summaryHtml += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px;">Novos no Período</td><td style="padding: 8px; text-align: right;">${formatNumber(data.summary.new_suppliers_period)}</td></tr>`;
      summaryHtml += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px;">Total Gasto</td><td style="padding: 8px; text-align: right;">${formatCurrency(data.spending.total_spent)}</td></tr>`;
      summaryHtml += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px;">Compras</td><td style="padding: 8px; text-align: right;">${formatNumber(data.spending.total_purchases)}</td></tr>`;
      summaryHtml += `<tr><td style="padding: 8px;">Compra Média</td><td style="padding: 8px; text-align: right;">${formatCurrency(data.spending.average_purchase)}</td></tr>`;
      summaryTableEl.innerHTML = summaryHtml;
    }
    
    // Payment status (with null check)
    const paymentStatusEl = document.getElementById('sup-payment-status');
    if (paymentStatusEl) {
      let paymentStatusHtml = '<table style="width: 100%; border-collapse: collapse;"><tr style="border-bottom: 1px solid #ddd;"><th style="padding: 8px; text-align: left;">Status</th><th style="padding: 8px; text-align: right;">Total</th></tr>';
      data.paymentStatus.forEach(ps => {
        paymentStatusHtml += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px;">${ps.payment_status}</td><td style="padding: 8px; text-align: right;">${formatCurrency(ps.total)}</td></tr>`;
      });
      paymentStatusHtml += '</table>';
      paymentStatusEl.innerHTML = paymentStatusHtml;
    }
    
    // Top suppliers (with null check)
    const topSuppliersEl = document.getElementById('sup-top-suppliers');
    if (topSuppliersEl) {
      let suppliersHtml = '<table style="width: 100%; border-collapse: collapse;"><tr style="border-bottom: 1px solid #ddd;"><th style="padding: 8px; text-align: left;">Fornecedor</th><th style="padding: 8px; text-align: right;">Total Gasto</th></tr>';
      data.topSuppliers.forEach(s => {
        suppliersHtml += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;" title="${s.company_name}">${s.company_name}</td><td style="padding: 8px; text-align: right;">${formatCurrency(s.total_spent)}</td></tr>`;
      });
      suppliersHtml += '</table>';
      topSuppliersEl.innerHTML = suppliersHtml;
    }
    
    // Debtors (with null check)
    const debtorsEl = document.getElementById('sup-debtors');
    if (debtorsEl) {
      let debtorsHtml = '<table style="width: 100%; border-collapse: collapse;"><tr style="border-bottom: 1px solid #ddd;"><th style="padding: 8px; text-align: left;">Fornecedor</th><th style="padding: 8px; text-align: right;">Débito</th></tr>';
      data.debtors.forEach(d => {
        debtorsHtml += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;" title="${d.company_name}">${d.company_name}</td><td style="padding: 8px; text-align: right; color: var(--vermelho); font-weight: 700;">${formatCurrency(d.total_debt)}</td></tr>`;
      });
      debtorsHtml += '</table>';
      debtorsEl.innerHTML = debtorsHtml;
    }
    
  } catch (error) {
    console.error('Error loading suppliers report:', error);
    showToast('Erro ao carregar relatório de fornecedores', 'error');
  }
}

// ==================== PROMOTIONS MANAGEMENT ====================

let currentPromoTab = 'products';
let allProducts = [];

// Load products for selectors
function loadProductsForPromo() {
  fetch(`${API_BASE}/products`)
    .then(res => res.json())
    .then(products => {
      allProducts = Array.isArray(products) ? products : (products.value || []);
    })
    .catch(error => console.error('Error loading products:', error));
}

// Switch between promotion tabs
function switchPromoTab(tab) {
  currentPromoTab = tab;
  document.querySelectorAll('.promo-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  
  document.querySelectorAll('.promo-content').forEach(c => c.classList.remove('active'));
  document.getElementById(`promo-${tab}`).classList.add('active');
  
  if (tab === 'products') renderProductPromotionsAsync();
  else if (tab === 'kits') renderKitsAsync();
}

// Handle dynamic save button based on current promo tab
function handleSavePromotion() {
  if (currentPromoTab === 'products') {
    saveProductPromo();
  } else if (currentPromoTab === 'kits') {
    saveKit();
  }
}

// ==================== PRODUCT PROMOTIONS ====================

function renderProductPromotionsAsync() {
  fetch(`${API_BASE}/promotions`)
    .then(res => res.json())
    .then(promos => {
      const promoList = Array.isArray(promos) ? promos : (promos.value || []);
      renderProductPromotions(promoList);
    })
    .catch(error => {
      console.error('Error:', error);
      document.getElementById('productPromosBody').innerHTML = '<tr><td colspan="5">Erro ao carregar</td></tr>';
    });
}

function renderProductPromotions(promos) {
  const tbody = document.getElementById('productPromosBody');
  
  if (!promos || promos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px;">Nenhuma promoção em produtos</td></tr>';
    return;
  }
  
  tbody.innerHTML = promos.map(p => {
    const endDate = new Date(p.end_date);
    const now = new Date();
    const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    const isExpired = endDate < now;
    
    const discount = ((p.original_price - p.discount_price) / p.original_price * 100).toFixed(0);
    
    return `
    <tr>
      <td data-label="Produto">${p.product_name || 'N/A'}</td>
      <td data-label="Desconto">${discount}% OFF</td>
      <td data-label="Preço"><del>R$ ${parseFloat(p.original_price).toFixed(2)}</del> → <strong>R$ ${parseFloat(p.discount_price).toFixed(2)}</strong></td>
      <td data-label="Válido até">${isExpired ? '⏰ Expirado' : `${daysLeft} dias`}</td>
      <td data-label="Ações">
        <button class="btn btn-sm btn-ghost" onclick="editProductPromo(${p.id})">✏️</button>
        <button class="btn btn-sm btn-ghost" onclick="deleteProductPromo(${p.id})">🗑️</button>
      </td>
    </tr>
    `;
  }).join('');
}

function openAddProductPromo() {
  const modal = document.getElementById('promotionModal');
  const title = document.getElementById('promotionModalTitle');
  const body = document.getElementById('promotionModalBody');
  
  title.textContent = '➕ Nova Promoção de Produto';
  
  // Load products if not already loaded
  if (allProducts.length === 0) {
    fetch(`${API_BASE}/products`)
      .then(res => res.json())
      .then(products => {
        allProducts = Array.isArray(products) ? products : (products.value || []);
        buildPromoModal();
      })
      .catch(error => {
        console.error('Error loading products:', error);
        showToast('Erro ao carregar produtos', 'error');
      });
    return;
  }
  
  buildPromoModal();
}

function buildPromoModal() {
  const modal = document.getElementById('promotionModal');
  const body = document.getElementById('promotionModalBody');
  
  const productOptions = allProducts.map(p => 
    `<option value="${p.id}">${p.name} - R$ ${parseFloat(p.price).toFixed(2)}</option>`
  ).join('');
  
  body.innerHTML = `
    <div class="fg">
      <label>Selecione o Produto *</label>
      <select id="promoProductId" onchange="updateProductPromoInfo()">
        <option value="">-- Selecione um produto --</option>
        ${productOptions}
      </select>
    </div>
    <div id="productPromoInfo"></div>
    <div class="form-row-2">
      <div class="fg">
        <label>Preço Original (R$) *</label>
        <input type="number" id="promoOriginalPrice" placeholder="0.00" step="0.01" readonly>
      </div>
      <div class="fg">
        <label>Preço da Promoção (R$) *</label>
        <input type="number" id="promoDiscountPrice" placeholder="0.00" step="0.01" onchange="updatePromoInfo()">
      </div>
    </div>
    <div class="form-row-2">
      <div class="fg">
        <label>Válido até *</label>
        <input type="date" id="promoEndDate">
      </div>
      <div class="fg">
        <label>Status</label>
        <select id="promoStatusSelect">
          <option value="Ativa">Ativa</option>
          <option value="Inativa">Inativa</option>
        </select>
      </div>
    </div>
    <div id="promoCalcInfo" style="background:#f5f5f5; padding:15px; border-radius:4px; margin:15px 0; display:none;">
      <p style="margin:0;"><strong>Resumo:</strong></p>
      <p style="margin:5px 0;"><span id="discountPercent">0</span>% de desconto</p>
      <p style="margin:5px 0;">Economia: R$ <span id="savingAmount">0.00</span></p>
    </div>
  `;
  
  modal.classList.add('open');
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 7);
  document.getElementById('promoEndDate').valueAsDate = tomorrow;
}

function updateProductPromoInfo() {
  const productId = document.getElementById('promoProductId')?.value;
  if (!productId) return;
  
  const product = allProducts.find(p => p.id == productId);
  if (product) {
    document.getElementById('promoOriginalPrice').value = parseFloat(product.price).toFixed(2);
    document.getElementById('promoDiscountPrice').value = '';
    document.getElementById('productPromoInfo').innerHTML = `
      <div style="background:#e8f5e9; padding:10px; border-radius:4px; margin:10px 0;">
        <p style="margin:0;"><strong>${product.name}</strong></p>
        <p style="margin:5px 0; font-size:12px; color:#666;">Preço atual: R$ ${parseFloat(product.price).toFixed(2)}</p>
      </div>
    `;
  }
}

function updatePromoInfo() {
  const original = parseFloat(document.getElementById('promoOriginalPrice')?.value) || 0;
  const discount = parseFloat(document.getElementById('promoDiscountPrice')?.value) || 0;
  
  if (original > 0 && discount > 0) {
    const percent = Math.round((original - discount) / original * 100);
    const saving = original - discount;
    
    document.getElementById('discountPercent').textContent = percent;
    document.getElementById('savingAmount').textContent = saving.toFixed(2);
    document.getElementById('promoCalcInfo').style.display = 'block';
  } else {
    document.getElementById('promoCalcInfo').style.display = 'none';
  }
}

function closePromotionModal() {
  document.getElementById('promotionModal').classList.remove('open');
}

function saveProductPromo() {
  const id = document.getElementById('promoId')?.value;
  const productId = document.getElementById('promoProductId')?.value;
  const originalPrice = parseFloat(document.getElementById('promoOriginalPrice')?.value) || 0;
  const discountPrice = parseFloat(document.getElementById('promoDiscountPrice')?.value) || 0;
  const endDate = document.getElementById('promoEndDate')?.value;
  const status = document.getElementById('promoStatusSelect')?.value;
  
  if (!productId) {
    showToast('Selecione um produto', 'error');
    return;
  }
  
  if (originalPrice <= 0 || discountPrice <= 0) {
    showToast('Preencha os preços corretamente', 'error');
    return;
  }
  
  if (discountPrice >= originalPrice) {
    showToast('Preço da promoção deve ser menor que o preço original', 'error');
    return;
  }
  
  if (!endDate) {
    showToast('Defina a data de validade', 'error');
    return;
  }
  
  const method = id ? 'PUT' : 'POST';
  const url = id ? `${API_BASE}/promotions/${id}` : `${API_BASE}/promotions`;
  
  const data = {
    product_id: productId,
    original_price: originalPrice,
    discount_price: discountPrice,
    end_date: endDate,
    status: status
  };
  
  fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  .then(res => res.json())
  .then(result => {
    if (result.error) {
      showToast('Erro: ' + result.error, 'error');
    } else {
      showToast('✅ Promoção salva!', 'success');
      closePromotionModal();
      renderProductPromotionsAsync();
    }
  })
  .catch(error => {
    console.error('Error:', error);
    showToast('Erro ao salvar', 'error');
  });
}

function editProductPromo(id) {
  // Load products if not already loaded
  if (allProducts.length === 0) {
    fetch(`${API_BASE}/products`)
      .then(res => res.json())
      .then(products => {
        allProducts = Array.isArray(products) ? products : (products.value || []);
        loadAndEditPromo(id);
      })
      .catch(error => {
        console.error('Error loading products:', error);
        showToast('Erro ao carregar produtos', 'error');
      });
    return;
  }
  
  loadAndEditPromo(id);
}

function loadAndEditPromo(id) {
  fetch(`${API_BASE}/promotions/${id}`)
    .then(res => res.json())
    .then(promo => {
      const modal = document.getElementById('promotionModal');
      const title = document.getElementById('promotionModalTitle');
      const body = document.getElementById('promotionModalBody');
      
      title.textContent = '✏️ Editar Promoção';
      
      const productOptions = allProducts.map(p => 
        `<option value="${p.id}" ${p.id == promo.product_id ? 'selected' : ''}>${p.name}</option>`
      ).join('');
      
      body.innerHTML = `
        <input type="hidden" id="promoId" value="${promo.id}">
        <div class="fg">
          <label>Produto</label>
          <select id="promoProductId" disabled>
            ${productOptions}
          </select>
        </div>
        <div class="form-row-2">
          <div class="fg">
            <label>Preço Original (R$)</label>
            <input type="number" id="promoOriginalPrice" value="${parseFloat(promo.original_price).toFixed(2)}" step="0.01">
          </div>
          <div class="fg">
            <label>Preço da Promoção (R$)</label>
            <input type="number" id="promoDiscountPrice" value="${parseFloat(promo.discount_price).toFixed(2)}" step="0.01" onchange="updatePromoInfo()">
          </div>
        </div>
        <div class="form-row-2">
          <div class="fg">
            <label>Válido até</label>
            <input type="date" id="promoEndDate" value="${promo.end_date.split('T')[0]}">
          </div>
          <div class="fg">
            <label>Status</label>
            <select id="promoStatusSelect">
              <option value="Ativa" ${promo.status === 'Ativa' ? 'selected' : ''}>Ativa</option>
              <option value="Inativa" ${promo.status === 'Inativa' ? 'selected' : ''}>Inativa</option>
            </select>
          </div>
        </div>
      `;
      
      modal.classList.add('open');
      updatePromoInfo();
    })
    .catch(error => {
      console.error('Error:', error);
      showToast('Erro ao carregar', 'error');
    });
}

function deleteProductPromo(id) {
  if (!confirm('Deletar esta promoção?')) return;
  
  fetch(`${API_BASE}/promotions/${id}`, { method: 'DELETE' })
    .then(res => res.json())
    .then(() => {
      showToast('✅ Deletado!', 'success');
      renderProductPromotionsAsync();
    })
    .catch(error => {
      console.error('Error:', error);
      showToast('Erro ao deletar', 'error');
    });
}

// ==================== KITS ====================

function renderKitsAsync() {
  fetch(`${API_BASE}/promotions/kits`)
    .then(res => res.json())
    .then(kits => {
      const kitList = Array.isArray(kits) ? kits : (kits.value || []);
      renderKits(kitList);
    })
    .catch(error => {
      console.error('Error:', error);
      document.getElementById('kitsBody').innerHTML = '<tr><td colspan="4">Erro ao carregar</td></tr>';
    });
}

function renderKits(kits) {
  const tbody = document.getElementById('kitsBody');
  
  if (!kits || kits.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:30px;">Nenhum kit criado</td></tr>';
    return;
  }
  
  tbody.innerHTML = kits.map(kit => `
    <tr>
      <td data-label="Kit">${kit.name}</td>
      <td data-label="Produtos">${kit.product_count || 0}</td>
      <td data-label="Preço"><strong>R$ ${parseFloat(kit.kit_price).toFixed(2)}</strong></td>
      <td data-label="Ações">
        <button class="btn btn-sm btn-ghost" onclick="editKit(${kit.id})">✏️</button>
        <button class="btn btn-sm btn-ghost" onclick="deleteKit(${kit.id})">🗑️</button>
      </td>
    </tr>
  `).join('');
}

function openAddKit() {
  // Load products if not already loaded
  if (allProducts.length === 0) {
    fetch(`${API_BASE}/products`)
      .then(res => res.json())
      .then(products => {
        allProducts = Array.isArray(products) ? products : (products.value || []);
        buildKitModal();
      })
      .catch(error => {
        console.error('Error loading products:', error);
        showToast('Erro ao carregar produtos', 'error');
      });
    return;
  }
  
  buildKitModal();
}

function buildKitModal() {
  const modal = document.getElementById('promotionModal');
  const title = document.getElementById('promotionModalTitle');
  const body = document.getElementById('promotionModalBody');
  
  title.textContent = '📦 Novo Kit';
  
  const productOptions = allProducts.map(p => 
    `<div style="display:flex; align-items:center; gap:10px; margin:8px 0; padding:10px; background:#f9f9f9; border-radius:3px;">
      <input type="checkbox" class="kit-product-select" value="${p.id}" onchange="updateKitProductsDisplay()"> 
      <span style="flex:1;">${p.name} (R$ ${parseFloat(p.price).toFixed(2)})</span>
      <input type="number" class="kit-product-qty" data-product-id="${p.id}" placeholder="Qtd" min="1" value="1" style="width:60px; padding:6px;" disabled>
    </div>`
  ).join('');
  
  body.innerHTML = `
    <div class="fg">
      <label>Nome do Kit *</label>
      <input type="text" id="kitName" placeholder="Ex: Kit de Ervas Aromáticas">
    </div>
    <div class="fg">
      <label>Descrição</label>
      <textarea id="kitDescription" placeholder="Descrição do kit..." rows="3"></textarea>
    </div>
    <div class="fg">
      <label>Preço do Kit (R$) *</label>
      <input type="number" id="kitPrice" placeholder="0.00" step="0.01">
    </div>
    <div class="fg">
      <label>Produtos (mínimo 2) - Defina a quantidade de cada item *</label>
      <div style="max-height:300px; overflow-y:auto; border:2px solid #e8e0d4; padding:10px; border-radius:4px;">
        ${productOptions}
      </div>
    </div>
  `;
  
  // Enable/disable quantity fields
  document.querySelectorAll('.kit-product-select').forEach(cb => {
    cb.addEventListener('change', updateKitProductsDisplay);
  });
  
  modal.classList.add('open');
}

function updateKitProductsDisplay() {
  document.querySelectorAll('.kit-product-select').forEach(cb => {
    const qtyInput = document.querySelector(`.kit-product-qty[data-product-id="${cb.value}"]`);
    if (qtyInput) {
      qtyInput.disabled = !cb.checked;
    }
  });
}

function saveKit() {
  const id = document.getElementById('kitId')?.value;
  const name = document.getElementById('kitName')?.value?.trim();
  const description = document.getElementById('kitDescription')?.value?.trim();
  const price = parseFloat(document.getElementById('kitPrice')?.value) || 0;
  
  // Collect products with quantities
  const productsWithQty = Array.from(document.querySelectorAll('.kit-product-select:checked'))
    .map(cb => {
      const qty = parseInt(document.querySelector(`.kit-product-qty[data-product-id="${cb.value}"]`)?.value) || 1;
      return {
        product_id: parseInt(cb.value),
        quantity: qty
      };
    });
  
  if (!name) {
    showToast('Preencha o nome do kit', 'error');
    return;
  }
  
  if (price <= 0) {
    showToast('Preencha um preço válido', 'error');
    return;
  }
  
  if (productsWithQty.length < 2) {
    showToast('Selecione pelo menos 2 produtos para o kit', 'error');
    return;
  }
  
  const method = id ? 'PUT' : 'POST';
  const url = id ? `${API_BASE}/promotions/kits/${id}` : `${API_BASE}/promotions/kits`;
  
  const data = {
    name,
    description: description || null,
    kit_price: price,
    products: productsWithQty,
    status: 'Ativa'
  };
  
  fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  .then(res => res.json())
  .then(result => {
    if (result.error) {
      showToast('Erro: ' + result.error, 'error');
    } else {
      showToast('✅ Kit salvo!', 'success');
      closePromotionModal();
      renderKitsAsync();
    }
  })
  .catch(error => {
    console.error('Error:', error);
    showToast('Erro ao salvar', 'error');
  });
}

function editKit(id) {
  fetch(`${API_BASE}/promotions/kits/${id}`)
    .then(res => res.json())
    .then(kit => {
      const modal = document.getElementById('promotionModal');
      const title = document.getElementById('promotionModalTitle');
      const body = document.getElementById('promotionModalBody');
      
      title.textContent = '✏️ Editar Kit';
      
      const kitProductIds = kit.products ? kit.products.map(p => p.id) : [];
      const kitProductMap = kit.products ? kit.products.reduce((acc, p) => ({...acc, [p.id]: p.quantity || 1}), {}) : {};
      
      const productOptions = allProducts.map(p => {
        const isChecked = kitProductIds.includes(p.id);
        const qty = kitProductMap[p.id] || 1;
        return `<div style="display:flex; align-items:center; gap:10px; margin:8px 0; padding:10px; background:#f9f9f9; border-radius:3px;">
          <input type="checkbox" class="kit-product-select" value="${p.id}" ${isChecked ? 'checked' : ''} onchange="updateKitProductsDisplay()"> 
          <span style="flex:1;">${p.name} (R$ ${parseFloat(p.price).toFixed(2)})</span>
          <input type="number" class="kit-product-qty" data-product-id="${p.id}" placeholder="Qtd" min="1" value="${qty}" style="width:60px; padding:6px;" ${isChecked ? '' : 'disabled'}>
        </div>`;
      }).join('');
      
      body.innerHTML = `
        <input type="hidden" id="kitId" value="${kit.id}">
        <div class="fg">
          <label>Nome do Kit</label>
          <input type="text" id="kitName" value="${kit.name}">
        </div>
        <div class="fg">
          <label>Descrição</label>
          <textarea id="kitDescription" rows="3">${kit.description || ''}</textarea>
        </div>
        <div class="fg">
          <label>Preço do Kit (R$)</label>
          <input type="number" id="kitPrice" value="${parseFloat(kit.kit_price).toFixed(2)}" step="0.01">
        </div>
        <div class="fg">
          <label>Produtos - Defina a quantidade de cada item</label>
          <div style="max-height:300px; overflow-y:auto; border:2px solid #e8e0d4; padding:10px; border-radius:4px;">
            ${productOptions}
          </div>
        </div>
      `;
      
      // Enable/disable quantity fields
      document.querySelectorAll('.kit-product-select').forEach(cb => {
        cb.addEventListener('change', updateKitProductsDisplay);
      });
      
      modal.classList.add('open');
    })
    .catch(error => {
      console.error('Error:', error);
      showToast('Erro ao carregar', 'error');
    });
}

function deleteKit(id) {
  if (!confirm('Deletar este kit?')) return;
  
  fetch(`${API_BASE}/promotions/kits/${id}`, { method: 'DELETE' })
    .then(res => res.json())
    .then(() => {
      showToast('✅ Deletado!', 'success');
      renderKitsAsync();
    })
    .catch(error => {
      console.error('Error:', error);
      showToast('Erro ao deletar', 'error');
    });
}

// ==================== QUANTITY PROMOTIONS ====================

function renderQuantityPromosAsync() {
  fetch(`${API_BASE}/promotions/quantity`)
    .then(res => res.json())
    .then(promos => {
      const promoList = Array.isArray(promos) ? promos : (promos.value || []);
      renderQuantityPromos(promoList);
    })
    .catch(error => {
      console.error('Error:', error);
      document.getElementById('quantityPromosBody').innerHTML = '<tr><td colspan="5">Erro ao carregar</td></tr>';
    });
}

function renderQuantityPromos(promos) {
  const tbody = document.getElementById('quantityPromosBody');
  
  if (!promos || promos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px;">Nenhuma promoção por quantidade</td></tr>';
    return;
  }
  
  tbody.innerHTML = promos.map(p => {
    const endDate = new Date(p.end_date);
    const isExpired = endDate < new Date();
    
    return `
    <tr>
      <td data-label="Nome">${p.name}</td>
      <td data-label="Condição">Compre ${p.min_quantity}+ ${p.product_count > 0 ? `(${p.product_count} produtos)` : '(todos)'}</td>
      <td data-label="Desconto">${p.discount_percentage}%</td>
      <td data-label="Válido até">${isExpired ? '⏰ Expirado' : new Date(p.end_date).toLocaleDateString('pt-BR')}</td>
      <td data-label="Ações">
        <button class="btn btn-sm btn-ghost" onclick="editQuantityPromo(${p.id})">✏️</button>
        <button class="btn btn-sm btn-ghost" onclick="deleteQuantityPromo(${p.id})">🗑️</button>
      </td>
    </tr>
    `;
  }).join('');
}

function openAddQuantityPromo() {
  // Load products if not already loaded
  if (allProducts.length === 0) {
    fetch(`${API_BASE}/products`)
      .then(res => res.json())
      .then(products => {
        allProducts = Array.isArray(products) ? products : (products.value || []);
        buildQuantityPromoModal();
      })
      .catch(error => {
        console.error('Error loading products:', error);
        showToast('Erro ao carregar produtos', 'error');
      });
    return;
  }
  
  buildQuantityPromoModal();
}

function buildQuantityPromoModal() {
  const modal = document.getElementById('promotionModal');
  const title = document.getElementById('promotionModalTitle');
  const body = document.getElementById('promotionModalBody');
  
  title.textContent = '📊 Nova Promoção por Quantidade';
  
  const productOptions = allProducts.map(p => 
    `<label style="display:block; margin:8px 0; padding:10px; background:#f9f9f9; border-radius:3px; cursor:pointer;">
      <input type="checkbox" class="qty-product-select" value="${p.id}"> ${p.name}
    </label>`
  ).join('');
  
  body.innerHTML = `
    <div class="fg">
      <label>Nome da Promoção *</label>
      <input type="text" id="qtyPromoName" placeholder="Ex: Desconto por quantidade">
    </div>
    <div class="fg">
      <label>Descrição</label>
      <textarea id="qtyPromoDescription" placeholder="Ex: Compre 5 ou mais ganhe 10% de desconto..." rows="2"></textarea>
    </div>
    <div class="form-row-2">
      <div class="fg">
        <label>A partir de quantas unidades? *</label>
        <input type="number" id="qtyPromoMinQty" placeholder="5" min="1">
      </div>
      <div class="fg">
        <label>Desconto (%) *</label>
        <input type="number" id="qtyPromoDiscount" placeholder="10" min="0" max="100" step="0.5">
      </div>
    </div>
    <div class="fg">
      <label>Válido até *</label>
      <input type="date" id="qtyPromoEndDate">
    </div>
    <div class="fg">
      <label>Aplicar a produtos específicos (deixe em branco para todos)</label>
      <div style="max-height:200px; overflow-y:auto; border:2px solid #e8e0d4; padding:10px; border-radius:4px;">
        ${productOptions}
      </div>
    </div>
  `;
  
  modal.classList.add('open');
  
  const nextMonth = new Date();
  nextMonth.setDate(nextMonth.getDate() + 30);
  document.getElementById('qtyPromoEndDate').valueAsDate = nextMonth;
}

function saveQuantityPromo() {
  const id = document.getElementById('qtyPromoId')?.value;
  const name = document.getElementById('qtyPromoName')?.value?.trim();
  const description = document.getElementById('qtyPromoDescription')?.value?.trim();
  const minQty = parseInt(document.getElementById('qtyPromoMinQty')?.value) || 0;
  const discount = parseFloat(document.getElementById('qtyPromoDiscount')?.value) || 0;
  const endDate = document.getElementById('qtyPromoEndDate')?.value;
  
  const selectedProducts = Array.from(document.querySelectorAll('.qty-product-select:checked'))
    .map(cb => parseInt(cb.value));
  
  if (!name) {
    showToast('Preencha o nome', 'error');
    return;
  }
  
  if (minQty <= 0 || discount <= 0) {
    showToast('Preencha quantidade e desconto corretamente', 'error');
    return;
  }
  
  if (!endDate) {
    showToast('Defina a data de validade', 'error');
    return;
  }
  
  const method = id ? 'PUT' : 'POST';
  const url = id ? `${API_BASE}/promotions/quantity/${id}` : `${API_BASE}/promotions/quantity`;
  
  const data = {
    name,
    description: description || null,
    min_quantity: minQty,
    discount_percentage: discount,
    end_date: endDate,
    product_ids: selectedProducts.length > 0 ? selectedProducts : null,
    status: 'Ativa'
  };
  
  fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  .then(res => res.json())
  .then(result => {
    if (result.error) {
      showToast('Erro: ' + result.error, 'error');
    } else {
      showToast('✅ Promoção salva!', 'success');
      closePromotionModal();
      renderQuantityPromosAsync();
    }
  })
  .catch(error => {
    console.error('Error:', error);
    showToast('Erro ao salvar', 'error');
  });
}

function editQuantityPromo(id) {
  fetch(`${API_BASE}/promotions/quantity/${id}`)
    .then(res => res.json())
    .then(promo => {
      const modal = document.getElementById('promotionModal');
      const title = document.getElementById('promotionModalTitle');
      const body = document.getElementById('promotionModalBody');
      
      title.textContent = '✏️ Editar Promoção';
      
      const promoProductIds = promo.products ? promo.products.map(p => p.id) : [];
      const productOptions = allProducts.map(p => 
        `<label style="display:block; margin:8px 0; padding:10px; background:#f9f9f9; border-radius:3px; cursor:pointer;">
          <input type="checkbox" class="qty-product-select" value="${p.id}" ${promoProductIds.includes(p.id) ? 'checked' : ''}> ${p.name}
        </label>`
      ).join('');
      
      body.innerHTML = `
        <input type="hidden" id="qtyPromoId" value="${promo.id}">
        <div class="fg">
          <label>Nome</label>
          <input type="text" id="qtyPromoName" value="${promo.name}">
        </div>
        <div class="fg">
          <label>Descrição</label>
          <textarea id="qtyPromoDescription" rows="2">${promo.description || ''}</textarea>
        </div>
        <div class="form-row-2">
          <div class="fg">
            <label>Quantidade mínima</label>
            <input type="number" id="qtyPromoMinQty" value="${promo.min_quantity}" min="1">
          </div>
          <div class="fg">
            <label>Desconto (%)</label>
            <input type="number" id="qtyPromoDiscount" value="${promo.discount_percentage}" min="0" max="100" step="0.5">
          </div>
        </div>
        <div class="fg">
          <label>Válido até</label>
          <input type="date" id="qtyPromoEndDate" value="${promo.end_date.split('T')[0]}">
        </div>
        <div class="fg">
          <label>Produtos</label>
          <div style="max-height:200px; overflow-y:auto; border:2px solid #e8e0d4; padding:10px; border-radius:4px;">
            ${productOptions}
          </div>
        </div>
      `;
      
      modal.classList.add('open');
    })
    .catch(error => {
      console.error('Error:', error);
      showToast('Erro ao carregar', 'error');
    });
}

function deleteQuantityPromo(id) {
  if (!confirm('Deletar esta promoção?')) return;
  
  fetch(`${API_BASE}/promotions/quantity/${id}`, { method: 'DELETE' })
    .then(res => res.json())
    .then(() => {
      showToast('✅ Deletado!', 'success');
      renderQuantityPromosAsync();
    })
    .catch(error => {
      console.error('Error:', error);
      showToast('Erro ao deletar', 'error');
    });
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
