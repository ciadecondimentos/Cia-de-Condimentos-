/**
 * Migração: Adicionar suporte para PIX no CRM com atualização automática
 * Data: 27 de maio de 2026
 * Descrição: Adiciona coluna crm_purchase_id na tabela payments para vincular pagamentos PIX com compras do CRM
 * Versão: Idempotente (segura para rodar múltiplas vezes)
 */

const db = require('../db');

async function migrate() {
  try {
    console.log('  📝 Migration: Adicionando suporte para CRM em payments...');

    // 1. Verificar se coluna existe
    const colResult = await db.query(
      `SELECT 1 FROM information_schema.columns 
       WHERE table_name='payments' AND column_name='crm_purchase_id'`
    );

    if (colResult.rows.length === 0) {
      console.log('    • Adicionando coluna crm_purchase_id...');
      await db.query('ALTER TABLE payments ADD COLUMN crm_purchase_id INTEGER;');
    } else {
      console.log('    • Coluna crm_purchase_id já existe');
    }

    // 2. Verificar se constraint existe
    const constraintResult = await db.query(
      `SELECT 1 FROM information_schema.table_constraints 
       WHERE table_name='payments' AND constraint_name='fk_payments_crm_purchases'`
    );

    if (constraintResult.rows.length === 0) {
      console.log('    • Adicionando constraint de chave estrangeira...');
      await db.query(
        `ALTER TABLE payments ADD CONSTRAINT fk_payments_crm_purchases 
         FOREIGN KEY (crm_purchase_id) REFERENCES crm_purchases(id) ON DELETE SET NULL;`
      );
    } else {
      console.log('    • Constraint fk_payments_crm_purchases já existe');
    }

    // 3. Criar índices (idempotente)
    console.log('    • Criando índices...');
    await db.query('CREATE INDEX IF NOT EXISTS idx_payments_crm_purchase_id ON payments(crm_purchase_id);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_payments_mp_payment_id ON payments(mp_payment_id);');

    console.log('  ✅ Migration 003 concluída com sucesso');
    return true;
  } catch (error) {
    console.error('  ❌ Erro na migration 003:', error.message);
    throw error;
  }
}

module.exports = { migrate };
