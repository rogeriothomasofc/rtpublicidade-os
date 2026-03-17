-- Change type values from 'Income'/'Expense' to 'Revenue'/'Expense'
-- First, update existing data
UPDATE public.finance SET type = 'Income' WHERE type = 'Income';

-- Add new columns for expense tracking
ALTER TABLE public.finance 
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS cost_center text;

-- Update existing records to have type 'Income' (they will be treated as Revenue)
-- The enum already has 'Income' and 'Expense', we'll use 'Income' as Revenue in the UI