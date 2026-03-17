
-- Enum para status da proposta
CREATE TYPE public.proposal_status AS ENUM ('Rascunho', 'Enviada', 'Em negociação', 'Aprovada', 'Perdida', 'Expirada');

-- Tabela principal de propostas
CREATE TABLE public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  pipeline_lead_id UUID REFERENCES public.sales_pipeline(id) ON DELETE SET NULL,
  responsible_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  
  -- Dados básicos
  company TEXT,
  campaign_objective TEXT,
  media_budget NUMERIC DEFAULT 0,
  segment TEXT,
  
  -- Escopo
  platforms TEXT[] DEFAULT '{}',
  services_included TEXT,
  creatives TEXT,
  landing_pages TEXT,
  automations TEXT,
  sla TEXT,
  
  -- Precificação
  monthly_fee NUMERIC DEFAULT 0,
  setup_fee NUMERIC DEFAULT 0,
  commission NUMERIC DEFAULT 0,
  tax_rate NUMERIC DEFAULT 0,
  margin NUMERIC DEFAULT 0,
  plan_type TEXT,
  
  -- Condições
  validity_months INTEGER DEFAULT 12,
  cancellation_terms TEXT,
  penalty TEXT,
  renewal_terms TEXT,
  response_deadline INTEGER,
  
  -- Meta
  notes TEXT,
  status public.proposal_status NOT NULL DEFAULT 'Rascunho',
  probability INTEGER DEFAULT 0,
  version INTEGER DEFAULT 1,
  parent_proposal_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to proposals"
  ON public.proposals FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger updated_at
CREATE TRIGGER update_proposals_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
