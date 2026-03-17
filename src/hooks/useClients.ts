import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Client, ClientStatus } from '@/types/database';
import { toast } from 'sonner';

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Client[];
    },
    staleTime: 60_000,   // 1 min — clientes mudam raramente
    gcTime: 300_000,     // 5 min no cache após unmount
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (client: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('clients')
        .insert(client)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar cliente: ' + error.message);
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Client> & { id: string }) => {
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar cliente: ' + error.message);
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente removido!');
    },
    onError: (error) => {
      toast.error('Erro ao remover cliente: ' + error.message);
    },
  });
}

export const ONBOARDING_SUBTASKS = [
  'Etapa 1.0 - Criar Grupo do WhatsApp',
  'Etapa 1.1 - Briefing do Projeto',
  'Etapa 2.0 - Reunião Kickoff + Setup',
  'Etapa 3.0 - Criar Plano de Campanhas',
  'Etapa 3.1 - Mapeamento dos Entregáveis',
  'Etapa 4.0 - Apresentação da Estratégia',
  'Etapa 5.0 - Subir primeira campanha',
  'Etapa 5.1 - Reunião de Alinhamento do Projeto',
  'Etapa 6.0 - Fim do Onboarding',
];

export function createOnboardingParentTask(clientId: string, clientName: string) {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);
  
  return {
    title: `${clientName} - Iniciar Onboarding`,
    client_id: clientId,
    type: 'Onboarding' as const,
    priority: 'Alta' as const,
    status: 'A Fazer' as const,
    recurrence: 'Nenhuma' as const,
    due_date: dueDate.toISOString().split('T')[0],
  };
}
