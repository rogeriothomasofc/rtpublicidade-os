-- Ativa extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove jobs antigos se existirem
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname IN (
  'instagram-alert-daily',
  'vendas-alerta-daily'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- instagram-alert-cron — todo dia às 9h (Brasília = 12h UTC)
-- ============================================================
SELECT cron.schedule(
  'instagram-alert-daily',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://nbzxofrllagqwwrwfskv.supabase.co/functions/v1/instagram-alert-cron',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'x-cron-secret',  current_setting('app.cron_secret', true)
    ),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ============================================================
-- vendas-alerta-cron — todo dia às 9h (Brasília = 12h UTC)
-- ============================================================
SELECT cron.schedule(
  'vendas-alerta-daily',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://nbzxofrllagqwwrwfskv.supabase.co/functions/v1/vendas-alerta-cron',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'x-cron-secret',  current_setting('app.cron_secret', true)
    ),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ============================================================
-- ATENÇÃO: Rode este comando UMA VEZ no SQL Editor do Supabase
-- com o valor do CRON_SECRET (Settings > Edge Functions > Secrets):
--
-- ALTER DATABASE postgres SET app.cron_secret = '4a8f2ba802c6e9dc955fb095f4f1a3debb22a7a19164ffe2';
-- ============================================================
