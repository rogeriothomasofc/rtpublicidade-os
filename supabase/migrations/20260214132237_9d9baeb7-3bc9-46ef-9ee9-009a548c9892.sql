-- Fix: Recreate tasks_with_subtask_counts view with SECURITY INVOKER
-- This ensures RLS policies of the querying user are enforced, not the view creator's.

DROP VIEW IF EXISTS public.tasks_with_subtask_counts;

CREATE VIEW public.tasks_with_subtask_counts
WITH (security_invoker = true)
AS
SELECT
  t.id,
  t.title,
  t.description,
  t.status,
  t.priority,
  t.type,
  t.recurrence,
  t.client_id,
  t.project_id,
  t.due_date,
  t.created_at,
  t.updated_at,
  COALESCE(s.total, 0)::int AS subtasks_total,
  COALESCE(s.done, 0)::int AS subtasks_done
FROM public.tasks t
LEFT JOIN (
  SELECT
    task_id,
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE is_completed)::int AS done
  FROM public.subtasks
  GROUP BY task_id
) s ON s.task_id = t.id;