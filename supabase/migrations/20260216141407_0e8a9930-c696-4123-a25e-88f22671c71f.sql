
-- Add phone and email to agency_settings for portal contact buttons
ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS email text;
