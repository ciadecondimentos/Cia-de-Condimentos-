const fs = require('fs');
const path = require('path');

console.log('🔨 Building for Vercel...');

// Criar diretórios necessários
const outputDir = '.vercel/output/static';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Função recursiva para copiar arquivos
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const files = fs.readdirSync(src);
  files.forEach(file => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`  ✓ ${destPath}`);
    }
  });
}

// Copiar frontend
console.log('📁 Copying frontend files...');
copyDir('frontend', outputDir);

console.log('✅ Build complete!');
