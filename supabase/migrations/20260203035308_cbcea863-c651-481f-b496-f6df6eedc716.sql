-- Add duration_months column to sales_pipeline to store contract duration before conversion
ALTER TABLE public.sales_pipeline ADD COLUMN duration_months INTEGER DEFAULT 12;