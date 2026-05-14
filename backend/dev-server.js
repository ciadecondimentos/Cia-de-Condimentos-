const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

// Criar diretório de uploads se não existir
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Diretório de frontend
const frontendDir = path.join(__dirname, '../frontend');

// In-memory database com produtos que podem ter imagens
let products = [
  { id: 1, name: 'Pimenta do Reino Preta', category: 'Pimentas', price: 18.90, stock: 45, description: 'Pimenta do reino preta moída na hora, aroma intenso e picância moderada. Ideal para carnes, massas e temperos gerais.', images: [], barcode: '7891234560001', weight: '100g', origin: 'Índia', active: true },
  { id: 2, name: 'Cúrcuma em Pó', category: 'Especiarias', price: 22.50, stock: 30, description: 'Cúrcuma de alta qualidade com cor vibrante e propriedades anti-inflamatórias. Perfeita para arrozes e curries.', images: [], barcode: '7891234560002', weight: '100g', origin: 'Brasil', active: true },
  { id: 3, name: 'Alecrim Fresco Desidratado', category: 'Ervas', price: 14.90, stock: 60, description: 'Alecrim desidratado com sabor intenso. Ótimo para carnes assadas, batatas e molhos mediterrâneos.', images: [], barcode: '7891234560003', weight: '50g', origin: 'Brasil', active: true },
  { id: 4, name: 'Tempero Baiano', category: 'Temperos', price: 12.90, stock: 80, description: 'Blend especial de especiarias do nordeste brasileiro. Ideal para frutos do mar, feijões e grelhados.', images: [], barcode: '7891234560004', weight: '150g', origin: 'Brasil', active: true },
  { id: 5, name: 'Molho de Pimenta Artesanal', category: 'Molhos', price: 28.90, stock: 25, description: 'Molho de pimenta biquinho artesanal com toque cítrico. Intensidade suave, sabor inconfundível.', images: [], barcode: '7891234560005', weight: '250ml', origin: 'Brasil', active: true },
  { id: 6, name: 'Páprica Defumada', category: 'Pimentas', price: 24.90, stock: 35, description: 'Páprica defumada espanhola importada. Confere cor e sabor defumado a carnes e legumes assados.', images: [], barcode: '7891234560006', weight: '100g', origin: 'Espanha', active: true },
  { id: 7, name: 'Canela em Pau', category: 'Especiarias', price: 16.90, stock: 50, description: 'Canela em pau inteira, perfeita para bebidas quentes, compotas e receitas doces.', images: [], barcode: '7891234560007', weight: '100g', origin: 'Sri Lanka', active: true },
  { id: 8, name: 'Manjericão Seco', category: 'Ervas', price: 11.90, stock: 3, description: 'Manjericão italiano desidratado. Essencial para molhos de tomate, pizzas e saladas caprese.', images: [], barcode: '7891234560008', weight: '30g', origin: 'Itália', active: true },
];

let maxProductId = 8;

// In-memory orders database
let orders = [
  { id: 1, customer_name: 'João Silva', customer_email: 'joao@email.com', customer_phone: '(11) 99999-1111', total: 150.00, payment_method: 'PIX', payment_status: 'Pago', status: 'Entregue', created_at: new Date(Date.now() - 5*24*60*60*1000).toISOString(), items: [] },
  { id: 2, customer_name: 'Maria Santos', customer_email: 'maria@email.com', customer_phone: '(11) 99999-2222', total: 280.50, payment_method: 'Cartão', payment_status: 'Pendente', status: 'Processando', created_at: new Date(Date.now() - 3*24*60*60*1000).toISOString(), items: [] },
  { id: 3, customer_name: 'Pedro Oliveira', customer_email: 'pedro@email.com', customer_phone: '(11) 99999-3333', total: 420.00, payment_method: 'PIX', payment_status: 'Pendente', status: 'Processando', created_at: new Date(Date.now() - 1*24*60*60*1000).toISOString(), items: [] }
];

let maxOrderId = 3;

// In-memory customers database
let customers = [
  { id: 1, name: 'João Silva', email: 'joao@email.com', phone: '(11) 99999-1111', cpf: '123.456.789-00', address: 'Rua A, 123', city: 'São Paulo', state: 'SP', zip: '01234-567', total_orders: 5, total_spent: 1200.00, notes: 'Cliente frequente' },
  { id: 2, name: 'Maria Santos', email: 'maria@email.com', phone: '(11) 99999-2222', cpf: '987.654.321-11', address: 'Avenida B, 456', city: 'São Paulo', state: 'SP', zip: '02345-678', total_orders: 3, total_spent: 680.50, notes: '' }
];

let maxCustomerId = 2;

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

function serveStaticFile(pathname, res) {
  // Mapear rotas para arquivos
  const fileMap = {
    '/': 'index.html',
    '/admin': 'admin.html',
    '/admin.html': 'admin.html',
    '/index.html': 'index.html'
  };
  
  // Se é uma rota raiz ou mapeada, servir arquivo correspondente
  let filePath = fileMap[pathname] ? path.join(frontendDir, fileMap[pathname]) : path.join(frontendDir, pathname);
  
  // Remover query string
  filePath = filePath.split('?')[0];
  
  // Segurança: garantir que não acessa fora do diretório
  if (!filePath.startsWith(frontendDir) || filePath.includes('..')) {
    return false;
  }
  
  // Verificar se arquivo existe
  if (!fs.existsSync(filePath)) {
    return false;
  }
  
  // Determinar MIME type
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
  };
  
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  
  // Ler e servir arquivo
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Arquivo não encontrado' }));
      return;
    }
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
  
  return true;
}

function setCORSHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function parseFormData(body, contentType) {
  // Parse boundary from content-type
  const boundaryMatch = contentType.match(/boundary=([^;]+)/);
  if (!boundaryMatch) return null;
  
  const boundary = boundaryMatch[1].trim();
  const parts = body.split('--' + boundary);
  const result = {};
  
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (part === '--' || part.trim() === '') continue;
    
    // Parse headers and body
    const [headerSection, ...bodyParts] = part.split('\r\n\r\n');
    const bodyData = bodyParts.join('\r\n\r\n').replace(/\r\n--$/, '').trim();
    
    // Extract name and filename
    const nameMatch = headerSection.match(/name="([^"]+)"/);
    const filenameMatch = headerSection.match(/filename="([^"]+)"/);
    
    if (nameMatch) {
      const fieldName = nameMatch[1];
      if (filenameMatch) {
        result[fieldName] = {
          filename: filenameMatch[1],
          data: bodyData
        };
      } else {
        result[fieldName] = bodyData;
      }
    }
  }
  
  return result;
}

const server = http.createServer((req, res) => {
  setCORSHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // ========== UPLOAD DE IMAGENS ==========
  if (pathname === '/api/upload' && req.method === 'POST') {
    let body = '';
    
    req.on('data', (chunk) => {
      body += chunk.toString('binary');
    });
    
    req.on('end', () => {
      try {
        const contentType = req.headers['content-type'];
        const formData = parseFormData(body, contentType);
        
        if (!formData || !formData.image) {
          sendJSON(res, 400, { error: 'Nenhuma imagem enviada' });
          return;
        }
        
        // Gerar nome de arquivo único
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        const filename = `${timestamp}-${random}.png`;
        const filepath = path.join(uploadDir, filename);
        
        // Salvar arquivo em binário
        fs.writeFile(filepath, formData.image.data, 'binary', (err) => {
          if (err) {
            console.error('❌ Erro ao salvar arquivo:', err);
            sendJSON(res, 500, { error: 'Erro ao salvar arquivo' });
            return;
          }
          
          const imageUrl = `/api/uploads/${filename}`;
          console.log('✅ Upload salvo:', imageUrl);
          sendJSON(res, 200, { imageUrl });
        });
      } catch (e) {
        console.error('❌ Erro no upload:', e);
        sendJSON(res, 500, { error: 'Erro ao processar upload' });
      }
    });
    
    req.on('error', (err) => {
      console.error('❌ Erro na requisição:', err);
      sendJSON(res, 500, { error: 'Erro na requisição' });
    });
    
    return;
  }
  
  // ========== SERVIR UPLOADS ==========
  if (pathname.startsWith('/api/uploads/')) {
    const filename = pathname.replace('/api/uploads/', '');
    const filepath = path.join(uploadDir, filename);
    
    // Segurança: garantir que não acessa fora do diretório
    if (!filepath.startsWith(uploadDir) || filename.includes('..')) {
      sendJSON(res, 403, { error: 'Acesso negado' });
      return;
    }
    
    fs.stat(filepath, (err, stats) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Arquivo não encontrado' }));
        return;
      }
      
      const ext = path.extname(filename).toLowerCase();
      const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
      };
      
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filepath).pipe(res);
    });
    return;
  }
  
  // ========== GET /api/products ==========
  if (pathname === '/api/products' && req.method === 'GET') {
    sendJSON(res, 200, products);
    return;
  }
  
  // ========== POST /api/products (criar produto) ==========
  if (pathname === '/api/products' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const newProduct = {
          id: ++maxProductId,
          name: data.name || '',
          category: data.category || null,
          price: parseFloat(data.price) || 0,
          stock: parseInt(data.stock) || 0,
          description: data.description || '',
          images: data.images || [],
          barcode: data.barcode || '',
          cod: data.cod || '',
          weight: data.weight || '',
          origin: data.origin || '',
          brand: data.brand || 'Cia. Condimentos e Especiarias',
          expiry: data.expiry || '',
          active: data.active !== false
        };
        products.push(newProduct);
        console.log('✅ Produto criado:', newProduct.id, newProduct.name);
        sendJSON(res, 201, newProduct);
      } catch (e) {
        console.error('❌ Erro ao criar produto:', e);
        sendJSON(res, 400, { error: e.message });
      }
    });
    return;
  }
  
  // ========== PUT /api/products/:id (atualizar produto) ==========
  const putMatch = pathname.match(/^\/api\/products\/(\d+)$/);
  if (putMatch && req.method === 'PUT') {
    const productId = parseInt(putMatch[1]);
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const product = products.find(p => p.id === productId);
        if (!product) {
          sendJSON(res, 404, { error: 'Produto não encontrado' });
          return;
        }
        
        // Atualizar campos
        if (data.name !== undefined) product.name = data.name;
        if (data.category !== undefined) product.category = data.category;
        if (data.price !== undefined) product.price = parseFloat(data.price);
        if (data.stock !== undefined) product.stock = parseInt(data.stock);
        if (data.description !== undefined) product.description = data.description;
        if (data.images !== undefined) product.images = data.images;
        if (data.barcode !== undefined) product.barcode = data.barcode;
        if (data.cod !== undefined) product.cod = data.cod;
        if (data.weight !== undefined) product.weight = data.weight;
        if (data.origin !== undefined) product.origin = data.origin;
        if (data.active !== undefined) product.active = data.active;
        
        console.log('✅ Produto atualizado:', productId, product.name);
        sendJSON(res, 200, product);
      } catch (e) {
        console.error('❌ Erro ao atualizar produto:', e);
        sendJSON(res, 400, { error: e.message });
      }
    });
    return;
  }
  
  // ========== GET /api/products/:id ==========
  const getMatch = pathname.match(/^\/api\/products\/(\d+)$/);
  if (getMatch && req.method === 'GET') {
    const productId = parseInt(getMatch[1]);
    const product = products.find(p => p.id === productId);
    if (!product) {
      sendJSON(res, 404, { error: 'Produto não encontrado' });
      return;
    }
    sendJSON(res, 200, product);
    return;
  }
  
  // ========== SERVIR ARQUIVOS ESTÁTICOS (FRONTEND) ==========
  if (req.method === 'GET' && !pathname.startsWith('/api')) {
    if (serveStaticFile(pathname, res)) {
      return;
    }
  }
  
  // ========== GET /api/orders ==========
  if (pathname === '/api/orders' && req.method === 'GET') {
    sendJSON(res, 200, orders);
    return;
  }
  
  // ========== GET /api/orders/:id ==========
  const ordersGetMatch = pathname.match(/^\/api\/orders\/(\d+)$/);
  if (ordersGetMatch && req.method === 'GET') {
    const orderId = parseInt(ordersGetMatch[1]);
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      sendJSON(res, 404, { error: 'Pedido não encontrado' });
      return;
    }
    sendJSON(res, 200, order);
    return;
  }
  
  // ========== PUT /api/orders/:id ==========
  const ordersPutMatch = pathname.match(/^\/api\/orders\/(\d+)$/);
  if (ordersPutMatch && req.method === 'PUT') {
    const orderId = parseInt(ordersPutMatch[1]);
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const order = orders.find(o => o.id === orderId);
        if (!order) {
          sendJSON(res, 404, { error: 'Pedido não encontrado' });
          return;
        }
        
        if (data.status !== undefined) order.status = data.status;
        if (data.payment_status !== undefined) order.payment_status = data.payment_status;
        if (data.payment !== undefined) order.payment_method = data.payment;
        
        sendJSON(res, 200, order);
      } catch (e) {
        sendJSON(res, 400, { error: e.message });
      }
    });
    return;
  }
  
  // ========== DELETE /api/orders/delete/all ==========
  if (pathname === '/api/orders/delete/all' && req.method === 'DELETE') {
    const deletedCount = orders.length;
    orders = [];
    console.log(`🗑️ ADMIN: ${deletedCount} pedidos deletados`);
    sendJSON(res, 200, { 
      success: true,
      deleted: deletedCount,
      message: `${deletedCount} pedidos deletados com sucesso`
    });
    return;
  }
  
  // ========== DELETE /api/orders/:id ==========
  const ordersDeleteMatch = pathname.match(/^\/api\/orders\/(\d+)$/);
  if (ordersDeleteMatch && req.method === 'DELETE') {
    const orderId = parseInt(ordersDeleteMatch[1]);
    const index = orders.findIndex(o => o.id === orderId);
    if (index === -1) {
      sendJSON(res, 404, { error: 'Pedido não encontrado' });
      return;
    }
    orders.splice(index, 1);
    sendJSON(res, 200, { message: 'Pedido deletado' });
    return;
  }
  
  // ========== GET /api/auth/admin/customers ==========
  if (pathname === '/api/auth/admin/customers' && req.method === 'GET') {
    sendJSON(res, 200, customers);
    return;
  }
  
  // ========== GET /api/auth/admin/customers/:id ==========
  const customersGetMatch = pathname.match(/^\/api\/auth\/admin\/customers\/(\d+)$/);
  if (customersGetMatch && req.method === 'GET') {
    const customerId = parseInt(customersGetMatch[1]);
    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
      sendJSON(res, 404, { error: 'Cliente não encontrado' });
      return;
    }
    sendJSON(res, 200, customer);
    return;
  }
  
  // ========== POST /api/auth/admin/customers ==========
  if (pathname === '/api/auth/admin/customers' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const newCustomer = {
          id: ++maxCustomerId,
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          cpf: data.cpf || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          zip: data.zip || '',
          total_orders: data.total_orders || 0,
          total_spent: data.total_spent || 0,
          notes: data.notes || ''
        };
        customers.push(newCustomer);
        sendJSON(res, 201, newCustomer);
      } catch (e) {
        sendJSON(res, 400, { error: e.message });
      }
    });
    return;
  }
  
  // ========== 404 ==========
  sendJSON(res, 404, { error: 'Rota não encontrada' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════╗
║  Dev Server Rodando em Porta ${PORT}     ║
║  http://localhost:${PORT}           ║
║  Upload: /api/upload               ║
║  Produtos: /api/products           ║
║  Uploads: /api/uploads/{filename}  ║
╚════════════════════════════════════╝
  `);
});
