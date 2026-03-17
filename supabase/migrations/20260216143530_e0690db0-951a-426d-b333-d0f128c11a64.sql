
CREATE TABLE public.portal_ai_summaries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  summary text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

ALTER TABLE public.portal_ai_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read summaries"
  ON public.portal_ai_summaries FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone authenticated can insert summaries"
  ON public.portal_ai_summaries FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone authenticated can update summaries"
  ON public.portal_ai_summaries FOR UPDATE
  USING (auth.uid() IS NOT NULL);
