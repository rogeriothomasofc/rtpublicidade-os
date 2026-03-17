import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SalesPipeline } from '@/types/database';
import { toast } from 'sonner';

export interface WhatsAppLabel {
  id: string;
  label_id: string;
  name: string;
  color: string | null;
}

export interface WhatsAppContact extends SalesPipeline {
  last_message?: string;
  last_message_time?: string;
  last_message_direction?: string;
  unread_count: number;
  labels: WhatsAppLabel[];
}

export function useWhatsAppContacts() {
  return useQuery({
    queryKey: ['whatsapp-contacts'],
    queryFn: async (): Promise<WhatsAppContact[]> => {
      // Get all leads with phone numbers
      const { data: leads, error: leadsError } = await supabase
        .from('sales_pipeline')
        .select('*')
        .not('phone', 'is', null)
        .not('phone', 'like', '%@lid')
        .neq('phone', '0')
        .order('updated_at', { ascending: false });

      if (leadsError) throw leadsError;

      // Get last message for each lead
      const { data: messages, error: msgError } = await supabase
        .from('whatsapp_messages')
        .select('lead_id, message, created_at, direction')
        .not('lead_id', 'is', null)
        .order('created_at', { ascending: false });

      if (msgError) throw msgError;

      // Get unread counts
      const { data: unreadMessages, error: unreadError } = await supabase
        .from('whatsapp_messages')
        .select('lead_id')
        .eq('direction', 'received')
        .is('read_at', null)
        .not('lead_id', 'is', null);

      if (unreadError) throw unreadError;

      // Get contact labels
      const { data: contactLabels } = await supabase
        .from('whatsapp_contact_labels')
        .select('lead_id, label_id, whatsapp_labels(*)');

      // Get all labels
      const { data: allLabels } = await supabase
        .from('whatsapp_labels')
        .select('*');

      const unreadCounts: Record<string, number> = {};
      for (const msg of unreadMessages || []) {
        if (msg.lead_id) {
          unreadCounts[msg.lead_id] = (unreadCounts[msg.lead_id] || 0) + 1;
        }
      }

      // Group last message per lead
      const lastMessages: Record<string, { message: string; created_at: string; direction: string }> = {};
      for (const msg of messages || []) {
        if (msg.lead_id && !lastMessages[msg.lead_id]) {
          lastMessages[msg.lead_id] = {
            message: msg.message,
            created_at: msg.created_at,
            direction: msg.direction,
          };
        }
      }

      // Group labels per lead
      const labelsMap: Record<string, WhatsAppLabel[]> = {};
      for (const cl of contactLabels || []) {
        if (cl.lead_id && cl.whatsapp_labels) {
          if (!labelsMap[cl.lead_id]) labelsMap[cl.lead_id] = [];
          const label = cl.whatsapp_labels as any;
          labelsMap[cl.lead_id].push({
            id: label.id,
            label_id: label.label_id,
            name: label.name,
            color: label.color,
          });
        }
      }

      // Combine and sort
      const contacts: WhatsAppContact[] = (leads || []).map((lead) => ({
        ...lead,
        source: (lead.source || 'manual') as SalesPipeline['source'],
        last_message: lastMessages[lead.id]?.message,
        last_message_time: lastMessages[lead.id]?.created_at,
        last_message_direction: lastMessages[lead.id]?.direction,
        unread_count: unreadCounts[lead.id] || 0,
        labels: labelsMap[lead.id] || [],
      }));

      contacts.sort((a, b) => {
        if (a.last_message_time && b.last_message_time) {
          return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
        }
        if (a.last_message_time) return -1;
        if (b.last_message_time) return 1;
        return 0;
      });

      return contacts;
    },
    refetchInterval: 10000,
  });
}

export function useWhatsAppLabels() {
  return useQuery({
    queryKey: ['whatsapp-labels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_labels')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as WhatsAppLabel[];
    },
  });
}

export function useSyncWhatsApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('whatsapp-chat', {
        body: { action: 'sync_chats' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-labels'] });
      queryClient.invalidateQueries({ queryKey: ['sales-pipeline'] });
      toast.success(
        `Sincronizado! ${data.synced} mensagens importadas, ${data.newLeads} novos contatos.`
      );
    },
    onError: (error) => {
      toast.error('Erro ao sincronizar: ' + error.message);
    },
  });
}

export function useFetchLabels() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('whatsapp-chat', {
        body: { action: 'fetch_labels' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-labels'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contacts'] });
      toast.success('Etiquetas sincronizadas!');
    },
    onError: (error) => {
      toast.error('Erro ao buscar etiquetas: ' + error.message);
    },
  });
}
