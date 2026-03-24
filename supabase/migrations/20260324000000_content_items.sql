-- Content items table for squad content management
-- Categories: Ideia (brainstorm), A Criar (planned), Postado (published)

CREATE TABLE IF NOT EXISTS public.content_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  category    TEXT NOT NULL CHECK (category IN ('Ideia', 'A Criar', 'Postado')),
  platform    TEXT NOT NULL DEFAULT 'Instagram',
  client_id   UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'Briefing' CHECK (status IN ('Briefing', 'Em Produção', 'Revisão', 'Aprovado', 'Postado')),
  scheduled_date DATE,
  posted_date    DATE,
  post_link   TEXT,
  tags        TEXT[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff can manage content_items"
  ON public.content_items
  FOR ALL
  TO authenticated
  USING (public.is_agency_staff())
  WITH CHECK (public.is_agency_staff());

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_content_items_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER content_items_updated_at
  BEFORE UPDATE ON public.content_items
  FOR EACH ROW EXECUTE FUNCTION public.set_content_items_updated_at();
