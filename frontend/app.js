'use strict';

const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000/api'
  : 'https://cia-de-condimentos.onrender.com/api';

const BACKEND_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'
  : 'https://cia-de-condimentos.onrender.com';

// Resolver URL de imagem relativa para absoluta
function getImageUrl(imageUrl) {
  if (!imageUrl) return '';
  // Se for URL absoluta, retorna como está
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  // Se for URL relativa, usa a base do backend
  return BACKEND_BASE + imageUrl;
}

let cart = [];
let currentFilter = 'all';
let currentSearch = '';

/* ════════════════════════════════════
   INICIALIZACAO — todos os listeners
   ════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function() {

  function safeListener(id, event, fn) {
    var el = document.getElementById(id);
    if (el) { el.addEventListener(event, fn); }
    else { console.warn('Elemento nao encontrado: #' + id); }
  }

  // Abrir carrinho
  safeListener('openCartBtn', 'click', openCart);
  safeListener('floatingCartBtn', 'click', openCart);

  // Fechar carrinho
  safeListener('cartCloseBtn', 'click', closeCart);
  safeListener('cartOverlay',  'click', closeCart);

  // Botao Finalizar Compra
  safeListener('checkoutBtn', 'click', openCheckout);

  // Fechar modal de checkout
  safeListener('closeCheckoutBtn', 'click', closeCheckout);
  var checkoutModal = document.getElementById('checkoutModal');
  if (checkoutModal) {
    checkoutModal.addEventListener('click', function(e) {
      if (e.target === this) closeCheckout();
    });
  }

  // Fechar modal de confirmação de pagamento
  var paymentConfirmationModal = document.getElementById('paymentConfirmationModal');
  if (paymentConfirmationModal) {
    paymentConfirmationModal.addEventListener('click', function(e) {
      if (e.target === this) closePaymentConfirmation();
    });
  }
  
  // Fechar modal de detalhes do produto
  var productDetailModal = document.getElementById('productDetailModal');
  if (productDetailModal) {
    productDetailModal.addEventListener('click', function(e) {
      if (e.target === this) closeProductDetail();
    });
  }

  renderProducts();
});

/* ════════════════════════════════════
   CARRINHO
   ════════════════════════════════════ */
function openCart() {
  var sidebar = document.getElementById('cartSidebar');
  var overlay = document.getElementById('cartOverlay');
  if (!sidebar || !overlay) { console.error('Elementos do carrinho nao encontrados'); return; }
  sidebar.classList.add('open');
  overlay.classList.add('open');
  
  // Esconder o botão flutuante quando o carrinho abre
  var floatingBtn = document.getElementById('floatingCartBtn');
  if (floatingBtn) floatingBtn.style.display = 'none';
  
  renderCartItems();
}

function closeCart() {
  var sidebar = document.getElementById('cartSidebar');
  var overlay = document.getElementById('cartOverlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  
  // Mostrar o botão flutuante quando o carrinho fecha
  var floatingBtn = document.getElementById('floatingCartBtn');
  if (floatingBtn) floatingBtn.style.display = 'flex';
}

function addToCart(productId) {
  var existing = cart.find(function(i) { return i.id === productId; });
  if (existing) { existing.qty++; } else { cart.push({ id: productId, qty: 1 }); }
  updateCartBadge();
  renderCartItems();
  showToast('Produto adicionado ao carrinho!');
}

function updateCartBadge() {
  var quantity = cart.reduce(function(s, i) { return s + i.qty; }, 0);
  
  // Update top cart badge
  var badge = document.getElementById('cartBadge');
  if (badge) badge.textContent = quantity;
  
  // Update floating cart badge
  var floatingBadge = document.getElementById('floatingCartBadge');
  if (floatingBadge) {
    floatingBadge.textContent = quantity;
    floatingBadge.style.display = quantity > 0 ? 'flex' : 'none';
  }
}

function changeQty(productId, delta) {
  var item = cart.find(function(i) { return i.id === productId; });
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(function(i) { return i.id !== productId; });
  updateCartBadge();
  renderCartItems();
}

function removeFromCart(productId) {
  cart = cart.filter(function(i) { return i.id !== productId; });
  updateCartBadge();
  renderCartItems();
}

function renderCartItems() {
  var container = document.getElementById('cartItems');
  var totalEl   = document.getElementById('cartTotal');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = '<div class="empty-cart"><div class="icon">&#x1F6D2;</div><p>Seu carrinho est&#xE1; vazio</p></div>';
    if (totalEl) totalEl.textContent = 'R$ 0,00';
    return;
  }

  getProducts().then(function(products) {
    var total = 0;
    container.innerHTML = cart.map(function(item) {
      var p = products.find(function(x) { return x.id === item.id; });
      if (!p) return '';
      var subtotal = p.price * item.qty;
      total += subtotal;
      var imgHtml = p.image
        ? '<img src="' + p.image + '" alt="' + p.name + '" onerror="this.parentElement.innerHTML=\'&#x1F336;&#xFE0F;\'">'
        : '&#x1F336;&#xFE0F;';
      return '<div class="cart-item">' +
        '<div class="cart-item-img">' + imgHtml + '</div>' +
        '<div class="cart-item-info">' +
          '<div class="cart-item-name">' + p.name + '</div>' +
          '<div class="cart-item-price">R$ ' + subtotal.toFixed(2).replace('.', ',') + '</div>' +
          '<div class="qty-controls">' +
            '<button class="qty-btn" onclick="changeQty(' + p.id + ', -1)">&#x2212;</button>' +
            '<span class="qty-val">' + item.qty + '</span>' +
            '<button class="qty-btn" onclick="changeQty(' + p.id + ', 1)">+</button>' +
            '<button class="remove-btn" onclick="removeFromCart(' + p.id + ')">&#x1F5D1;</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
    if (totalEl) totalEl.textContent = 'R$ ' + total.toFixed(2).replace('.', ',');
  });
}

/* ════════════════════════════════════
   CHECKOUT
   ════════════════════════════════════ */
function openCheckout() {
  if (cart.length === 0) {
    showToast('Seu carrinho est\u00E1 vazio!');
    return;
  }

  var modal = document.getElementById('checkoutModal');
  var body  = document.getElementById('checkoutBody');
  if (!modal || !body) {
    console.error('Modal de checkout nao encontrado no DOM');
    return;
  }

  getProducts().then(function(products) {
    var total = 0;
    var itemsHtml = cart.map(function(item) {
      var p = products.find(function(x) { return x.id === item.id; });
      if (!p) return '';
      var subtotal = p.price * item.qty;
      total += subtotal;
      return '<div class="order-summary-item">' +
        '<span>' + p.name + ' <strong>x' + item.qty + '</strong></span>' +
        '<span>R$ ' + subtotal.toFixed(2).replace('.', ',') + '</span>' +
        '</div>';
    }).join('');

    body.innerHTML =
      '<div class="order-summary">' +
        itemsHtml +
        '<div class="order-total-row"><span>Total</span><span>R$ ' + total.toFixed(2).replace('.', ',') + '</span></div>' +
      '</div>' +
      '<div class="form-group"><label>Nome Completo *</label><input type="text" id="checkoutName" placeholder="Seu nome completo" autocomplete="name"></div>' +
      '<div class="form-group"><label>Telefone / WhatsApp *</label><input type="tel" id="checkoutPhone" placeholder="(81) 9 XXXX-XXXX" oninput="maskPhone(this)" autocomplete="tel"></div>' +
      '<div class="form-group"><label>Endere\u00E7o de Entrega *</label><input type="text" id="checkoutAddress" placeholder="Rua, n\u00FAmero, bairro, cidade" autocomplete="street-address"></div>' +
      '<div class="form-group"><label>Observa\u00E7\u00F5es</label><input type="text" id="checkoutObs" placeholder="Instru\u00E7\u00F5es especiais..."></div>' +
      '<button class="submit-order-btn" id="submitOrderBtn">Escolher Forma de Pagamento</button>';

    // 1. Fechar carrinho
    closeCart();

    // 2. Abrir modal (z-index 400 garante que fica sobre tudo)
    modal.classList.add('open');

    // 3. Attach no botao de envio sempre fresco (innerHTML recriou o elemento)
    var submitBtn = document.getElementById('submitOrderBtn');
    if (submitBtn) {
      submitBtn.addEventListener('click', choosePaymentMethod);
    }
  });
}

function closeCheckout() {
  document.getElementById('checkoutModal').classList.remove('open');
}

function choosePaymentMethod() {
  var name    = (document.getElementById('checkoutName') || {}).value;
  var phone   = (document.getElementById('checkoutPhone') || {}).value;
  var address = (document.getElementById('checkoutAddress') || {}).value;

  if (!name || !phone || !address) {
    showToast('Preencha todos os campos obrigatorios!');
    return;
  }

  // Guardar dados do cliente em variavel global (para usar depois)
  window.checkoutData = {
    name: name,
    phone: phone,
    address: address,
    obs: (document.getElementById('checkoutObs') || {}).value || ''
  };

  // Mostrar opcoes de pagamento
  var body = document.getElementById('checkoutBody');
  if (!body) return;

  body.innerHTML = 
    '<div style="text-align: center; margin-bottom: 24px;">' +
      '<h3 style="color: var(--marrom); font-family: Playfair Display, serif; font-size: 20px;">Escolha a Forma de Pagamento</h3>' +
    '</div>' +
    '<div class="payment-methods-container">' +
      '<div class="payment-method-card" onclick="selectPaymentMethod(\'pix\')">' +
        '<div class="payment-method-icon">🔐</div>' +
        '<div class="payment-method-name">PIX</div>' +
      '</div>' +
      '<div class="payment-method-card" onclick="selectPaymentMethod(\'dinheiro\')">' +
        '<div class="payment-method-icon">💵</div>' +
        '<div class="payment-method-name">Dinheiro</div>' +
      '</div>' +
      '<div class="payment-method-card" onclick="selectPaymentMethod(\'cartao\')">' +
        '<div class="payment-method-icon">💳</div>' +
        '<div class="payment-method-name">Cartão</div>' +
      '</div>' +
    '</div>';
}

function selectPaymentMethod(method) {
  var messages = {
    'pix': '💳 Você deseja pagar com PIX? O código QR será gerado e você terá 3 minutos para confirmar o pagamento.',
    'cartao': '💳 Você deseja pagar com cartão? O pagamento será finalizado presencialmente na entrega.',
    'dinheiro': '💵 Você deseja pagar em dinheiro? O pagamento será feito na entrega.'
  };
  
  window.pendingPaymentMethod = method;
  
  var messageEl = document.getElementById('paymentConfirmationMessage');
  if (messageEl) {
    messageEl.textContent = messages[method] || 'Confirmar este método de pagamento?';
  }
  
  var modal = document.getElementById('paymentConfirmationModal');
  if (modal) modal.style.display = 'flex';
}

function closePaymentConfirmation() {
  var modal = document.getElementById('paymentConfirmationModal');
  if (modal) modal.style.display = 'none';
  window.pendingPaymentMethod = null;
}

function backToPaymentSelection() {
  // Fecha a confirmação e volta ao menu de escolha de pagamento
  closePaymentConfirmation();
  showPaymentMethodsMenu();
}

function cancelCheckoutProcess() {
  // Fecha a confirmação, limpa dados e volta ao carrinho
  closePaymentConfirmation();
  
  // Limpar dados do checkout
  window.checkoutData = null;
  window.pendingPaymentMethod = null;
  
  // Fechar modal de checkout
  var checkoutModal = document.getElementById('checkoutModal');
  if (checkoutModal) {
    checkoutModal.classList.remove('open');
    checkoutModal.style.display = 'none';
  }
  
  var checkoutBody = document.getElementById('checkoutBody');
  if (checkoutBody) checkoutBody.innerHTML = '';
  
  // Mostrar toast
  showToast('❌ Pedido cancelado');
  
  // Abrir carrinho
  openCart();
}

function confirmPaymentMethod() {
  var method = window.pendingPaymentMethod;
  closePaymentConfirmation();
  
  if (method === 'cartao') {
    showCardConfirmation();
  } else if (method === 'pix') {
    submitOrderWithPixPayment();
  } else if (method === 'dinheiro') {
    showMoneyConfirmation();
  }
}

function showCardConfirmation() {
  var confirmationHtml = 
    '<div style="text-align: center; padding: 40px 20px;">' +
      '<h3 style="color: var(--marrom); font-family: Playfair Display, serif; font-size: 22px; margin-bottom: 24px;">Você confirma o pagamento com cartão?</h3>' +
      '<div style="display: flex; gap: 16px; justify-content: center;">' +
        '<button onclick="confirmCardPayment()" style="background: var(--vermelho); color: white; border: none; padding: 16px 48px; font-weight: 900; cursor: pointer; border-radius: 4px; font-size: 16px; letter-spacing: 1px;">Confirmar</button>' +
        '<button onclick="cancelCardPayment()" style="background: #ccc; color: var(--marrom); border: none; padding: 16px 48px; font-weight: 900; cursor: pointer; border-radius: 4px; font-size: 16px; letter-spacing: 1px;">Cancelar</button>' +
      '</div>' +
    '</div>';
  
  var body = document.getElementById('checkoutBody');
  if (body) {
    body.innerHTML = confirmationHtml;
  }
}

function confirmCardPayment() {
  submitOrderWithCardPayment();
}

function cancelCardPayment() {
  // Voltar para tela de escolha de pagamento
  choosePaymentMethod();
}

function showMoneyConfirmation() {
  // Calcular total do pedido
  getProducts().then(function(products) {
    var total = 0;
    cart.forEach(function(item) {
      var p = products.find(function(x) { return x.id === item.id; });
      if (p) total += p.price * item.qty;
    });

    var confirmationHtml = 
      '<div style="text-align: center; padding: 60px 30px; background: #faf7f2; border-radius: 12px; max-width: 500px; margin: 0 auto;">' +
        '<div style="font-size: 56px; margin-bottom: 20px;">💵</div>' +
        '<h2 style="color: var(--vermelho); font-family: Playfair Display, serif; font-size: 36px; font-weight: 900; margin-bottom: 12px; letter-spacing: 1px;">Pagamento em Dinheiro</h2>' +
        '<p style="color: #666; font-size: 15px; margin-bottom: 8px; line-height: 1.6;">O pagamento será feito na entrega.</p>' +
        '<p style="color: #999; font-size: 13px; margin-bottom: 40px;">Você receberá contato em breve para confirmar a data e hora.</p>' +
        
        '<div style="background: #faf7f2; border: 3px solid var(--amarelo); padding: 30px; border-radius: 12px; margin-bottom: 40px; text-align: left; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">' +
          '<div style="font-size: 13px; color: #999; text-transform: uppercase; letter-spacing: 2px; font-weight: 700; margin-bottom: 12px;">💰 Valor Total</div>' +
          '<div style="font-size: 44px; font-weight: 900; color: var(--vermelho); margin-bottom: 32px; font-family: Playfair Display, serif; letter-spacing: 1px;">R$ ' + total.toFixed(2).replace('.', ',') + '</div>' +
          
          '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 28px;">' +
            '<button onclick="selectPaymentType(\'exact\', ' + total + ')" id="btnExact" style="flex: 1; background: var(--amarelo); border: 3px solid var(--amarelo); color: var(--marrom); padding: 16px; font-weight: 900; cursor: pointer; border-radius: 8px; font-size: 15px; transition: all 0.3s; letter-spacing: 1px; text-transform: uppercase; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">✓ Pagar Exato</button>' +
            '<button onclick="selectPaymentType(\'change\', ' + total + ')" id="btnChange" style="flex: 1; background: white; border: 3px solid #e0d8c8; color: var(--marrom); padding: 16px; font-weight: 900; cursor: pointer; border-radius: 8px; font-size: 15px; transition: all 0.3s; letter-spacing: 1px; text-transform: uppercase;">💵 Com Troco</button>' +
          '</div>' +
          
          '<div id="changePaymentSection" style="display: none; animation: slideDown 0.3s ease;">' +
            '<div style="font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; font-weight: 700;">Quanto você vai pagar?</div>' +
            '<input type="number" id="paymentAmountInput" placeholder="Digite o valor que vai pagar" step="0.01" min="' + total.toFixed(2) + '" onkeyup="calculateChange(' + total + ')" onchange="calculateChange(' + total + ')" style="width: 100%; padding: 16px; font-size: 16px; border: 2px solid var(--amarelo); border-radius: 8px; margin-bottom: 18px; box-sizing: border-box; font-weight: 600; background: white;">' +
            
            '<div id="changeDisplay" style="display: none; background: #f0fff4; padding: 18px; border-radius: 8px; border-left: 5px solid #27ae60; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(39, 174, 96, 0.1);">' +
              '<div style="font-size: 11px; color: #27ae60; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; font-weight: 700;">🪙 Troco</div>' +
              '<div style="font-size: 32px; font-weight: 900; color: #27ae60; font-family: Playfair Display, serif;" id="changeValue">R$ 0,00</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        
        '<div style="display: flex; gap: 14px; justify-content: center;">' +
          '<button onclick="submitOrderWithMoneyPayment()" style="background: var(--vermelho); color: white; border: none; padding: 18px 56px; font-weight: 900; cursor: pointer; border-radius: 8px; font-size: 16px; letter-spacing: 2px; text-transform: uppercase; transition: all 0.3s; box-shadow: 0 4px 12px rgba(192, 57, 43, 0.3); hover: transform: translateY(-2px);">Confirmar</button>' +
          '<button onclick="cancelCardPayment()" style="background: #ddd; color: var(--marrom); border: none; padding: 18px 56px; font-weight: 900; cursor: pointer; border-radius: 8px; font-size: 16px; letter-spacing: 2px; text-transform: uppercase; transition: all 0.3s;">Cancelar</button>' +
        '</div>' +
      '</div>' +
      
      '<style>' +
        '@keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }' +
      '</style>';
    
    var body = document.getElementById('checkoutBody');
    if (body) {
      body.innerHTML = confirmationHtml;
      // Guardar total para uso posterior
      window.moneyPaymentTotal = total;
      window.moneyPaymentType = 'exact'; // Por padrão: pagar exato
      
      // Selecionar "Pagar Exato" por padrão
      selectPaymentType('exact', total);
    }
  });
}

function selectPaymentType(type, total) {
  window.moneyPaymentType = type;
  
  var btnExact = document.getElementById('btnExact');
  var btnChange = document.getElementById('btnChange');
  var changeSection = document.getElementById('changePaymentSection');
  var paymentInput = document.getElementById('paymentAmountInput');
  
  // Reset inputs
  if (paymentInput) paymentInput.value = '';
  
  if (type === 'exact') {
    // Pagar exato
    if (btnExact) {
      btnExact.style.background = 'var(--amarelo)';
      btnExact.style.borderColor = 'var(--amarelo)';
      btnExact.style.color = 'var(--marrom)';
      btnExact.style.boxShadow = '0 4px 12px rgba(245, 197, 24, 0.3)';
      btnExact.style.transform = 'scale(1.02)';
    }
    if (btnChange) {
      btnChange.style.background = 'white';
      btnChange.style.borderColor = '#e0d8c8';
      btnChange.style.color = 'var(--marrom)';
      btnChange.style.boxShadow = 'none';
      btnChange.style.transform = 'scale(1)';
    }
    if (changeSection) changeSection.style.display = 'none';
  } else {
    // Com troco
    if (btnChange) {
      btnChange.style.background = 'var(--vermelho)';
      btnChange.style.borderColor = 'var(--vermelho)';
      btnChange.style.color = 'white';
      btnChange.style.boxShadow = '0 4px 12px rgba(192, 57, 43, 0.3)';
      btnChange.style.transform = 'scale(1.02)';
    }
    if (btnExact) {
      btnExact.style.background = 'white';
      btnExact.style.borderColor = '#e0d8c8';
      btnExact.style.color = 'var(--marrom)';
      btnExact.style.boxShadow = 'none';
      btnExact.style.transform = 'scale(1)';
    }
    if (changeSection) changeSection.style.display = 'block';
    if (paymentInput) paymentInput.focus();
  }
}

function calculateChange(total) {
  var paymentInput = document.getElementById('paymentAmountInput');
  var paymentAmount = parseFloat(paymentInput.value) || 0;
  var changeDisplay = document.getElementById('changeDisplay');
  var changeValue = document.getElementById('changeValue');
  
  if (paymentAmount > 0) {
    var change = paymentAmount - total;
    if (change >= 0) {
      changeDisplay.style.display = 'block';
      changeValue.textContent = 'R$ ' + change.toFixed(2).replace('.', ',');
      window.moneyChange = change;
    } else {
      changeDisplay.style.display = 'none';
      paymentInput.value = '';
    }
  } else {
    changeDisplay.style.display = 'none';
    window.moneyChange = 0;
  }
}

function submitOrderWithMoneyPayment() {
  var name = window.checkoutData.name;
  var phone = window.checkoutData.phone;
  var address = window.checkoutData.address;
  var obs = window.checkoutData.obs;
  var paymentType = window.moneyPaymentType || 'exact';
  var paymentAmountInput = document.getElementById('paymentAmountInput');
  var moneyChange = window.moneyChange || 0;
  var paymentAmount = paymentType === 'exact' ? 0 : (parseFloat(paymentAmountInput?.value) || 0);

  // Validar se foi preenchido corretamente
  if (paymentType === 'change' && (!paymentAmount || paymentAmount < window.moneyPaymentTotal)) {
    showToast('❌ Digite um valor igual ou maior que o total do pedido');
    return;
  }

  getProducts().then(function(products) {
    var total = 0;
    var orderItems = cart.map(function(item) {
      var p = products.find(function(x) { return x.id === item.id; });
      if (!p) return null;
      var subtotal = p.price * item.qty;
      total += subtotal;
      return { id: item.id, qty: item.qty, price: p.price, name: p.name };
    }).filter(Boolean);

    var orderData = {
      customer: { name: name, phone: phone, address: address },
      items: orderItems,
      subtotal: total,
      frete: 0,
      total: total,
      payment: 'Dinheiro',
      moneyPaymentDetails: {
        paymentType: paymentType,
        paymentAmount: paymentType === 'exact' ? total : paymentAmount,
        change: moneyChange
      },
      status: 'Pendente',
      paymentStatus: 'Pendente'
    };

    fetch(API_URL + '/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    })
    .then(function(response) {
      if (!response.ok) throw new Error('Erro ao salvar pedido');
      return response.json();
    })
    .then(function(orderResult) {
      var lines = orderItems.map(function(item) {
        return '• ' + item.name + ' x' + item.qty + ' = R$ ' + (item.price * item.qty).toFixed(2).replace('.', ',');
      }).join('\n');

      var paymentInfo = '';
      if (paymentType === 'exact') {
        paymentInfo = '💵 *Pagamento:* Exatamente R$ ' + total.toFixed(2).replace('.', ',');
      } else if (paymentAmount > 0) {
        paymentInfo = '💵 *Pagamento:* R$ ' + paymentAmount.toFixed(2).replace('.', ',') + '\n' +
                     '🪙 *Troco:* R$ ' + moneyChange.toFixed(2).replace('.', ',');
      } else {
        paymentInfo = '💵 *Pagamento:* A confirmar';
      }

      var whatsappMsg = '🌶️ *PEDIDO - PAGAMENTO EM DINHEIRO*\n\n' +
        '👤 *Cliente:* ' + name + '\n' +
        '📱 *Telefone:* ' + phone + '\n' +
        '📍 *Endereço:* ' + address + '\n' +
        (obs ? '📝 *Obs:* ' + obs + '\n' : '') +
        '\n*Itens:*\n' + lines + '\n\n' +
        '💰 *Total: R$ ' + total.toFixed(2).replace('.', ',') + '*\n' +
        paymentInfo + '\n\n' +
        '*Pedido #' + orderResult.id + '*';

      showOrderSuccess(orderResult.id, whatsappMsg);
      cart = [];
      updateCartBadge();
    })
    .catch(function(error) {
      showToast('Erro: ' + error.message);
    });
  });
}

function submitOrderWithCardPayment() {
  var btn = document.getElementById('checkoutBody');
  var name = window.checkoutData.name;
  var phone = window.checkoutData.phone;
  var address = window.checkoutData.address;
  var obs = window.checkoutData.obs;

  if (btn) { 
    var buttons = btn.querySelectorAll('button');
    buttons.forEach(function(b) { b.disabled = true; });
  }

  getProducts().then(function(products) {
    var total = 0;
    var orderItems = cart.map(function(item) {
      var p = products.find(function(x) { return x.id === item.id; });
      if (!p) return null;
      var subtotal = p.price * item.qty;
      total += subtotal;
      return { id: item.id, qty: item.qty, price: p.price, name: p.name };
    }).filter(Boolean);

    if (orderItems.length === 0) {
      showToast('Erro: Nenhum produto válido no carrinho');
      if (btn) { 
        var buttons = btn.querySelectorAll('button');
        buttons.forEach(function(b) { b.disabled = false; });
      }
      return;
    }

    var orderData = {
      customer: { name: name, phone: phone, address: address },
      items: orderItems,
      subtotal: total,
      frete: 0,
      total: total,
      payment: 'Cartão',
      status: 'Pendente',
      paymentStatus: 'Pendente'
    };

    fetch(API_URL + '/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    })
    .then(function(response) {
      if (!response.ok) {
        return response.json().catch(function() { return {}; }).then(function(err) {
          throw new Error(err.error || ('Erro ' + response.status + ' ao salvar pedido'));
        });
      }
      return response.json();
    })
    .then(function(orderResult) {
      var lines = orderItems.map(function(item) {
        return '• ' + item.name + ' x' + item.qty + ' = R$ ' + (item.price * item.qty).toFixed(2).replace('.', ',');
      }).join('\n');

      var whatsappMsg = '🌶️ *NOVO PEDIDO - Cia de Condimentos*\n\n' +
        '👤 *Cliente:* ' + name + '\n' +
        '📱 *Telefone:* ' + phone + '\n' +
        '📍 *Endereço:* ' + address + '\n' +
        (obs ? '📝 *Obs:* ' + obs + '\n' : '') +
        '\n*Itens:*\n' + lines + '\n\n' +
        '💰 *Total: R$ ' + total.toFixed(2).replace('.', ',') + '*\n\n' +
        '*Pedido #' + orderResult.id + '*';

      showOrderSuccess(orderResult.id, whatsappMsg);
      cart = [];
      updateCartBadge();
    })
    .catch(function(error) {
      console.error('Erro ao enviar pedido:', error);
      showToast('Erro: ' + error.message);
      if (btn) { 
        var buttons = btn.querySelectorAll('button');
        buttons.forEach(function(b) { b.disabled = false; });
      }
    });
  });
}

function showOrderSuccess(orderId, whatsappMsg) {
  var body = document.getElementById('checkoutBody');
  if (!body) return;

  var safeMsg = whatsappMsg
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '\\n');

  var successHtml = 
    '<div style="text-align: center; padding: 40px 20px;">' +
      '<div style="font-size: 48px; margin-bottom: 20px;">✓</div>' +
      '<h3 style="color: var(--vermelho); font-family: Playfair Display, serif; font-size: 24px; margin-bottom: 12px;">Pedido Finalizado com Sucesso!</h3>' +
      '<p style="color: #666; font-size: 16px; margin-bottom: 24px;">Número do Pedido:</p>' +
      '<div style="background: #fdf8ee; padding: 20px; border-radius: 8px; margin-bottom: 24px; border: 2px solid var(--amarelo);">' +
        '<p style="font-size: 32px; font-weight: 900; color: var(--vermelho);">#' + orderId + '</p>' +
      '</div>' +
      '<p style="color: #666; font-size: 14px; margin-bottom: 20px;"><em>Guarde este número para acompanhar seu pedido</em></p>' +
      '<button onclick="sendOrderViaWhatsapp(\'' + safeMsg + '\')" style="width: 100%; background: #25D366; color: white; border: none; padding: 16px; font-weight: 900; cursor: pointer; border-radius: 4px; font-size: 16px; letter-spacing: 1px; margin-bottom: 12px;">📱 Enviar Pedido pelo WhatsApp</button>' +
      '<p style="color: #999; font-size: 12px; margin-bottom: 12px;">(Opcional - para reforçar o pedido)</p>' +
      '<button onclick="finishCheckout()" style="width: 100%; background: var(--marrom); color: white; border: none; padding: 16px; font-weight: 700; cursor: pointer; border-radius: 4px; font-size: 16px; letter-spacing: 1px;">Finalizar</button>' +
    '</div>';

  body.innerHTML = successHtml;
}

function sendOrderViaWhatsapp(msg) {
  window.open('https://wa.me/5581971132776?text=' + encodeURIComponent(msg), '_blank');
}

function finishCheckout() {
  closeCheckout();
  showToast('Obrigado pela sua compra!');
}

function submitOrder() {
  var btn     = document.getElementById('submitOrderBtn');
  var name    = (document.getElementById('checkoutName') || {}).value;
  var phone   = (document.getElementById('checkoutPhone') || {}).value;
  var address = (document.getElementById('checkoutAddress') || {}).value;
  var obs     = (document.getElementById('checkoutObs') || {}).value;

  if (name) name = name.trim();
  if (phone) phone = phone.trim();
  if (address) address = address.trim();
  if (obs) obs = obs.trim();

  if (!name || !phone || !address) {
    showToast('Preencha todos os campos obrigat\u00F3rios!');
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

  getProducts().then(function(products) {
    var total = 0;
    var orderItems = cart.map(function(item) {
      var p = products.find(function(x) { return x.id === item.id; });
      if (!p) return null;
      var subtotal = p.price * item.qty;
      total += subtotal;
      return { id: item.id, qty: item.qty, price: p.price, name: p.name };
    }).filter(Boolean);

    if (orderItems.length === 0) {
      showToast('Erro: Nenhum produto v\u00E1lido no carrinho');
      if (btn) { btn.disabled = false; btn.textContent = 'Confirmar Pedido via WhatsApp'; }
      return;
    }

    var orderData = {
      customer: { name: name, phone: phone, address: address },
      items: orderItems,
      subtotal: total,
      frete: 0,
      total: total,
      payment: 'WhatsApp',
      status: 'Pendente',
      paymentStatus: 'Aguardando'
    };

    fetch(API_URL + '/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    })
    .then(function(response) {
      if (!response.ok) {
        return response.json().catch(function() { return {}; }).then(function(err) {
          throw new Error(err.error || ('Erro ' + response.status + ' ao salvar pedido'));
        });
      }
      return response.json();
    })
    .then(function(orderResult) {
      var lines = orderItems.map(function(item) {
        return '\u2022 ' + item.name + ' x' + item.qty + ' = R$ ' + (item.price * item.qty).toFixed(2).replace('.', ',');
      }).join('\n');

      var msg = '\uD83C\uDF36\uFE0F *NOVO PEDIDO - Cia de Condimentos*\n\n' +
        '\uD83D\uDC64 *Cliente:* ' + name + '\n' +
        '\uD83D\uDCF1 *Telefone:* ' + phone + '\n' +
        '\uD83D\uDCCD *Endere\u00E7o:* ' + address + '\n' +
        (obs ? '\uD83D\uDCDD *Obs:* ' + obs + '\n' : '') +
        '\n*Itens:*\n' + lines + '\n\n' +
        '\uD83D\uDCB0 *Total: R$ ' + total.toFixed(2).replace('.', ',') + '*\n\n' +
        '*Pedido #' + orderResult.id + '*';

      window.open('https://wa.me/5581999999999?text=' + encodeURIComponent(msg), '_blank');

      cart = [];
      updateCartBadge();
      closeCheckout();
      showToast('Pedido enviado via WhatsApp!');
    })
    .catch(function(error) {
      console.error('Erro ao enviar pedido:', error);
      showToast('Erro: ' + error.message);
      if (btn) { btn.disabled = false; btn.textContent = 'Confirmar Pedido via WhatsApp'; }
    });
  });
}

function submitOrderWithPixPayment() {
  var name = window.checkoutData.name;
  var phone = window.checkoutData.phone;
  var address = window.checkoutData.address;
  var obs = window.checkoutData.obs;

  getProducts().then(function(products) {
    var total = 0;
    var orderItems = cart.map(function(item) {
      var p = products.find(function(x) { return x.id === item.id; });
      if (!p) return null;
      var subtotal = p.price * item.qty;
      total += subtotal;
      return { id: item.id, qty: item.qty, price: p.price, name: p.name };
    }).filter(Boolean);

    var orderData = {
      customer: { name: name, phone: phone, address: address },
      items: orderItems,
      subtotal: total,
      frete: 0,
      total: total,
      payment: 'PIX',
      status: 'Aguardando Pagamento',
      paymentStatus: 'Pendente'
    };

    fetch(API_URL + '/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    })
    .then(function(response) {
      if (!response.ok) throw new Error('Erro ao salvar pedido');
      return response.json();
    })
    .then(function(orderResult) {
      var paymentPayload = {
        orderId: orderResult.id,
        amount: total,
        description: 'Pedido #' + orderResult.id + ' - ' + name,
        payerEmail: 'cliente@condimentos.com',
        payerPhone: phone
      };

      return fetch(API_URL + '/payments/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentPayload)
      })
      .then(function(response) {
        if (!response.ok) throw new Error('Erro ao gerar QR Code');
        return response.json();
      })
      .then(function(paymentResult) {
        showPixQrCode(paymentResult, orderResult, total, name, phone, address, orderItems);
      });
    })
    .catch(function(error) {
      console.error('Erro:', error);
      showToast('Erro: ' + error.message);
    });
  });
}

function showPixQrCode(payment, order, total, customerName, customerPhone, customerAddress, orderItems) {
  var body = document.getElementById('checkoutBody');
  if (!body) return;

  // Garantir que o QR code tem o prefixo correto
  var qrCodeSrc = payment.qr_code_base64;
  if (qrCodeSrc && !qrCodeSrc.startsWith('data:')) {
    qrCodeSrc = 'data:image/png;base64,' + qrCodeSrc;
  }

  window.pixPaymentData = {
    paymentId: payment.mp_payment_id,
    orderId: order.id,
    qrCode: payment.qr_code,
    qrCodeBase64: payment.qr_code_base64,
    pollingCount: 0,
    maxPolling: 36, // 3 minutos (36 * 5 segundos = 180 segundos)
    canceled: false,
    customerName: customerName,
    customerPhone: customerPhone,
    customerAddress: customerAddress,
    orderItems: orderItems,
    total: total
  };

  var pixCopyPasteHtml = '';
  if (payment.qr_code) {
    pixCopyPasteHtml = 
      '<div style="background: #f5f5f5; border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-top: 20px; margin-bottom: 24px;">' +
        '<p style="color: #666; font-size: 14px; margin-bottom: 12px; font-weight: 600;">PIX Copia e Cola:</p>' +
        '<div style="display: flex; align-items: center; gap: 8px;">' +
          '<input type="text" id="pixCopyPasteField" value="' + payment.qr_code + '" style="flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; font-family: monospace; color: #333; background: white;" readonly>' +
          '<button onclick="copyPixToClipboard()" style="padding: 10px 18px; background: var(--vermelho); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; white-space: nowrap; transition: background 0.3s;">📋 Copiar</button>' +
        '</div>' +
      '</div>';
  }

  var pixHtml = 
    '<div style="text-align: center; padding: 30px 20px;">' +
      '<h3 style="color: var(--marrom); font-family: Playfair Display, serif; font-size: 24px; margin-bottom: 8px;">QR Code PIX</h3>' +
      '<p style="color: #999; font-size: 14px; margin-bottom: 24px;">Escaneie com seu telefone para pagar</p>' +
      '<div style="background: white; padding: 20px; border-radius: 8px; display: inline-block; margin-bottom: 24px;">' +
        '<img src="' + qrCodeSrc + '" alt="QR Code PIX" style="width: 250px; height: 250px; display: block;">' +
      '</div>' +
      pixCopyPasteHtml +
      '<p style="color: #666; font-size: 16px; margin-bottom: 8px;"><strong>Valor:</strong></p>' +
      '<p style="color: var(--vermelho); font-family: Playfair Display, serif; font-size: 32px; font-weight: 900; margin-bottom: 24px;">R$ ' + total.toFixed(2).replace('.', ',') + '</p>' +
      '<div style="background: #ffe5e0; border-left: 4px solid var(--vermelho); padding: 16px; border-radius: 4px; margin-bottom: 24px; text-align: left;">' +
        '<p style="color: var(--vermelho); font-weight: 900; margin-bottom: 8px;">📱 Instruções:</p>' +
        '<ol style="color: #666; font-size: 14px; margin-left: 20px;">' +
          '<li>Abra seu app de banco ou PIX</li>' +
          '<li>Escolha "Pagar com QR Code" ou "Copia e Cola"</li>' +
          '<li>Escaneie a imagem acima ou cole a chave</li>' +
          '<li>Confirme o pagamento</li>' +
        '</ol>' +
      '</div>' +
      '<div id="pixStatus" style="color: #999; font-size: 13px; margin-top: 20px;">⏳ Aguardando confirmação do pagamento... <strong id="pixTimer">Expira em: 3:00</strong></div>' +
      '<div id="pixCancelButtonContainer" style="display: flex; gap: 12px; margin-top: 24px; justify-content: center; flex-wrap: wrap;">' +
        '<button id="pixChangePaymentButton" onclick="changePaymentMethod()" style="padding: 12px 24px; background: var(--amarelo); color: var(--marrom); border: none; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 14px;">🔄 Mudar Forma de Pagamento</button>' +
        '<button id="pixCancelButton" onclick="cancelPixPayment()" style="padding: 12px 24px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 14px;">❌ Cancelar Pedido</button>' +
      '</div>' +
    '</div>';

  body.innerHTML = pixHtml;
  pollPixStatus();
}

function pollPixStatus() {
  if (!window.pixPaymentData) return;

  var data = window.pixPaymentData;
  
  if (data.canceled) {
    return;
  }

  data.pollingCount++;

  // Atualizar timer visual
  var secondsRemaining = (data.maxPolling - data.pollingCount) * 5;
  var minutesRemaining = Math.floor(secondsRemaining / 60);
  var secsRemaining = secondsRemaining % 60;
  var timerEl = document.getElementById('pixTimer');
  if (timerEl) {
    timerEl.innerHTML = 'Expira em: ' + minutesRemaining + ':' + (secsRemaining < 10 ? '0' : '') + secsRemaining;
  }

  fetch(API_URL + '/payments/status/' + data.paymentId, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })
  .then(function(response) {
    if (!response.ok) throw new Error('Erro ao consultar status');
    return response.json();
  })
  .then(function(result) {
    var statusEl = document.getElementById('pixStatus');
    
    if (result.status === 'approved') {
      if (statusEl) {
        statusEl.innerHTML = '✅ <span style="color: #4CAF50;"><strong>Pagamento confirmado!</strong></span>';
      }
      
      var cancelButton = document.getElementById('pixCancelButton');
      if (cancelButton) {
        cancelButton.style.display = 'none';
      }
      
      data.canceled = true;
      
      setTimeout(function() {
        showPixConfirmedWithWhatsApp(data);
      }, 1000);
      
      return;
    }
    
    if (data.pollingCount >= data.maxPolling) {
      data.canceled = true;
      if (statusEl) {
        statusEl.innerHTML = '⏱️ <span style="color: #FF9800;"><strong>Tempo expirado!</strong></span>';
      }
      
      setTimeout(function() {
        showPixExpiredMessage();
      }, 1000);
      
      return;
    }

    if (statusEl) {
      statusEl.innerHTML = '⏳ Aguardando confirmação do pagamento... <strong id="pixTimer">Expira em: ' + minutesRemaining + ':' + (secsRemaining < 10 ? '0' : '') + secsRemaining + '</strong>';
    }

    setTimeout(pollPixStatus, 5000);
  })
  .catch(function(error) {
    console.error('Erro no polling:', error);
    if (data.pollingCount < data.maxPolling && !data.canceled) {
      setTimeout(pollPixStatus, 5000);
    }
  });
}

function showPixExpiredMessage() {
  var body = document.getElementById('checkoutBody');
  if (!body) return;

  var expiredHtml = 
    '<div style="text-align: center; padding: 40px 20px;">' +
      '<div style="font-size: 64px; margin-bottom: 20px;">⏱️</div>' +
      '<h3 style="color: #FF9800; font-family: Playfair Display, serif; font-size: 24px; margin-bottom: 12px;">Tempo Expirado</h3>' +
      '<p style="color: #666; font-size: 16px; margin-bottom: 24px;">O QR Code expirou após 3 minutos sem confirmação</p>' +
      '<div style="background: #fff3e0; border: 2px solid #FF9800; padding: 16px; border-radius: 8px; margin-bottom: 24px;">' +
        '<p style="color: #FF9800; font-size: 14px;">Para prosseguir, gere um novo código PIX</p>' +
      '</div>' +
      '<button onclick="regeneratePixQrCode()" style="width: 100%; background: var(--vermelho); color: white; border: none; padding: 16px; font-weight: 900; cursor: pointer; border-radius: 4px; font-size: 16px; letter-spacing: 1px; margin-bottom: 12px;">🔄 Gerar Novo QR Code</button>' +
      '<button onclick="goBackToCart()" style="width: 100%; background: #999; color: white; border: none; padding: 12px; font-weight: 600; cursor: pointer; border-radius: 4px; font-size: 14px;">Voltar para Carrinho</button>' +
    '</div>';

  body.innerHTML = expiredHtml;
}

function showPixConfirmedWithWhatsApp(data) {
  var body = document.getElementById('checkoutBody');
  if (!body) return;

  var storageData = {
    orderId: data.orderId,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    customerAddress: data.customerAddress,
    orderItems: data.orderItems,
    total: data.total,
    timestamp: Date.now()
  };
  
  localStorage.setItem('pixOrderData', JSON.stringify(storageData));
  
  setTimeout(function() {
    localStorage.removeItem('pixOrderData');
    console.log('🗑️ Dados do pedido removidos de localStorage (30 min)');
  }, 30 * 60 * 1000);

  var confirmedHtml = 
    '<div style="text-align: center; padding: 40px 20px;">' +
      '<div style="font-size: 64px; margin-bottom: 20px;">✅</div>' +
      '<h3 style="color: var(--vermelho); font-family: Playfair Display, serif; font-size: 24px; margin-bottom: 12px;">Pagamento Confirmado!</h3>' +
      '<p style="color: #666; font-size: 16px; margin-bottom: 24px;">Sua compra foi aprovada com sucesso</p>' +
      '<div style="background: #fdf8ee; padding: 20px; border-radius: 8px; margin-bottom: 24px; border: 2px solid var(--amarelo);">' +
        '<p style="font-size: 14px; color: #999; margin-bottom: 8px;">Número do Pedido</p>' +
        '<p style="font-size: 32px; font-weight: 900; color: var(--vermelho);">#' + data.orderId + '</p>' +
      '</div>' +
      '<p style="color: #666; font-size: 14px; margin-bottom: 24px;">Confirme seu pedido pelo WhatsApp</p>' +
      '<div style="display: flex; flex-direction: column; gap: 12px; margin-top: 24px;">' +
        '<button onclick="sendToWhatsAppAgain()" style="width: 100%; background: #25D366; color: white; border: none; padding: 14px; font-weight: 900; cursor: pointer; border-radius: 4px; font-size: 16px; letter-spacing: 1px;">📱 Enviar para WhatsApp</button>' +
        '<button onclick="goBackToCart()" style="width: 100%; background: #999; color: white; border: none; padding: 12px; font-weight: 600; cursor: pointer; border-radius: 4px; font-size: 14px;">Voltar ao Catálogo</button>' +
      '</div>' +
    '</div>';

  body.innerHTML = confirmedHtml;
}

function sendToWhatsAppAgain() {
  var data = window.pixPaymentData;
  
  if (!data) {
    var storedData = localStorage.getItem('pixOrderData');
    if (storedData) {
      try {
        data = JSON.parse(storedData);
        console.log('📱 Usando dados recuperados do localStorage');
      } catch (e) {
        console.error('Erro ao recuperar dados do localStorage:', e);
        showToast('❌ Não foi possível recuperar dados do pedido');
        return;
      }
    } else {
      showToast('❌ Dados do pedido não encontrados');
      return;
    }
  }
  
  redirectToWhatsAppWithOrder(data);
}

function showPixSuccessMessage(orderId) {
  var body = document.getElementById('checkoutBody');
  if (!body) return;

  var successHtml = 
    '<div style="text-align: center; padding: 40px 20px;">' +
      '<div style="font-size: 64px; margin-bottom: 20px;">✅</div>' +
      '<h3 style="color: var(--vermelho); font-family: Playfair Display, serif; font-size: 24px; margin-bottom: 12px;">Pagamento Confirmado!</h3>' +
      '<p style="color: #666; font-size: 16px; margin-bottom: 24px;">Sua compra foi aprovada com sucesso</p>' +
      '<div style="background: #fdf8ee; padding: 20px; border-radius: 8px; margin-bottom: 24px; border: 2px solid var(--amarelo);">' +
        '<p style="font-size: 14px; color: #999; margin-bottom: 8px;">Número do Pedido</p>' +
        '<p style="font-size: 32px; font-weight: 900; color: var(--vermelho);">#' + orderId + '</p>' +
      '</div>' +
      '<p style="color: #666; font-size: 14px; margin-bottom: 24px;">Redirecionando para WhatsApp...</p>' +
      '<div style="display: flex; gap: 12px; margin-top: 24px; justify-content: center;">' +
        '<button onclick="goBackToCart()" style="padding: 12px 24px; background: #999; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">Voltar ao Catálogo</button>' +
      '</div>' +
    '</div>';

  body.innerHTML = successHtml;
}

function redirectToWhatsAppWithOrder(data) {
  if (!data) return;
  
  var message = '🛍️ *NOVO PEDIDO* #' + data.orderId + '\n\n';
  message += '*Cliente:* ' + data.customerName + '\n';
  message += '*Telefone:* ' + data.customerPhone + '\n';
  message += '*Endereço:* ' + data.customerAddress + '\n\n';
  message += '*Itens:*\n';
  
  if (data.orderItems && Array.isArray(data.orderItems)) {
    data.orderItems.forEach(function(item, index) {
      message += (index + 1) + '. ' + item.name + ' - Qtd: ' + item.quantity + ' x R$ ' + parseFloat(item.price).toFixed(2).replace('.', ',') + '\n';
    });
  }
  
  message += '\n*TOTAL:* R$ ' + data.total.toFixed(2).replace('.', ',') + '\n\n';
  message += '💰 *Pagamento:* PIX (Confirmado)\n';
  message += '✅ *Status:* Aguardando preparo\n\n';
  message += 'Obrigado pela compra! 🙏';
  
  var whatsappNumber = '5581992555317';
  var whatsappUrl = 'https://wa.me/' + whatsappNumber + '?text=' + encodeURIComponent(message);
  
  window.open(whatsappUrl, '_blank');
  
  localStorage.removeItem('pixOrderData');
  console.log('✅ Pedido enviado para WhatsApp e dados removidos de localStorage');
}

function changePaymentMethod() {
  if (!window.pixPaymentData) {
    showToast('❌ Nenhum pagamento para mudar');
    return;
  }
  
  window.pixPaymentData.canceled = true;
  
  localStorage.removeItem('pixOrderData');
  
  fetch(API_URL + '/payments/cancel/' + window.pixPaymentData.paymentId, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })
  .catch(function(e) {
    console.error('Erro ao cancelar pagamento:', e);
  });
  
  showToast('🔄 Escolha outra forma de pagamento');
  
  setTimeout(function() {
    window.pixPaymentData = null;
    
    showPaymentMethodsMenu();
  }, 600);
}

function showPaymentMethodsMenu() {
  var body = document.getElementById('checkoutBody');
  if (!body) return;

  body.innerHTML = 
    '<div style="text-align: center; margin-bottom: 24px;">' +
      '<h3 style="color: var(--marrom); font-family: Playfair Display, serif; font-size: 20px;">Escolha a Forma de Pagamento</h3>' +
    '</div>' +
    '<div class="payment-methods-container">' +
      '<div class="payment-method-card" onclick="selectPaymentMethod(\'pix\')">' +
        '<div class="payment-method-icon">🔐</div>' +
        '<div class="payment-method-name">PIX</div>' +
      '</div>' +
      '<div class="payment-method-card" onclick="selectPaymentMethod(\'dinheiro\')">' +
        '<div class="payment-method-icon">💵</div>' +
        '<div class="payment-method-name">Dinheiro</div>' +
      '</div>' +
      '<div class="payment-method-card" onclick="selectPaymentMethod(\'cartao\')">' +
        '<div class="payment-method-icon">💳</div>' +
        '<div class="payment-method-name">Cartão</div>' +
      '</div>' +
    '</div>';
}

function cancelPixPayment() {
  if (!window.pixPaymentData) {
    showToast('❌ Nenhum pagamento para cancelar');
    return;
  }
  
  window.pixPaymentData.canceled = true;
  
  localStorage.removeItem('pixOrderData');
  
  fetch(API_URL + '/payments/cancel/' + window.pixPaymentData.paymentId, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })
  .catch(function(e) {
    console.error('Erro ao cancelar pagamento:', e);
  });
  
  showToast('❌ Pagamento cancelado');
  
  setTimeout(function() {
    goBackToCart();
  }, 800);
}

function regeneratePixQrCode() {
  if (!window.pixPaymentData) return;
  
  goBackToCart();
}

function goBackToCart() {
  localStorage.removeItem('pixOrderData');
  
  window.pixPaymentData = null;
  window.showCheckout = false;
  window.checkoutData = null;
  
  var checkoutBody = document.getElementById('checkoutBody');
  if (checkoutBody) checkoutBody.innerHTML = '';
  
  var checkoutModal = document.getElementById('checkoutModal');
  if (checkoutModal) {
    checkoutModal.classList.remove('open');
    checkoutModal.style.display = 'none';
  }
  
  showToast('✅ Pedido cancelado. Você pode tentar novamente!');
  
  openCart();
}

function copyPixToClipboard() {
  var pixField = document.getElementById('pixCopyPasteField');
  if (!pixField) return;
  
  pixField.select();
  pixField.setSelectionRange(0, 99999);
  
  try {
    document.execCommand('copy');
    
    var button = event.target;
    var originalText = button.innerHTML;
    button.innerHTML = '✅ Copiado!';
    button.style.background = '#4CAF50';
    
    setTimeout(function() {
      button.innerHTML = originalText;
      button.style.background = 'var(--vermelho)';
    }, 2000);
    
    showToast('✅ Chave PIX copiada para área de transferência!');
  } catch (e) {
    showToast('❌ Erro ao copiar. Tente novamente.');
  }
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
        return products.map(function(p) { return Object.assign({}, p, { price: parseFloat(p.price) || 0 }); });
      });
    }
    throw new Error('Response not ok');
  })
  .catch(function(e) {
    clearTimeout(timeout);
    if (e.name === 'AbortError') {
      showToast('Servidor demorando. Verifique sua conex\u00E3o.');
    } else {
      showToast('Erro ao carregar produtos: ' + (e.message || 'Tente novamente'));
    }
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
        ? '<img src="' + imageUrl + '" alt="' + p.name + '" onerror="this.src=\'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ctext y=%2250%22 font-size=%2240%22 text-anchor=%22middle%22 x=%2250%22%3E🌶️%3C/text%3E%3C/svg%3E\'" style="width: 100%; height: 100%; object-fit: cover;">'
        : '<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 60px;">🌶️</div>';
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
    document.getElementById('productsGrid').innerHTML = html;
  }).catch(function(err) {
    console.error('Erro ao renderizar produtos:', err);
    document.getElementById('productsGrid').innerHTML = '<div style="padding: 60px; text-align: center; color: #888;">Erro ao carregar produtos. Tente recarregar a página.</div>';
  });
}
    } else {
      showToast('Erro ao carregar produtos: ' + (e.message || 'Tente novamente'));
    }
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

    var grid = document.getElementById('productsGrid');
    if (!grid) return;

    if (filtered.length === 0) {
      grid.innerHTML = '<div class="no-products">Nenhum produto encontrado.</div>';
      return;
    }

    grid.innerHTML = filtered.map(function(p) {
      var imageUrl = p.image_url || ((p.images && p.images.length > 0) ? getImageUrl(p.images[0]) : p.image);
      var imgHtml = imageUrl
        ? '<img src="' + imageUrl + '" alt="' + p.name + '" onerror="this.parentElement.innerHTML=\'&#x1F336;&#xFE0F;\'">'
        : '&#x1F336;&#xFE0F;';
      return '<div class="product-card" onclick="openProductDetail(' + JSON.stringify(p).replace(/'/g, '&#39;') + ')" style="cursor: pointer;">' +
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
  });
}

function filterProducts(category, btn) {
  currentFilter = category;
  document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  renderProducts();
}

function handleSearch(val) {
  currentSearch = val.toLowerCase();
  renderProducts();
}

/* ════════════════════════════════════
   DETALHES DO PRODUTO
   ════════════════════════════════════ */
function openProductDetail(product) {
  var modal = document.getElementById('productDetailModal');
  if (!modal) return;
  
  window.currentProductDetail = product;
  
  var imageUrl = product.image_url || ((product.images && product.images.length > 0) ? getImageUrl(product.images[0]) : product.image);
  var imgHtml = imageUrl
    ? '<img src="' + imageUrl + '" alt="' + product.name + '" onerror="this.parentElement.innerHTML=\'&#x1F336;&#xFE0F;\'" style="width: 100%; height: 100%; object-fit: cover;">'
    : '&#x1F336;&#xFE0F;';
  
  document.getElementById('productDetailName').textContent = product.name;
  document.getElementById('productDetailCategory').textContent = product.category || '';
  document.getElementById('productDetailDescription').textContent = product.description || 'Sem descrição disponível';
  document.getElementById('productDetailPrice').textContent = 'R$ ' + product.price.toFixed(2).replace('.', ',');
  document.getElementById('productDetailStock').textContent = 'Estoque: ' + product.stock + ' unidades';
  document.getElementById('productDetailImage').innerHTML = imgHtml;
  
  var addBtn = document.getElementById('productDetailAddBtn');
  if (product.stock === 0) {
    addBtn.textContent = 'Esgotado';
    addBtn.disabled = true;
  } else {
    addBtn.textContent = 'Adicionar ao Carrinho';
    addBtn.disabled = false;
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

/* ════════════════════════════════════
   UTILITARIOS
   ════════════════════════════════════ */
function maskPhone(input) {
  var v = input.value.replace(/\D/g, '').slice(0, 11);
  if (v.length <= 2)      input.value = v.length ? '(' + v : v;
  else if (v.length <= 7) input.value = '(' + v.slice(0,2) + ') ' + v.slice(2);
  else                    input.value = '(' + v.slice(0,2) + ') ' + v.slice(2,7) + '-' + v.slice(7);
}

function showToast(msg) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 3000);
}
