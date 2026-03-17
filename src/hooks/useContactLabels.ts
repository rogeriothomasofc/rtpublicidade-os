import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useAssignLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, labelId }: { leadId: string; labelId: string }) => {
      // Check if already assigned
      const { data: existing } = await supabase
        .from('whatsapp_contact_labels')
        .select('id')
        .eq('lead_id', leadId)
        .eq('label_id', labelId)
        .maybeSingle();

      if (existing) return existing;

      const { data, error } = await supabase
        .from('whatsapp_contact_labels')
        .insert({ lead_id: leadId, label_id: labelId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contacts'] });
      toast.success('Etiqueta adicionada');
    },
    onError: (error) => {
      toast.error('Erro ao adicionar etiqueta: ' + error.message);
    },
  });
}

export function useRemoveLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, labelId }: { leadId: string; labelId: string }) => {
      const { error } = await supabase
        .from('whatsapp_contact_labels')
        .delete()
        .eq('lead_id', leadId)
        .eq('label_id', labelId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contacts'] });
      toast.success('Etiqueta removida');
    },
    onError: (error) => {
      toast.error('Erro ao remover etiqueta: ' + error.message);
    },
  });
}
