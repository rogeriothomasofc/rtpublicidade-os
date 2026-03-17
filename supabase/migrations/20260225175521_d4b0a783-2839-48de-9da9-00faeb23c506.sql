
-- Create lead reminders table
CREATE TABLE public.lead_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.sales_pipeline(id) ON DELETE CASCADE,
  remind_at TIMESTAMPTZ NOT NULL,
  note TEXT,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage reminders" ON public.lead_reminders
  FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_lead_reminders_updated_at
  BEFORE UPDATE ON public.lead_reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
