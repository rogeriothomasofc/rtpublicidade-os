
-- Enum for planning campaign status
CREATE TYPE public.planning_status AS ENUM (
  'Rascunho', 'Em Aprovação', 'Pronto para Subir', 'Publicado', 'Em Teste', 'Escalando', 'Pausado'
);

-- 1. Planning Campaigns (main table)
CREATE TABLE public.planning_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  objective TEXT,
  status planning_status NOT NULL DEFAULT 'Rascunho',
  platform TEXT NOT NULL DEFAULT 'Meta',
  start_date DATE,
  end_date DATE,
  total_budget NUMERIC DEFAULT 0,
  daily_budget NUMERIC DEFAULT 0,
  kpis JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.planning_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access to planning_campaigns" ON public.planning_campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Planning Structures
CREATE TABLE public.planning_structures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  planning_id UUID NOT NULL REFERENCES public.planning_campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Prospecção',
  objective TEXT,
  budget NUMERIC DEFAULT 0,
  kpis JSONB DEFAULT '[]'::jsonb,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.planning_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access to planning_structures" ON public.planning_structures FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Planning Audiences
CREATE TABLE public.planning_audiences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  planning_id UUID NOT NULL REFERENCES public.planning_campaigns(id) ON DELETE CASCADE,
  structure_id UUID REFERENCES public.planning_structures(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Interesse',
  description TEXT,
  estimated_size TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.planning_audiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access to planning_audiences" ON public.planning_audiences FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Planning Creatives
CREATE TABLE public.planning_creatives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  planning_id UUID NOT NULL REFERENCES public.planning_campaigns(id) ON DELETE CASCADE,
  structure_id UUID REFERENCES public.planning_structures(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'Imagem',
  status TEXT NOT NULL DEFAULT 'Pendente',
  file_url TEXT,
  copy_text TEXT,
  headline TEXT,
  cta TEXT,
  version INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.planning_creatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access to planning_creatives" ON public.planning_creatives FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Planning Tests (A/B)
CREATE TABLE public.planning_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  planning_id UUID NOT NULL REFERENCES public.planning_campaigns(id) ON DELETE CASCADE,
  hypothesis TEXT NOT NULL,
  variable TEXT NOT NULL,
  variants JSONB DEFAULT '[]'::jsonb,
  metric TEXT,
  status TEXT NOT NULL DEFAULT 'Planejado',
  winner TEXT,
  results TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.planning_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access to planning_tests" ON public.planning_tests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Planning Checklists
CREATE TABLE public.planning_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  planning_id UUID NOT NULL REFERENCES public.planning_campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  category TEXT DEFAULT 'Geral',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.planning_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access to planning_checklists" ON public.planning_checklists FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Planning Forecasts
CREATE TABLE public.planning_forecasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  planning_id UUID NOT NULL REFERENCES public.planning_campaigns(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  spend NUMERIC DEFAULT 0,
  impressions NUMERIC DEFAULT 0,
  clicks NUMERIC DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  cpm NUMERIC DEFAULT 0,
  conversions NUMERIC DEFAULT 0,
  cpa NUMERIC DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  roas NUMERIC DEFAULT 0,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.planning_forecasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated access to planning_forecasts" ON public.planning_forecasts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_planning_campaigns_updated_at BEFORE UPDATE ON public.planning_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_planning_structures_updated_at BEFORE UPDATE ON public.planning_structures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_planning_audiences_updated_at BEFORE UPDATE ON public.planning_audiences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_planning_creatives_updated_at BEFORE UPDATE ON public.planning_creatives FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_planning_tests_updated_at BEFORE UPDATE ON public.planning_tests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_planning_checklists_updated_at BEFORE UPDATE ON public.planning_checklists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_planning_forecasts_updated_at BEFORE UPDATE ON public.planning_forecasts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
