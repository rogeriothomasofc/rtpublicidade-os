import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Subtask } from '@/types/database';
import { toast } from 'sonner';

export function useSubtasks(taskId: string | null) {
  return useQuery({
    queryKey: ['subtasks', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      
      const { data, error } = await supabase
        .from('subtasks')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as Subtask[];
    },
    enabled: !!taskId,
  });
}

export function useCreateSubtask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ taskId, title }: { taskId: string; title: string }) => {
      const { data, error } = await supabase
        .from('subtasks')
        .insert({ task_id: taskId, title })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', variables.taskId] });
    },
    onError: (error) => {
      toast.error('Erro ao criar subtarefa: ' + error.message);
    },
  });
}

export function useUpdateSubtask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, taskId, ...updates }: Partial<Subtask> & { id: string; taskId: string }) => {
      const { data, error } = await supabase
        .from('subtasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', variables.taskId] });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar subtarefa: ' + error.message);
    },
  });
}

export function useDeleteSubtask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, taskId }: { id: string; taskId: string }) => {
      const { error } = await supabase
        .from('subtasks')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', variables.taskId] });
    },
    onError: (error) => {
      toast.error('Erro ao remover subtarefa: ' + error.message);
    },
  });
}

export function useCreateManySubtasks() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ taskId, titles }: { taskId: string; titles: string[] }) => {
      const subtasks = titles.map(title => ({ task_id: taskId, title }));
      
      const { data, error } = await supabase
        .from('subtasks')
        .insert(subtasks)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error) => {
      toast.error('Erro ao criar subtarefas: ' + error.message);
    },
  });
}
