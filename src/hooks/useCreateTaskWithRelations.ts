import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TaskStatus, TaskPriority, TaskType, TaskRecurrence } from '@/types/database';
import { toast } from 'sonner';

interface CreateTaskWithRelationsInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  type?: TaskType;
  recurrence?: TaskRecurrence;
  client_id?: string | null;
  project_id?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  assignee_ids?: string[];
  subtask_titles?: string[];
}

/**
 * Hook for atomic task creation with relations (assignees + subtasks).
 * Uses the `create_task_with_relations` RPC for transactional safety.
 */
export function useCreateTaskWithRelations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTaskWithRelationsInput) => {
      const { data, error } = await supabase.rpc('create_task_with_relations', {
        p_title: input.title,
        p_description: input.description ?? null,
        p_status: input.status ?? 'A Fazer',
        p_priority: input.priority ?? 'Média',
        p_type: input.type ?? 'Outro',
        p_recurrence: input.recurrence ?? 'Nenhuma',
        p_client_id: input.client_id ?? null,
        p_project_id: input.project_id ?? null,
        p_due_date: input.due_date ?? null,
        p_assignee_ids: input.assignee_ids ?? [],
        p_subtask_titles: input.subtask_titles ?? [],
        p_due_time: input.due_time ?? null,
      });

      if (error) throw error;
      return data as string; // returns new task UUID
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
      toast.success('Tarefa criada!');
    },
    onError: (error) => {
      toast.error('Erro ao criar tarefa: ' + error.message);
    },
  });
}
