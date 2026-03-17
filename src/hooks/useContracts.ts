import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ContractStatus = 'Ativo' | 'Expirado' | 'Cancelado';

export interface Contract {
  id: string;
  client_id: string;
  value: number;
  start_date: string;
  end_date?: string | null;
  status: ContractStatus;
  description?: string | null;
  duration_months?: number | null;
  created_at: string;
  updated_at: string;
}

export function useContracts() {
  return useQuery({
    queryKey: ['contracts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('*, client:clients(*)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    staleTime: 120_000,  // 2 min — contratos mudam raramente
    gcTime: 600_000,     // 10 min no cache
  });
}

export function useCreateContract() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (contract: Omit<Contract, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('contracts')
        .insert(contract)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contrato criado!');
    },
    onError: (error) => {
      toast.error('Erro ao criar contrato: ' + error.message);
    },
  });
}

export function useUpdateContract() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Contract> & { id: string }) => {
      const { data, error } = await supabase
        .from('contracts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contrato atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar contrato: ' + error.message);
    },
  });
}

export function useDeleteContract() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contrato removido!');
    },
    onError: (error) => {
      toast.error('Erro ao remover contrato: ' + error.message);
    },
  });
}
