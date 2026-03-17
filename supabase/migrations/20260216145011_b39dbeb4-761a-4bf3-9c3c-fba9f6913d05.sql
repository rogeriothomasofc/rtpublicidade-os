
CREATE TABLE public.portal_access_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds int,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read portal logs" ON public.portal_access_logs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can insert portal logs" ON public.portal_access_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can update own logs" ON public.portal_access_logs FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_portal_access_logs_client ON public.portal_access_logs(client_id);
CREATE INDEX idx_portal_access_logs_started ON public.portal_access_logs(started_at DESC);
