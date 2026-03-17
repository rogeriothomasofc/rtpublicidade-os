-- Add duration field to contracts table (in months)
ALTER TABLE public.contracts ADD COLUMN duration_months INTEGER DEFAULT 12;