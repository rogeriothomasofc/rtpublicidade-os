import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PresenceState {
  isOnline: boolean;
  isTyping: boolean;
}

export function useWhatsAppPresence(leadId: string) {
  const [remotePresence, setRemotePresence] = useState<PresenceState>({
    isOnline: false,
    isTyping: false,
  });
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const channel = supabase.channel(`whatsapp-presence-${leadId}`);
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat() as any[];
        const other = users.find((u) => u.role === 'user');
        setRemotePresence({
          isOnline: !!other,
          isTyping: other?.is_typing || false,
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ role: 'agent', online_at: new Date().toISOString(), is_typing: false });
        }
      });

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [leadId]);

  const setTyping = useCallback((typing: boolean) => {
    if (!channelRef.current) return;
    channelRef.current.track({ role: 'agent', online_at: new Date().toISOString(), is_typing: typing });

    if (typing) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        channelRef.current?.track({ role: 'agent', online_at: new Date().toISOString(), is_typing: false });
      }, 3000);
    }
  }, []);

  return { ...remotePresence, setTyping };
}
