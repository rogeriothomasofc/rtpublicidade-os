import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UnreadCount {
  lead_id: string;
  count: number;
}

export function useUnreadMessages() {
  return useQuery({
    queryKey: ['unread-messages'],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('lead_id')
        .eq('direction', 'received')
        .is('read_at', null)
        .not('lead_id', 'is', null);

      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const msg of data || []) {
        if (msg.lead_id) {
          counts[msg.lead_id] = (counts[msg.lead_id] || 0) + 1;
        }
      }
      return counts;
    },
    refetchInterval: 10000,
  });
}

export async function markMessagesAsRead(leadId: string) {
  const { error } = await supabase
    .from('whatsapp_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('lead_id', leadId)
    .eq('direction', 'received')
    .is('read_at', null);

  if (error) console.error('Error marking messages as read:', error);
}
