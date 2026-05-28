-- Migração: Adicionar suporte para PIX no CRM com atualização automática
-- Data: 27 de maio de 2026
-- Descrição: Adiciona coluna crm_purchase_id na tabela payments para vincular pagamentos PIX com compras do CRM

-- 1. Adicionar coluna crm_purchase_id
ALTER TABLE payments ADD COLUMN crm_purchase_id INTEGER;

-- 2. Adicionar restrição de chave estrangeira
ALTER TABLE payments ADD CONSTRAINT fk_payments_crm_purchases 
  FOREIGN KEY (crm_purchase_id) REFERENCES crm_purchases(id) ON DELETE SET NULL;

-- 3. Criar índice para melhorar performance
CREATE INDEX idx_payments_crm_purchase_id ON payments(crm_purchase_id);

-- 4. Criar índice para melhorar performance de queries por mp_payment_id
CREATE INDEX idx_payments_mp_payment_id ON payments(mp_payment_id) IF NOT EXISTS;

-- Verificação: Consultar estrutura da tabela payments
-- SELECT * FROM information_schema.columns WHERE table_name='payments' ORDER BY ordinal_position;

-- Teste: Inserir um pagamento de teste
-- INSERT INTO payments (order_id, crm_purchase_id, mp_payment_id, status, amount, payment_method, qr_code, payer_email)
-- VALUES (NULL, 1, 'TEST_12345', 'pending', 100.00, 'pix', 'TEST_QR_CODE', 'test@example.com');

