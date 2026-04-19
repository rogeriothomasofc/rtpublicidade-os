-- Add Asaas fields to clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT UNIQUE;

-- Add Asaas fields to finance
ALTER TABLE finance ADD COLUMN IF NOT EXISTS asaas_charge_id TEXT UNIQUE;
ALTER TABLE finance ADD COLUMN IF NOT EXISTS asaas_payment_url TEXT;
ALTER TABLE finance ADD COLUMN IF NOT EXISTS asaas_pix_code TEXT;
ALTER TABLE finance ADD COLUMN IF NOT EXISTS asaas_billing_type TEXT;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_finance_asaas_charge_id ON finance(asaas_charge_id);
CREATE INDEX IF NOT EXISTS idx_clients_asaas_customer_id ON clients(asaas_customer_id);
