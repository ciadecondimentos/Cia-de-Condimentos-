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

// ==================== PAYMENT LOADING STATE ====================
// Flag para prevenir múltiplos cliques em botões de pagamento
let isPaymentProcessing = false;

function setPaymentButtonLoading(buttonId, isLoading) {
  const button = document.getElementById(buttonId);
  if (!button) return;
  
  if (isLoading) {
    button.disabled = true;
    button.style.opacity = '0.6';
    button.style.cursor = 'not-allowed';
    const originalText = button.textContent;
    button.textContent = '⏳ Processando...';
    button.dataset.originalText = originalText;
  } else {
    button.disabled = false;
    button.style.opacity = '1';
    button.style.cursor = 'pointer';
    button.textContent = button.dataset.originalText || button.textContent;
  }
}

// Variáveis para polling de pagamento
let paymentPollingInterval = null;
let paymentPollingData = null;
let paymentPollingTimeout = null;
let paymentPollingAttempts = 0;
let paymentPollingFailures = 0;
let paymentPollingStartTime = null;
let paymentPollingInterval_ms = 2000; // Começa a cada 2s, pode aumentar com backoff

// Função para formatar valores em moeda
function formatCurrency(value) {
  const num = parseFloat(value) || 0;
  return 'R$ ' + num.toFixed(2).replace('.', ',');
}

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
      return response.json().then(function(data) {
        // Handle both array and object with value property
        var products = Array.isArray(data) ? data : (data.value || []);
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
  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeQuantityModal() {
  var modal = document.getElementById('quantityModal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = 'auto';
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
      quantity: selectedQuantity,
      image: selectedProductForQuantity.image
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
  
  // Atualizar badge do botão flutuante
  var floatingBadge = document.getElementById('floatingCartBadge');
  if (floatingBadge) {
    floatingBadge.textContent = total;
    floatingBadge.style.display = total > 0 ? 'flex' : 'none';
  }
}

function openCart() {
  var sidebar = document.getElementById('cartSidebar');
  var overlay = document.getElementById('cartOverlay');
  var floatingBtn = document.getElementById('floatingCartBtn');
  if (!sidebar || !overlay) return;
  sidebar.classList.add('open');
  overlay.classList.add('open');
  if (floatingBtn) floatingBtn.style.display = 'none';
  renderCartItems();
}

function closeCart() {
  var sidebar = document.getElementById('cartSidebar');
  var overlay = document.getElementById('cartOverlay');
  var floatingBtn = document.getElementById('floatingCartBtn');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  if (floatingBtn) floatingBtn.style.display = 'flex';
}

function renderCartItems() {
  var container = document.getElementById('cartItems');
  if (!container) return;
  
  if (cart.length === 0) {
    container.innerHTML = '<div class="empty-cart"><div class="icon">🛒</div><p>Seu carrinho está vazio</p></div>';
    return;
  }
  
  var html = cart.map(function(item) {
    var imageHtml = '';
    if (item.image) {
      imageHtml = '<img src="' + getImageUrl(item.image) + '" style="width: 100%; height: 100%; object-fit: cover;">';
    } else {
      imageHtml = '<span style="font-size: 28px;">🌶️</span>';
    }
    
    var subtotal = item.price * item.quantity;
    
    return '<div class="cart-item">' +
      '<div class="cart-item-img">' + imageHtml + '</div>' +
      '<div class="cart-item-info">' +
        '<div class="cart-item-name">' + item.name + '</div>' +
        '<div class="cart-item-price">R$ ' + item.price.toFixed(2).replace('.', ',') + '</div>' +
        '<div style="font-size: 12px; color: #999; margin-top: 4px;">Subtotal: R$ ' + subtotal.toFixed(2).replace('.', ',') + '</div>' +
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
    document.body.style.overflow = 'hidden';
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
  
  // Transform cart items: change 'quantity' to 'qty' for API
  var itemsForApi = cart.map(function(item) {
    return {
      id: item.id,
      name: item.name,
      price: item.price,
      qty: item.quantity
    };
  });
  
  // Store checkout data and open payment method modal
  pendingCheckoutData = {
    customer: { name: name, email: '', phone: phone, address: address },
    items: itemsForApi,
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
  
  // Update amounts in confirmation modals
  var totalAmount = 'R$ ' + pendingCheckoutData.total.toFixed(2).replace('.', ',');
  
  var moneyAmount = document.getElementById('moneyTotalAmount');
  if (moneyAmount) moneyAmount.textContent = totalAmount;
  
  var cardAmount = document.getElementById('cardTotalAmount');
  if (cardAmount) cardAmount.textContent = totalAmount;
  
  var pixAmount = document.getElementById('pixTotalAmount');
  if (pixAmount) pixAmount.textContent = totalAmount;
  
  // Hide payment method modal and show appropriate confirmation modal
  var paymentModal = document.getElementById('paymentMethodModal');
  if (paymentModal) paymentModal.classList.remove('open');
  
  if (method === 'Dinheiro') {
    var moneyModal = document.getElementById('moneyConfirmModal');
    if (moneyModal) moneyModal.classList.add('open');
  } else if (method === 'Cartão') {
    var cardModal = document.getElementById('cardConfirmModal');
    if (cardModal) cardModal.classList.add('open');
  } else if (method === 'PIX') {
    var pixModal = document.getElementById('pixConfirmModal');
    if (pixModal) pixModal.classList.add('open');
  }
}

function goBackToPaymentMethod() {
  // Close all confirmation modals
  var moneyModal = document.getElementById('moneyConfirmModal');
  var cardModal = document.getElementById('cardConfirmModal');
  var pixModal = document.getElementById('pixConfirmModal');
  var pixQrModal = document.getElementById('pixQrModal');
  
  if (moneyModal) moneyModal.classList.remove('open');
  if (cardModal) cardModal.classList.remove('open');
  if (pixModal) pixModal.classList.remove('open');
  if (pixQrModal) pixQrModal.classList.remove('open');
  
  // Re-open payment method selection
  var paymentModal = document.getElementById('paymentMethodModal');
  if (paymentModal) paymentModal.classList.add('open');
  
  selectedPaymentMethod = null;
}

function confirmMoneyPayment(type) {
  console.log('💰 confirmMoneyPayment chamado com type:', type);
  
  if (!selectedPaymentMethod || !pendingCheckoutData) {
    alert('Erro ao processar pagamento');
    return;
  }
  
  // Fechar modal de seleção
  var moneyConfirmModal = document.getElementById('moneyConfirmModal');
  if (moneyConfirmModal) {
    moneyConfirmModal.classList.remove('open');
    console.log('✓ Fechado moneyConfirmModal');
  }
  
  if (type === 'exact') {
    console.log('📌 Abrindo modal de pagamento exato...');
    // Mostrar modal de confirmação para pagamento exato
    var exactMoneyConfirmModal = document.getElementById('exactMoneyConfirmModal');
    var exactMoneyTotalAmount = document.getElementById('exactMoneyTotalAmount');
    
    console.log('  - exactMoneyConfirmModal existe?', exactMoneyConfirmModal ? 'SIM' : 'NÃO');
    console.log('  - exactMoneyTotalAmount existe?', exactMoneyTotalAmount ? 'SIM' : 'NÃO');
    
    if (exactMoneyConfirmModal && exactMoneyTotalAmount) {
      var formatted = formatCurrency(pendingCheckoutData.total);
      exactMoneyTotalAmount.textContent = formatted;
      console.log('  - Valor formatado:', formatted);
      exactMoneyConfirmModal.classList.add('open');
      console.log('  - Classe open adicionada');
    } else {
      console.error('❌ Elementos não encontrados!');
    }
  } else if (type === 'change') {
    console.log('📌 Abrindo modal de troco...');
    // Mostrar modal de troco
    var changeMoneyModal = document.getElementById('changeMoneyModal');
    var changeMoneyTotalAmount = document.getElementById('changeMoneyTotalAmount');
    var changeMoneyPaidAmount = document.getElementById('changeMoneyPaidAmount');
    
    console.log('  - changeMoneyModal existe?', changeMoneyModal ? 'SIM' : 'NÃO');
    console.log('  - changeMoneyTotalAmount existe?', changeMoneyTotalAmount ? 'SIM' : 'NÃO');
    console.log('  - changeMoneyPaidAmount existe?', changeMoneyPaidAmount ? 'SIM' : 'NÃO');
    
    if (changeMoneyModal && changeMoneyTotalAmount) {
      var formatted = formatCurrency(pendingCheckoutData.total);
      changeMoneyTotalAmount.textContent = formatted;
      changeMoneyPaidAmount.value = '';
      console.log('  - Valor formatado:', formatted);
      document.getElementById('changeMoneyChangeAmount').textContent = 'R$ 0,00';
      document.getElementById('confirmChangeBtn').disabled = true;
      document.getElementById('confirmChangeBtn').style.opacity = '0.5';
      changeMoneyModal.classList.add('open');
      console.log('  - Classe open adicionada');
      // Focus no input para melhor UX
      setTimeout(function() {
        changeMoneyPaidAmount.focus();
      }, 300);
    } else {
      console.error('❌ Elementos não encontrados!');
    }
  }
}

function backToMoneyOptions() {
  // Fechar modals de confirmação
  var exactMoneyConfirmModal = document.getElementById('exactMoneyConfirmModal');
  if (exactMoneyConfirmModal) {
    exactMoneyConfirmModal.classList.remove('open');
  }
  
  var changeMoneyModal = document.getElementById('changeMoneyModal');
  if (changeMoneyModal) {
    changeMoneyModal.classList.remove('open');
  }
  
  // Reabrir modal de seleção
  var moneyConfirmModal = document.getElementById('moneyConfirmModal');
  if (moneyConfirmModal) {
    moneyConfirmModal.classList.add('open');
  }
}

function calculateChange() {
  var totalAmount = pendingCheckoutData.total;
  var paidAmountInput = document.getElementById('changeMoneyPaidAmount');
  var paidAmount = parseFloat(paidAmountInput.value) || 0;
  var change = paidAmount - totalAmount;
  
  var changeMoneyChangeAmount = document.getElementById('changeMoneyChangeAmount');
  var confirmChangeBtn = document.getElementById('confirmChangeBtn');
  
  if (paidAmount >= totalAmount) {
    changeMoneyChangeAmount.textContent = formatCurrency(change);
    changeMoneyChangeAmount.style.color = '#4285F4';
    confirmChangeBtn.disabled = false;
    confirmChangeBtn.style.opacity = '1';
  } else {
    changeMoneyChangeAmount.textContent = formatCurrency(change);
    changeMoneyChangeAmount.style.color = '#e74c3c';
    confirmChangeBtn.disabled = true;
    confirmChangeBtn.style.opacity = '0.5';
  }
}

function confirmExactMoneyPayment() {
  if (!selectedPaymentMethod || !pendingCheckoutData) {
    alert('Erro ao processar pagamento');
    return;
  }
  
  // Prevenir múltiplos cliques
  if (isPaymentProcessing) {
    console.warn('⏳ Pagamento já está sendo processado...');
    return;
  }
  
  isPaymentProcessing = true;
  setPaymentButtonLoading('confirmExactPaymentBtn', true);
  
  pendingCheckoutData.payment = selectedPaymentMethod;
  // Dinheiro começa como Pendente - só vira Pago quando admin confirmar
  pendingCheckoutData.paymentStatus = 'Pendente';
  pendingCheckoutData.paymentType = 'exact';
  
  console.log('Enviando pedido Dinheiro (Exato):', JSON.stringify(pendingCheckoutData, null, 2));
  
  // Send to API
  fetch(API_URL + '/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pendingCheckoutData)
  })
  .then(function(response) {
    console.log('Response status:', response.status);
    if (response.ok) {
      return response.json();
    }
    return response.json().then(function(data) {
      throw new Error(JSON.stringify(data));
    });
  })
  .then(function(data) {
    console.log('Order created:', data);
    console.log('✅ Pedido criado com sucesso! ID: ' + data.id);
    console.log('💰 Pagamento exato na entrega');
    
    // Fechar modal de confirmação
    var exactMoneyConfirmModal = document.getElementById('exactMoneyConfirmModal');
    if (exactMoneyConfirmModal) {
      exactMoneyConfirmModal.classList.remove('open');
    }
    
    // Mostrar modal de confirmação geral
    showPaymentConfirmedModal({
      order_id: data.id,
      amount: data.total || pendingCheckoutData.total,
      payment_method: 'Dinheiro',
      payment_type: 'exact',
      items: pendingCheckoutData.items || []
    });
    
    cart = [];
    updateCartBadge();
    
    // Limpar flag de processamento
    isPaymentProcessing = false;
  })
  .catch(function(error) {
    console.error('Error creating order:', error);
    alert('Erro ao criar pedido:\n' + error.message);
    // Re-habilitar botão em caso de erro
    isPaymentProcessing = false;
    setPaymentButtonLoading('confirmExactPaymentBtn', false);
  });
}

function confirmChangeMoneyPayment() {
  if (!selectedPaymentMethod || !pendingCheckoutData) {
    alert('Erro ao processar pagamento');
    return;
  }
  
  // Prevenir múltiplos cliques
  if (isPaymentProcessing) {
    console.warn('⏳ Pagamento já está sendo processado...');
    return;
  }
  
  isPaymentProcessing = true;
  setPaymentButtonLoading('confirmChangeBtn', true);
  
  var paidAmount = parseFloat(document.getElementById('changeMoneyPaidAmount').value) || 0;
  var totalAmount = pendingCheckoutData.total;
  
  if (paidAmount < totalAmount) {
    alert('O valor pago deve ser maior ou igual ao valor total!');
    isPaymentProcessing = false;
    setPaymentButtonLoading('confirmChangeBtn', false);
    return;
  }
  
  pendingCheckoutData.payment = selectedPaymentMethod;
  // Dinheiro começa como Pendente - só vira Pago quando admin confirmar
  pendingCheckoutData.paymentStatus = 'Pendente';
  pendingCheckoutData.paymentType = 'change';
  pendingCheckoutData.paidAmount = paidAmount;
  pendingCheckoutData.changeAmount = paidAmount - totalAmount;
  
  console.log('Enviando pedido Dinheiro (Com Troco):', JSON.stringify(pendingCheckoutData, null, 2));
  
  // Send to API
  fetch(API_URL + '/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pendingCheckoutData)
  })
  .then(function(response) {
    console.log('Response status:', response.status);
    if (response.ok) {
      return response.json();
    }
    return response.json().then(function(data) {
      throw new Error(JSON.stringify(data));
    });
  })
  .then(function(data) {
    console.log('Order created:', data);
    console.log('✅ Pedido criado com sucesso! ID: ' + data.id);
    console.log('💵 O entregador está preparado para dar troco');
    
    // Fechar modal de troco
    var changeMoneyModal = document.getElementById('changeMoneyModal');
    if (changeMoneyModal) {
      changeMoneyModal.classList.remove('open');
    }
    
    // Mostrar modal de confirmação geral
    showPaymentConfirmedModal({
      order_id: data.id,
      amount: data.total || pendingCheckoutData.total,
      payment_method: 'Dinheiro',
      payment_type: 'change',
      items: pendingCheckoutData.items || []
    });
    
    cart = [];
    updateCartBadge();
    
    // Limpar flag de processamento
    isPaymentProcessing = false;
  })
  .catch(function(error) {
    console.error('Error creating order:', error);
    alert('Erro ao criar pedido:\n' + error.message);
    // Re-habilitar botão em caso de erro
    isPaymentProcessing = false;
    setPaymentButtonLoading('confirmChangeBtn', false);
  });
}

function confirmCardPayment() {
  if (!selectedPaymentMethod || !pendingCheckoutData) {
    alert('Erro ao processar pagamento');
    return;
  }
  
  // Prevenir múltiplos cliques
  if (isPaymentProcessing) {
    console.warn('⏳ Pagamento já está sendo processado...');
    return;
  }
  
  isPaymentProcessing = true;
  setPaymentButtonLoading('confirmCardPaymentBtn', true);
  
  pendingCheckoutData.payment = selectedPaymentMethod;
  // Cartão começa como Pendente - só vira Pago quando admin confirmar
  pendingCheckoutData.paymentStatus = 'Pendente';
  
  console.log('Enviando pedido Cartão:', JSON.stringify(pendingCheckoutData, null, 2));
  
  // Send to API
  fetch(API_URL + '/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pendingCheckoutData)
  })
  .then(function(response) {
    console.log('Response status:', response.status);
    if (response.ok) {
      return response.json();
    }
    return response.json().then(function(data) {
      throw new Error(JSON.stringify(data));
    });
  })
  .then(function(data) {
    console.log('Order created:', data);
    console.log('✅ Pagamento com cartão processado com sucesso! Pedido ID: ' + data.id);
    
    // Fechar modal de pagamento com cartão
    var cardPaymentModal = document.getElementById('cardPaymentModal');
    if (cardPaymentModal) {
      cardPaymentModal.classList.remove('open');
    }
    
    // Mostrar modal de confirmação
    showPaymentConfirmedModal({
      order_id: data.id,
      amount: data.total || pendingCheckoutData.total,
      payment_method: 'Cartão',
      items: pendingCheckoutData.items || []
    });
    
    cart = [];
    updateCartBadge();
    
    // Limpar flag de processamento
    isPaymentProcessing = false;
  })
  .catch(function(error) {
    console.error('Error creating order:', error);
    alert('Erro ao processar o pagamento:\n' + error.message);
    // Re-habilitar botão em caso de erro
    isPaymentProcessing = false;
    setPaymentButtonLoading('confirmCardPaymentBtn', false);
  });
}

function confirmPixPayment() {
  if (!selectedPaymentMethod || !pendingCheckoutData) {
    alert('Erro ao processar pagamento');
    return;
  }
  
  // Prevenir múltiplos cliques
  if (isPaymentProcessing) {
    console.warn('⏳ Pagamento já está sendo processado...');
    return;
  }
  
  isPaymentProcessing = true;
  setPaymentButtonLoading('confirmPixPaymentBtn', true);
  
  // PIX fica como 'Aguardando' até webhook confirmar pagamento
  pendingCheckoutData.paymentStatus = 'Aguardando';
  
  // Close confirmation modal
  var pixConfirmModal = document.getElementById('pixConfirmModal');
  if (pixConfirmModal) pixConfirmModal.classList.remove('open');
  
  // Show loading state in QR modal
  var pixQrModal = document.getElementById('pixQrModal');
  if (pixQrModal) pixQrModal.classList.add('open');
  
  var pixQrCode = document.getElementById('pixQrCode');
  var pixCode = document.getElementById('pixCode');
  if (pixQrCode) pixQrCode.innerHTML = '⏳ Gerando QR Code...';
  if (pixCode) pixCode.textContent = 'Carregando...';
  
  console.log('📝 Iniciando fluxo PIX com criação automática de pedido...');
  
  // Call backend to generate real PIX from Mercado Pago
  fetch(API_URL + '/payments/pix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: null, // Will be set after order creation
      amount: pendingCheckoutData.total,
      description: 'Pagamento - Cia de Condimentos',
      payerEmail: pendingCheckoutData.customer.email || 'cliente@condimentos.com',
      payerPhone: pendingCheckoutData.customer.phone
    })
  })
  .then(function(response) {
    console.log('PIX Response status:', response.status);
    if (!response.ok) {
      return response.json().then(function(error) {
        throw new Error(error.error || 'Erro ao gerar PIX');
      });
    }
    return response.json();
  })
  .then(function(pixData) {
    console.log('PIX Data received:', pixData);
    
    // Store PIX data
    window.currentPixData = {
      mp_payment_id: pixData.mp_payment_id,
      qr_code: pixData.qr_code,
      qr_code_base64: pixData.qr_code_base64,
      status: pixData.status,
      amount: pixData.amount
    };
    
    // Display QR code image
    if (pixQrCode) {
      if (pixData.qr_code_base64) {
        pixQrCode.innerHTML = '<img src="data:image/png;base64,' + pixData.qr_code_base64 + '" style="width: 100%; height: 100%; border-radius: 8px;">';
      } else {
        pixQrCode.innerHTML = '❌ Erro ao carregar QR Code';
      }
    }
    
    // Display PIX code
    if (pixCode) {
      pixCode.textContent = pixData.qr_code || 'Código não disponível';
    }
    
    window.currentPixCode = pixData.qr_code;
    
    console.log('✅ PIX gerado com sucesso:', pixData.mp_payment_id);
    console.log('📋 Criando pedido automaticamente...');
    
    // ✅ NOVO: Criar pedido AUTOMATICAMENTE após gerar QR
    pendingCheckoutData.payment = 'PIX';
    pendingCheckoutData.mp_payment_id = window.currentPixData.mp_payment_id;
    
    return fetch(API_URL + '/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pendingCheckoutData)
    });
  })
  .then(function(response) {
    console.log('Order Response status:', response.status);
    if (response.ok) {
      return response.json();
    }
    return response.json().then(function(data) {
      throw new Error(JSON.stringify(data));
    });
  })
  .then(function(orderData) {
    console.log('✅ Pedido criado automaticamente:', orderData);
    
    // Update payment record with order ID
    if (orderData.id && window.currentPixData.mp_payment_id) {
      fetch(API_URL + '/payments/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mp_payment_id: window.currentPixData.mp_payment_id,
          order_id: orderData.id,
          status: window.currentPixData.status
        })
      }).catch(function(err) {
        console.warn('Aviso: não foi possível atualizar payment record:', err);
      });
    }
    
    // Armazenar dados para polling
    const paymentAmount = parseFloat(window.currentPixData.amount) || parseFloat(pendingCheckoutData.total) || 0;
    
    paymentPollingData = {
      mp_payment_id: window.currentPixData.mp_payment_id,
      order_id: orderData.id,
      amount: paymentAmount
    };
    
    console.log('💾 Dados de polling armazenados:', paymentPollingData);
    console.log('⏱️  Iniciando polling automático...');
    
    // ✅ NOVO: Iniciar polling AUTOMATICAMENTE
    startPaymentPolling();
    
    // Limpar flag de processamento após iniciar polling
    isPaymentProcessing = false;
    
    // ✅ Modal de QR Code permanece aberto enquanto polling acontece
    // showWaitingForPaymentModal(); // REMOVIDO: mantém o modal de PIX visível
  })
  .catch(function(error) {
    console.error('Erro no fluxo PIX:', error);
    if (pixQrCode) pixQrCode.innerHTML = '❌ Erro ao processar: ' + error.message;
    if (pixCode) pixCode.textContent = 'Erro: ' + error.message;
    alert('Erro ao processar PIX:\n' + error.message);
    // Re-habilitar botão em caso de erro
    isPaymentProcessing = false;
    setPaymentButtonLoading('confirmPixPaymentBtn', false);
  });
}

function copyPixCode() {
  var pixCode = window.currentPixCode;
  if (!pixCode) {
    alert('Código PIX não disponível');
    return;
  }
  
  // Copy to clipboard
  navigator.clipboard.writeText(pixCode).then(function() {
    alert('✓ Código PIX copiado para a área de transferência!');
  }).catch(function(error) {
    console.error('Erro ao copiar:', error);
    // Fallback for older browsers
    var textarea = document.createElement('textarea');
    textarea.value = pixCode;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    alert('✓ Código PIX copiado para a área de transferência!');
  });
}

function closePix() {
  if (!pendingCheckoutData || !window.currentPixData) {
    alert('Erro ao processar pagamento PIX');
    return;
  }
  
  // Set payment method and MP payment ID
  pendingCheckoutData.payment = 'PIX';
  pendingCheckoutData.mp_payment_id = window.currentPixData.mp_payment_id;
  
  console.log('Criando pedido com PIX:', JSON.stringify(pendingCheckoutData, null, 2));
  
  // Create order
  fetch(API_URL + '/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pendingCheckoutData)
  })
  .then(function(response) {
    console.log('Order Response status:', response.status);
    if (response.ok) {
      return response.json();
    }
    return response.json().then(function(data) {
      throw new Error(JSON.stringify(data));
    });
  })
  .then(function(orderData) {
    console.log('Pedido criado com sucesso:', orderData);
    
    // Update payment record with order ID
    if (orderData.id && window.currentPixData.mp_payment_id) {
      fetch(API_URL + '/payments/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mp_payment_id: window.currentPixData.mp_payment_id,
          order_id: orderData.id,
          status: window.currentPixData.status
        })
      }).catch(function(err) {
        console.warn('Aviso: não foi possível atualizar payment record:', err);
      });
    }
    
    // Armazenar dados para polling
    // Garantir que amount é número válido
    const paymentAmount = parseFloat(window.currentPixData.amount) || parseFloat(pendingCheckoutData.total) || 0;
    
    paymentPollingData = {
      mp_payment_id: window.currentPixData.mp_payment_id,
      order_id: orderData.id,
      amount: paymentAmount
    };
    
    console.log('💾 Dados de polling armazenados:', paymentPollingData);
    
    // Iniciar polling de confirmação
    startPaymentPolling();
    
    // Mostrar tela de espera
    showWaitingForPaymentModal();
    
    // ✅ TRAVAR MODAL para evitar fechar acidentalmente
    lockPixQrModal();
    
    // NÃO limpar o carrinho aqui - apenas após confirmação
    updateCartBadge();
  })
  .catch(function(error) {
    console.error('Erro ao criar pedido:', error);
    alert('❌ Erro ao criar pedido:\n' + error.message);
  });
}

// ✅ NOVA: Função para fechar o modal de QR (com verificação de travamento)
function closePixQrModal() {
  var pixQrModal = document.getElementById('pixQrModal');
  if (pixQrModal && pixQrModal.getAttribute('data-locked') === 'false') {
    console.log('🔓 Fechando modal de QR (não travado)');
    pixQrModal.classList.remove('open');
    cancelCheckoutProcess();
  } else {
    console.warn('🔒 Modal de QR está travado. Use o botão Cancelar para sair.');
  }
}

// ✅ NOVA: Função para TRAVAR o modal durante o polling
function lockPixQrModal() {
  var pixQrModal = document.getElementById('pixQrModal');
  var closeBtn = document.getElementById('pixQrCloseBtn');
  if (pixQrModal) {
    pixQrModal.setAttribute('data-locked', 'true');
    console.log('🔒 Modal de QR TRAVADO - Cliente não pode sair sem cancelar ou pagar');
  }
  if (closeBtn) {
    closeBtn.style.display = 'none'; // Ocultar botão X
  }
}

// ✅ NOVA: Função para DESTRAVRAR o modal após cancelar ou confirmar
function unlockPixQrModal() {
  var pixQrModal = document.getElementById('pixQrModal');
  var closeBtn = document.getElementById('pixQrCloseBtn');
  if (pixQrModal) {
    pixQrModal.setAttribute('data-locked', 'false');
    console.log('🔓 Modal de QR DESTRAVADO');
  }
  if (closeBtn) {
    closeBtn.style.display = 'block'; // Mostrar botão X novamente
  }
}

// ✅ NOVA: Bloquear cliques fora do modal quando travado
document.addEventListener('DOMContentLoaded', function() {
  var pixQrModal = document.getElementById('pixQrModal');
  if (pixQrModal) {
    pixQrModal.addEventListener('click', function(e) {
      // Se clicou no overlay (fora do modal)
      if (e.target === this && this.getAttribute('data-locked') === 'true') {
        e.stopPropagation();
        console.warn('🔒 Clique bloqueado - Modal está travado');
        return false;
      }
    });
  }
});

function cancelPixPayment() {
  // Mostrar confirmação
  if (!confirm('⚠️  Deseja realmente cancelar este pagamento PIX?\n\nSeu carrinho será mantido.')) {
    return;
  }
  
  console.log('🚫 Cancelando pagamento PIX...');
  
  // Parar o polling se estiver ativo
  stopPaymentPolling();
  
  // Cancelar pagamento no backend (opcional)
  if (window.currentPixData && window.currentPixData.mp_payment_id) {
    fetch(API_URL + '/payments/cancel/' + window.currentPixData.mp_payment_id, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).catch(function(err) {
      console.warn('⚠️  Erro ao cancelar no backend:', err.message);
    });
  }
  
  // Limpar dados de polling mas NÃO limpar carrinho
  paymentPollingData = null;
  window.currentPixData = null;
  window.currentPixCode = null;
  
  // Fechar todas as modais
  var pixQrModal = document.getElementById('pixQrModal');
  var waitingModal = document.getElementById('waitingForPaymentModal');
  var pixConfirmModal = document.getElementById('pixConfirmModal');
  
  if (pixQrModal) {
    pixQrModal.classList.remove('open');
    unlockPixQrModal(); // ✅ Destravando o modal
  }
  if (waitingModal) waitingModal.classList.remove('open');
  if (pixConfirmModal) pixConfirmModal.classList.remove('open');
  
  // Voltar para seleção de forma de pagamento
  var paymentModal = document.getElementById('paymentMethodModal');
  if (paymentModal) {
    paymentModal.classList.add('open');
  }
  
  console.log('✓ Pagamento cancelado - Carrinho mantido com ' + cart.length + ' itens');
}

function cancelCheckoutProcess() {
  var checkoutModal = document.getElementById('checkoutModal');
  var paymentModal = document.getElementById('paymentMethodModal');
  
  if (checkoutModal) checkoutModal.classList.remove('open');
  if (paymentModal) paymentModal.classList.remove('open');
  
  document.body.style.overflow = 'auto';
  pendingCheckoutData = null;
  selectedPaymentMethod = null;
}

function closeCheckout() {
  var modal = document.getElementById('checkoutModal');
  if (modal) modal.classList.remove('open');
  
  var paymentModal = document.getElementById('paymentMethodModal');
  if (paymentModal) paymentModal.classList.remove('open');
  
  document.body.style.overflow = 'auto';
  pendingCheckoutData = null;
  selectedPaymentMethod = null;
}

// ==================== FUNÇÕES DE POLLING DE PAGAMENTO ====================

function startPaymentPolling() {
  if (!paymentPollingData) {
    console.warn('⚠️  Dados de polling não disponíveis');
    return;
  }
  
  // Reset das variáveis
  paymentPollingAttempts = 0;
  paymentPollingFailures = 0;
  paymentPollingStartTime = Date.now();
  paymentPollingInterval_ms = 2000; // Começar a cada 2 segundos
  
  console.log('⏱️  INICIANDO POLLING DE PAGAMENTO PIX');
  console.log('   ID do pagamento:', paymentPollingData.mp_payment_id);
  console.log('   ID do pedido:', paymentPollingData.order_id);
  
  // Log seguro do valor (em caso de amount não estar definido)
  if (paymentPollingData.amount && typeof paymentPollingData.amount === 'number') {
    console.log('   Valor:', 'R$ ' + paymentPollingData.amount.toFixed(2).replace('.', ','));
  } else {
    console.log('   Valor: Não definido');
  }
  
  console.log('   Intervalo inicial:', paymentPollingInterval_ms + 'ms');
  
  // Limpar polling anterior se existir
  stopPaymentPolling();
  
  // Fazer primeira verificação imediatamente
  checkPaymentStatus();
  
  // Iniciar novo polling com intervalo adaptativo
  paymentPollingInterval = setInterval(function() {
    checkPaymentStatus();
  }, paymentPollingInterval_ms);
  
  // Timeout de 30 minutos
  paymentPollingTimeout = setTimeout(function() {
    console.warn('⚠️  TIMEOUT: Polling alcançou 30 minutos sem confirmação');
    stopPaymentPolling();
    alert('⏱️  Tempo limite atingido. Se você já pagou, o pagamento será processado em breve.\nVerifique sua bandeja de entrada para atualizações.');
  }, 30 * 60 * 1000);
}

function stopPaymentPolling() {
  if (paymentPollingInterval) {
    clearInterval(paymentPollingInterval);
    paymentPollingInterval = null;
  }
  
  if (paymentPollingTimeout) {
    clearTimeout(paymentPollingTimeout);
    paymentPollingTimeout = null;
  }
  
  if (paymentPollingStartTime) {
    const duration = Math.round((Date.now() - paymentPollingStartTime) / 1000);
    console.log('✓ Polling interrompido - Duração:', duration + 's', '- Tentativas:', paymentPollingAttempts);
  } else {
    console.log('✓ Polling de pagamento interrompido');
  }
}

function checkPaymentStatus() {
  if (!paymentPollingData) return;
  
  paymentPollingAttempts++;
  const attemptNumber = paymentPollingAttempts;
  const elapsed = Math.round((Date.now() - paymentPollingStartTime) / 1000);
  
  console.log(`\n📊 [POLLING] Tentativa #${attemptNumber} (${elapsed}s decorridos) - Intervalo: ${paymentPollingInterval_ms}ms`);
  
  // 1️⃣ Verificar status no Mercado Pago
  fetch(API_URL + '/payments/status/' + paymentPollingData.mp_payment_id, {
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
    paymentPollingFailures = 0;
    paymentPollingInterval_ms = 2000; // Voltar ao intervalo normal
    
    // Se pagamento foi aprovado
    if (paymentData.status === 'approved') {
      console.log('✅ ✅ ✅ PAGAMENTO APROVADO! Mostrando confirmação...');
      stopPaymentPolling();
      showPaymentConfirmedModal(paymentData);
      return;
    }
    
    // Se ainda está pendente, log informativo
    if (paymentData.status === 'pending') {
      console.log('⏳ Pagamento ainda pendente - aguardando confirmação...');
      
      // Também verificar o banco local
      if (paymentData.order_id) {
        checkOrderStatus(paymentData.order_id);
      }
    }
    
    // Outros status
    if (paymentData.status === 'rejected') {
      console.warn('❌ Pagamento rejeitado');
      stopPaymentPolling();
      alert('❌ Pagamento foi rejeitado. Tente novamente ou use outro método de pagamento.');
      return;
    }
    
    if (paymentData.status === 'cancelled') {
      console.warn('⛔ Pagamento cancelado');
      stopPaymentPolling();
      alert('⛔ Pagamento foi cancelado.');
      return;
    }
  })
  .catch(function(error) {
    paymentPollingFailures++;
    console.warn(`❌ Erro ao verificar status (Falha #${paymentPollingFailures}):`, error.message);
    
    // Aumentar intervalo após falhas (backoff exponencial)
    if (paymentPollingFailures >= 3) {
      // Após 3 falhas, aumentar intervalo progressivamente
      paymentPollingInterval_ms = Math.min(paymentPollingInterval_ms * 1.5, 10000);
      console.warn(`⚠️  Aumentando intervalo para ${paymentPollingInterval_ms}ms (falhas: ${paymentPollingFailures})`);
      
      // Atualizar intervalo do setInterval
      if (paymentPollingInterval) {
        clearInterval(paymentPollingInterval);
        paymentPollingInterval = setInterval(function() {
          checkPaymentStatus();
        }, paymentPollingInterval_ms);
      }
    }
    
    // Se muitas falhas, mostrar aviso
    if (paymentPollingFailures === 5) {
      console.warn('⚠️  Múltiplas falhas ao conectar. Verifique sua conexão...');
    }
  });
}

function checkOrderStatus(orderId) {
  // Verificar se o pedido foi confirmado localmente (por outro sistema, admin, etc)
  console.log('   📋 Verificando status local do pedido #' + orderId + '...');
  
  fetch(API_URL + '/orders/' + orderId, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })
  .then(function(response) {
    if (response.ok) {
      return response.json();
    }
    throw new Error('Erro HTTP ' + response.status);
  })
  .then(function(orderData) {
    console.log('      Status do pedido:', orderData.status, '| Payment status:', orderData.payment_status);
    
    // Se o pedido foi confirmado (status = 'Confirmado'), mostrar sucesso
    if (orderData.status === 'Confirmado' || orderData.payment_status === 'Confirmado') {
      console.log('✅ ✅ PAGAMENTO CONFIRMADO (Banco Local)! Pedido #' + orderId);
      stopPaymentPolling();
      showPaymentConfirmedModal({
        order_id: orderId,
        amount: orderData.total || (paymentPollingData ? paymentPollingData.amount : 0),
        payment_method: 'PIX',
        items: pendingCheckoutData && pendingCheckoutData.items || []
      });
    }
  })
  .catch(function(error) {
    // Silenciosamente ignora erro - é apenas verificação adicional
    console.debug('      ℹ️  Verificação de pedido não disponível:', error.message);
  });
}

function showWaitingForPaymentModal() {
  // Fechar PIX modal
  var pixQrModal = document.getElementById('pixQrModal');
  if (pixQrModal) {
    pixQrModal.classList.remove('open');
  }
  
  // Mostrar modal de espera
  var waitingModal = document.getElementById('waitingForPaymentModal');
  if (!waitingModal) {
    // Criar modal se não existir
    createWaitingForPaymentModal();
    waitingModal = document.getElementById('waitingForPaymentModal');
  }
  
  if (waitingModal) {
    waitingModal.classList.add('open');
  }
}

function createWaitingForPaymentModal() {
  // Verificar se já existe
  if (document.getElementById('waitingForPaymentModal')) {
    return;
  }
  
  var html = '<div id="waitingForPaymentModal" class="modal" style="display: none;">' +
    '<div class="modal-overlay"></div>' +
    '<div class="modal-content" style="max-width: 90%; max-height: 90vh; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">' +
      '<div style="background: linear-gradient(135deg, var(--verde) 0%, #27a745 100%); color: white; padding: 32px 24px; text-align: center; border-radius: 12px 12px 0 0;">' +
        '<div style="font-size: 60px; margin-bottom: 16px; animation: spin 2s linear infinite;">⏳</div>' +
        '<h2 style="margin: 0; font-size: 24px; font-weight: 900;">Aguardando Confirmação</h2>' +
        '<p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.95;">Seu pagamento PIX foi criado com sucesso</p>' +
      '</div>' +
      '<div style="padding: 24px; text-align: center; background: white;">' +
        '<p style="margin: 0 0 16px 0; font-size: 16px; color: #333;">Estamos verificando seu pagamento...</p>' +
        '<p style="margin: 0 0 16px 0; font-size: 14px; color: #666;">Pode levar alguns segundos após você escanear o QR Code ou usar o código PIX.</p>' +
        '<div style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin: 16px 0; border-left: 4px solid var(--verde);">' +
          '<small style="color: #666;">💡 <strong>Dica:</strong> Você pode voltar à tela de pagamento para copiar o código PIX se necessário.</small>' +
        '</div>' +
        '<div style="display: flex; gap: 8px; margin-top: 16px;">' +
          '<button onclick="goBackToPixPayment()" style="flex: 1; background: var(--marrom); color: white; border: none; padding: 12px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px;">' +
            '← Voltar ao PIX' +
          '</button>' +
          '<button onclick="testConfirmPayment()" style="flex: 1; background: #27a745; color: white; border: none; padding: 12px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 14px;">' +
            '🧪 Testar Confirmação' +
          '</button>' +
        '</div>' +
      '</div>' +
      '</div>' +
    '</div>' +
  '</div>';
  
  document.body.insertAdjacentHTML('beforeend', html);
}

function showPaymentConfirmedModal(paymentData) {
  console.log('🎉 Mostrando modal de confirmação de pagamento...');
  
  // Criar modal se não existir
  if (!document.getElementById('paymentConfirmedModal')) {
    console.log('   Criando nova modal de confirmação...');
    createPaymentConfirmedModal();
  }
  
  var modal = document.getElementById('paymentConfirmedModal');
  var orderId = document.getElementById('confirmedOrderId');
  var amount = document.getElementById('confirmedAmount');
  
  if (orderId) {
    orderId.textContent = paymentData.order_id || 'N/A';
    console.log('   ID do pedido:', paymentData.order_id || 'N/A');
  }
  
  if (amount) {
    // Garantir que amount é número válido
    const amountValue = parseFloat(paymentData.amount) || 0;
    const amountFormatted = 'R$ ' + amountValue.toFixed(2).replace('.', ',');
    amount.textContent = amountFormatted;
    console.log('   Valor:', amountFormatted);
  }
  
  // Atualizar texto de pagamento dinamicamente
  var paymentMethodText = document.getElementById('paymentMethodText');
  if (paymentMethodText) {
    if (paymentData.payment_method === 'Dinheiro') {
      if (paymentData.payment_type === 'exact') {
        paymentMethodText.textContent = '💰 Pagamento exato na entrega';
      } else {
        paymentMethodText.textContent = '💵 O entregador está preparado para dar troco';
      }
    } else if (paymentData.payment_method === 'Cartão') {
      paymentMethodText.textContent = '💳 Pagamento com cartão processado com sucesso';
    } else {
      paymentMethodText.textContent = '✅ Seu PIX foi processado com sucesso';
    }
    console.log('   Método de pagamento:', paymentMethodText.textContent);
  }
  // Fechar modais anteriores
  var waitingModal = document.getElementById('waitingForPaymentModal');
  if (waitingModal) {
    console.log('   Fechando modal de espera...');
    waitingModal.classList.remove('open');
  }
  
  var pixQrModal = document.getElementById('pixQrModal');
  if (pixQrModal) {
    console.log('   Fechando modal de QR Code...');
    pixQrModal.classList.remove('open');
    unlockPixQrModal(); // ✅ Destravando o modal após confirmação
  }
  
  // Armazenar dados do pedido para usar no WhatsApp
  window.confirmedOrderData = {
    order_id: paymentData.order_id,
    amount: paymentData.amount,
    payment_method: paymentData.payment_method || 'PIX',
    customer_name: paymentData.customer_name || (pendingCheckoutData && pendingCheckoutData.customer && pendingCheckoutData.customer.name) || 'Cliente',
    customer_phone: paymentData.customer_phone || (pendingCheckoutData && pendingCheckoutData.customer && pendingCheckoutData.customer.phone) || '',
    customer_email: paymentData.customer_email || (pendingCheckoutData && pendingCheckoutData.customer && pendingCheckoutData.customer.email) || '',
    address: paymentData.address || (pendingCheckoutData && pendingCheckoutData.customer && pendingCheckoutData.customer.address) || '',
    items: paymentData.items || (pendingCheckoutData && pendingCheckoutData.items) || [],
    notes: paymentData.notes || '',
    changeAmount: paymentData.changeAmount || (pendingCheckoutData && pendingCheckoutData.changeAmount) || 0,
    paidAmount: paymentData.paidAmount || (pendingCheckoutData && pendingCheckoutData.paidAmount) || 0
  };
  
  // Mostrar modal de confirmação
  if (modal) {
    console.log('   Exibindo modal de confirmação...');
    console.log('   ℹ️  Modal permanecerá aberta - cliente deve clicar para fechar');
    modal.classList.add('open');
    // Garantir que apareça com display block
    modal.style.display = 'flex';
    // Desabilitar scroll da página
    document.body.style.overflow = 'hidden';
  } else {
    console.error('❌ Elemento da modal não encontrado!');
  }
}

function createPaymentConfirmedModal() {
  if (document.getElementById('paymentConfirmedModal')) {
    return;
  }
  
  var html = '<div id="paymentConfirmedModal" class="modal payment-confirmed-modal open" style="display: flex !important; z-index: 9999; position: fixed; inset: 0; align-items: flex-end; justify-content: center; padding: 0;">' +
    '<div class="modal-overlay" style="position: fixed; inset: 0; z-index: 9998; background: rgba(0,0,0,0.8); cursor: pointer;" onclick="closePaymentConfirmedModal()"></div>' +
    '<div class="modal-content payment-confirmed-content" style="width: 100%; height: 100%; max-height: 100vh; border-radius: 0; box-shadow: none; z-index: 9999; display: flex; flex-direction: column; background: white; position: relative; overflow: hidden; max-width: 100%;">' +
      '<div style="background: linear-gradient(135deg, #27a745 0%, #20c997 100%); color: white; padding: 24px 20px; text-align: center; border-radius: 0; flex-shrink: 0;">' +
        '<div style="font-size: 64px; margin-bottom: 12px; animation: bounce 0.6s ease-in-out; line-height: 1;">✅</div>' +
        '<h1 style="margin: 0; font-size: 26px; font-weight: 900; line-height: 1.2;">Pagamento<br>Confirmado!</h1>' +
        '<p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.95; font-weight: 600;" id="paymentMethodText">Seu PIX foi processado com sucesso</p>' +
      '</div>' +
      '<div class="payment-confirmed-body" style="padding: 20px 16px; text-align: center; background: white; overflow-y: auto; -webkit-overflow-scrolling: touch; flex: 1; min-height: 0;">' +
        '<div style="margin-bottom: 20px;">' +
          '<p style="margin: 0 0 6px 0; font-size: 12px; color: #999; font-weight: 700; letter-spacing: 1px;">NÚMERO DO PEDIDO</p>' +
          '<p style="margin: 0; font-size: 32px; font-weight: 900; color: var(--marrom); word-break: break-word;" id="confirmedOrderId">-</p>' +
        '</div>' +
        '<div style="margin-bottom: 18px; padding: 14px; background: #f0f8f0; border-radius: 8px; border: 1px solid #d0e8d0;">' +
          '<p style="margin: 0 0 6px 0; font-size: 12px; color: #666; font-weight: 600;">Valor Pago</p>' +
          '<p style="margin: 0; font-size: 28px; font-weight: 900; color: #27a745;" id="confirmedAmount">R$ 0,00</p>' +
        '</div>' +
        '<div style="background: #f5f5f5; padding: 12px; border-radius: 8px; margin-bottom: 16px; text-align: left;">' +
          '<p style="margin: 0; font-size: 13px; color: #555; line-height: 1.6;">' +
            '<span style="display: block; margin-bottom: 4px;">✅ Pagamento recebido com sucesso</span>' +
            '<span style="display: block; margin-bottom: 4px;">📦 Seu pedido está sendo preparado</span>' +
            '<span style="display: block;">📱 Você receberá atualizações em breve</span>' +
          '</p>' +
        '</div>' +
        '<div style="background: #e8f5e9; padding: 12px; border-radius: 8px; border-left: 4px solid #27a745;">' +
          '<p style="margin: 0; color: #2e7d32; font-size: 12px; font-weight: 600;">🎉 Obrigado pela sua compra!</p>' +
        '</div>' +
      '</div>' +
      '<div class="payment-confirmed-footer" style="padding: 12px 16px; background: #fafafa; border-top: 1px solid #e0e0e0; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px; border-radius: 0;">' +
        '<button onclick="sendOrderToWhatsApp()" style="background: #25d366; color: white; border: none; padding: 12px 16px; border-radius: 6px; cursor: pointer; font-weight: 900; font-size: 14px; letter-spacing: 0.5px; display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; width: 100%; transition: background 0.2s;">' +
          '💬 WhatsApp' +
        '</button>' +
        '<button onclick="closePaymentConfirmedModal()" style="background: var(--marrom); color: white; border: none; padding: 12px 32px; border-radius: 6px; cursor: pointer; font-weight: 900; font-size: 14px; width: 100%; letter-spacing: 0.5px; min-height: 44px; transition: background 0.2s;">' +
          'Fechar' +
        '</button>' +
      '</div>' +
    '</div>' +
  '</div>';
  
  
  document.body.insertAdjacentHTML('beforeend', html);
}

function goBackToPixPayment() {
  var waitingModal = document.getElementById('waitingForPaymentModal');
  var pixQrModal = document.getElementById('pixQrModal');
  
  if (waitingModal) waitingModal.classList.remove('open');
  if (pixQrModal) pixQrModal.classList.add('open');
}

function closePaymentConfirmedModal() {
  var modal = document.getElementById('paymentConfirmedModal');
  if (modal) {
    modal.classList.remove('open');
    modal.style.display = 'none';
  }
  
  // Ativar scroll da página
  document.body.style.overflow = 'auto';
  
  // ✅ AGORA SIM, limpar carrinho e resetar dados após confirmação
  cart = [];
  updateCartBadge();
  cancelCheckoutProcess();
}

function testConfirmPayment() {
  if (!paymentPollingData || !paymentPollingData.mp_payment_id) {
    alert('❌ Erro: dados de pagamento não disponíveis');
    return;
  }
  
  console.log('🧪 Testando confirmação de pagamento:', paymentPollingData.mp_payment_id);
  
  fetch(API_URL + '/payments/confirm-test/' + paymentPollingData.mp_payment_id, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })
  .then(function(response) {
    if (response.ok) {
      return response.json();
    }
    return response.json().then(function(error) {
      throw new Error(error.error || 'Erro ao confirmar pagamento');
    });
  })
  .then(function(data) {
    console.log('✅ Pagamento confirmado em teste:', data);
    alert('✅ Pagamento confirmado com sucesso em modo teste!');
    
    // Parar polling para testar o resultado manual
    stopPaymentPolling();
    
    // Mostrar modal de confirmação
    showPaymentConfirmedModal({
      order_id: paymentPollingData.order_id,
      amount: paymentPollingData.amount,
      payment_method: 'PIX',
      items: pendingCheckoutData && pendingCheckoutData.items || []
    });
  })
  .catch(function(error) {
    console.error('❌ Erro ao confirmar:', error);
    alert('❌ Erro: ' + error.message);
  });
}

function sendOrderToWhatsApp() {
  if (!window.confirmedOrderData) {
    alert('❌ Erro: Dados do pedido não disponíveis');
    return;
  }
  
  const orderData = window.confirmedOrderData;
  console.log('📱 Enviando pedido para WhatsApp:', orderData);
  
  // Construir mensagem formatada detalhada
  let message = '🎉 *NOVO PEDIDO CONFIRMADO*\n';
  message += '_Cia de Condimentos e Especiarias_\n\n';
  
  message += '─ *INFORMAÇÕES DO CLIENTE* ─\n';
  // Verificar nome do cliente em várias possibilidades
  const clientName = (orderData.customer_name || orderData.customerName || localStorage.getItem('lastCustomerName') || 'Cliente');
  message += '👤 *Nome:* ' + clientName + '\n';
  if (orderData.customer_phone) {
    message += '📞 *Telefone:* ' + orderData.customer_phone + '\n';
  }
  if (orderData.customer_email) {
    message += '📧 *E-mail:* ' + orderData.customer_email + '\n';
  }
  
  message += '\n─ *DETALHES DO PEDIDO* ─\n';
  message += '📋 *Número do Pedido:* ' + (orderData.order_id || 'N/A') + '\n';
  message += '🕐 *Data/Hora:* ' + new Date().toLocaleString('pt-BR') + '\n';
  
  // Adicionar itens do pedido com formato compacto
  if (orderData.items && orderData.items.length > 0) {
    message += '\n─ *ITENS DO PEDIDO* ─\n';
    const itemsFormatted = orderData.items.map(function(item) {
      const priceFormatted = parseFloat(item.price).toFixed(2).replace('.', ',');
      const quantity = item.quantity || item.qty || 1;
      return item.name + ' R$ ' + priceFormatted + ' ' + quantity + 'x';
    }).join(' - ');
    message += itemsFormatted + '\n';
  }
  
  message += '\n─ *RESUMO FINANCEIRO* ─\n';
  message += '💰 *Valor Total:* R$ ' + (parseFloat(orderData.amount) || 0).toFixed(2).replace('.', ',') + '\n';
  message += '💳 *Forma de Pagamento:* ' + (orderData.payment_method || 'PIX') + '\n';
  
  // Adicionar informação de troco se for dinheiro com troco
  const paymentMethod = (orderData.payment_method || 'PIX').toLowerCase();
  if (paymentMethod === 'dinheiro' && orderData.changeAmount > 0) {
    message += '💵 *Valor Pago:* R$ ' + (parseFloat(orderData.paidAmount) || 0).toFixed(2).replace('.', ',') + '\n';
    message += '🔄 *Troco:* R$ ' + (parseFloat(orderData.changeAmount) || 0).toFixed(2).replace('.', ',') + '\n';
  }
  
  // Adicionar endereço se disponível
  if (orderData.address || orderData.city || orderData.state) {
    message += '\n─ *ENDEREÇO DE ENTREGA* ─\n';
    if (orderData.address) {
      message += '📍 *Endereço:* ' + orderData.address + '\n';
    }
    if (orderData.city) {
      message += '🏙️ *Cidade:* ' + orderData.city;
      if (orderData.state) {
        message += ', ' + orderData.state;
      }
      message += '\n';
    }
  }
  
  // Adicionar nota especial/observações se existir
  if (orderData.notes) {
    message += '\n─ *OBSERVAÇÕES/PEDIDOS ESPECIAIS* ─\n';
    message += '📝 ' + orderData.notes + '\n';
  }
  
  message += '\n─ *STATUS DO PEDIDO* ─\n';
  // Determinar status baseado no método de pagamento
  if (paymentMethod === 'dinheiro' || paymentMethod === 'cartão') {
    message += '✅ *Status Atual:* Pagamento na entrega\n';
  } else {
    message += '✅ *Status Atual:* Pagamento confirmado\n';
  }
  
  message += '\n_Obrigado pela sua compra! 🙏_\n';
  message += '_Mensagem enviada automaticamente pelo sistema da Cia de Condimentos_';
  
  console.log('📤 Mensagem construída:\n', message);
  
  // Número do WhatsApp da loja - ATUALIZADO
  const storeWhatsAppNumber = '5581997364190'; // +55 81 99736-4190
  
  // Codificar a mensagem para URL
  const encodedMessage = encodeURIComponent(message);
  
  // URL do WhatsApp Web ou App
  const whatsappURL = 'https://wa.me/' + storeWhatsAppNumber + '?text=' + encodedMessage;
  
  console.log('🔗 URL do WhatsApp:', whatsappURL);
  
  // Abrir em nova aba
  window.open(whatsappURL, '_blank');
  
  alert('✅ WhatsApp aberto! A mensagem do seu pedido foi preparada e pode ser enviada.');
}

// ==================== MAIN SEARCH BAR ====================
function handleMainSearch(searchTerm) {
  const resultsContainer = document.getElementById('mainSearchResults');
  if (!resultsContainer) return;
  
  const term = searchTerm.toLowerCase().trim();
  
  // Se vazio, limpar resultados
  if (!term) {
    resultsContainer.classList.remove('active');
    resultsContainer.innerHTML = '';
    return;
  }
  
  getProducts().then(function(products) {
    // Filtrar produtos ativos que correspondem à busca
    const filtered = products.filter(function(p) {
      return p.active && (
        p.name.toLowerCase().indexOf(term) !== -1 ||
        (p.description || '').toLowerCase().indexOf(term) !== -1 ||
        (p.category || '').toLowerCase().indexOf(term) !== -1
      );
    }).slice(0, 8); // Limitar a 8 resultados
    
    if (filtered.length === 0) {
      resultsContainer.innerHTML = '<div class="search-results-empty">Nenhum produto encontrado para "' + searchTerm + '"</div>';
      resultsContainer.classList.add('active');
      return;
    }
    
    // Renderizar resultados
    const html = filtered.map(function(p) {
      const imageUrl = p.image_url || ((p.images && p.images.length > 0) ? getImageUrl(p.images[0]) : p.image);
      const imgHtml = imageUrl
        ? '<img src="' + imageUrl + '" alt="' + p.name + '">'
        : '<div style="font-size: 20px;">🌶️</div>';
      
      return '<div class="search-result-item" onclick="selectSearchResult(' + p.id + ', ' + JSON.stringify(p).replace(/"/g, '&quot;') + ')">' +
        '<div class="search-result-img">' + imgHtml + '</div>' +
        '<div class="search-result-info">' +
          '<div class="search-result-name">' + p.name + '</div>' +
          '<div class="search-result-price">R$ ' + p.price.toFixed(2).replace('.', ',') + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
    
    resultsContainer.innerHTML = html;
    resultsContainer.classList.add('active');
  });
}

function selectSearchResult(productId, product) {
  closeMainSearch();
  if (product && product.id === productId) {
    openProductDetail(product);
  }
}

function closeMainSearch() {
  const resultsContainer = document.getElementById('mainSearchResults');
  if (resultsContainer) {
    resultsContainer.classList.remove('active');
  }
  const input = document.getElementById('mainSearchInput');
  if (input) {
    input.value = '';
  }
}

// Fechar resultados da busca quando clicar fora
document.addEventListener('click', function(event) {
  const searchSection = document.querySelector('.search-section');
  const resultsContainer = document.getElementById('mainSearchResults');
  
  if (searchSection && resultsContainer) {
    if (!searchSection.contains(event.target)) {
      resultsContainer.classList.remove('active');
    }
  }
});

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
  
  // Event listeners para modais de dinheiro
  var moneyConfirmModal = document.getElementById('moneyConfirmModal');
  if (moneyConfirmModal) {
    moneyConfirmModal.addEventListener('click', function(e) {
      if (e.target === moneyConfirmModal) {
        console.log('Clique no overlay de moneyConfirmModal detectado');
        goBackToPaymentMethod();
      }
    });
  }
  
  var exactMoneyConfirmModal = document.getElementById('exactMoneyConfirmModal');
  if (exactMoneyConfirmModal) {
    exactMoneyConfirmModal.addEventListener('click', function(e) {
      if (e.target === exactMoneyConfirmModal) {
        console.log('Clique no overlay de exactMoneyConfirmModal detectado');
        backToMoneyOptions();
      }
    });
  }
  
  var changeMoneyModal = document.getElementById('changeMoneyModal');
  if (changeMoneyModal) {
    changeMoneyModal.addEventListener('click', function(e) {
      if (e.target === changeMoneyModal) {
        console.log('Clique no overlay de changeMoneyModal detectado');
        backToMoneyOptions();
      }
    });
  }
});
