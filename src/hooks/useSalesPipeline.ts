import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SalesPipeline, PipelineStage } from '@/types/database';
import { toast } from 'sonner';

export function useSalesPipeline() {
  return useQuery({
    queryKey: ['sales-pipeline'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_pipeline')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as SalesPipeline[];
    },
    staleTime: 45_000,   // 45s — pipeline muda durante o dia de vendas
    gcTime: 180_000,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (lead: Omit<SalesPipeline, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('sales_pipeline')
        .insert(lead)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-pipeline'] });
      toast.success('Lead criado!');
    },
    onError: (error) => {
      toast.error('Erro ao criar lead: ' + error.message);
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SalesPipeline> & { id: string }) => {
      const { data, error } = await supabase
        .from('sales_pipeline')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-pipeline'] });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar lead: ' + error.message);
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sales_pipeline')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-pipeline'] });
      toast.success('Lead removido!');
    },
    onError: (error) => {
      toast.error('Erro ao remover lead: ' + error.message);
    },
  });
}
