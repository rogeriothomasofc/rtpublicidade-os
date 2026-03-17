import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AgencySettings {
  id: string;
  name: string;
  logo_url: string | null;
  cnpj: string | null;
  monthly_revenue_goal: number;
  monthly_profit_goal: number;
  main_bank_account: string | null;
  currency: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export function useAgencySettings() {
  return useQuery({
    queryKey: ['agency-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_settings')
        .select('*')
        .limit(1)
        .single();
      if (error) throw error;
      return data as AgencySettings;
    },
  });
}

export function useUpdateAgencySettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AgencySettings> & { id: string }) => {
      const { data, error } = await supabase
        .from('agency_settings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-settings'] });
      toast({ title: 'Configurações da agência atualizadas' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    },
  });
}
