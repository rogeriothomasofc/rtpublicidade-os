-- Tabela de cadência de leads cruzados (Instagram + GMB)
CREATE TABLE IF NOT EXISTS lead_cadence (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  instagram_prospect_id uuid REFERENCES instagram_prospects(id) ON DELETE SET NULL,
  gmb_lead_id uuid REFERENCES gmb_leads(id) ON DELETE SET NULL,
  -- Dados unificados do lead
  lead_name text NOT NULL,
  company text,
  website text,
  phone text,
  email text,
  -- Scores
  heat_score integer DEFAULT 0, -- 0 a 100
  instagram_score integer DEFAULT 0,
  gmb_score integer DEFAULT 0,
  -- IA
  ai_unified_analysis text,
  cadence_steps jsonb DEFAULT '[]'::jsonb,
  -- Controle
  status text DEFAULT 'pending', -- pending | active | completed | paused
  current_step integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE lead_cadence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage lead_cadence"
  ON lead_cadence FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Trigger updated_at
CREATE TRIGGER update_lead_cadence_updated_at
  BEFORE UPDATE ON lead_cadence
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
