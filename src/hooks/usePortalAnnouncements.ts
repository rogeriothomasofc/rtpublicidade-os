import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PortalAnnouncement {
  id: string;
  title: string;
  message: string;
  client_id: string | null;
  is_global: boolean;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  client?: { id: string; name: string; company: string } | null;
}

export function usePortalAnnouncements() {
  return useQuery({
    queryKey: ['portal-announcements'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('portal_announcements')
        .select('*, client:clients(id, name, company)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PortalAnnouncement[];
    },
  });
}

export function useClientAnnouncements(clientId: string | undefined) {
  return useQuery({
    queryKey: ['portal-announcements', 'client', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('portal_announcements')
        .select('*')
        .or(`is_global.eq.true,client_id.eq.${clientId}`)
        .eq('is_read', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PortalAnnouncement[];
    },
  });
}

export function useMarkAnnouncementRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('portal_announcements')
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-announcements'] });
    },
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (announcement: { title: string; message: string; client_id?: string | null; is_global: boolean }) => {
      const { data, error } = await (supabase as any)
        .from('portal_announcements')
        .insert(announcement)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-announcements'] });
      toast.success('Aviso enviado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao enviar aviso: ' + error.message);
    },
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('portal_announcements')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-announcements'] });
      toast.success('Aviso removido!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover aviso: ' + error.message);
    },
  });
}
