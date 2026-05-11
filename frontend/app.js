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
let selectedProductForQuantity = null;
let selectedQuantity = 1;

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
    openQuantityModal(window.currentProductDetail);
  }
}

function addToCart(productId) {
  getProducts().then(function(products) {
    var product = products.find(function(p) { return p.id === productId; });
    if (!product) return;
    
    openQuantityModal(product);
  });
}

function openQuantityModal(product) {
  selectedProductForQuantity = product;
  selectedQuantity = 1;
  
  var nameEl = document.getElementById('quantityProductName');
  if (nameEl) nameEl.textContent = product.name;
  
  var imageEl = document.getElementById('quantityProductImage');
  if (imageEl) {
    if (product.image) {
      imageEl.innerHTML = '<img src="' + product.image + '" style="width: 100%; height: 100%; object-fit: cover;">';
    } else {
      imageEl.textContent = '🌶️';
    }
  }
  
  var priceEl = document.getElementById('quantityProductPrice');
  if (priceEl) priceEl.textContent = 'R$ ' + product.price.toFixed(2).replace('.', ',');
  
  var qtyDisplay = document.getElementById('quantityDisplay');
  if (qtyDisplay) qtyDisplay.textContent = selectedQuantity;
  
  updateQuantityTotal();
  
  var modal = document.getElementById('quantityModal');
  if (modal) modal.classList.add('open');
}

function closeQuantityModal() {
  var modal = document.getElementById('quantityModal');
  if (modal) modal.classList.remove('open');
  selectedProductForQuantity = null;
  selectedQuantity = 1;
}

function increaseQuantity() {
  if (selectedProductForQuantity && selectedQuantity < selectedProductForQuantity.stock) {
    selectedQuantity++;
    var qtyDisplay = document.getElementById('quantityDisplay');
    if (qtyDisplay) qtyDisplay.textContent = selectedQuantity;
    updateQuantityTotal();
  }
}

function decreaseQuantity() {
  if (selectedQuantity > 1) {
    selectedQuantity--;
    var qtyDisplay = document.getElementById('quantityDisplay');
    if (qtyDisplay) qtyDisplay.textContent = selectedQuantity;
    updateQuantityTotal();
  }
}

function updateQuantityTotal() {
  if (selectedProductForQuantity) {
    var total = selectedProductForQuantity.price * selectedQuantity;
    var totalEl = document.getElementById('quantityTotalValue');
    if (totalEl) totalEl.textContent = 'R$ ' + total.toFixed(2).replace('.', ',');
  }
}

function confirmQuantity() {
  if (!selectedProductForQuantity) return;
  
  var existing = cart.find(function(item) { return item.id === selectedProductForQuantity.id; });
  if (existing) {
    existing.quantity += selectedQuantity;
  } else {
    cart.push({ 
      id: selectedProductForQuantity.id, 
      name: selectedProductForQuantity.name, 
      price: selectedProductForQuantity.price, 
      quantity: selectedQuantity 
    });
  }
  
  // Animar imagem voando para o carrinho
  animateProductToCart(selectedProductForQuantity);
  
  // Mostrar notificação
  showNotification(selectedQuantity + 'x ' + selectedProductForQuantity.name + ' adicionado(s) ao carrinho com sucesso');
  
  updateCartBadge();
  closeQuantityModal();
  closeProductDetail();
}

function animateProductToCart(product) {
  // Pegar informações do elemento da imagem
  var productImage = document.getElementById('quantityProductImage');
  if (!productImage && product.image) {
    productImage = document.querySelector('[src*="' + product.image + '"]');
  }
  
  // Usar emoji como fallback
  var imageSource = productImage ? productImage.src : null;
  
  // Criar clone da imagem
  var clone = document.createElement('div');
  clone.className = 'flying-image';
  
  if (imageSource) {
    clone.style.backgroundImage = 'url(' + imageSource + ')';
    clone.style.backgroundSize = 'cover';
    clone.style.backgroundPosition = 'center';
  } else {
    clone.textContent = '🌶️';
    clone.style.fontSize = '48px';
    clone.style.display = 'flex';
    clone.style.alignItems = 'center';
    clone.style.justifyContent = 'center';
  }
  
  clone.style.width = '80px';
  clone.style.height = '80px';
  
  // Pegar posição inicial
  var startX = window.innerWidth / 2;
  var startY = window.innerHeight / 2;
  clone.style.left = startX + 'px';
  clone.style.top = startY + 'px';
  
  document.body.appendChild(clone);
  
  // Pegar posição do botão carrinho
  var cartBtn = document.getElementById('openCartBtn');
  var cartRect = cartBtn ? cartBtn.getBoundingClientRect() : { left: window.innerWidth - 100, top: 80, width: 50, height: 40 };
  
  var endX = cartRect.left + cartRect.width / 2 - startX;
  var endY = cartRect.top + cartRect.height / 2 - startY;
  
  // Animar
  clone.style.setProperty('--endX', endX + 'px');
  clone.style.setProperty('--endY', endY + 'px');
  clone.style.animation = 'flyToCart 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards';
  
  // Remover elemento após animação
  setTimeout(function() {
    clone.remove();
  }, 800);
}

function showNotification(message) {
  var toast = document.createElement('div');
  toast.className = 'toast-notification success';
  toast.innerHTML = '<span class="toast-icon">✓</span><span>' + message + '</span>';
  
  document.body.appendChild(toast);
  
  // Remover após animação
  setTimeout(function() {
    toast.remove();
  }, 3000);
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
  if (modal) {
    modal.classList.add('open');
    renderCheckoutForm();
  }
}

function renderCheckoutForm() {
  var body = document.getElementById('checkoutBody');
  if (!body) return;
  
  var cartSummary = cart.map(function(item) {
    return '<div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0;">' +
      '<div>' + item.name + ' (x' + item.quantity + ')</div>' +
      '<div>R$ ' + (item.price * item.quantity).toFixed(2).replace('.', ',') + '</div>' +
    '</div>';
  }).join('');
  
  var total = cart.reduce(function(sum, item) { return sum + (item.price * item.quantity); }, 0);
  
  var html = '<form id="checkoutForm" style="display: flex; flex-direction: column; gap: 16px;">' +
    '<div style="background: #f5f5f5; padding: 16px; border-radius: 4px;">' +
      '<h4 style="margin: 0 0 12px 0; color: var(--marrom);">Resumo do Pedido:</h4>' +
      cartSummary +
      '<div style="display: flex; justify-content: space-between; padding: 12px 0; font-weight: 900; color: var(--marrom); font-size: 18px;">' +
        '<div>Total:</div>' +
        '<div>R$ ' + total.toFixed(2).replace('.', ',') + '</div>' +
      '</div>' +
    '</div>' +
    '<div>' +
      '<label style="display: block; margin-bottom: 4px; font-weight: 600; color: var(--marrom);">Nome *</label>' +
      '<input type="text" id="checkoutName" placeholder="Seu nome completo" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 4px; font-size: 14px;" required>' +
    '</div>' +
    '<div>' +
      '<label style="display: block; margin-bottom: 4px; font-weight: 600; color: var(--marrom);">Telefone *</label>' +
      '<input type="tel" id="checkoutPhone" placeholder="(11) 99999-9999" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 4px; font-size: 14px;" required>' +
    '</div>' +
    '<div>' +
      '<label style="display: block; margin-bottom: 4px; font-weight: 600; color: var(--marrom);">Endereço *</label>' +
      '<input type="text" id="checkoutAddress" placeholder="Rua, número, bairro, cidade" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 4px; font-size: 14px;" required>' +
    '</div>' +
    '<button type="button" onclick="submitCheckout()" style="background: var(--vermelho); color: white; border: none; padding: 14px; font-weight: 900; cursor: pointer; border-radius: 4px; font-size: 16px; letter-spacing: 1px; width: 100%;">Confirmar Pedido</button>' +
  '</form>';
  
  body.innerHTML = html;
}

var pendingCheckoutData = null;
var selectedPaymentMethod = null;

function submitCheckout() {
  var name = document.getElementById('checkoutName').value.trim();
  var phone = document.getElementById('checkoutPhone').value.trim();
  var address = document.getElementById('checkoutAddress').value.trim();
  
  if (!name || !phone || !address) {
    alert('Por favor, preencha todos os campos');
    return;
  }
  
  var subtotal = cart.reduce(function(sum, item) { return sum + (item.price * item.quantity); }, 0);
  var frete = 0;
  var total = subtotal + frete;
  
  // Store checkout data and open payment method modal
  pendingCheckoutData = {
    customer: { name: name, phone: phone, address: address },
    items: cart,
    subtotal: subtotal,
    frete: frete,
    total: total,
    status: 'Pendente',
    paymentStatus: 'Aguardando'
  };
  
  selectedPaymentMethod = null;
  
  var checkoutModal = document.getElementById('checkoutModal');
  if (checkoutModal) checkoutModal.classList.remove('open');
  
  var paymentModal = document.getElementById('paymentMethodModal');
  if (paymentModal) paymentModal.classList.add('open');
}

function selectPaymentMethod(method) {
  selectedPaymentMethod = method;
  
  // Visual feedback
  var paymentCards = document.querySelectorAll('.payment-method-card');
  paymentCards.forEach(function(card) {
    card.style.borderColor = '#e0e0e0';
    card.style.background = 'white';
  });
  
  var selectedCard = event.target.closest('.payment-method-card');
  if (selectedCard) {
    selectedCard.style.borderColor = 'var(--vermelho)';
    selectedCard.style.background = '#fff5f5';
  }
  
  // Auto-confirm after selection
  setTimeout(function() {
    confirmPaymentMethod();
  }, 300);
}

function confirmPaymentMethod() {
  if (!selectedPaymentMethod || !pendingCheckoutData) {
    alert('Por favor, selecione um método de pagamento');
    return;
  }
  
  pendingCheckoutData.payment = selectedPaymentMethod;
  
  // Send to API
  fetch(API_URL + '/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pendingCheckoutData)
  })
  .then(function(response) {
    if (response.ok) {
      return response.json();
    }
    throw new Error('Failed to create order');
  })
  .then(function(data) {
    alert('Pedido criado com sucesso! ID: ' + data.id);
    cart = [];
    updateCartBadge();
    cancelCheckoutProcess();
  })
  .catch(function(error) {
    console.error('Error:', error);
    alert('Erro ao criar pedido. Tente novamente.');
  });
}

function cancelCheckoutProcess() {
  var checkoutModal = document.getElementById('checkoutModal');
  var paymentModal = document.getElementById('paymentMethodModal');
  
  if (checkoutModal) checkoutModal.classList.remove('open');
  if (paymentModal) paymentModal.classList.remove('open');
  
  pendingCheckoutData = null;
  selectedPaymentMethod = null;
}

function closeCheckout() {
  var modal = document.getElementById('checkoutModal');
  if (modal) modal.classList.remove('open');
  
  var paymentModal = document.getElementById('paymentMethodModal');
  if (paymentModal) paymentModal.classList.remove('open');
  
  pendingCheckoutData = null;
  selectedPaymentMethod = null;
}

document.addEventListener('DOMContentLoaded', function() {
  renderProducts();
  updateCartBadge();
  
  // Cart button in header
  var openCartBtn = document.getElementById('openCartBtn');
  if (openCartBtn) {
    openCartBtn.addEventListener('click', openCart);
  }
  
  // Floating cart button
  var floatingCartBtn = document.getElementById('floatingCartBtn');
  if (floatingCartBtn) {
    floatingCartBtn.addEventListener('click', openCart);
  }
  
  // Cart event listeners
  var cartCloseBtn = document.getElementById('cartCloseBtn');
  if (cartCloseBtn) {
    cartCloseBtn.addEventListener('click', closeCart);
  }
  
  var cartOverlay = document.getElementById('cartOverlay');
  if (cartOverlay) {
    cartOverlay.addEventListener('click', closeCart);
  }
  
  var checkoutBtn = document.getElementById('checkoutBtn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', function() {
      closeCart();
      openCheckout();
    });
  }
  
  var closeCheckoutBtn = document.getElementById('closeCheckoutBtn');
  if (closeCheckoutBtn) {
    closeCheckoutBtn.addEventListener('click', closeCheckout);
  }
  
  var checkoutModal = document.getElementById('checkoutModal');
  if (checkoutModal) {
    var overlay = checkoutModal;
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        closeCheckout();
      }
    });
  }
});
