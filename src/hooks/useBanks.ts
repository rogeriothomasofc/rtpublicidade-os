import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Bank } from '@/types/database';
import { toast } from 'sonner';

export function useBanks() {
  return useQuery({
    queryKey: ['banks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Bank[];
    },
  });
}

export function useCreateBank() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bank: Omit<Bank, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from('banks').insert(bank).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      toast.success('Banco criado!');
    },
    onError: (e) => toast.error('Erro: ' + e.message),
  });
}

export function useUpdateBank() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Bank> & { id: string }) => {
      const { data, error } = await supabase.from('banks').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      toast.success('Banco atualizado!');
    },
    onError: (e) => toast.error('Erro: ' + e.message),
  });
}

export function useDeleteBank() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('banks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      toast.success('Banco excluído!');
    },
    onError: (e) => toast.error('Erro: ' + e.message),
  });
}
