-- Remove Asaas integration columns
ALTER TABLE clients
  DROP COLUMN IF EXISTS asaas_customer_id;

ALTER TABLE finance
  DROP COLUMN IF EXISTS asaas_charge_id,
  DROP COLUMN IF EXISTS asaas_payment_url,
  DROP COLUMN IF EXISTS asaas_pix_code,
  DROP COLUMN IF EXISTS asaas_billing_type;

-- Remove Asaas integration record
DELETE FROM integrations WHERE provider = 'asaas';
