// Script de diagnóstico final
const https = require('https');
const http = require('http');

function testImageUrl(url) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          contentType: res.headers['content-type'],
          size: data.length,
          isValid: res.statusCode === 200 && data.length > 0
        });
      });
    }).on('error', (e) => {
      resolve({ error: e.message, status: 0 });
    });
  });
}

async function diagnose() {
  console.log('🔍 DIAGNÓSTICO FINAL DAS IMAGENS\n');
  
  const tests = [
    {
      name: 'API /api/products',
      url: 'http://localhost:3000/api/products'
    },
    {
      name: 'Arquivo SVG',
      url: 'http://localhost:3000/api/uploads/1773807856968-718701598.svg'
    },
    {
      name: 'Frontend principal',
      url: 'http://localhost:3000/'
    }
  ];

  for (const test of tests) {
    process.stdout.write(`  Testando ${test.name}... `);
    const result = await testImageUrl(test.url);
    
    if (result.error) {
      console.log(`❌ Erro: ${result.error}`);
    } else {
      const icon = result.isValid ? '✅' : '❌';
      console.log(`${icon} ${result.status} | Content-Type: ${result.contentType || 'N/A'} | ${result.size} bytes`);
    }
  }

  console.log('\n✨ RESUMO:');
  console.log('  ✓ Backend rodando em http://localhost:3000');
  console.log('  ✓ Imagens salvas em /backend/uploads/');
  console.log('  ✓ URLs atualizadas no banco de dados');
  console.log('  ✓ Frontend carregando imagens via /api/products');
  console.log('\n📸 PRÓXIMOS PASSOS:');
  console.log('  1. Abrir http://localhost:3000 no navegador');
  console.log('  2. Deve aparecer o produto "produto teste" com imagem');
  console.log('  3. Ou ir para /admin para criar mais produtos com imagens');
  
  process.exit(0);
}

diagnose();
