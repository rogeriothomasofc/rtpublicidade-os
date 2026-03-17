import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Task, TaskStatus } from '@/types/database';
import { toast } from 'sonner';

export interface TaskWithAssignees extends Omit<Task, 'client' | 'project'> {
  client?: { id: string; name: string; company: string } | null;
  project?: { id: string; name: string; client_id: string } | null;
  assignees?: {
    id: string;
    member: {
      id: string;
      name: string;
      email: string | null;
      avatar_url: string | null;
    };
  }[];
  subtasks_count: number;
  subtasks_completed: number;
  subtasks_total?: number | null;
  subtasks_done?: number | null;
}

/**
 * Fetches tasks with subtask counts from the SQL view (single query)
 * and assignees via a joined select — no client-side aggregation.
 */
export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks_with_subtask_counts')
        .select(`
          *,
          client:clients(id, name, company),
          project:projects(id, name, client_id),
          assignees:task_assignees(
            id,
            member:team_members(id, name, email, avatar_url)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data ?? []).map(task => ({
        ...task,
        subtasks_count: task.subtasks_total ?? 0,
        subtasks_completed: task.subtasks_done ?? 0,
      })) as TaskWithAssignees[];
    },
    staleTime: 30_000,   // 30s — tarefas mudam com mais frequência
    gcTime: 120_000,     // 2 min no cache
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Status atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar status: ' + error.message);
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert(task)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarefa criada!');
    },
    onError: (error) => {
      toast.error('Erro ao criar tarefa: ' + error.message);
    },
  });
}

export function useCreateManyTasks() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (tasks: Omit<Task, 'id' | 'created_at' | 'updated_at'>[]) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert(tasks)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarefas de onboarding criadas!');
    },
    onError: (error) => {
      toast.error('Erro ao criar tarefas: ' + error.message);
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar tarefa: ' + error.message);
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarefa removida!');
    },
    onError: (error) => {
      toast.error('Erro ao remover tarefa: ' + error.message);
    },
  });
}
