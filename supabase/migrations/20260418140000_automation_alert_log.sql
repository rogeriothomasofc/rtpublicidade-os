-- Tabela de log de alertas enviados (controle de cooldown)
CREATE TABLE IF NOT EXISTS automation_alert_log (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_id text        NOT NULL REFERENCES automation_configs(id) ON DELETE CASCADE,
  client_id     uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  sent_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alert_log_lookup
  ON automation_alert_log (automation_id, client_id, sent_at DESC);

-- Coluna cooldown_days em automation_configs (padrão = mesmo que threshold_days)
ALTER TABLE automation_configs
  ADD COLUMN IF NOT EXISTS cooldown_days integer;

UPDATE automation_configs SET cooldown_days = threshold_days WHERE cooldown_days IS NULL;

-- RLS
ALTER TABLE automation_alert_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver log de alertas"
  ON automation_alert_log FOR ALL
  USING (true)
  WITH CHECK (true);
