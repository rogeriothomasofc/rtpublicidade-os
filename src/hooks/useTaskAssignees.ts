import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TaskAssignee {
  id: string;
  task_id: string;
  member_id: string;
  created_at: string;
}

export function useUpdateTaskAssignees() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ taskId, memberIds }: { taskId: string; memberIds: string[] }) => {
      // First, delete all existing assignees for this task
      const { error: deleteError } = await supabase
        .from('task_assignees')
        .delete()
        .eq('task_id', taskId);
      
      if (deleteError) throw deleteError;
      
      // Then insert new assignees
      if (memberIds.length > 0) {
        const assignees = memberIds.map(memberId => ({
          task_id: taskId,
          member_id: memberId,
        }));
        
        const { error: insertError } = await supabase
          .from('task_assignees')
          .insert(assignees);
        
        if (insertError) throw insertError;
      }
      
      return { taskId, memberIds };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Responsáveis atualizados!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar responsáveis: ' + error.message);
    },
  });
}
