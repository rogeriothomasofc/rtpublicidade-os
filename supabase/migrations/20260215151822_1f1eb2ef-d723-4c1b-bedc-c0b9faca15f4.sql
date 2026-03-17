
-- Table for monthly goals with history
CREATE TABLE public.monthly_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month TEXT NOT NULL, -- format: YYYY-MM
  clients_to_close INTEGER NOT NULL DEFAULT 0,
  revenue_target NUMERIC NOT NULL DEFAULT 0,
  leads_per_day INTEGER NOT NULL DEFAULT 0,
  leads_per_month INTEGER NOT NULL DEFAULT 0,
  ai_action_plan TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(month)
);

-- Enable RLS
ALTER TABLE public.monthly_goals ENABLE ROW LEVEL SECURITY;

-- Policies - authenticated users can CRUD
CREATE POLICY "Authenticated users can view monthly goals"
  ON public.monthly_goals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert monthly goals"
  ON public.monthly_goals FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update monthly goals"
  ON public.monthly_goals FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete monthly goals"
  ON public.monthly_goals FOR DELETE
  TO authenticated
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_monthly_goals_updated_at
  BEFORE UPDATE ON public.monthly_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
