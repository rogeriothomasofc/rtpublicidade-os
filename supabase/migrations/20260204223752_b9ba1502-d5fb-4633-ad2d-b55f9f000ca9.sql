-- Create trigger function to check and update overdue finance
CREATE OR REPLACE FUNCTION public.check_finance_overdue()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- If finance has a due date in the past and is Pending, mark as Overdue
  IF NEW.due_date IS NOT NULL 
     AND NEW.due_date < CURRENT_DATE 
     AND NEW.status = 'Pending' THEN
    NEW.status := 'Overdue'::finance_status;
  END IF;
  RETURN NEW;
END;
$function$;

-- Create trigger on finance table for INSERT
CREATE TRIGGER check_finance_overdue_on_insert
  BEFORE INSERT ON public.finance
  FOR EACH ROW
  EXECUTE FUNCTION public.check_finance_overdue();

-- Create trigger on finance table for UPDATE
CREATE TRIGGER check_finance_overdue_on_update
  BEFORE UPDATE ON public.finance
  FOR EACH ROW
  EXECUTE FUNCTION public.check_finance_overdue();