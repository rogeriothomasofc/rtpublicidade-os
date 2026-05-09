-- Remove se já existir
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname = 'prospeccao-automatica-daily';

-- SDR automático — todo dia útil (seg-sex) às 09h Brasília (12h UTC)
SELECT cron.schedule(
  'prospeccao-automatica-daily',
  '0 12 * * 1-5',
  $$
  SELECT net.http_post(
    url     := 'https://nbzxofrllagqwwrwfskv.supabase.co/functions/v1/prospeccao-automatica-cron',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "4a8f2ba802c6e9dc955fb095f4f1a3debb22a7a19164ffe2"}'::jsonb,
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);
