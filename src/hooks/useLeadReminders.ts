import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LeadReminder {
  id: string;
  lead_id: string;
  remind_at: string;
  note: string | null;
  is_dismissed: boolean;
  created_by: string | null;
  created_at: string;
}

export function useLeadReminders(leadId: string) {
  return useQuery({
    queryKey: ['lead-reminders', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_reminders')
        .select('*')
        .eq('lead_id', leadId)
        .eq('is_dismissed', false)
        .order('remind_at', { ascending: true });
      if (error) throw error;
      return data as LeadReminder[];
    },
    enabled: !!leadId,
  });
}

export function useCreateReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, remindAt, note }: { leadId: string; remindAt: string; note?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('lead_reminders')
        .insert({ lead_id: leadId, remind_at: remindAt, note: note || null, created_by: user?.id ?? null })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['lead-reminders', vars.leadId] });
      toast.success('Lembrete criado');
    },
    onError: () => toast.error('Erro ao criar lembrete'),
  });
}

export function useDismissReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, leadId }: { id: string; leadId: string }) => {
      const { error } = await supabase
        .from('lead_reminders')
        .update({ is_dismissed: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['lead-reminders', vars.leadId] });
      toast.success('Lembrete removido');
    },
    onError: () => toast.error('Erro ao remover lembrete'),
  });
}
