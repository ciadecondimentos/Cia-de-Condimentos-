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

// Variáveis para polling de pagamento
let paymentPollingInterval = null;
let paymentPollingData = null;
let paymentPollingTimeout = null;
let paymentPollingAttempts = 0;
let paymentPollingFailures = 0;
let paymentPollingStartTime = null;
let paymentPollingInterval_ms = 2000; // Começa a cada 2s, pode aumentar com backoff

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
  if (!selectedPaymentMethod || !pendingCheckoutData) {
    alert('Erro ao processar pagamento');
    return;
  }
  
  pendingCheckoutData.payment = selectedPaymentMethod;
  pendingCheckoutData.paymentType = type;
  
  console.log('Enviando pedido Dinheiro:', JSON.stringify(pendingCheckoutData, null, 2));
  
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
    var message = type === 'exact' 
      ? 'Pedido criado! ID: ' + data.id + '\n\nPagamento exato na entrega.'
      : 'Pedido criado! ID: ' + data.id + '\n\nO entregador está preparado para dar troco.';
    alert(message);
    cart = [];
    updateCartBadge();
    cancelCheckoutProcess();
  })
  .catch(function(error) {
    console.error('Error creating order:', error);
    alert('Erro ao criar pedido:\n' + error.message);
  });
}

function confirmCardPayment() {
  if (!selectedPaymentMethod || !pendingCheckoutData) {
    alert('Erro ao processar pagamento');
    return;
  }
  
  pendingCheckoutData.payment = selectedPaymentMethod;
  
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
    alert('Pagamento processado com sucesso!\n\nPedido ID: ' + data.id + '\n\nObrigado pela compra!');
    cart = [];
    updateCartBadge();
    cancelCheckoutProcess();
  })
  .catch(function(error) {
    console.error('Error creating order:', error);
    alert('Erro ao processar o pagamento:\n' + error.message);
  });
}

function confirmPixPayment() {
  if (!selectedPaymentMethod || !pendingCheckoutData) {
    alert('Erro ao processar pagamento');
    return;
  }
  
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
    
    // ✅ Modal de QR Code permanece aberto enquanto polling acontece
    // showWaitingForPaymentModal(); // REMOVIDO: mantém o modal de PIX visível
  })
  .catch(function(error) {
    console.error('Erro no fluxo PIX:', error);
    if (pixQrCode) pixQrCode.innerHTML = '❌ Erro ao processar: ' + error.message;
    if (pixCode) pixCode.textContent = 'Erro: ' + error.message;
    alert('Erro ao processar PIX:\n' + error.message);
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
        amount: orderData.total || (paymentPollingData ? paymentPollingData.amount : 0)
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
  
  // Mostrar modal de confirmação
  if (modal) {
    console.log('   Exibindo modal de confirmação...');
    modal.classList.add('open');
    // Garantir que apareça com display block
    modal.style.display = 'flex';
    
    // Auto-fechar após 5 segundos (usuário pode clicar antes)
    setTimeout(function() {
      if (modal && modal.classList.contains('open')) {
        console.log('   Auto-fechando modal após 5 segundos...');
        closePaymentConfirmedModal();
      }
    }, 5000);
  } else {
    console.error('❌ Elemento da modal não encontrado!');
  }
}

function createPaymentConfirmedModal() {
  if (document.getElementById('paymentConfirmedModal')) {
    return;
  }
  
  var html = '<div id="paymentConfirmedModal" class="modal" style="display: none;">' +
    '<div class="modal-overlay"></div>' +
    '<div class="modal-content" style="max-width: 90%; max-height: 90vh; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">' +
      '<div style="background: linear-gradient(135deg, #27a745 0%, #20c997 100%); color: white; padding: 40px 24px; text-align: center; border-radius: 12px 12px 0 0;">' +
        '<div style="font-size: 80px; margin-bottom: 16px; animation: bounce 0.6s ease-in-out;">✅</div>' +
        '<h1 style="margin: 0; font-size: 28px; font-weight: 900;">Pagamento Confirmado!</h1>' +
        '<p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.95;">Seu PIX foi processado com sucesso</p>' +
      '</div>' +
      '<div style="padding: 32px 24px; text-align: center; background: white;">' +
        '<div style="margin-bottom: 24px;">' +
          '<p style="margin: 0 0 8px 0; font-size: 14px; color: #666; font-weight: 600;">NÚMERO DO PEDIDO</p>' +
          '<p style="margin: 0; font-size: 28px; font-weight: 900; color: var(--marrom);" id="confirmedOrderId">-</p>' +
        '</div>' +
        '<div style="margin-bottom: 24px; padding: 16px; background: #f8f9fa; border-radius: 8px;">' +
          '<p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">Valor Pago:</p>' +
          '<p style="margin: 0; font-size: 24px; font-weight: 900; color: var(--verde);" id="confirmedAmount">R$ 0,00</p>' +
        '</div>' +
        '<p style="margin: 0 0 16px 0; font-size: 14px; color: #666;">' +
          '✓ Pagamento recebido com sucesso<br>' +
          '✓ Seu pedido está sendo preparado<br>' +
          '✓ Você receberá atualizações em breve' +
        '</p>' +
        '<div style="background: #e8f5e9; padding: 12px; border-radius: 8px; margin: 16px 0; border-left: 4px solid var(--verde);">' +
          '<small style="color: #2e7d32;">🎉 Obrigado pela sua compra na Cia de Condimentos!</small>' +
        '</div>' +
        '<button onclick="closePaymentConfirmedModal()" style="background: var(--verde); color: white; border: none; padding: 14px 32px; border-radius: 6px; cursor: pointer; font-weight: 900; font-size: 16px; margin-top: 16px; width: 100%; letter-spacing: 0.5px;">' +
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
      amount: paymentPollingData.amount
    });
  })
  .catch(function(error) {
    console.error('❌ Erro ao confirmar:', error);
    alert('❌ Erro: ' + error.message);
  });
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
