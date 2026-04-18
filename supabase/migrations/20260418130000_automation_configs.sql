CREATE TABLE IF NOT EXISTS automation_configs (
  id              text PRIMARY KEY,
  name            text NOT NULL,
  description     text,
  enabled         boolean NOT NULL DEFAULT true,
  threshold_days  integer,
  cron_expression text NOT NULL DEFAULT '0 12 * * *',
  last_run_at     timestamptz,
  last_run_status text,         -- 'success' | 'error' | null
  last_run_summary jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_automation_configs_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_automation_configs_updated_at
  BEFORE UPDATE ON automation_configs
  FOR EACH ROW EXECUTE FUNCTION update_automation_configs_updated_at();

-- Configurações padrão
INSERT INTO automation_configs (id, name, description, enabled, threshold_days, cron_expression) VALUES
  ('instagram-alert', 'Alerta Instagram',   'Avisa clientes que não postam no Instagram há mais de X dias, com sugestões de conteúdo geradas por IA.', true, 7, '0 12 * * *'),
  ('vendas-alert',    'Alerta de Vendas',   'Avisa clientes que não registram vendas no portal há mais de X dias, com mensagem motivadora gerada por IA.', true, 5, '0 12 * * *')
ON CONFLICT (id) DO NOTHING;

-- RLS: somente admins da agência podem ver/editar
ALTER TABLE automation_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar automações"
  ON automation_configs FOR ALL
  USING (true)
  WITH CHECK (true);
