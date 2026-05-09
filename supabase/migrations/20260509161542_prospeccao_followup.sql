-- ─── Controle de follow-up por lead ──────────────────────────────────────────
-- Rastreia quais mensagens já foram enviadas e quando
ALTER TABLE gmb_leads
  ADD COLUMN IF NOT EXISTS followup_msg2_em timestamptz,  -- quando enviou msg 2 (dia 5)
  ADD COLUMN IF NOT EXISTS followup_msg3_em timestamptz,  -- quando enviou msg 3 (dia 10)
  ADD COLUMN IF NOT EXISTS followup_email_em timestamptz, -- quando enviou email (dia 3)
  ADD COLUMN IF NOT EXISTS email text;                    -- email do lead (para envio automático)

-- ─── Novo status: Sem Retorno ─────────────────────────────────────────────────
-- Permite status 'Sem Retorno' (lead que passou por toda a cadência sem responder)
ALTER TABLE gmb_leads
  DROP CONSTRAINT IF EXISTS gmb_leads_status_check;

ALTER TABLE gmb_leads
  ADD CONSTRAINT gmb_leads_status_check
  CHECK (status IN (
    'Novo', 'Contatado', 'Respondeu',
    'Reunião Marcada', 'Proposta Enviada',
    'Ganho', 'Perdido', 'Sem Retorno'
  ));

-- ─── Cron de follow-up: roda diariamente às 10h Brasília (13h UTC) ───────────
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname = 'prospeccao-followup-daily';

SELECT cron.schedule(
  'prospeccao-followup-daily',
  '0 13 * * 1-5',
  $$
  SELECT net.http_post(
    url     := 'https://nbzxofrllagqwwrwfskv.supabase.co/functions/v1/prospeccao-followup-cron',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "4a8f2ba802c6e9dc955fb095f4f1a3debb22a7a19164ffe2"}'::jsonb,
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);
