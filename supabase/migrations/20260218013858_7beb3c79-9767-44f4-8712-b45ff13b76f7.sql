
-- Drop tables in correct order (respecting FK constraints)
DROP TABLE IF EXISTS public.campaign_metrics_daily CASCADE;
DROP TABLE IF EXISTS public.campaigns CASCADE;
DROP TABLE IF EXISTS public.campaign_column_presets CASCADE;
