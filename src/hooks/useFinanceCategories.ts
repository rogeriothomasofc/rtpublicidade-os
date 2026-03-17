import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FinanceCategoryRecord } from '@/types/database';
import { toast } from 'sonner';

export function useFinanceCategories() {
  return useQuery({
    queryKey: ['finance-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance_categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as FinanceCategoryRecord[];
    },
  });
}

export function useCreateFinanceCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cat: Omit<FinanceCategoryRecord, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from('finance_categories').insert(cat).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-categories'] });
      toast.success('Categoria criada!');
    },
    onError: (e) => toast.error('Erro: ' + e.message),
  });
}

export function useUpdateFinanceCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FinanceCategoryRecord> & { id: string }) => {
      const { data, error } = await supabase.from('finance_categories').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-categories'] });
      toast.success('Categoria atualizada!');
    },
    onError: (e) => toast.error('Erro: ' + e.message),
  });
}

export function useDeleteFinanceCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('finance_categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-categories'] });
      toast.success('Categoria excluída!');
    },
    onError: (e) => toast.error('Erro: ' + e.message),
  });
}
