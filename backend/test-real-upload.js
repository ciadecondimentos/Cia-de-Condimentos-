// Script para testar upload de arquivo
const fs = require('fs');
const path = require('path');
const http = require('http');

function uploadFile() {
  return new Promise((resolve) => {
    // Criar conteúdo SVG simples
    const svgContent = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="200" fill="#FF6B6B"/>
  <circle cx="100" cy="100" r="50" fill="white"/>
  <text x="100" y="110" text-anchor="middle" font-size="20" fill="#FF6B6B">TEST</text>
</svg>`;

    // Preparar multipart form data
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="test-image-real.svg"\r\nContent-Type: image/svg+xml\r\n\r\n`),
      Buffer.from(svgContent),
      Buffer.from(`\r\n--${boundary}--\r\n`)
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
        console.log('\n📤 RESPOSTA DO SERVIDOR:\n');
        console.log('Status:', res.statusCode);
        console.log('Headers:', res.headers);
        console.log('Body:', data);
        
        try {
          const json = JSON.parse(data);
          if (json.imageUrl) {
            console.log('\n✅ Upload respondeu com URL:', json.imageUrl);
            
            // Tentar acessar via fetch
            console.log('\n🔍 Verificando arquivo no disco...');
            const filename = json.imageUrl.split('/').pop();
            const upladsDir = path.join(__dirname, 'uploads');
            const filepath = path.join(upladsDir, filename);
            
            if (fs.existsSync(filepath)) {
              const stat = fs.statSync(filepath);
              console.log(`✅ Arquivo EXISTE: ${filepath}`);
              console.log(`   Tamanho: ${stat.size} bytes`);
              
              // Tentar acessar via HTTP
              const opts = {
                hostname: 'localhost',
                port: 3000,
                path: json.imageUrl,
                method: 'GET'
              };
              
              const checkReq = http.request(opts, (checkRes) => {
                let checkData = '';
                checkRes.on('data', chunk => checkData += chunk);
                checkRes.on('end', () => {
                  console.log(`\n✅ HTTP GET Status: ${checkRes.statusCode}`);
                  console.log(`   Content-Type: ${checkRes.headers['content-type']}`);
                  console.log(`   Bytes recebidos: ${checkData.length}`);
                  resolve();
                });
              });
              
              checkReq.on('error', (e) => {
                console.log(`❌ Erro ao fazer GET: ${e.message}`);
                resolve();
              });
              
              checkReq.end();
            } else {
              console.log(`❌ Arquivo NÃO EXISTE: ${filepath}`);
              console.log(`\n📁 Arquivos na pasta uploads:`);
              try {
                const files = fs.readdirSync(upladsDir);
                console.log(files.length > 0 ? files.join('\n') : 'Vazia!');
              } catch (e) {
                console.log('Erro ao listar:', e.message);
              }
              resolve();
            }
          }
        } catch (e) {
          console.log('❌ Erro parsing JSON:', e.message);
          resolve();
        }
      });
    });

    req.on('error', (e) => {
      console.error('❌ Erro na requisição:', e.message);
      resolve();
    });

    req.write(body);
    req.end();
  });
}

console.log('🧪 TESTE DE UPLOAD DE ARQUIVO\n');
uploadFile();
