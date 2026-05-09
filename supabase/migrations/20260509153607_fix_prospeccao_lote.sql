-- Reduz lote para 5 leads por execução (limite de recursos da Edge Function)
-- 4 execuções/dia × 5 leads = 20 leads/dia no total
UPDATE prospeccao_config SET leads_por_dia = 5;

-- Remove cron antigo
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname IN ('prospeccao-automatica-daily');

-- 4 execuções por dia útil: 09h, 11h, 14h e 16h (horário Brasília = +3h UTC)
SELECT cron.schedule(
  'prospeccao-sdr-09h',
  '0 12 * * 1-5',
  $$
  SELECT net.http_post(
    url     := 'https://nbzxofrllagqwwrwfskv.supabase.co/functions/v1/prospeccao-automatica-cron',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "4a8f2ba802c6e9dc955fb095f4f1a3debb22a7a19164ffe2"}'::jsonb,
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'prospeccao-sdr-11h',
  '0 14 * * 1-5',
  $$
  SELECT net.http_post(
    url     := 'https://nbzxofrllagqwwrwfskv.supabase.co/functions/v1/prospeccao-automatica-cron',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "4a8f2ba802c6e9dc955fb095f4f1a3debb22a7a19164ffe2"}'::jsonb,
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'prospeccao-sdr-14h',
  '0 17 * * 1-5',
  $$
  SELECT net.http_post(
    url     := 'https://nbzxofrllagqwwrwfskv.supabase.co/functions/v1/prospeccao-automatica-cron',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "4a8f2ba802c6e9dc955fb095f4f1a3debb22a7a19164ffe2"}'::jsonb,
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'prospeccao-sdr-16h',
  '0 19 * * 1-5',
  $$
  SELECT net.http_post(
    url     := 'https://nbzxofrllagqwwrwfskv.supabase.co/functions/v1/prospeccao-automatica-cron',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "4a8f2ba802c6e9dc955fb095f4f1a3debb22a7a19164ffe2"}'::jsonb,
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);
