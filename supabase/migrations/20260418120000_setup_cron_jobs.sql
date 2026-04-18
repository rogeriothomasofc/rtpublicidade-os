-- pg_cron e pg_net já vêm pré-instalados no Supabase — não criar

-- Remove jobs antigos se existirem
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname IN ('instagram-alert-daily', 'vendas-alerta-daily');

-- ============================================================
-- instagram-alert-cron — todo dia às 9h (Brasília = 12h UTC)
-- ============================================================
SELECT cron.schedule(
  'instagram-alert-daily',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://nbzxofrllagqwwrwfskv.supabase.co/functions/v1/instagram-alert-cron',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "4a8f2ba802c6e9dc955fb095f4f1a3debb22a7a19164ffe2"}'::jsonb,
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
    headers := '{"Content-Type": "application/json", "x-cron-secret": "4a8f2ba802c6e9dc955fb095f4f1a3debb22a7a19164ffe2"}'::jsonb,
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);
