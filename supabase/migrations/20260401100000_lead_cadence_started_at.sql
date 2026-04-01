-- Adiciona campo started_at para rastrear quando o primeiro contato foi feito
-- e calcular quais passos da cadência estão vencendo hoje
ALTER TABLE lead_cadence ADD COLUMN IF NOT EXISTS started_at timestamptz;
