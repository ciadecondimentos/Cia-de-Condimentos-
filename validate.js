const fs = require('fs');
const code = fs.readFileSync('frontend/app.js', 'utf8');
const lines = code.split('\n');

let braces = 0;
let parens = 0;
let brackets = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '{') braces++;
    if (char === '}') braces--;
    if (char === '(') parens++;
    if (char === ')') parens--;
    if (char === '[') brackets++;
    if (char === ']') brackets--;
    
    if (braces < 0) {
      console.log(`ERROR at line ${i + 1}, col ${j + 1}: Extra closing brace '}'`);
      console.log(`  ${line}`);
      console.log(`  ${' '.repeat(j)}^`);
      process.exit(1);
    }
  }
}

console.log(`Total lines: ${lines.length}`);
console.log(`Final braces: ${braces}, parens: ${parens}, brackets: ${brackets}`);
if (braces !== 0 || parens !== 0 || brackets !== 0) {
  console.log('ERROR: Unmatched delimiters');
  process.exit(1);
}
console.log('OK: No syntax issues found');
