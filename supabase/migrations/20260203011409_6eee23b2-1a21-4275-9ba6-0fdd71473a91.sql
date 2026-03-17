-- Function to calculate next due date based on recurrence
CREATE OR REPLACE FUNCTION public.calculate_next_due_date(p_due_date date, p_recurrence finance_recurrence)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  CASE p_recurrence
    WHEN 'Monthly' THEN RETURN p_due_date + INTERVAL '1 month';
    WHEN 'Quarterly' THEN RETURN p_due_date + INTERVAL '3 months';
    WHEN 'Semiannual' THEN RETURN p_due_date + INTERVAL '6 months';
    WHEN 'Annual' THEN RETURN p_due_date + INTERVAL '1 year';
    ELSE RETURN NULL;
  END CASE;
END;
$$;

-- Trigger function to create next recurring record when marked as paid
CREATE OR REPLACE FUNCTION public.handle_finance_recurrence()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_due date;
BEGIN
  -- Only trigger when status changes to 'Paid' and recurrence is not 'None'
  IF NEW.status = 'Paid' AND OLD.status != 'Paid' AND NEW.recurrence != 'None' THEN
    next_due := public.calculate_next_due_date(NEW.due_date, NEW.recurrence);
    
    IF next_due IS NOT NULL THEN
      INSERT INTO public.finance (
        client_id, description, amount, due_date, status, type, category, cost_center, recurrence
      ) VALUES (
        NEW.client_id,
        NEW.description,
        NEW.amount,
        next_due,
        'Pending',
        NEW.type,
        NEW.category,
        NEW.cost_center,
        NEW.recurrence
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS finance_recurrence_trigger ON public.finance;
CREATE TRIGGER finance_recurrence_trigger
AFTER UPDATE ON public.finance
FOR EACH ROW
EXECUTE FUNCTION public.handle_finance_recurrence();

-- Function to update overdue status (will be called by cron)
CREATE OR REPLACE FUNCTION public.update_overdue_finance()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.finance
  SET status = 'Overdue', updated_at = now()
  WHERE status = 'Pending'
    AND due_date < CURRENT_DATE;
END;
$$;