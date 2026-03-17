-- Update task_status enum to new values
-- First, we need to create a new enum and migrate the data

-- Create new enum type
CREATE TYPE task_status_new AS ENUM ('A Fazer', 'Fazendo', 'Atrasado', 'Concluído');

-- Add a temporary column with the new type
ALTER TABLE public.tasks ADD COLUMN status_new task_status_new;

-- Migrate existing data to new values
UPDATE public.tasks SET status_new = 
  CASE status::text
    WHEN 'Backlog' THEN 'A Fazer'::task_status_new
    WHEN 'Planning' THEN 'A Fazer'::task_status_new
    WHEN 'In Progress' THEN 'Fazendo'::task_status_new
    WHEN 'Done' THEN 'Concluído'::task_status_new
  END;

-- Drop the old column and rename the new one
ALTER TABLE public.tasks DROP COLUMN status;
ALTER TABLE public.tasks RENAME COLUMN status_new TO status;

-- Set default and not null
ALTER TABLE public.tasks ALTER COLUMN status SET DEFAULT 'A Fazer'::task_status_new;
ALTER TABLE public.tasks ALTER COLUMN status SET NOT NULL;

-- Drop old enum type
DROP TYPE task_status;

-- Rename new enum to original name
ALTER TYPE task_status_new RENAME TO task_status;

-- Create function to update overdue tasks
CREATE OR REPLACE FUNCTION public.update_overdue_tasks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.tasks
  SET status = 'Atrasado'::task_status, updated_at = now()
  WHERE status IN ('A Fazer', 'Fazendo')
    AND due_date < CURRENT_DATE;
END;
$$;

-- Create trigger function to check overdue on insert/update
CREATE OR REPLACE FUNCTION public.check_task_overdue()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- If task has a due date in the past and is not Done, mark as Atrasado
  IF NEW.due_date IS NOT NULL 
     AND NEW.due_date < CURRENT_DATE 
     AND NEW.status IN ('A Fazer', 'Fazendo') THEN
    NEW.status := 'Atrasado'::task_status;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for automatic overdue detection
CREATE TRIGGER check_task_overdue_trigger
BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.check_task_overdue();