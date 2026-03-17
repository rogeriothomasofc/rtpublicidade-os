
-- ===== TRADUÇÃO COMPLETA DOS ENUMS PARA PORTUGUÊS =====

-- 1. client_status
ALTER TYPE client_status RENAME VALUE 'Active' TO 'Ativo';
ALTER TYPE client_status RENAME VALUE 'Paused' TO 'Pausado';
ALTER TYPE client_status RENAME VALUE 'Cancelled' TO 'Cancelado';

-- 2. contract_status
ALTER TYPE contract_status RENAME VALUE 'Active' TO 'Ativo';
ALTER TYPE contract_status RENAME VALUE 'Expired' TO 'Expirado';
ALTER TYPE contract_status RENAME VALUE 'Cancelled' TO 'Cancelado';

-- 3. finance_status
ALTER TYPE finance_status RENAME VALUE 'Paid' TO 'Pago';
ALTER TYPE finance_status RENAME VALUE 'Pending' TO 'Pendente';
ALTER TYPE finance_status RENAME VALUE 'Overdue' TO 'Atrasado';

-- 4. finance_type
ALTER TYPE finance_type RENAME VALUE 'Income' TO 'Receita';
ALTER TYPE finance_type RENAME VALUE 'Expense' TO 'Despesa';

-- 5. finance_recurrence
ALTER TYPE finance_recurrence RENAME VALUE 'None' TO 'Nenhuma';
ALTER TYPE finance_recurrence RENAME VALUE 'Monthly' TO 'Mensal';
ALTER TYPE finance_recurrence RENAME VALUE 'Quarterly' TO 'Trimestral';
ALTER TYPE finance_recurrence RENAME VALUE 'Semiannual' TO 'Semestral';
ALTER TYPE finance_recurrence RENAME VALUE 'Annual' TO 'Anual';

-- 6. pipeline_stage
ALTER TYPE pipeline_stage RENAME VALUE 'New' TO 'Novo';
ALTER TYPE pipeline_stage RENAME VALUE 'Contacted' TO 'Contatado';
ALTER TYPE pipeline_stage RENAME VALUE 'Proposal' TO 'Proposta';
ALTER TYPE pipeline_stage RENAME VALUE 'Won' TO 'Ganho';
ALTER TYPE pipeline_stage RENAME VALUE 'Lost' TO 'Perdido';

-- 7. task_priority
ALTER TYPE task_priority RENAME VALUE 'Low' TO 'Baixa';
ALTER TYPE task_priority RENAME VALUE 'Medium' TO 'Média';
ALTER TYPE task_priority RENAME VALUE 'High' TO 'Alta';
ALTER TYPE task_priority RENAME VALUE 'Urgent' TO 'Urgente';

-- 8. task_type
ALTER TYPE task_type RENAME VALUE 'Campaign' TO 'Campanha';
ALTER TYPE task_type RENAME VALUE 'Creative' TO 'Criativo';
ALTER TYPE task_type RENAME VALUE 'Report' TO 'Relatório';
ALTER TYPE task_type RENAME VALUE 'Other' TO 'Outro';

-- 9. task_recurrence
ALTER TYPE task_recurrence RENAME VALUE 'None' TO 'Nenhuma';
ALTER TYPE task_recurrence RENAME VALUE 'Daily' TO 'Diária';
ALTER TYPE task_recurrence RENAME VALUE 'Weekly' TO 'Semanal';
ALTER TYPE task_recurrence RENAME VALUE 'Monthly' TO 'Mensal';
ALTER TYPE task_recurrence RENAME VALUE 'Quarterly' TO 'Trimestral';

-- ===== ATUALIZAR DEFAULTS =====
ALTER TABLE contracts ALTER COLUMN status SET DEFAULT 'Ativo'::contract_status;
ALTER TABLE finance ALTER COLUMN status SET DEFAULT 'Pendente'::finance_status;
ALTER TABLE finance ALTER COLUMN type SET DEFAULT 'Receita'::finance_type;
ALTER TABLE finance ALTER COLUMN recurrence SET DEFAULT 'Nenhuma'::finance_recurrence;
ALTER TABLE sales_pipeline ALTER COLUMN stage SET DEFAULT 'Novo'::pipeline_stage;
ALTER TABLE tasks ALTER COLUMN priority SET DEFAULT 'Média'::task_priority;
ALTER TABLE tasks ALTER COLUMN type SET DEFAULT 'Outro'::task_type;
ALTER TABLE tasks ALTER COLUMN recurrence SET DEFAULT 'Nenhuma'::task_recurrence;

-- ===== ATUALIZAR pipeline_stages =====
UPDATE pipeline_stages SET name = 'Novo', display_name = 'Novo' WHERE name = 'New';
UPDATE pipeline_stages SET name = 'Contatado', display_name = 'Contatado' WHERE name = 'Contacted';
UPDATE pipeline_stages SET name = 'Proposta', display_name = 'Proposta' WHERE name = 'Proposal';
UPDATE pipeline_stages SET name = 'Ganho', display_name = 'Ganho' WHERE name = 'Won';
UPDATE pipeline_stages SET name = 'Perdido', display_name = 'Perdido' WHERE name = 'Lost';

-- ===== ATUALIZAR create_task_with_relations defaults =====
DROP FUNCTION IF EXISTS create_task_with_relations(text, text, task_status, task_priority, task_type, task_recurrence, uuid, uuid, date, uuid[], text[]);
CREATE OR REPLACE FUNCTION public.create_task_with_relations(
  p_title text,
  p_description text DEFAULT NULL,
  p_status task_status DEFAULT 'A Fazer'::task_status,
  p_priority task_priority DEFAULT 'Média'::task_priority,
  p_type task_type DEFAULT 'Outro'::task_type,
  p_recurrence task_recurrence DEFAULT 'Nenhuma'::task_recurrence,
  p_client_id uuid DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_due_date date DEFAULT NULL,
  p_assignee_ids uuid[] DEFAULT '{}'::uuid[],
  p_subtask_titles text[] DEFAULT '{}'::text[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_task_id uuid;
  aid uuid;
  stitle text;
BEGIN
  INSERT INTO tasks (title, description, status, priority, type, recurrence, client_id, project_id, due_date)
  VALUES (p_title, p_description, p_status, p_priority, p_type, p_recurrence, p_client_id, p_project_id, p_due_date)
  RETURNING id INTO new_task_id;

  IF array_length(p_assignee_ids, 1) IS NOT NULL THEN
    FOREACH aid IN ARRAY p_assignee_ids LOOP
      INSERT INTO task_assignees (task_id, member_id) VALUES (new_task_id, aid);
    END LOOP;
  END IF;

  IF array_length(p_subtask_titles, 1) IS NOT NULL THEN
    FOREACH stitle IN ARRAY p_subtask_titles LOOP
      INSERT INTO subtasks (task_id, title) VALUES (new_task_id, stitle);
    END LOOP;
  END IF;

  RETURN new_task_id;
END;
$$;

-- ===== ATUALIZAR FUNÇÕES =====

CREATE OR REPLACE FUNCTION public.check_finance_overdue()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE AND NEW.status = 'Pendente' THEN
    NEW.status := 'Atrasado'::finance_status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_overdue_finance()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.finance SET status = 'Atrasado', updated_at = now() WHERE status = 'Pendente' AND due_date < CURRENT_DATE;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_finance_recurrence()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE next_due date;
BEGIN
  IF NEW.status = 'Pago' AND OLD.status != 'Pago' AND NEW.recurrence != 'Nenhuma' THEN
    next_due := public.calculate_next_due_date(NEW.due_date, NEW.recurrence);
    IF next_due IS NOT NULL THEN
      INSERT INTO public.finance (client_id, description, amount, due_date, status, type, category, cost_center, recurrence)
      VALUES (NEW.client_id, NEW.description, NEW.amount, next_due, 'Pendente', NEW.type, NEW.category, NEW.cost_center, NEW.recurrence);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_next_due_date(p_due_date date, p_recurrence finance_recurrence)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  CASE p_recurrence
    WHEN 'Mensal' THEN RETURN p_due_date + INTERVAL '1 month';
    WHEN 'Trimestral' THEN RETURN p_due_date + INTERVAL '3 months';
    WHEN 'Semestral' THEN RETURN p_due_date + INTERVAL '6 months';
    WHEN 'Anual' THEN RETURN p_due_date + INTERVAL '1 year';
    ELSE RETURN NULL;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_task_recurrence()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE next_due DATE;
BEGIN
  IF NEW.status = 'Concluído' AND OLD.status != 'Concluído' AND NEW.recurrence != 'Nenhuma' THEN
    CASE NEW.recurrence
      WHEN 'Diária' THEN next_due := NEW.due_date + INTERVAL '1 day';
      WHEN 'Semanal' THEN next_due := NEW.due_date + INTERVAL '1 week';
      WHEN 'Mensal' THEN next_due := NEW.due_date + INTERVAL '1 month';
      WHEN 'Trimestral' THEN next_due := NEW.due_date + INTERVAL '3 months';
      ELSE next_due := NULL;
    END CASE;
    IF next_due IS NOT NULL THEN
      INSERT INTO public.tasks (title, description, status, priority, type, client_id, project_id, due_date, recurrence)
      VALUES (NEW.title, NEW.description, 'A Fazer', NEW.priority, NEW.type, NEW.client_id, NEW.project_id, next_due, NEW.recurrence);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_and_create_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  task_record RECORD;
  finance_record RECORD;
  contract_record RECORD;
  notification_exists BOOLEAN;
  contract_end_date DATE;
BEGIN
  FOR task_record IN SELECT id, title, due_date, status FROM tasks WHERE due_date IS NOT NULL AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '2 days' AND status NOT IN ('Concluído', 'Atrasado')
  LOOP
    SELECT EXISTS(SELECT 1 FROM notifications WHERE reference_id = task_record.id AND reference_type = 'task' AND type = 'task_due_soon' AND created_at::date = CURRENT_DATE) INTO notification_exists;
    IF NOT notification_exists THEN
      INSERT INTO notifications (type, title, message, reference_id, reference_type) VALUES ('task_due_soon', 'Tarefa com prazo próximo', 'A tarefa "' || task_record.title || '" vence em ' || CASE WHEN task_record.due_date = CURRENT_DATE THEN 'hoje' WHEN task_record.due_date = CURRENT_DATE + 1 THEN 'amanhã' ELSE (task_record.due_date - CURRENT_DATE) || ' dias' END, task_record.id, 'task');
    END IF;
  END LOOP;

  FOR task_record IN SELECT id, title, due_date FROM tasks WHERE status = 'Atrasado'
  LOOP
    SELECT EXISTS(SELECT 1 FROM notifications WHERE reference_id = task_record.id AND reference_type = 'task' AND type = 'task_overdue' AND created_at::date = CURRENT_DATE) INTO notification_exists;
    IF NOT notification_exists THEN
      INSERT INTO notifications (type, title, message, reference_id, reference_type) VALUES ('task_overdue', 'Tarefa atrasada', 'A tarefa "' || task_record.title || '" está atrasada há ' || (CURRENT_DATE - task_record.due_date) || ' dia(s)', task_record.id, 'task');
    END IF;
  END LOOP;

  FOR finance_record IN SELECT id, description, due_date, type, amount FROM finance WHERE due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days' AND status = 'Pendente'
  LOOP
    SELECT EXISTS(SELECT 1 FROM notifications WHERE reference_id = finance_record.id AND reference_type = 'finance' AND type = 'payment_due_soon' AND created_at::date = CURRENT_DATE) INTO notification_exists;
    IF NOT notification_exists THEN
      INSERT INTO notifications (type, title, message, reference_id, reference_type) VALUES ('payment_due_soon', CASE finance_record.type WHEN 'Receita' THEN 'Recebimento próximo' ELSE 'Pagamento próximo' END, COALESCE(finance_record.description, 'Lançamento financeiro') || ' de R$ ' || TO_CHAR(finance_record.amount, 'FM999G999G999D00') || ' vence em ' || CASE WHEN finance_record.due_date = CURRENT_DATE THEN 'hoje' WHEN finance_record.due_date = CURRENT_DATE + 1 THEN 'amanhã' ELSE (finance_record.due_date - CURRENT_DATE) || ' dias' END, finance_record.id, 'finance');
    END IF;
  END LOOP;

  FOR finance_record IN SELECT id, description, due_date, type, amount FROM finance WHERE status = 'Atrasado'
  LOOP
    SELECT EXISTS(SELECT 1 FROM notifications WHERE reference_id = finance_record.id AND reference_type = 'finance' AND type = 'payment_overdue' AND created_at::date = CURRENT_DATE) INTO notification_exists;
    IF NOT notification_exists THEN
      INSERT INTO notifications (type, title, message, reference_id, reference_type) VALUES ('payment_overdue', CASE finance_record.type WHEN 'Receita' THEN 'Recebimento atrasado' ELSE 'Pagamento atrasado' END, COALESCE(finance_record.description, 'Lançamento financeiro') || ' de R$ ' || TO_CHAR(finance_record.amount, 'FM999G999G999D00') || ' está atrasado há ' || (CURRENT_DATE - finance_record.due_date) || ' dia(s)', finance_record.id, 'finance');
    END IF;
  END LOOP;

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
END;
$$;

-- Drop and recreate get_dashboard_metrics with correct return type
DROP FUNCTION IF EXISTS get_dashboard_metrics(date, date);
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(period_start date, period_end date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  today date := CURRENT_DATE;
BEGIN
  SELECT jsonb_build_object(
    'active_clients', (SELECT COUNT(*)::int FROM clients WHERE status = 'Ativo' AND created_at::date BETWEEN period_start AND period_end),
    'paused_clients', (SELECT COUNT(*)::int FROM clients WHERE status = 'Pausado'),
    'overdue_tasks', (SELECT COUNT(*)::int FROM tasks WHERE status = 'Atrasado'),
    'overdue_invoices_amount', COALESCE((SELECT SUM(amount) FROM finance WHERE status = 'Atrasado'), 0),
    'pending_invoices', (SELECT COUNT(*)::int FROM finance WHERE (status = 'Pendente' OR status = 'Atrasado') AND due_date BETWEEN period_start AND period_end),
    'pipeline_value', COALESCE((SELECT SUM(deal_value) FROM sales_pipeline WHERE stage NOT IN ('Perdido', 'Ganho')), 0),
    'hot_leads', (SELECT COUNT(*)::int FROM sales_pipeline WHERE stage = 'Proposta'),
    'revenue_in_period', COALESCE((SELECT SUM(amount) FROM finance WHERE status = 'Pago' AND due_date BETWEEN period_start AND period_end), 0),
    'leads_won', (SELECT COUNT(*)::int FROM sales_pipeline WHERE stage = 'Ganho' AND created_at::date BETWEEN period_start AND period_end),
    'tasks_by_status', COALESCE((SELECT jsonb_agg(jsonb_build_object('status', s, 'count', c)) FROM (SELECT status::text AS s, COUNT(*)::int AS c FROM tasks WHERE created_at::date BETWEEN period_start AND period_end GROUP BY status) sub), '[]'::jsonb),
    'recent_tasks', COALESCE((SELECT jsonb_agg(to_jsonb(sub.*)) FROM (SELECT id, title, description, status::text, priority::text, type::text, recurrence::text, client_id, project_id, due_date, created_at, updated_at FROM tasks WHERE status = 'Atrasado' OR (due_date = today AND status != 'Concluído') ORDER BY CASE WHEN status = 'Atrasado' THEN 0 ELSE 1 END, due_date NULLS LAST LIMIT 8) sub), '[]'::jsonb),
    'monthly_finance', COALESCE((SELECT jsonb_agg(jsonb_build_object('month', TO_CHAR(month_date, 'Mon/YY'), 'revenue', COALESCE(rev, 0), 'expense', COALESCE(exp, 0)) ORDER BY month_date) FROM (SELECT DATE_TRUNC('month', due_date)::date AS month_date, SUM(amount) FILTER (WHERE type = 'Receita' AND status = 'Pago') AS rev, SUM(amount) FILTER (WHERE type = 'Despesa' AND status = 'Pago') AS exp FROM finance GROUP BY DATE_TRUNC('month', due_date) ORDER BY month_date DESC LIMIT 6) sub), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_overdue_tasks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.tasks SET status = 'Atrasado'::task_status, updated_at = now() WHERE status IN ('A Fazer', 'Fazendo') AND due_date < CURRENT_DATE;
END;
$$;
