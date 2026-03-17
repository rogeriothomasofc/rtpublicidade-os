import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PipelineStage {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  probability: number;
  position: number;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export function usePipelineStages() {
  return useQuery({
    queryKey: ['pipeline_stages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('*')
        .order('position', { ascending: true });
      
      if (error) throw error;
      return data as PipelineStage[];
    },
  });
}

export function useCreatePipelineStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stage: { display_name: string; probability: number; description?: string }) => {
      // Get the highest position of non-system stages
      const { data: stages } = await supabase
        .from('pipeline_stages')
        .select('position')
        .eq('is_system', false)
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = stages && stages.length > 0 ? stages[0].position + 1 : 0;
      
      // Generate a name from display_name
      const name = stage.display_name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .toUpperCase();

      const { data, error } = await supabase
        .from('pipeline_stages')
        .insert({
          name,
          display_name: stage.display_name,
          description: stage.description || null,
          probability: stage.probability,
          position: nextPosition,
          is_system: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline_stages'] });
      toast.success('Coluna criada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar coluna');
    },
  });
}

export function useUpdatePipelineStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stage: { id: string; display_name?: string; probability?: number; position?: number; description?: string }) => {
      const { data, error } = await supabase
        .from('pipeline_stages')
        .update({
          ...(stage.display_name && { display_name: stage.display_name }),
          ...(stage.probability !== undefined && { probability: stage.probability }),
          ...(stage.position !== undefined && { position: stage.position }),
          ...(stage.description !== undefined && { description: stage.description }),
        })
        .eq('id', stage.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline_stages'] });
      toast.success('Coluna atualizada!');
    },
    onError: () => {
      toast.error('Erro ao atualizar coluna');
    },
  });
}

export function useDeletePipelineStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pipeline_stages')
        .delete()
        .eq('id', id)
        .eq('is_system', false); // Safety: only delete non-system stages

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline_stages'] });
      toast.success('Coluna excluída!');
    },
    onError: () => {
      toast.error('Erro ao excluir coluna');
    },
  });
}
