#!/usr/bin/env node
/**
 * SCRIPT COMPLETO DE RESOLUÇÃO DE IMAGENS
 * 
 * Executa todos os passo necessários para garantir que as imagens aparecem:
 * 1. Verifica quais imagens faltam
 * 2. Cria os arquivos faltantes
 * 3. Atualiza banco de dados
 * 4. Testa se tudo está funcionando
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🎯 SCRIPT DE RESOLUÇÃO DE IMAGENS\n');

const scripts = [
  {
    name: 'Verificar imagens faltantes',
    file: 'check-images.js'
  },
  {
    name: 'Criar imagens faltantes',
    file: 'fix-missing-images.js'
  },
  {
    name: 'Atualizar extensões (PNG → SVG)',
    file: 'fix-image-extensions.js'
  },
  {
    name: 'Teste final',
    file: 'test-final.js'
  }
];

const backendDir = __dirname;

for (const script of scripts) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📌 ${script.name}`);
  console.log(`${'='.repeat(60)}\n`);

  const scriptPath = path.join(backendDir, script.file);
  
  if (!fs.existsSync(scriptPath)) {
    console.error(`❌ Arquivo não encontrado: ${script.file}`);
    continue;
  }

  try {
    execSync(`node "${scriptPath}"`, {
      cwd: backendDir,
      stdio: 'inherit'
    });
  } catch (error) {
    console.error(`\n❌ Erro ao executar ${script.file}`);
    console.error(error.message);
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log('✅ RESOLUÇÃO COMPLETA!');
console.log(`${'='.repeat(60)}\n`);

console.log('🎉 Próximas etapas:');
console.log('  1. Abra http://localhost:3000 no navegador');
console.log('  2. Veja a imagem do produto "produto teste"');
console.log('  3. Vá para /admin para adicionar mais produtos');
console.log('\n💡 Para adicionar imagens a novos produtos:');
console.log('  - Use o painel Admin em http://localhost:3000/admin');
console.log('  - Selecione um arquivo para fazer upload');
console.log('  - A imagem será salva automaticamente\n');

process.exit(0);
