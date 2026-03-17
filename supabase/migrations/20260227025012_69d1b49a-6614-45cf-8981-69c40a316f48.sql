
-- Update the RPC to accept due_time
CREATE OR REPLACE FUNCTION public.create_task_with_relations(
  p_title text,
  p_description text DEFAULT NULL,
  p_status task_status DEFAULT 'A Fazer',
  p_priority task_priority DEFAULT 'Média',
  p_type task_type DEFAULT 'Outro',
  p_recurrence task_recurrence DEFAULT 'Nenhuma',
  p_client_id uuid DEFAULT NULL,
  p_project_id uuid DEFAULT NULL,
  p_due_date date DEFAULT NULL,
  p_assignee_ids uuid[] DEFAULT '{}',
  p_subtask_titles text[] DEFAULT '{}',
  p_due_time text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_task_id uuid;
  aid uuid;
  stitle text;
BEGIN
  INSERT INTO tasks (title, description, status, priority, type, recurrence, client_id, project_id, due_date, due_time)
  VALUES (p_title, p_description, p_status, p_priority, p_type, p_recurrence, p_client_id, p_project_id, p_due_date, p_due_time)
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
$function$;
