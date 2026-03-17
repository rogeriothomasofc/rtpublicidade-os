import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PortalAccessLog {
  id: string;
  client_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  created_at: string;
}

export function usePortalAccessLogs(clientId?: string) {
  return useQuery({
    queryKey: ['portal-access-logs', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('portal_access_logs')
        .select('*')
        .eq('client_id', clientId)
        .order('started_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as PortalAccessLog[];
    },
    enabled: !!clientId,
  });
}

export function useCreatePortalAccessLog() {
  return useMutation({
    mutationFn: async (params: { client_id: string; user_id: string }) => {
      const { data, error } = await supabase
        .from('portal_access_logs')
        .insert({ client_id: params.client_id, user_id: params.user_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdatePortalAccessLog() {
  return useMutation({
    mutationFn: async (params: { id: string; ended_at: string; duration_seconds: number }) => {
      const { error } = await supabase
        .from('portal_access_logs')
        .update({ ended_at: params.ended_at, duration_seconds: params.duration_seconds })
        .eq('id', params.id);
      if (error) throw error;
    },
  });
}

export function usePortalAccessStats(clientId?: string) {
  const { data: logs, isLoading } = usePortalAccessLogs(clientId);

  const stats = {
    totalVisits: logs?.length || 0,
    lastAccess: logs?.[0]?.started_at || null,
    totalTimeSeconds: logs?.reduce((sum, l) => sum + (l.duration_seconds || 0), 0) || 0,
    averageTimeSeconds: 0,
  };

  if (stats.totalVisits > 0) {
    const logsWithDuration = logs?.filter(l => l.duration_seconds && l.duration_seconds > 0) || [];
    stats.averageTimeSeconds = logsWithDuration.length > 0
      ? logsWithDuration.reduce((sum, l) => sum + (l.duration_seconds || 0), 0) / logsWithDuration.length
      : 0;
  }

  return { stats, isLoading };
}
