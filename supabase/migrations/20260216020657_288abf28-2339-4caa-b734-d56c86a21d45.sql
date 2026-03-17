
-- Banks table
CREATE TABLE public.banks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Conta Corrente',
  balance NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Ativo',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated access to banks"
  ON public.banks
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Finance categories table
CREATE TABLE public.finance_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Despesa',
  color TEXT NOT NULL DEFAULT '#ef4444',
  is_active BOOLEAN NOT NULL DEFAULT true,
  rules TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated access to finance_categories"
  ON public.finance_categories
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add bank_id to finance table
ALTER TABLE public.finance ADD COLUMN bank_id UUID REFERENCES public.banks(id);

-- Triggers for updated_at
CREATE TRIGGER update_banks_updated_at
  BEFORE UPDATE ON public.banks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_finance_categories_updated_at
  BEFORE UPDATE ON public.finance_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
