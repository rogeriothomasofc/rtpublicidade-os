
ALTER TABLE public.tasks ADD COLUMN due_time text DEFAULT NULL;

-- Also update the view to include due_time
DROP VIEW IF EXISTS public.tasks_with_subtask_counts;
CREATE VIEW public.tasks_with_subtask_counts AS
SELECT
  t.id, t.title, t.description, t.status, t.priority, t.type, t.recurrence,
  t.client_id, t.project_id, t.due_date, t.due_time, t.created_at, t.updated_at,
  COALESCE(COUNT(s.id), 0)::int AS subtasks_total,
  COALESCE(COUNT(s.id) FILTER (WHERE s.is_completed), 0)::int AS subtasks_done
FROM tasks t
LEFT JOIN subtasks s ON s.task_id = t.id
GROUP BY t.id;
