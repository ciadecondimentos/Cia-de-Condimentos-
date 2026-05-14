// Admin Dashboard - JavaScript
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000/api'
  : 'https://cia-de-condimentos.onrender.com/api';

// Global variable to track current report period
let currentReportPeriod = '7';

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
    'reports': 'Relatórios',
    'crm': 'Central de Clientes'
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
  } else if (pageId === 'reports') {
    loadReportData('7');
  } else if (pageId === 'crm') {
    initializeCrm();
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
    // Get first image or emoji
    const firstImage = prod.images && prod.images.length > 0 ? prod.images[0] : null;
    const imgHtml = firstImage 
      ? `<img src="${firstImage}" alt="${prod.name}" onerror="this.parentElement.innerHTML='🌶️'">` 
      : '🌶️';
    
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
      <td data-label="COD">${prod.sku || 'N/A'}</td>
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
  const sku = document.getElementById('prodSku')?.value?.trim();
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
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
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
      console.error('Error saving product:', error);
      showToast('Erro ao salvar produto: ' + error.message, 'error');
    });
  };
  
  // Preparar dados do produto
  const productData = {
    name,
    sku,
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
        .then(() => {
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
  if (product.images && product.images.length > 0) {
    imagesHtml = `
      <div style="margin-bottom: 15px;">
        <strong style="color: #c0392b; font-size: 13px;">📷 Imagens Atuais:</strong>
      </div>
      <div style="display: flex; gap: 12px; flex-wrap: wrap; border: 2px solid #e0d8c8; padding: 15px; border-radius: 8px; background: #fff9f5; margin-bottom: 12px;">
    `;
    
    product.images.forEach((img, idx) => {
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
            <img src="${img}" style="max-width: 100%; max-height: 100%; object-fit: cover;" alt="Imagem ${idx + 1}" onerror="this.parentElement.innerHTML='❌'">
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

function exportCustomers() {
  fetch(`${API_BASE}/auth/admin/customers`)
    .then(res => res.json())
    .then(customers => {
      if (!customers || customers.length === 0) {
        showToast('Nenhum cliente para exportar', 'warning');
        return;
      }

      // Prepare CSV headers
      const headers = ['ID', 'Nome', 'Email', 'Telefone', 'CPF', 'Endereço', 'Cidade', 'Estado', 'CEP', 'Total Pedidos', 'Total Gasto', 'Notas'];
      
      // Prepare CSV rows
      const rows = customers.map(customer => {
        return [
          customer.id || '',
          customer.name || 'N/A',
          customer.email || 'N/A',
          customer.phone || 'N/A',
          customer.cpf || 'N/A',
          customer.address || 'N/A',
          customer.city || 'N/A',
          customer.state || 'N/A',
          customer.zip || 'N/A',
          customer.total_orders || 0,
          customer.total_spent ? parseFloat(customer.total_spent).toFixed(2) : '0.00',
          customer.notes || ''
        ];
      });

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
      link.setAttribute('download', `Clientes_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast(`${customers.length} clientes exportados como CSV!`);
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
