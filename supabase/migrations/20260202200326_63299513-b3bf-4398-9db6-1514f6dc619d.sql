-- Create enum for finance type
CREATE TYPE public.finance_type AS ENUM ('Income', 'Expense');

-- Add type column to finance table
ALTER TABLE public.finance 
ADD COLUMN type public.finance_type NOT NULL DEFAULT 'Income';