
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(period_start date, period_end date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  today date := CURRENT_DATE;
BEGIN
  SELECT jsonb_build_object(
    'active_clients', (SELECT COUNT(*)::int FROM clients WHERE status = 'Ativo' AND created_at::date BETWEEN period_start AND period_end),
    'paused_clients', (SELECT COUNT(*)::int FROM clients WHERE status = 'Pausado'),
    'overdue_tasks', (SELECT COUNT(*)::int FROM tasks WHERE status != 'Concluído' AND due_date < today),
    'overdue_invoices_amount', COALESCE((SELECT SUM(amount) FROM finance WHERE status = 'Atrasado'), 0),
    'pending_invoices', (SELECT COUNT(*)::int FROM finance WHERE (status = 'Pendente' OR status = 'Atrasado') AND due_date BETWEEN period_start AND period_end),
    'pipeline_value', COALESCE((SELECT SUM(deal_value) FROM sales_pipeline WHERE stage NOT IN ('Perdido', 'Ganho')), 0),
    'hot_leads', (SELECT COUNT(*)::int FROM sales_pipeline WHERE stage = 'Proposta'),
    'revenue_in_period', COALESCE((SELECT SUM(amount) FROM finance WHERE status = 'Pago' AND due_date BETWEEN period_start AND period_end), 0),
    'leads_won', (SELECT COUNT(*)::int FROM sales_pipeline WHERE stage = 'Ganho' AND created_at::date BETWEEN period_start AND period_end),
    'tasks_by_status', COALESCE((SELECT jsonb_agg(jsonb_build_object('status', s, 'count', c)) FROM (SELECT status::text AS s, COUNT(*)::int AS c FROM tasks WHERE created_at::date BETWEEN period_start AND period_end GROUP BY status) sub), '[]'::jsonb),
    'recent_tasks', COALESCE((SELECT jsonb_agg(to_jsonb(sub.*) ORDER BY sub.is_overdue DESC, sub.due_date NULLS LAST) FROM (
      SELECT id, title, description, status::text, priority::text, type::text, recurrence::text, client_id, project_id, due_date, created_at, updated_at,
        CASE WHEN due_date < today AND status != 'Concluído' THEN true ELSE false END AS is_overdue
      FROM tasks
      WHERE status != 'Concluído'
        AND (due_date <= today)
      ORDER BY
        CASE WHEN due_date < today THEN 0 ELSE 1 END,
        due_date NULLS LAST
      LIMIT 10
    ) sub), '[]'::jsonb),
    'monthly_finance', COALESCE((SELECT jsonb_agg(jsonb_build_object('month', TO_CHAR(month_date, 'Mon/YY'), 'revenue', COALESCE(rev, 0), 'expense', COALESCE(exp, 0)) ORDER BY month_date) FROM (SELECT DATE_TRUNC('month', due_date)::date AS month_date, SUM(amount) FILTER (WHERE type = 'Receita' AND status = 'Pago') AS rev, SUM(amount) FILTER (WHERE type = 'Despesa' AND status = 'Pago') AS exp FROM finance GROUP BY DATE_TRUNC('month', due_date) ORDER BY month_date DESC LIMIT 6) sub), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$$;
