-- Adiciona campos para confirmação de e-mail
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_confirmed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_confirmation_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS email_confirmation_expires TIMESTAMPTZ;
