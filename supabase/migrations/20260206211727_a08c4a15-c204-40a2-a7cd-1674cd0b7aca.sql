
-- Table for WhatsApp Business labels
CREATE TABLE public.whatsapp_labels (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label_id text NOT NULL UNIQUE,
  name text NOT NULL,
  color text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to whatsapp_labels"
  ON public.whatsapp_labels FOR ALL
  USING (true)
  WITH CHECK (true);

-- Junction table: lead <-> label
CREATE TABLE public.whatsapp_contact_labels (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.sales_pipeline(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES public.whatsapp_labels(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(lead_id, label_id)
);

ALTER TABLE public.whatsapp_contact_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to whatsapp_contact_labels"
  ON public.whatsapp_contact_labels FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at on labels
CREATE TRIGGER update_whatsapp_labels_updated_at
  BEFORE UPDATE ON public.whatsapp_labels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
