import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useGoogleCalendarStatus() {
  return useQuery({
    queryKey: ['google-calendar-status'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { connected: false };

      try {
        const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
          body: { action: 'status' },
        });
        return { connected: data?.connected || false };
      } catch {
        return { connected: false };
      }
    },
  });
}

export function useGoogleCalendarAuth() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('google-calendar-auth');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.url) {
        window.open(data.url, 'google-auth', 'width=600,height=700');
      }
    },
    onError: (error) => {
      toast.error('Erro ao conectar: ' + error.message);
    },
  });
}

export function useGoogleCalendarSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'sync' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['google-calendar-events'] });
      toast.success(`${data?.synced || 0} itens sincronizados!`);
    },
    onError: (error) => {
      toast.error('Erro ao sincronizar: ' + error.message);
    },
  });
}

export function useGoogleCalendarEvents(timeMin?: string, timeMax?: string) {
  return useQuery({
    queryKey: ['google-calendar-events', timeMin, timeMax],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'list', timeMin, timeMax },
      });
      if (error) throw error;
      return data?.events || [];
    },
    enabled: !!timeMin,
  });
}

export function useGoogleCalendarDisconnect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('google-calendar-sync', {
        body: { action: 'disconnect' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-calendar-status'] });
      queryClient.invalidateQueries({ queryKey: ['google-calendar-events'] });
      toast.success('Google Calendar desconectado');
    },
    onError: (error) => {
      toast.error('Erro ao desconectar: ' + error.message);
    },
  });
}
