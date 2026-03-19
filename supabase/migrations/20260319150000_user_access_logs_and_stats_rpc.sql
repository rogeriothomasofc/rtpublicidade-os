-- Create user_access_logs table
CREATE TABLE IF NOT EXISTS public.user_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_access_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_access_logs' AND policyname = 'Authenticated users can read all access logs') THEN
    CREATE POLICY "Authenticated users can read all access logs"
      ON public.user_access_logs FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_access_logs' AND policyname = 'Users can insert their own access logs') THEN
    CREATE POLICY "Users can insert their own access logs"
      ON public.user_access_logs FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_access_logs' AND policyname = 'Users can update their own access logs') THEN
    CREATE POLICY "Users can update their own access logs"
      ON public.user_access_logs FOR UPDATE TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_access_logs_user_id ON public.user_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_access_logs_started_at ON public.user_access_logs(started_at DESC);

-- RPC that returns stats with proper names from auth.users + profiles + team_members
CREATE OR REPLACE FUNCTION public.get_user_access_stats()
RETURNS TABLE (
  user_id uuid,
  user_name text,
  avatar_url text,
  last_access timestamptz,
  total_sessions bigint,
  total_time_seconds numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  WITH log_agg AS (
    SELECT
      ual.user_id,
      MAX(ual.started_at) AS last_access,
      COUNT(*) AS total_sessions,
      SUM(COALESCE(ual.duration_seconds, 0)) AS total_time_seconds
    FROM public.user_access_logs ual
    GROUP BY ual.user_id
  )
  SELECT
    la.user_id,
    COALESCE(NULLIF(TRIM(p.name), ''), tm.name, au.email, 'Usuário') AS user_name,
    COALESCE(p.avatar_url, tm.avatar_url) AS avatar_url,
    la.last_access,
    la.total_sessions,
    la.total_time_seconds
  FROM log_agg la
  LEFT JOIN auth.users au ON au.id = la.user_id
  LEFT JOIN public.profiles p ON p.user_id = la.user_id
  LEFT JOIN public.team_members tm ON tm.email = au.email
  ORDER BY la.last_access DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_access_stats() TO authenticated;
