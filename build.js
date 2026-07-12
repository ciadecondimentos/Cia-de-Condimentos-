const fs = require('fs');
const path = require('path');

console.log('🔨 Building for Vercel...');

// Criar diretório de saída
const outputDir = 'out';
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

// Copiar frontend para out
console.log('📁 Copying frontend files...');
copyDir('frontend', outputDir);

// Also create a copy inside the frontend folder (frontend/out)
// This ensures Vercel finds the output directory whether project root
// is repository root or the `frontend` subfolder.
try {
  const frontendOut = path.join('frontend', 'out');
  if (fs.existsSync(frontendOut)) {
    // remove existing frontend/out to avoid stale files
    fs.rmSync(frontendOut, { recursive: true, force: true });
  }
  copyDir(outputDir, frontendOut);
  console.log(`  ✓ ${frontendOut}`);
} catch (err) {
  console.warn('⚠️  Não foi possível criar frontend/out:', err.message);
}

console.log('✅ Build complete!');
