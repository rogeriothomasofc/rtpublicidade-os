-- Make client_id nullable for expenses
ALTER TABLE public.finance ALTER COLUMN client_id DROP NOT NULL;