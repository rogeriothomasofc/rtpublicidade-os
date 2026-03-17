-- Add new notification type for contract expiration
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'contract_expiring';

-- Update the check_and_create_notifications function to include contract expiration alerts
CREATE OR REPLACE FUNCTION public.check_and_create_notifications()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  task_record RECORD;
  finance_record RECORD;
  contract_record RECORD;
  notification_exists BOOLEAN;
  contract_end_date DATE;
BEGIN
  -- Check tasks due in the next 2 days (but not overdue)
  FOR task_record IN 
    SELECT id, title, due_date, status 
    FROM tasks 
    WHERE due_date IS NOT NULL 
      AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '2 days'
      AND status NOT IN ('Concluído', 'Atrasado')
  LOOP
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

  -- Check contracts expiring in 30 days
  FOR contract_record IN 
    SELECT c.id, c.description, c.start_date, c.duration_months, c.value, cl.name as client_name
    FROM contracts c
    LEFT JOIN clients cl ON c.client_id = cl.id
    WHERE c.status = 'Active'
  LOOP
    -- Calculate end date based on start_date + duration_months
    contract_end_date := contract_record.start_date + (contract_record.duration_months || ' months')::interval;
    
    -- Check if contract expires within 30 days
    IF contract_end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN
      SELECT EXISTS(
        SELECT 1 FROM notifications 
        WHERE reference_id = contract_record.id 
          AND reference_type = 'contract'
          AND type = 'contract_expiring'
          AND created_at::date = CURRENT_DATE
      ) INTO notification_exists;
      
      IF NOT notification_exists THEN
        INSERT INTO notifications (type, title, message, reference_id, reference_type)
        VALUES (
          'contract_expiring',
          'Contrato próximo do vencimento',
          'O contrato de ' || COALESCE(contract_record.client_name, 'Cliente') || 
            ' (R$ ' || TO_CHAR(contract_record.value, 'FM999G999G999D00') || ') vence em ' ||
            (contract_end_date - CURRENT_DATE) || ' dias',
          contract_record.id,
          'contract'
        );
      END IF;
    END IF;
  END LOOP;
END;
$function$;