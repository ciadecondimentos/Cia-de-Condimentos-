const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testUpload() {
  console.log('🧪 Testando upload de imagem real...\n');
  
  // Criar uma imagem PNG de teste
  const testImagePath = path.join(__dirname, 'test-image.png');
  
  if (!fs.existsSync(testImagePath)) {
    console.log('📝 Criando imagem PNG de teste...');
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
    fs.writeFileSync(testImagePath, pngBuffer);
    console.log('✓ Imagem criada\n');
  }
  
  try {
    console.log('📤 Fazendo upload...');
    const form = new FormData();
    form.append('image', fs.createReadStream(testImagePath), 'test-image.png');
    
    const response = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      body: form
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Upload bem-sucedido!');
      console.log('📁 URL: ' + data.imageUrl);
      
      // Verificar o arquivo salvo
      const filename = data.imageUrl.split('/').pop();
      const savedPath = path.join(__dirname, 'backend/uploads', filename);
      
      // Dar um tempo para o arquivo ser escrito
      setTimeout(() => {
        if (fs.existsSync(savedPath)) {
          const stats = fs.statSync(savedPath);
          const content = fs.readFileSync(savedPath, 'utf8');
          
          console.log('\n🔍 Analisando arquivo salvo:');
          console.log('  Tamanho: ' + stats.size + ' bytes');
          console.log('  Primeiros 100 caracteres:', content.substring(0, 100));
          
          if (content.includes('svg') || content.includes('linearGradient')) {
            console.log('\n⚠️  PROBLEMA: Arquivo é um SVG FAKE!');
            console.log('   Conteúdo esperado: dados binários PNG');
            console.log('   Conteúdo encontrado: SVG text');
          } else if (content.includes('\x89PNG')) {
            console.log('\n✅ SUCESSO: Arquivo é um PNG real!');
          } else {
            console.log('\n❓ Tipo de arquivo desconhecido');
          }
        } else {
          console.log('\n❌ Arquivo não encontrado no servidor');
        }
      }, 500);
      
    } else {
      console.log('❌ Upload falhou:');
      console.log(data.error || 'Erro desconhecido');
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testUpload();
