const http = require('http');
const url = require('url');

// In-memory database simulado
const products = [
  { id: 1, name: 'Pimenta do Reino Preta', category: 'Pimentas', price: 18.90, stock: 45, description: 'Pimenta do reino preta moída na hora, aroma intenso e picância moderada. Ideal para carnes, massas e temperos gerais.', images: ['data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZWRlYSIvPjx0ZXh0IHRleHQtYW5jaG9yPSJtaWRkbGUiIHg9IjEwMCIgeT0iMTEwIiBzdHlsZT0iZm9udC1zaXplOjcwcHg7Zm9udC13ZWlnaHQ6Ym9sZDsiPvCfk5Y8L3RleHQ+PC9zdmc+'], barcode: '7891234560001', weight: '100g', origin: 'Índia', active: true },
  { id: 2, name: 'Cúrcuma em Pó', category: 'Especiarias', price: 22.50, stock: 30, description: 'Cúrcuma de alta qualidade com cor vibrante e propriedades anti-inflamatórias. Perfeita para arrozes e curries.', images: ['data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2ZmZjhkNyIvPjx0ZXh0IHRleHQtYW5jaG9yPSJtaWRkbGUiIHg9IjEwMCIgeT0iMTEwIiBzdHlsZT0iZm9udC1zaXplOjcwcHg7Zm9udC13ZWlnaHQ6Ym9sZDsiPvCflLQgUy9LPC90ZXh0Pjwvc3ZnPg=='], barcode: '7891234560002', weight: '100g', origin: 'Brasil', active: true },
  { id: 3, name: 'Alecrim Fresco Desidratado', category: 'Ervas', price: 14.90, stock: 60, description: 'Alecrim desidratado com sabor intenso. Ótimo para carnes assadas, batatas e molhos mediterrâneos.', images: ['data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VmZThlYyIvPjx0ZXh0IHRleHQtYW5jaG9yPSJtaWRkbGUiIHg9IjEwMCIgeT0iMTEwIiBzdHlsZT0iZm9udC1zaXplOjcwcHg7Zm9udC13ZWlnaHQ6Ym9sZDsiPvCfk5I8L3RleHQ+PC9zdmc+'], barcode: '7891234560003', weight: '50g', origin: 'Brasil', active: true },
  { id: 4, name: 'Tempero Baiano', category: 'Temperos', price: 12.90, stock: 80, description: 'Blend especial de especiarias do nordeste brasileiro. Ideal para frutos do mar, feijões e grelhados.', images: ['data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VkZDZjNiIvPjx0ZXh0IHRleHQtYW5jaG9yPSJtaWRkbGUiIHg9IjEwMCIgeT0iMTEwIiBzdHlsZT0iZm9udC1zaXplOjcwcHg7Zm9udC13ZWlnaHQ6Ym9sZDsiPvCfk5Y8L3RleHQ+PC9zdmc+'], barcode: '7891234560004', weight: '150g', origin: 'Brasil', active: true },
  { id: 5, name: 'Molho de Pimenta Artesanal', category: 'Molhos', price: 28.90, stock: 25, description: 'Molho de pimenta biquinho artesanal com toque cítrico. Intensidade suave, sabor inconfundível.', images: ['data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2ZmZjBlNyIvPjx0ZXh0IHRleHQtYW5jaG9yPSJtaWRkbGUiIHg9IjEwMCIgeT0iMTEwIiBzdHlsZT0iZm9udC1zaXplOjcwcHg7Zm9udC13ZWlnaHQ6Ym9sZDsiPvCfk5Y8L3RleHQ+PC9zdmc+'], barcode: '7891234560005', weight: '250ml', origin: 'Brasil', active: true },
  { id: 6, name: 'Páprica Defumada', category: 'Pimentas', price: 24.90, stock: 35, description: 'Páprica defumada espanhola importada. Confere cor e sabor defumado a carnes e legumes assados.', images: ['data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2ZmZGVkOCIvPjx0ZXh0IHRleHQtYW5jaG9yPSJtaWRkbGUiIHg9IjEwMCIgeT0iMTEwIiBzdHlsZT0iZm9udC1zaXplOjcwcHg7Zm9udC13ZWlnaHQ6Ym9sZDsiPvCfk5Y8L3RleHQ+PC9zdmc+'], barcode: '7891234560006', weight: '100g', origin: 'Espanha', active: true },
  { id: 7, name: 'Canela em Pau', category: 'Especiarias', price: 16.90, stock: 50, description: 'Canela em pau inteira, perfeita para bebidas quentes, compotas e receitas doces.', images: ['data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2ZmZWJkNiIvPjx0ZXh0IHRleHQtYW5jaG9yPSJtaWRkbGUiIHg9IjEwMCIgeT0iMTEwIiBzdHlsZT0iZm9udC1zaXplOjcwcHg7Zm9udC13ZWlnaHQ6Ym9sZDsiPvCfk5Y8L3RleHQ+PC9zdmc+'], barcode: '7891234560007', weight: '100g', origin: 'Sri Lanka', active: true },
  { id: 8, name: 'Manjericão Seco', category: 'Ervas', price: 11.90, stock: 3, description: 'Manjericão italiano desidratado. Essencial para molhos de tomate, pizzas e saladas caprese.', images: ['data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VmZThlYyIvPjx0ZXh0IHRleHQtYW5jaG9yPSJtaWRkbGUiIHg9IjEwMCIgeT0iMTEwIiBzdHlsZT0iZm9udC1zaXplOjcwcHg7Zm9udC13ZWlnaHQ6Ym9sZDsiPvCfk5I8L3RleHQ+PC9zdmc+'], barcode: '7891234560008', weight: '30g', origin: 'Itália', active: true },
];

const orders = [];
const users = [];
let orderIdCounter = 1;
let userIdCounter = 1;

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

function setEventListenerCORSHeaders(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return true;
  }
  return false;
}

const server = http.createServer((req, res) => {
  if (setEventListenerCORSHeaders(req, res)) return;

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const bodyData = body ? JSON.parse(body) : {};

      // GET /api/products
      if (pathname === '/api/products' && req.method === 'GET') {
        return sendJSON(res, 200, products);
      }

      // GET /api/products/:id
      if (pathname.startsWith('/api/products/') && req.method === 'GET') {
        const id = parseInt(pathname.split('/')[3]);
        const product = products.find(p => p.id === id);
        if (!product) return sendJSON(res, 404, { error: 'Product not found' });
        return sendJSON(res, 200, product);
      }

      // POST /api/orders
      if (pathname === '/api/orders' && req.method === 'POST') {
        const { customer, items, subtotal, frete, total, payment } = bodyData;
        if (!customer || !items || !total) return sendJSON(res, 400, { error: 'Missing fields' });

        // Atualizar stock dos produtos
        items.forEach(item => {
          const prod = products.find(p => p.id === item.id);
          if (prod) prod.stock -= item.qty;
        });

        const order = {
          id: orderIdCounter++,
          customer,
          items,
          subtotal,
          frete,
          total,
          payment,
          status: 'Pendente',
          paymentStatus: 'Aguardando',
          createdAt: new Date().toISOString()
        };
        orders.push(order);
        return sendJSON(res, 201, order);
      }

      // GET /api/orders
      if (pathname === '/api/orders' && req.method === 'GET') {
        return sendJSON(res, 200, orders);
      }

      // GET /api/orders/:id
      if (pathname.startsWith('/api/orders/') && req.method === 'GET') {
        const id = parseInt(pathname.split('/')[3]);
        const order = orders.find(o => o.id === id);
        if (!order) return sendJSON(res, 404, { error: 'Order not found' });
        return sendJSON(res, 200, order);
      }

      // POST /api/auth/register
      if (pathname === '/api/auth/register' && req.method === 'POST') {
        const { name, email, password } = bodyData;
        if (!name || !email || !password) return sendJSON(res, 400, { error: 'Missing fields' });
        if (users.find(u => u.email === email)) return sendJSON(res, 400, { message: 'Email already in use' });

        const user = {
          id: userIdCounter++,
          name,
          email,
          password_hash: password,
          createdAt: new Date().toISOString()
        };
        users.push(user);
        return sendJSON(res, 201, { name: user.name, email: user.email, id: user.id });
      }

      // POST /api/auth/login
      if (pathname === '/api/auth/login' && req.method === 'POST') {
        const { email, password } = bodyData;
        if (!email || !password) return sendJSON(res, 400, { error: 'Missing fields' });
        
        const user = users.find(u => u.email === email && u.password_hash === password);
        if (!user) return sendJSON(res, 400, { message: 'Invalid credentials' });
        
        return sendJSON(res, 200, { name: user.name, email: user.email, id: user.id });
      }

      // 404
      sendJSON(res, 404, { error: 'Endpoint not found' });
    } catch (err) {
      console.error('Error:', err);
      sendJSON(res, 500, { error: 'Server error' });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
