#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const db = require('./db');

const TEST_IMAGE = path.join(__dirname, 'test-upload-debug.png');
const API_URL = 'http://localhost:3000/api';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createTestImage() {
  console.log('📝 1. Criando imagem de teste...');
  
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
    0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
    0x00, 0x00, 0x03, 0x00, 0x01, 0x3F, 0x2C, 0xA1, 0xA8, 0x00, 0x00, 0x00,
    0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]);
  
  fs.writeFileSync(TEST_IMAGE, pngData);
  console.log('   ✓ Arquivo criado: ' + path.basename(TEST_IMAGE));
}

async function uploadImage() {
  console.log('\n📤 2. Fazendo upload da imagem...');
  
  return new Promise((resolve, reject) => {
    const http = require('http');
    const imageBuffer = fs.readFileSync(TEST_IMAGE);
    
    const boundary = '----WebKitFormBoundary' + Date.now();
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="test.png"\r\nContent-Type: image/png\r\n\r\n`),
      imageBuffer,
      Buffer.from(`\r\n--${boundary}--`)
    ]);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/upload',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          console.log('   ❌ Erro HTTP:', res.statusCode, data);
          reject(new Error(`Upload falhou`));
        } else {
          try {
            const result = JSON.parse(data);
            console.log('   ✓ Upload bem-sucedido');
            console.log('   URL:', result.imageUrl);
            resolve(result.imageUrl);
          } catch (e) {
            reject(new Error('Resposta invalida'));
          }
        }
      });
    });
    
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function createProduct(imageUrl) {
  console.log('\n🛍️  3. Criando produto com imagem...');
  
  const product = {
    name: 'Teste ' + Date.now(),
    category: 'Pimentas',
    price: 29.90,
    stock: 100,
    active: true,
    description: 'Teste de fluxo',
    images: [imageUrl],
    sku: 'TEST-' + Date.now()
  };
  
  try {
    const response = await fetch(API_URL + '/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Erro ao criar produto');
    }
    
    console.log('   ✓ Produto criado: ID', data.id);
    return data;
  } catch (error) {
    console.log('   ❌ Erro:', error.message);
    throw error;
  }
}

function verifyFileOnDisk(imageUrl) {
  console.log('\n💾 4. Verificando arquivo no disco...');
  
  const filename = imageUrl.split('/').pop();
  const filepath = path.join(__dirname, 'uploads', filename);
  
  if (fs.existsSync(filepath)) {
    const size = fs.statSync(filepath).size;
    console.log('   ✓ Arquivo encontrado');
    console.log('   Caminho:', filepath);
    console.log('   Tamanho:', size, 'bytes');
    return true;
  } else {
    console.log('   ❌ Arquivo NAO encontrado!');
    console.log('   Procurado em:', filepath);
    
    const uploads = path.join(__dirname, 'uploads');
    if (fs.existsSync(uploads)) {
      const files = fs.readdirSync(uploads);
      console.log('   Arquivos em uploads/:', files.length > 0 ? files.slice(0, 5).join(', ') : '(vazio)');
    }
    return false;
  }
}

async function testHTTPAccess(imageUrl) {
  console.log('\n🌐 5. Testando acesso HTTP...');
  
  try {
    const response = await fetch('http://localhost:3000' + imageUrl);
    
    if (response.ok) {
      console.log('   ✓ Arquivo acessivel via HTTP');
      console.log('   Status:', response.status);
      return true;
    } else {
      console.log('   ❌ Erro HTTP:', response.status);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Erro de conexao:', error.message);
    return false;
  }
}

async function verifyInDatabase(productId) {
  console.log('\n🔍 6. Verificando no banco de dados...');
  
  try {
    const result = await db.query(
      'SELECT id, image_url FROM product_images WHERE product_id = $1',
      [productId]
    );
    
    if (result.rows.length === 0) {
      console.log('   ❌ Nenhuma imagem encontrada no BD para produto', productId);
      return false;
    }
    
    result.rows.forEach(row => {
      console.log('   ✓ Imagem no BD:', row.image_url);
    });
    return true;
  } catch (error) {
    console.log('   ❌ Erro BD:', error.message);
    return false;
  }
}

async function verifyViaAPI(productId) {
  console.log('\n📡 7. Verificando via GET /api/products/:id...');
  
  try {
    const response = await fetch(`${API_URL}/products/${productId}`);
    const product = await response.json();
    
    if (!product.images || product.images.length === 0) {
      console.log('   ❌ Produto retornado mas SEM imagens');
      return false;
    }
    
    console.log('   ✓ Produto retornado com imagens');
    console.log('   Imagens:', product.images);
    return true;
  } catch (error) {
    console.log('   ❌ Erro:', error.message);
    return false;
  }
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║        🧪 TESTE FLUXO COMPLETO DE IMAGENS                 ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  let results = {
    upload: false,
    disk: false,
    http: false,
    db: false,
    api: false
  };
  
  try {
    createTestImage();
    await delay(500);
    
    const imageUrl = await uploadImage();
    results.upload = true;
    await delay(1000);
    
    const product = await createProduct(imageUrl);
    await delay(500);
    
    results.disk = verifyFileOnDisk(imageUrl);
    results.http = await testHTTPAccess(imageUrl);
    results.db = await verifyInDatabase(product.id);
    results.api = await verifyViaAPI(product.id);
    
  } catch (error) {
    console.log('\n' + 'Erro fatal:', error.message);
  }
  
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                      RESUMO FINAL                          ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('║ Upload de Arquivo         : ' + (results.upload ? '✅' : '❌'));
  console.log('║ Arquivo no Disco          : ' + (results.disk ? '✅' : '❌'));
  console.log('║ Acesso HTTP               : ' + (results.http ? '✅' : '❌'));
  console.log('║ Registro no BD            : ' + (results.db ? '✅' : '❌'));
  console.log('║ GET API com Imagem        : ' + (results.api ? '✅' : '❌'));
  
  const allOk = Object.values(results).every(v => v);
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log('║ Status Final              : ' + (allOk ? '✅ TUDO OK!' : '❌ COM PROBLEMAS'));
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  if (fs.existsSync(TEST_IMAGE)) {
    fs.unlinkSync(TEST_IMAGE);
  }
  
  try {
    await db.query('SELECT 1');
  } catch (e) {}
  
  process.exit(allOk ? 0 : 1);
}

main().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
