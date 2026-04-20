import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Finance } from '@/types/database';
import { toast } from 'sonner';

async function callAsaasApi(action: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('asaas-api', {
    body: { action, payload },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

async function isAsaasConnected(): Promise<boolean> {
  const { data } = await supabase
    .from('integrations')
    .select('status')
    .eq('provider', 'asaas')
    .single();
  return data?.status === 'connected';
}

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
    onSuccess: async (created) => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast.success('Registro financeiro criado!');
      // Auto-criar cobrança Asaas se for Receita com cliente e status Pendente
      if (created.type === 'Receita' && created.client_id && created.status !== 'Pago') {
        try {
          const connected = await isAsaasConnected();
          if (connected) {
            await callAsaasApi('create_charge', { finance_id: created.id, billing_type: 'PIX' });
            queryClient.invalidateQueries({ queryKey: ['finance'] });
            toast.success('Cobrança PIX criada no Asaas!');
          }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Erro desconhecido';
          toast.warning('Receita criada, mas erro no Asaas: ' + msg);
        }
      }
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
