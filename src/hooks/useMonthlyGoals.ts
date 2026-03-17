import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MonthlyGoal {
  id: string;
  month: string;
  clients_to_close: number;
  revenue_target: number;
  leads_per_day: number;
  leads_per_month: number;
  ai_action_plan: string | null;
  created_at: string;
  updated_at: string;
}

export function useMonthlyGoals() {
  return useQuery({
    queryKey: ['monthly-goals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_goals')
        .select('*')
        .order('month', { ascending: false });
      if (error) throw error;
      return data as MonthlyGoal[];
    },
  });
}

export function useCurrentMonthGoal() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  return useQuery({
    queryKey: ['monthly-goals', currentMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_goals')
        .select('*')
        .eq('month', currentMonth)
        .maybeSingle();
      if (error) throw error;
      return data as MonthlyGoal | null;
    },
  });
}

export function useSaveMonthlyGoal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (goal: Omit<MonthlyGoal, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: existing } = await supabase
        .from('monthly_goals')
        .select('id')
        .eq('month', goal.month)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('monthly_goals')
          .update(goal)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('monthly_goals')
          .insert(goal)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-goals'] });
      toast({ title: 'Metas salvas com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar metas', description: error.message, variant: 'destructive' });
    },
  });
}
