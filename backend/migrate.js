const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const { pool } = require('./db');

// Parse SQL statements, handling comments and semicolons properly
function parseSQLStatements(sql) {
  const statements = [];
  let current = '';
  let inString = false;
  let stringChar = '';
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1];
    const prevChar = i > 0 ? sql[i - 1] : '';

    // Handle line comments
    if (!inString && !inBlockComment && char === '-' && nextChar === '-') {
      inLineComment = true;
      i++; // Skip next -
      continue;
    }

    if (inLineComment && (char === '\n' || char === '\r')) {
      inLineComment = false;
      continue;
    }

    if (inLineComment) {
      continue;
    }

    // Handle block comments
    if (!inString && !inLineComment && char === '/' && nextChar === '*') {
      inBlockComment = true;
      i++; // Skip *
      continue;
    }

    if (inBlockComment && char === '*' && nextChar === '/') {
      inBlockComment = false;
      i++; // Skip /
      continue;
    }

    if (inBlockComment) {
      continue;
    }

    // Handle strings
    if (!inLineComment && !inBlockComment) {
      if ((char === "'" || char === '"') && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      // Handle statement terminator
      if (char === ';' && !inString) {
        current += char;
        const trimmed = current.trim();
        if (trimmed.length > 0) {
          statements.push(trimmed);
        }
        current = '';
        continue;
      }
    }

    current += char;
  }

  // Add any remaining statement
  const trimmed = current.trim();
  if (trimmed.length > 0) {
    statements.push(trimmed);
  }

  return statements;
}

async function runMigrations() {
  try {
    console.log('🔄 Rodando migrations...');
    
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrations = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Ordena alfabeticamente
    
    for (const migration of migrations) {
      const migrationPath = path.join(migrationsDir, migration);
      const sql = fs.readFileSync(migrationPath, 'utf8');
      
      console.log(`  ⏳ Executando: ${migration}`);
      
      // Parse statements properly
      const statements = parseSQLStatements(sql);
      
      let stmtCount = 0;
      for (const statement of statements) {
        stmtCount++;
        try {
          await pool.query(statement);
        } catch (err) {
          console.error(`    ❌ Erro na statement ${stmtCount}: ${err.message}`);
          console.error(`    SQL: ${statement.substring(0, 100)}...`);
          throw err;
        }
      }
      
      console.log(`  ✅ ${migration} concluído (${stmtCount} statements)`);
    }
    
    console.log('✅ Todas as migrations executadas com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao executar migrations:', error.message);
    process.exit(1);
  }
}

runMigrations();
