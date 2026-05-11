'use strict';

const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000/api'
  : 'https://cia-de-condimentos.onrender.com/api';

const BACKEND_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'
  : 'https://cia-de-condimentos.onrender.com';

let cart = [];
let currentFilter = 'all';
let currentSearch = '';

function getImageUrl(imageUrl) {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  return BACKEND_BASE + imageUrl;
}

function getProducts() {
  var controller = new AbortController();
  var timeout = setTimeout(function() { controller.abort(); }, 10000);
  return fetch(API_URL + '/products', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    signal: controller.signal
  })
  .then(function(response) {
    clearTimeout(timeout);
    if (response.ok) {
      return response.json().then(function(products) {
        return products.map(function(p) { 
          return Object.assign({}, p, { price: parseFloat(p.price) || 0 }); 
        });
      });
    }
    throw new Error('Response not ok');
  })
  .catch(function(e) {
    clearTimeout(timeout);
    console.error('Erro ao carregar produtos:', e);
    return [];
  });
}

function renderProducts() {
  getProducts().then(function(products) {
    var filtered = products.filter(function(p) {
      return p.active && (currentFilter === 'all' || p.category === currentFilter);
    });
    if (currentSearch) {
      filtered = filtered.filter(function(p) {
        return p.name.toLowerCase().indexOf(currentSearch) !== -1 ||
          (p.description || '').toLowerCase().indexOf(currentSearch) !== -1;
      });
    }
    var html = filtered.map(function(p) {
      var imageUrl = p.image_url || ((p.images && p.images.length > 0) ? getImageUrl(p.images[0]) : p.image);
      var imgHtml = imageUrl
        ? '<img src="' + imageUrl + '" alt="' + p.name + '" style="width: 100%; height: 100%; object-fit: cover;">'
        : '<div style="display: flex; align-items: center; justify-content: center; font-size: 60px;">🌶️</div>';
      return '<div class="product-card" onclick="openProductDetail(' + JSON.stringify(p).replace(/"/g, '&quot;') + ')" style="cursor: pointer;">' +
        '<div class="product-img">' + imgHtml + '</div>' +
        '<div class="product-body">' +
          '<div class="product-category">' + (p.category || '') + '</div>' +
          '<div class="product-name">' + p.name + '</div>' +
          '<div class="product-desc">' + (p.description || '') + '</div>' +
          '<div class="product-stock">Estoque: ' + p.stock + ' unidades</div>' +
          '<div class="product-footer">' +
            '<div class="product-price">R$ ' + p.price.toFixed(2).replace('.', ',') + '</div>' +
            '<button class="add-cart-btn" onclick="event.stopPropagation(); addToCart(' + p.id + ')" ' + (p.stock === 0 ? 'disabled' : '') + '>' +
              (p.stock === 0 ? 'Esgotado' : 'Adicionar') +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
    var grid = document.getElementById('productsGrid');
    if (grid) {
      grid.innerHTML = html;
    }
  });
}

function filterProducts(category, btn) {
  currentFilter = category;
  document.querySelectorAll('.filter-btn').forEach(function(b) { 
    b.classList.remove('active'); 
  });
  if (btn) btn.classList.add('active');
  renderProducts();
}

function handleSearch(val) {
  currentSearch = val.toLowerCase();
  renderProducts();
}

function openProductDetail(product) {
  var modal = document.getElementById('productDetailModal');
  if (!modal) return;
  
  window.currentProductDetail = product;
  
  var imageUrl = product.image_url || ((product.images && product.images.length > 0) ? getImageUrl(product.images[0]) : product.image);
  var imgHtml = imageUrl
    ? '<img src="' + imageUrl + '" alt="' + product.name + '" style="width: 100%; height: 100%; object-fit: cover;">'
    : '<div style="display: flex; align-items: center; justify-content: center; font-size: 60px;">🌶️</div>';
  
  var nameEl = document.getElementById('productDetailName');
  if (nameEl) nameEl.textContent = product.name;
  
  var catEl = document.getElementById('productDetailCategory');
  if (catEl) catEl.textContent = product.category || '';
  
  var descEl = document.getElementById('productDetailDescription');
  if (descEl) descEl.textContent = product.description || 'Sem descrição disponível';
  
  var priceEl = document.getElementById('productDetailPrice');
  if (priceEl) priceEl.textContent = 'R$ ' + product.price.toFixed(2).replace('.', ',');
  
  var stockEl = document.getElementById('productDetailStock');
  if (stockEl) stockEl.textContent = 'Estoque: ' + product.stock + ' unidades';
  
  var imgEl = document.getElementById('productDetailImage');
  if (imgEl) imgEl.innerHTML = imgHtml;
  
  var addBtn = document.getElementById('productDetailAddBtn');
  if (addBtn) {
    if (product.stock === 0) {
      addBtn.textContent = 'Esgotado';
      addBtn.disabled = true;
    } else {
      addBtn.textContent = 'Adicionar ao Carrinho';
      addBtn.disabled = false;
    }
  }
  
  modal.classList.add('open');
}

function closeProductDetail() {
  var modal = document.getElementById('productDetailModal');
  if (modal) {
    modal.classList.remove('open');
  }
  window.currentProductDetail = null;
}

function addToCartFromDetail() {
  if (window.currentProductDetail) {
    addToCart(window.currentProductDetail.id);
    closeProductDetail();
  }
}

function addToCart(productId) {
  getProducts().then(function(products) {
    var product = products.find(function(p) { return p.id === productId; });
    if (!product) return;
    
    var existing = cart.find(function(item) { return item.id === productId; });
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ id: productId, name: product.name, price: product.price, quantity: 1 });
    }
    updateCartBadge();
  });
}

function removeFromCart(productId) {
  cart = cart.filter(function(item) { return item.id !== productId; });
  updateCartBadge();
  renderCartItems();
}

function updateQuantity(productId, quantity) {
  var item = cart.find(function(item) { return item.id === productId; });
  if (item) {
    item.quantity = Math.max(1, quantity);
    updateCartBadge();
    renderCartItems();
  }
}

function updateCartBadge() {
  var total = cart.reduce(function(sum, item) { return sum + item.quantity; }, 0);
  var badge = document.getElementById('cartBadge');
  if (badge) {
    badge.textContent = total;
    badge.style.display = total > 0 ? 'flex' : 'none';
  }
}

function openCart() {
  var sidebar = document.getElementById('cartSidebar');
  var overlay = document.getElementById('cartOverlay');
  if (!sidebar || !overlay) return;
  sidebar.classList.add('open');
  overlay.classList.add('open');
  renderCartItems();
}

function closeCart() {
  var sidebar = document.getElementById('cartSidebar');
  var overlay = document.getElementById('cartOverlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
}

function renderCartItems() {
  var container = document.getElementById('cartItems');
  if (!container) return;
  
  if (cart.length === 0) {
    container.innerHTML = '<div class="empty-cart"><div class="icon">🛒</div><p>Seu carrinho está vazio</p></div>';
    return;
  }
  
  var html = cart.map(function(item) {
    return '<div class="cart-item">' +
      '<div class="cart-item-info">' +
        '<div class="cart-item-name">' + item.name + '</div>' +
        '<div class="cart-item-price">R$ ' + item.price.toFixed(2).replace('.', ',') + '</div>' +
        '<div class="qty-controls">' +
          '<button class="qty-btn" onclick="updateQuantity(' + item.id + ', ' + (item.quantity - 1) + ')">−</button>' +
          '<div class="qty-val">' + item.quantity + '</div>' +
          '<button class="qty-btn" onclick="updateQuantity(' + item.id + ', ' + (item.quantity + 1) + ')">+</button>' +
          '<button class="remove-btn" onclick="removeFromCart(' + item.id + ')">✕</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
  
  container.innerHTML = html;
  
  var total = cart.reduce(function(sum, item) { return sum + (item.price * item.quantity); }, 0);
  var totalEl = document.getElementById('cartTotal');
  if (totalEl) {
    totalEl.innerHTML = '<span>Total:</span><span>R$ ' + total.toFixed(2).replace('.', ',') + '</span>';
  }
}

function openCheckout() {
  if (cart.length === 0) {
    alert('Carrinho vazio');
    return;
  }
  var modal = document.getElementById('checkoutModal');
  if (modal) modal.classList.add('open');
}

function closeCheckout() {
  var modal = document.getElementById('checkoutModal');
  if (modal) modal.classList.remove('open');
}

document.addEventListener('DOMContentLoaded', function() {
  renderProducts();
  updateCartBadge();
});
