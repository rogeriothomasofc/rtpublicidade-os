
-- Add lead_reminder to notification_type enum
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'lead_reminder';

-- Update check_and_create_notifications to include lead reminders
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
  reminder_record RECORD;
  notification_exists BOOLEAN;
  contract_end_date DATE;
BEGIN
  -- Tasks due soon
  FOR task_record IN SELECT id, title, due_date, status FROM tasks WHERE due_date IS NOT NULL AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '2 days' AND status NOT IN ('Concluído', 'Atrasado')
  LOOP
    SELECT EXISTS(SELECT 1 FROM notifications WHERE reference_id = task_record.id AND reference_type = 'task' AND type = 'task_due_soon' AND created_at::date = CURRENT_DATE) INTO notification_exists;
    IF NOT notification_exists THEN
      INSERT INTO notifications (type, title, message, reference_id, reference_type) VALUES ('task_due_soon', 'Tarefa com prazo próximo', 'A tarefa "' || task_record.title || '" vence em ' || CASE WHEN task_record.due_date = CURRENT_DATE THEN 'hoje' WHEN task_record.due_date = CURRENT_DATE + 1 THEN 'amanhã' ELSE (task_record.due_date - CURRENT_DATE) || ' dias' END, task_record.id, 'task');
    END IF;
  END LOOP;

  -- Tasks overdue
  FOR task_record IN SELECT id, title, due_date FROM tasks WHERE status = 'Atrasado'
  LOOP
    SELECT EXISTS(SELECT 1 FROM notifications WHERE reference_id = task_record.id AND reference_type = 'task' AND type = 'task_overdue' AND created_at::date = CURRENT_DATE) INTO notification_exists;
    IF NOT notification_exists THEN
      INSERT INTO notifications (type, title, message, reference_id, reference_type) VALUES ('task_overdue', 'Tarefa atrasada', 'A tarefa "' || task_record.title || '" está atrasada há ' || (CURRENT_DATE - task_record.due_date) || ' dia(s)', task_record.id, 'task');
    END IF;
  END LOOP;

  -- Finance due soon
  FOR finance_record IN SELECT id, description, due_date, type, amount FROM finance WHERE due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days' AND status = 'Pendente'
  LOOP
    SELECT EXISTS(SELECT 1 FROM notifications WHERE reference_id = finance_record.id AND reference_type = 'finance' AND type = 'payment_due_soon' AND created_at::date = CURRENT_DATE) INTO notification_exists;
    IF NOT notification_exists THEN
      INSERT INTO notifications (type, title, message, reference_id, reference_type) VALUES ('payment_due_soon', CASE finance_record.type WHEN 'Receita' THEN 'Recebimento próximo' ELSE 'Pagamento próximo' END, COALESCE(finance_record.description, 'Lançamento financeiro') || ' de R$ ' || TO_CHAR(finance_record.amount, 'FM999G999G999D00') || ' vence em ' || CASE WHEN finance_record.due_date = CURRENT_DATE THEN 'hoje' WHEN finance_record.due_date = CURRENT_DATE + 1 THEN 'amanhã' ELSE (finance_record.due_date - CURRENT_DATE) || ' dias' END, finance_record.id, 'finance');
    END IF;
  END LOOP;

  -- Finance overdue
  FOR finance_record IN SELECT id, description, due_date, type, amount FROM finance WHERE status = 'Atrasado'
  LOOP
    SELECT EXISTS(SELECT 1 FROM notifications WHERE reference_id = finance_record.id AND reference_type = 'finance' AND type = 'payment_overdue' AND created_at::date = CURRENT_DATE) INTO notification_exists;
    IF NOT notification_exists THEN
      INSERT INTO notifications (type, title, message, reference_id, reference_type) VALUES ('payment_overdue', CASE finance_record.type WHEN 'Receita' THEN 'Recebimento atrasado' ELSE 'Pagamento atrasado' END, COALESCE(finance_record.description, 'Lançamento financeiro') || ' de R$ ' || TO_CHAR(finance_record.amount, 'FM999G999G999D00') || ' está atrasado há ' || (CURRENT_DATE - finance_record.due_date) || ' dia(s)', finance_record.id, 'finance');
    END IF;
  END LOOP;

  -- Contract expiring
  FOR contract_record IN SELECT c.id, c.description, c.start_date, c.duration_months, c.value, cl.name as client_name FROM contracts c LEFT JOIN clients cl ON c.client_id = cl.id WHERE c.status = 'Ativo'
  LOOP
    contract_end_date := contract_record.start_date + (contract_record.duration_months || ' months')::interval;
    IF contract_end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN
      SELECT EXISTS(SELECT 1 FROM notifications WHERE reference_id = contract_record.id AND reference_type = 'contract' AND type = 'contract_expiring' AND created_at::date = CURRENT_DATE) INTO notification_exists;
      IF NOT notification_exists THEN
        INSERT INTO notifications (type, title, message, reference_id, reference_type) VALUES ('contract_expiring', 'Contrato próximo do vencimento', 'O contrato de ' || COALESCE(contract_record.client_name, 'Cliente') || ' (R$ ' || TO_CHAR(contract_record.value, 'FM999G999G999D00') || ') vence em ' || (contract_end_date - CURRENT_DATE) || ' dias', contract_record.id, 'contract');
      END IF;
    END IF;
  END LOOP;

  -- Lead reminders that are due
  FOR reminder_record IN 
    SELECT lr.id, lr.lead_id, lr.remind_at, lr.note, sp.lead_name 
    FROM lead_reminders lr 
    JOIN sales_pipeline sp ON sp.id = lr.lead_id 
    WHERE lr.is_dismissed = false AND lr.remind_at <= now()
  LOOP
    SELECT EXISTS(SELECT 1 FROM notifications WHERE reference_id = reminder_record.id AND reference_type = 'lead_reminder' AND type = 'lead_reminder') INTO notification_exists;
    IF NOT notification_exists THEN
      INSERT INTO notifications (type, title, message, reference_id, reference_type) 
      VALUES (
        'lead_reminder', 
        'Lembrete: ' || reminder_record.lead_name, 
        COALESCE(reminder_record.note, 'Você tem um lembrete para o lead ' || reminder_record.lead_name),
        reminder_record.id, 
        'lead_reminder'
      );
      -- Auto-dismiss after creating notification
      UPDATE lead_reminders SET is_dismissed = true WHERE id = reminder_record.id;
    END IF;
  END LOOP;
END;
$function$;
