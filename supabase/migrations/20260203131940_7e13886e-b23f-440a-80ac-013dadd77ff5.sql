-- Create table for dynamic pipeline stages
CREATE TABLE public.pipeline_stages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  display_name text NOT NULL,
  probability integer NOT NULL DEFAULT 0,
  position integer NOT NULL DEFAULT 0,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

-- Create policy for access
CREATE POLICY "Allow all access to pipeline_stages" 
ON public.pipeline_stages 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Insert default stages (Won and Lost are system stages that cannot be deleted)
INSERT INTO public.pipeline_stages (name, display_name, probability, position, is_system) VALUES
  ('New', 'Novo', 10, 0, false),
  ('Contacted', 'Contato', 25, 1, false),
  ('Proposal', 'Proposta', 50, 2, false),
  ('Won', 'Ganho', 100, 100, true),
  ('Lost', 'Perdido', 0, 101, true);

-- Add updated_at trigger
CREATE TRIGGER update_pipeline_stages_updated_at
BEFORE UPDATE ON public.pipeline_stages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();