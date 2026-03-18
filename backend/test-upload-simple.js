const fs = require('fs');
const path = require('path');
const http = require('http');

async function testUpload() {
  console.log('🧪 Testando upload de imagem real...\n');
  
  // Mínimo PNG válido: 1x1 vermelho
  const pngBuffer = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
    0x54, 0x08, 0x99, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
    0x00, 0x05, 0xFE, 0x02, 0xFE, 0x73, 0xBC, 0xEE,
    0xCC, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
    0x44, 0xAE, 0x42, 0x60, 0x82
  ]);
  
  const boundary = '----FormBoundary' + Math.random().toString(36).substr(2, 9);
  
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="test-imagem-real.png"\r\nContent-Type: image/png\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;
  
  const headerBuffer = Buffer.from(header, 'utf-8');
  const footerBuffer = Buffer.from(footer, 'utf-8');
  
  // Criar o body completo
  const body = Buffer.concat([headerBuffer, pngBuffer, footerBuffer]);
  
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
  
  console.log('📤 Fazendo upload de PNG real...');
  
  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (res.statusCode === 200) {
            console.log('✅ Upload bem-sucedido!');
            console.log('📁 URL retornada: ' + response.imageUrl);
            
            // Verificar o arquivo salvo
            const filename = response.imageUrl.split('/').pop();
            const savedPath = path.join(__dirname, 'uploads', filename);
            
            // Dar um tempo para o arquivo ser escrito
            setTimeout(() => {
              if (fs.existsSync(savedPath)) {
                const stats = fs.statSync(savedPath);
                const contentStart = fs.readFileSync(savedPath).toString('hex', 0, 20);
                
                console.log('\n🔍 Verificando arquivo no servidor:');
                console.log('  Arquivo: ', filename);
                console.log('  Tamanho: ' + stats.size + ' bytes');
                console.log('  Magic bytes (hex): ' + contentStart);
                
                // Verificar se é PNG (começa com 89504e47)
                if (contentStart.startsWith('89504e47')) {
                  console.log('\n✅ SUCESSO TOTAL: Arquivo é um PNG real!');
                  console.log('   O arquivo foi salvo corretamente como PNG');
                  console.log('   Agora quando você acessar a URL no navegador,');
                  console.log('   verá a imagem real, não um SVG fake!');
                } else {
                  // Tentar verificar se é SVG
                  const textContent = fs.readFileSync(savedPath, 'utf8').substring(0, 100);
                  if (textContent.includes('svg') || textContent.includes('linearGradient')) {
                    console.log('\n⚠️  PROBLEMA ENCONTRADO: Arquivo é um SVG FAKE!');
                    console.log('   Isso significa que há código convertendo PNG para SVG');
                    console.log('   Primeiros 200 chars:', fs.readFileSync(savedPath, 'utf8').substring(0, 200));
                  } else {
                    console.log('\n❓ Arquivo de tipo desconhecido');
                    console.log('   Primeiros 100 chars:', textContent);
                  }
                }
              } else {
                console.log('\n❌ ERRO: Arquivo não encontrado no servidor');
                console.log('   Caminho esperado: ' + savedPath);
              }
              resolve();
            }, 500);
            
          } else {
            console.log('❌ Upload falhou:', res.statusCode);
            console.log('Resposta:', response.error || data);
            resolve();
          }
        } catch (e) {
          console.log('❌ Erro ao parsear resposta:');
          console.log(data);
          resolve();
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Erro na requisição:', error.message);
      resolve();
    });
    
    req.write(body);
    req.end();
  });
}

testUpload();
