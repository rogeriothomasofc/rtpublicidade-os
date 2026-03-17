
-- Add new pipeline stage enum values
ALTER TYPE public.pipeline_stage ADD VALUE IF NOT EXISTS 'Qualificação';
ALTER TYPE public.pipeline_stage ADD VALUE IF NOT EXISTS 'Diagnóstico';
ALTER TYPE public.pipeline_stage ADD VALUE IF NOT EXISTS 'Reunião Agendada';
ALTER TYPE public.pipeline_stage ADD VALUE IF NOT EXISTS 'Proposta Enviada';
ALTER TYPE public.pipeline_stage ADD VALUE IF NOT EXISTS 'Negociação';

-- Add description column to pipeline_stages
ALTER TABLE public.pipeline_stages ADD COLUMN IF NOT EXISTS description text;

-- Add loss_reason column to sales_pipeline
ALTER TABLE public.sales_pipeline ADD COLUMN IF NOT EXISTS loss_reason text;
