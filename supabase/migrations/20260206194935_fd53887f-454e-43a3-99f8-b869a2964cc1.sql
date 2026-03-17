
-- Campaigns table (synced from Meta/Google)
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_account_id UUID REFERENCES public.integration_accounts(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'UNKNOWN',
  objective TEXT,
  daily_budget NUMERIC DEFAULT 0,
  lifetime_budget NUMERIC DEFAULT 0,
  start_time TIMESTAMPTZ,
  stop_time TIMESTAMPTZ,
  platform TEXT NOT NULL DEFAULT 'meta',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(integration_account_id, external_id)
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to campaigns" ON public.campaigns FOR ALL USING (true) WITH CHECK (true);

-- Daily metrics per campaign
CREATE TABLE public.campaign_metrics_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  impressions BIGINT DEFAULT 0,
  reach BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  spend NUMERIC DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  cpm NUMERIC DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  frequency NUMERIC DEFAULT 0,
  leads INTEGER DEFAULT 0,
  purchases INTEGER DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, date)
);

ALTER TABLE public.campaign_metrics_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to campaign_metrics_daily" ON public.campaign_metrics_daily FOR ALL USING (true) WITH CHECK (true);

-- Column presets for the campaigns table
CREATE TABLE public.campaign_column_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  columns JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_column_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to campaign_column_presets" ON public.campaign_column_presets FOR ALL USING (true) WITH CHECK (true);

-- Insert default presets
INSERT INTO public.campaign_column_presets (name, columns, is_default) VALUES
('Performance', '["name","client","account","status","objective","spend","impressions","clicks","ctr","cpc","cpm"]', true),
('Leads', '["name","client","status","spend","leads","cpl","conversions","ctr"]', false),
('Vendas', '["name","client","status","spend","purchases","revenue","cpa","roas"]', false),
('Branding', '["name","client","status","impressions","reach","frequency","cpm","likes","comments","shares"]', false),
('Financeiro', '["name","client","account","budget","spend","revenue","roas","cpa"]', false);

-- Trigger for updated_at on campaigns
CREATE TRIGGER update_campaigns_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaign_column_presets_updated_at
BEFORE UPDATE ON public.campaign_column_presets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
