import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SmtpSettings {
  id: string;
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
  encryption: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useSmtpSettings() {
  return useQuery({
    queryKey: ['smtp-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('smtp_settings' as any)
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown) as SmtpSettings | null;
    },
  });
}

export function useSaveSmtpSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Omit<SmtpSettings, 'id' | 'created_at' | 'updated_at'>) => {
      // Check if exists
      const { data: existing } = await supabase
        .from('smtp_settings' as any)
        .select('id')
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('smtp_settings' as any)
          .update(settings as any)
          .eq('id', (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('smtp_settings' as any)
          .insert(settings as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smtp-settings'] });
      toast.success('Configurações SMTP salvas!');
    },
    onError: (err: Error) => {
      toast.error('Erro ao salvar SMTP: ' + err.message);
    },
  });
}
