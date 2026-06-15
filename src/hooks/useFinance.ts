import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Finance } from '@/types/database';
import { toast } from 'sonner';

export function useFinance() {
  return useQuery({
    queryKey: ['finance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('finance')
        .select(`
          *,
          client:clients(id, name, company),
          bank:banks(id, name)
        `)
        .order('due_date', { ascending: false });
      
      if (error) throw error;
      return data as unknown as Finance[];
    },
    staleTime: 60_000,   // 1 min — lançamentos mudam pontualmente
    gcTime: 300_000,
  });
}

export function useCreateFinance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (finance: Omit<Finance, 'id' | 'created_at' | 'updated_at' | 'client'>) => {
      const { data, error } = await supabase
        .from('finance')
        .insert({
          client_id: finance.client_id,
          amount: finance.amount,
          due_date: finance.due_date,
          status: finance.status,
          type: finance.type,
          description: finance.description || null,
          category: finance.category || null,
          cost_center: finance.cost_center || null,
          recurrence: finance.recurrence || 'Nenhuma',
          bank_id: finance.bank_id || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast.success('Registro financeiro criado!');
    },
    onError: (error) => {
      toast.error('Erro: ' + error.message);
    },
  });
}

export function useUpdateFinance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Finance> & { id: string }) => {
      const { client, ...dbUpdates } = updates as any;
      const { data, error } = await supabase
        .from('finance')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast.success('Registro atualizado!');
    },
    onError: (error) => {
      toast.error('Erro: ' + error.message);
    },
  });
}

export function useDeleteFinance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('finance')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast.success('Registro excluído!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir: ' + error.message);
    },
  });
}
