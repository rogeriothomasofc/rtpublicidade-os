
-- Track user access/sessions in the system
CREATE TABLE public.user_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all access logs"
  ON public.user_access_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert their own access logs"
  ON public.user_access_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own access logs"
  ON public.user_access_logs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_user_access_logs_user_id ON public.user_access_logs(user_id);
CREATE INDEX idx_user_access_logs_started_at ON public.user_access_logs(started_at DESC);
