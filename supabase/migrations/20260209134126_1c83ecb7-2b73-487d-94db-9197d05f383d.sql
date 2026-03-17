
-- =============================================
-- 1. VIEW: tasks_with_subtask_counts
-- Eliminates N+1 subtask queries from frontend
-- =============================================
CREATE OR REPLACE VIEW public.tasks_with_subtask_counts AS
SELECT 
  t.*,
  COALESCE(sc.subtasks_total, 0)::int AS subtasks_total,
  COALESCE(sc.subtasks_done, 0)::int AS subtasks_done
FROM public.tasks t
LEFT JOIN (
  SELECT 
    task_id,
    COUNT(*)::int AS subtasks_total,
    COUNT(*) FILTER (WHERE is_completed = true)::int AS subtasks_done
  FROM public.subtasks
  GROUP BY task_id
) sc ON sc.task_id = t.id;

-- =============================================
-- 2. RPC: get_dashboard_metrics
-- Moves all dashboard aggregations to backend
-- =============================================
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(
  period_start date,
  period_end date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  today date := CURRENT_DATE;
BEGIN
  SELECT jsonb_build_object(
    'active_clients', (
      SELECT COUNT(*)::int FROM clients 
      WHERE status = 'Active' AND created_at::date BETWEEN period_start AND period_end
    ),
    'paused_clients', (
      SELECT COUNT(*)::int FROM clients WHERE status = 'Paused'
    ),
    'overdue_tasks', (
      SELECT COUNT(*)::int FROM tasks WHERE status = 'Atrasado'
    ),
    'overdue_invoices_amount', COALESCE((
      SELECT SUM(amount) FROM finance WHERE status = 'Overdue'
    ), 0),
    'pending_invoices', (
      SELECT COUNT(*)::int FROM finance 
      WHERE (status = 'Pending' OR status = 'Overdue') 
      AND due_date BETWEEN period_start AND period_end
    ),
    'pipeline_value', COALESCE((
      SELECT SUM(deal_value) FROM sales_pipeline 
      WHERE stage NOT IN ('Lost', 'Won')
    ), 0),
    'hot_leads', (
      SELECT COUNT(*)::int FROM sales_pipeline WHERE stage = 'Proposal'
    ),
    'revenue_in_period', COALESCE((
      SELECT SUM(amount) FROM finance 
      WHERE status = 'Paid' AND due_date BETWEEN period_start AND period_end
    ), 0),
    'leads_won', (
      SELECT COUNT(*)::int FROM sales_pipeline 
      WHERE stage = 'Won' AND created_at::date BETWEEN period_start AND period_end
    ),
    'tasks_by_status', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('status', s, 'count', c))
      FROM (
        SELECT status::text AS s, COUNT(*)::int AS c 
        FROM tasks 
        WHERE created_at::date BETWEEN period_start AND period_end
        GROUP BY status
      ) sub
    ), '[]'::jsonb),
    'recent_tasks', COALESCE((
      SELECT jsonb_agg(to_jsonb(sub.*))
      FROM (
        SELECT id, title, description, status::text, priority::text, type::text, recurrence::text,
               client_id, project_id, due_date, created_at, updated_at
        FROM tasks
        WHERE status = 'Atrasado' 
           OR (due_date = today AND status != 'Concluído')
        ORDER BY 
          CASE WHEN status = 'Atrasado' THEN 0 ELSE 1 END,
          due_date NULLS LAST
        LIMIT 8
      ) sub
    ), '[]'::jsonb),
    'monthly_finance', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'month', TO_CHAR(month_date, 'Mon/YY'),
        'revenue', COALESCE(rev, 0),
        'expense', COALESCE(exp, 0)
      ) ORDER BY month_date)
      FROM (
        SELECT 
          DATE_TRUNC('month', due_date)::date AS month_date,
          SUM(amount) FILTER (WHERE type = 'Income' AND status = 'Paid') AS rev,
          SUM(amount) FILTER (WHERE type = 'Expense' AND status = 'Paid') AS exp
        FROM finance
        GROUP BY DATE_TRUNC('month', due_date)
        ORDER BY month_date DESC
        LIMIT 6
      ) sub
    ), '[]'::jsonb)
  ) INTO result;
  
  RETURN result;
END;
$$;

-- =============================================
-- 3. RPC: create_task_with_relations
-- Atomic task creation with subtasks + assignees
-- =============================================
CREATE OR REPLACE FUNCTION public.create_task_with_relations(
  p_title text,
  p_description text DEFAULT NULL,
  p_status task_status DEFAULT 'A Fazer',
  p_priority task_priority DEFAULT 'Medium',
  p_type task_type DEFAULT 'Other',
  p_recurrence task_recurrence DEFAULT 'None',
  p_client_id uuid DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_due_date date DEFAULT NULL,
  p_assignee_ids uuid[] DEFAULT '{}',
  p_subtask_titles text[] DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_task_id uuid;
  aid uuid;
  stitle text;
BEGIN
  -- Create task
  INSERT INTO tasks (title, description, status, priority, type, recurrence, client_id, project_id, due_date)
  VALUES (p_title, p_description, p_status, p_priority, p_type, p_recurrence, p_client_id, p_project_id, p_due_date)
  RETURNING id INTO new_task_id;

  -- Create assignees
  IF array_length(p_assignee_ids, 1) IS NOT NULL THEN
    FOREACH aid IN ARRAY p_assignee_ids LOOP
      INSERT INTO task_assignees (task_id, member_id) VALUES (new_task_id, aid);
    END LOOP;
  END IF;

  -- Create subtasks
  IF array_length(p_subtask_titles, 1) IS NOT NULL THEN
    FOREACH stitle IN ARRAY p_subtask_titles LOOP
      INSERT INTO subtasks (task_id, title) VALUES (new_task_id, stitle);
    END LOOP;
  END IF;

  RETURN new_task_id;
END;
$$;
