-- ──────────────────────────────────────────────────────────────────────────────
-- Instagram username detectado automaticamente no lead do Google Maps
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE gmb_leads
  ADD COLUMN IF NOT EXISTS instagram_username text,
  ADD COLUMN IF NOT EXISTS instagram_found_via text, -- 'website' | 'name_search' | 'manual'
  ADD COLUMN IF NOT EXISTS icp_score integer,
  ADD COLUMN IF NOT EXISTS icp_qualificado boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_prospectado_em timestamptz,
  ADD COLUMN IF NOT EXISTS ai_diagnosis text,
  ADD COLUMN IF NOT EXISTS ai_messages jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS website_issues jsonb;

-- ──────────────────────────────────────────────────────────────────────────────
-- Configuração da prospecção automática (toggle liga/desliga + parâmetros)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prospeccao_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ativa boolean NOT NULL DEFAULT false,
  leads_por_dia integer NOT NULL DEFAULT 20,
  horario_inicio text NOT NULL DEFAULT '09:00',    -- horário local de início
  intervalo_min_minutos integer NOT NULL DEFAULT 8, -- intervalo mínimo entre envios
  intervalo_max_minutos integer NOT NULL DEFAULT 15,-- intervalo máximo entre envios
  icp_score_minimo integer NOT NULL DEFAULT 60,    -- score mínimo para abordar
  meeting_link text,                               -- link do Calendly/Google Meet
  whatsapp_warmup_dias integer NOT NULL DEFAULT 7, -- dias de warm-up antes de prospectar
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Garante apenas 1 linha de config
CREATE UNIQUE INDEX IF NOT EXISTS prospeccao_config_singleton ON prospeccao_config ((true));

-- Insere config padrão
INSERT INTO prospeccao_config (ativa, leads_por_dia, icp_score_minimo)
VALUES (false, 20, 60)
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE prospeccao_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_prospeccao_config"
  ON prospeccao_config FOR ALL
  USING (true) WITH CHECK (true);

GRANT ALL ON TABLE prospeccao_config TO anon, authenticated, service_role;

-- ──────────────────────────────────────────────────────────────────────────────
-- Log de execuções da prospecção automática
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prospeccao_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  executado_em timestamptz NOT NULL DEFAULT now(),
  leads_processados integer NOT NULL DEFAULT 0,
  leads_qualificados integer NOT NULL DEFAULT 0,
  leads_abordados integer NOT NULL DEFAULT 0,
  leads_fora_icp integer NOT NULL DEFAULT 0,
  erros integer NOT NULL DEFAULT 0,
  detalhes jsonb DEFAULT '[]'::jsonb -- array de {lead_id, nome, status, canal, erro?}
);

ALTER TABLE prospeccao_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_prospeccao_log"
  ON prospeccao_log FOR ALL
  USING (true) WITH CHECK (true);

GRANT ALL ON TABLE prospeccao_log TO anon, authenticated, service_role;

-- Trigger updated_at na config
CREATE TRIGGER update_prospeccao_config_updated_at
  BEFORE UPDATE ON prospeccao_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
