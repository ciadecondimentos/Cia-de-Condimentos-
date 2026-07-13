#!/usr/bin/env node

// Script de diagnóstico - Verificar estado do banco de dados e imagens
const dotenv = require('dotenv');
dotenv.config();

const db = require('./db');

async function runDiagnostics() {
  console.log('\n🔍 DIAGNÓSTICO DO SISTEMA DE IMAGENS\n');
  console.log('=' .repeat(60));
  
  try {
    // 1. Verificar conexão com banco
    console.log('\n1️⃣ Testando Conexão com Banco de Dados...');
    try {
      const connectionTest = await db.query('SELECT NOW()');
      console.log('✅ Conexão OK');
      console.log(`   Timestamp: ${connectionTest.rows[0].now}`);
    } catch (err) {
      console.log('❌ Erro na conexão:', err.message);
      return;
    }

    // 2. Listar productos
    console.log('\n2️⃣ Buscando Produtos...');
    const productsResult = await db.query('SELECT id, name, active FROM products ORDER BY id LIMIT 50');
    const products = productsResult.rows;
    
    if (products.length === 0) {
      console.log('❌ NENHUM PRODUTO ENCONTRADO!');
      console.log('   Ação: Criar produtos via Admin Panel (/admin.html)');
    } else {
      console.log(`✅ ${products.length} produto(s) encontrado(s)`);
      products.forEach(p => {
        console.log(`   - ID ${p.id}: ${p.name} ${p.active ? '(ATIVO)' : '(INATIVO)'}`);
      });
    }

    // 3. Verificar tabela product_images
    console.log('\n3️⃣ Buscando Imagens no Banco...');
    const imagesResult = await db.query('SELECT COUNT(*) as total FROM product_images');
    const imagesTotalCount = imagesResult.rows[0].total;
    
    if (imagesTotalCount === 0) {
      console.log('❌ NENHUMA IMAGEM ENCONTRADA na tabela product_images!');
      console.log('   Possíveis causas:');
      console.log('   A. Nenhum produto foi criado com imagens');
      console.log('   B. As imagens foram criadas mas não foram salvas no banco');
      console.log('   Ação: Ir para Admin Panel e criar um produto COM imagem');
    } else {
      console.log(`✅ ${imagesTotalCount} imagem(s) encontrada(s)`);
      
      // Show details per product
      const detailedResult = await db.query(`
        SELECT p.id, p.name, COUNT(pi.id) as image_count
        FROM products p
        LEFT JOIN product_images pi ON p.id = pi.product_id
        GROUP BY p.id, p.name
        ORDER BY p.id
      `);
      
      detailedResult.rows.forEach(row => {
        console.log(`   - Produto ID ${row.id}: ${row.name} → ${row.image_count} imagem(s)`);
      });
    }

    // 4. Mostrar exemplos de URLs
    console.log('\n4️⃣ Exemplos de URLs de Imagens no Banco...');
    const examplesResult = await db.query(
      'SELECT product_id, image_url FROM product_images LIMIT 5'
    );
    
    if (examplesResult.rows.length === 0) {
      console.log('   (Sem imagens para mostrar)');
    } else {
      examplesResult.rows.forEach((row, idx) => {
        console.log(`   ${idx + 1}. Produto ${row.product_id}: ${row.image_url}`);
      });
    }

    // 5. Testar API
    console.log('\n5️⃣ Testando API GET /api/products...');
    console.log('   (Você precisa iniciar o servidor para este testes)');
    console.log('   Execute: npm start');
    console.log('   Depois acesse: http://localhost:3000/api/products');

    // 6. Resumo
    console.log('\n' + '=' .repeat(60));
    console.log('\n📋 RESUMO:\n');
    
    if (products.length === 0) {
      console.log('❌ NÃO HÁ PRODUTOS CADASTRADOS');
      console.log('   ➜ Ir para: http://localhost:3000/admin.html');
      console.log('   ➜ Clicar: "Adicionar Novo Produto"');
      console.log('   ➜ Selecionar: Arquivo de imagem');
      console.log('   ➜ Salvar');
    } else if (imagesTotalCount === 0) {
      console.log('⚠️  HÁ PRODUTOS MAS NENHUMA IMAGEM CADASTRADA');
      console.log('   Possíveis causas:');
      console.log('   A. Os produtos foram criados SEM imagens');
      console.log('   B. Há um bug no upload de imagens');
      console.log('   ➜ Ação: Editar um produto e adicionar imagem');
    } else {
      console.log('✅ IMAGENS ESTÃO CADASTRADAS NO BANCO');
      console.log('   Se ainda não aparecem na loja:');
      console.log('   1. Verificar se URLs estão corretas');
      console.log('   2. Iniciar servidor: npm start');
      console.log('   3. Acessar: http://localhost:3000/test-images.html');
      console.log('   4. Ver resultado da API e diagnosticar');
    }

    console.log('\n' + '=' .repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Erro durante diagnóstico:', error);
  } finally {
    process.exit(0);
  }
}

runDiagnostics();
