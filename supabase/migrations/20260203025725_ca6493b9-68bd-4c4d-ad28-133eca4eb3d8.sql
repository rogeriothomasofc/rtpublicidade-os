-- Add recurrence to tasks table (same pattern as finance)
CREATE TYPE public.task_recurrence AS ENUM ('None', 'Daily', 'Weekly', 'Monthly', 'Quarterly');

ALTER TABLE public.tasks 
ADD COLUMN recurrence public.task_recurrence NOT NULL DEFAULT 'None';

-- Create subtasks table (simple checklist)
CREATE TABLE public.subtasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

-- Create policy for subtasks
CREATE POLICY "Allow all access to subtasks" 
ON public.subtasks 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_subtasks_updated_at
BEFORE UPDATE ON public.subtasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle task recurrence (creates new task when completed)
CREATE OR REPLACE FUNCTION public.handle_task_recurrence()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_due DATE;
BEGIN
  -- Only trigger when status changes to 'Concluído' and recurrence is not 'None'
  IF NEW.status = 'Concluído' AND OLD.status != 'Concluído' AND NEW.recurrence != 'None' THEN
    -- Calculate next due date
    CASE NEW.recurrence
      WHEN 'Daily' THEN next_due := NEW.due_date + INTERVAL '1 day';
      WHEN 'Weekly' THEN next_due := NEW.due_date + INTERVAL '1 week';
      WHEN 'Monthly' THEN next_due := NEW.due_date + INTERVAL '1 month';
      WHEN 'Quarterly' THEN next_due := NEW.due_date + INTERVAL '3 months';
      ELSE next_due := NULL;
    END CASE;
    
    IF next_due IS NOT NULL THEN
      INSERT INTO public.tasks (
        title, description, status, priority, type, client_id, project_id, due_date, recurrence
      ) VALUES (
        NEW.title,
        NEW.description,
        'A Fazer',
        NEW.priority,
        NEW.type,
        NEW.client_id,
        NEW.project_id,
        next_due,
        NEW.recurrence
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for task recurrence
CREATE TRIGGER handle_task_recurrence_trigger
AFTER UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.handle_task_recurrence();