
-- Agency settings (singleton)
CREATE TABLE public.agency_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  logo_url text,
  cnpj text,
  monthly_revenue_goal numeric DEFAULT 0,
  monthly_profit_goal numeric DEFAULT 0,
  main_bank_account text,
  currency text DEFAULT 'BRL',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to agency_settings" ON public.agency_settings FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_agency_settings_updated_at
  BEFORE UPDATE ON public.agency_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Integrations
CREATE TABLE public.integrations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL, -- 'meta_ads' | 'evolution_api'
  name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'disconnected', -- 'connected' | 'disconnected' | 'expired'
  config jsonb DEFAULT '{}',
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to integrations" ON public.integrations FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Integration accounts (linked accounts per integration)
CREATE TABLE public.integration_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id uuid NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  account_external_id text NOT NULL,
  account_name text NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to integration_accounts" ON public.integration_accounts FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_integration_accounts_updated_at
  BEFORE UPDATE ON public.integration_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Integration logs
CREATE TABLE public.integration_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id uuid NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  action text NOT NULL,
  status text NOT NULL DEFAULT 'success', -- 'success' | 'error'
  message text,
  details jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to integration_logs" ON public.integration_logs FOR ALL USING (true) WITH CHECK (true);

-- Insert default agency settings row
INSERT INTO public.agency_settings (name) VALUES ('Minha Agência');
