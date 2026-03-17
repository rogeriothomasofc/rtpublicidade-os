-- Create recurrence enum
CREATE TYPE public.finance_recurrence AS ENUM ('None', 'Monthly', 'Quarterly', 'Semiannual', 'Annual');

-- Add recurrence column to finance table
ALTER TABLE public.finance ADD COLUMN recurrence finance_recurrence NOT NULL DEFAULT 'None';