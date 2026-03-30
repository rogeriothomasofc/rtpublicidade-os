-- Add self-update form token to clients table
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS form_token uuid UNIQUE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS form_token_created_at timestamptz DEFAULT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS clients_form_token_idx
  ON public.clients (form_token)
  WHERE form_token IS NOT NULL;
