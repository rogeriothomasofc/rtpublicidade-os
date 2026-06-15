-- Remove pg_cron jobs for native automation crons
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname IN (
  'instagram-alert-cron',
  'vendas-alerta-cron',
  'financeiro-alerta-cron'
);

-- Remove automation configs for the 3 removed automations
DELETE FROM automation_configs
WHERE id IN ('instagram-alert', 'vendas-alert', 'financeiro-alert');

-- Drop automation_alert_log (only used by the removed crons)
DROP TABLE IF EXISTS automation_alert_log;
