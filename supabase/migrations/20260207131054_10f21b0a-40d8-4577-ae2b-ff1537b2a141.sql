
-- Add source column to sales_pipeline
ALTER TABLE public.sales_pipeline ADD COLUMN source text NOT NULL DEFAULT 'manual';

-- Mark existing contacts that look like auto-synced (phone number as name, deal_value = 0)
-- These are contacts created by whatsapp sync where lead_name is just a phone number
UPDATE public.sales_pipeline 
SET source = 'whatsapp_sync' 
WHERE deal_value = 0 
  AND (lead_name ~ '^\d+$' OR lead_name ~ '^[a-z0-9]+$')
  AND stage = 'New';
