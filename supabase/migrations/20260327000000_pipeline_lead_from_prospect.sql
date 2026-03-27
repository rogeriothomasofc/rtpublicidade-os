-- 1. Alter sales_pipeline.stage from enum to text
--    Allows storing dynamic stage names like 'ATENDIMENTO_INICIA', 'QUALIFICACAO', etc.
ALTER TABLE public.sales_pipeline
  ALTER COLUMN stage TYPE text USING stage::text;

ALTER TABLE public.sales_pipeline
  ALTER COLUMN stage SET DEFAULT 'ATENDIMENTO_INICIA';

-- 2. Add pipeline_lead_id to gmb_leads to track when a lead was added to the pipeline
ALTER TABLE public.gmb_leads
  ADD COLUMN IF NOT EXISTS pipeline_lead_id uuid REFERENCES public.sales_pipeline(id) ON DELETE SET NULL;
