// Quick validation script to test that all modules load correctly
// Run with: node backend/validate-scripts.js

console.log('🧪 Validando carregamento de scripts...\n');

const tests = [];

// Test 1: Check admin-reports-v2.js content
console.log('📝 Teste 1: Verificando admin-reports-v2.js');
try {
  const fs = require('fs');
  const content = fs.readFileSync('./frontend/admin-reports-v2.js', 'utf-8');
  
  if (content.includes('const API_BASE = \'https://')) {
    console.log('❌ FALHA: admin-reports-v2.js ainda tem declaração de API_BASE');
    tests.push({ name: 'API_BASE declaration', result: false });
  } else if (!content.includes('// API_BASE já definido em admin.js')) {
    console.log('⚠️  AVISO: Comentário esperado não encontrado');
    tests.push({ name: 'API_BASE comment', result: false });
  } else {
    console.log('✅ PASSOU: API_BASE duplicado removido, comentário encontrado');
    tests.push({ name: 'API_BASE declaration', result: true });
  }
} catch (error) {
  console.log('❌ Erro ao ler arquivo:', error.message);
}

// Test 2: Check admin.js has API_BASE and toggleSidebar
console.log('\n📝 Teste 2: Verificando admin.js');
try {
  const fs = require('fs');
  const content = fs.readFileSync('./frontend/admin.js', 'utf-8');
  
  const hasAPIBase = content.includes('const API_BASE =');
  const hasToggleSidebar = content.includes('function toggleSidebar()');
  
  if (hasAPIBase && hasToggleSidebar) {
    console.log('✅ PASSOU: API_BASE e toggleSidebar encontrados');
    tests.push({ name: 'admin.js functions', result: true });
  } else {
    console.log('❌ FALHA: Funções esperadas não encontradas');
    if (!hasAPIBase) console.log('   - API_BASE não encontrado');
    if (!hasToggleSidebar) console.log('   - toggleSidebar não encontrado');
    tests.push({ name: 'admin.js functions', result: false });
  }
} catch (error) {
  console.log('❌ Erro ao ler arquivo:', error.message);
}

// Test 3: Check script loading order in admin.html
console.log('\n📝 Teste 3: Verificando ordem de scripts em admin.html');
try {
  const fs = require('fs');
  const content = fs.readFileSync('./frontend/admin.html', 'utf-8');
  
  const adminJsIndex = content.indexOf('src="admin.js"');
  const adminReportsIndex = content.indexOf('src="admin-reports-v2.js"');
  
  if (adminJsIndex > 0 && adminReportsIndex > adminJsIndex) {
    console.log('✅ PASSOU: admin.js carrega ANTES de admin-reports-v2.js');
    tests.push({ name: 'script order', result: true });
  } else {
    console.log('❌ FALHA: Ordem de scripts incorreta');
    tests.push({ name: 'script order', result: false });
  }
} catch (error) {
  console.log('❌ Erro ao ler arquivo:', error.message);
}

// Summary
console.log('\n' + '='.repeat(50));
const passed = tests.filter(t => t.result).length;
const total = tests.length;
console.log(`\n📊 Resultado: ${passed}/${total} testes passaram`);

if (passed === total) {
  console.log('\n✅ Todos os testes passaram! Scripts estão carregando corretamente.');
  process.exit(0);
} else {
  console.log('\n❌ Alguns testes falharam. Verifique os erros acima.');
  process.exit(1);
}
