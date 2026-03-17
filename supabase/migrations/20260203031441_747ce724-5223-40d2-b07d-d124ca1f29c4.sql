-- Create notification type enum
CREATE TYPE public.notification_type AS ENUM (
  'task_due_soon',
  'task_overdue',
  'payment_due_soon',
  'payment_overdue'
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reference_id UUID, -- Can reference task_id or finance_id
  reference_type TEXT, -- 'task' or 'finance'
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (no auth in this app)
CREATE POLICY "Allow all access to notifications"
  ON public.notifications
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Function to check and create notifications for due items
CREATE OR REPLACE FUNCTION public.check_and_create_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  task_record RECORD;
  finance_record RECORD;
  notification_exists BOOLEAN;
BEGIN
  -- Check tasks due in the next 2 days (but not overdue)
  FOR task_record IN 
    SELECT id, title, due_date, status 
    FROM tasks 
    WHERE due_date IS NOT NULL 
      AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '2 days'
      AND status NOT IN ('Concluído', 'Atrasado')
  LOOP
    -- Check if notification already exists for this task today
    SELECT EXISTS(
      SELECT 1 FROM notifications 
      WHERE reference_id = task_record.id 
        AND reference_type = 'task'
        AND type = 'task_due_soon'
        AND created_at::date = CURRENT_DATE
    ) INTO notification_exists;
    
    IF NOT notification_exists THEN
      INSERT INTO notifications (type, title, message, reference_id, reference_type)
      VALUES (
        'task_due_soon',
        'Tarefa com prazo próximo',
        'A tarefa "' || task_record.title || '" vence em ' || 
          CASE 
            WHEN task_record.due_date = CURRENT_DATE THEN 'hoje'
            WHEN task_record.due_date = CURRENT_DATE + 1 THEN 'amanhã'
            ELSE (task_record.due_date - CURRENT_DATE) || ' dias'
          END,
        task_record.id,
        'task'
      );
    END IF;
  END LOOP;

  -- Check overdue tasks
  FOR task_record IN 
    SELECT id, title, due_date 
    FROM tasks 
    WHERE status = 'Atrasado'
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM notifications 
      WHERE reference_id = task_record.id 
        AND reference_type = 'task'
        AND type = 'task_overdue'
        AND created_at::date = CURRENT_DATE
    ) INTO notification_exists;
    
    IF NOT notification_exists THEN
      INSERT INTO notifications (type, title, message, reference_id, reference_type)
      VALUES (
        'task_overdue',
        'Tarefa atrasada',
        'A tarefa "' || task_record.title || '" está atrasada há ' || 
          (CURRENT_DATE - task_record.due_date) || ' dia(s)',
        task_record.id,
        'task'
      );
    END IF;
  END LOOP;

  -- Check finance due in the next 3 days
  FOR finance_record IN 
    SELECT id, description, due_date, type, amount
    FROM finance 
    WHERE due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'
      AND status = 'Pending'
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM notifications 
      WHERE reference_id = finance_record.id 
        AND reference_type = 'finance'
        AND type = 'payment_due_soon'
        AND created_at::date = CURRENT_DATE
    ) INTO notification_exists;
    
    IF NOT notification_exists THEN
      INSERT INTO notifications (type, title, message, reference_id, reference_type)
      VALUES (
        'payment_due_soon',
        CASE finance_record.type 
          WHEN 'Income' THEN 'Recebimento próximo'
          ELSE 'Pagamento próximo'
        END,
        COALESCE(finance_record.description, 'Lançamento financeiro') || ' de R$ ' || 
          TO_CHAR(finance_record.amount, 'FM999G999G999D00') || ' vence em ' ||
          CASE 
            WHEN finance_record.due_date = CURRENT_DATE THEN 'hoje'
            WHEN finance_record.due_date = CURRENT_DATE + 1 THEN 'amanhã'
            ELSE (finance_record.due_date - CURRENT_DATE) || ' dias'
          END,
        finance_record.id,
        'finance'
      );
    END IF;
  END LOOP;

  -- Check overdue finance
  FOR finance_record IN 
    SELECT id, description, due_date, type, amount
    FROM finance 
    WHERE status = 'Overdue'
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM notifications 
      WHERE reference_id = finance_record.id 
        AND reference_type = 'finance'
        AND type = 'payment_overdue'
        AND created_at::date = CURRENT_DATE
    ) INTO notification_exists;
    
    IF NOT notification_exists THEN
      INSERT INTO notifications (type, title, message, reference_id, reference_type)
      VALUES (
        'payment_overdue',
        CASE finance_record.type 
          WHEN 'Income' THEN 'Recebimento atrasado'
          ELSE 'Pagamento atrasado'
        END,
        COALESCE(finance_record.description, 'Lançamento financeiro') || ' de R$ ' || 
          TO_CHAR(finance_record.amount, 'FM999G999G999D00') || ' está atrasado há ' ||
          (CURRENT_DATE - finance_record.due_date) || ' dia(s)',
        finance_record.id,
        'finance'
      );
    END IF;
  END LOOP;
END;
$$;