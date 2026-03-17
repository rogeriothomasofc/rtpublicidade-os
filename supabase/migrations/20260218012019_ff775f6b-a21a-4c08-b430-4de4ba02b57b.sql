
-- Table to store configurable automation rules
CREATE TABLE public.automation_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL, -- e.g. 'pipeline_stage_change', 'task_status_change', 'finance_status_change', 'client_status_change'
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb, -- e.g. { "from_stage": "Proposta", "to_stage": "Ganho" }
  action_type text NOT NULL, -- e.g. 'create_client', 'create_task', 'create_finance', 'create_contract', 'send_notification', 'update_field'
  action_config jsonb NOT NULL DEFAULT '{}'::jsonb, -- e.g. { "task_title": "Onboarding", "priority": "Alta" }
  is_active boolean NOT NULL DEFAULT true,
  execution_count integer NOT NULL DEFAULT 0,
  last_executed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage automation rules
CREATE POLICY "Authenticated access to automation_rules"
  ON public.automation_rules
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Updated at trigger
CREATE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
