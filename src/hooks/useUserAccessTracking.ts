import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useUserAccessTracking() {
  const { user } = useAuth();
  const logRef = useRef<{ id: string; startTime: number } | null>(null);

  useEffect(() => {
    if (!user) return;

    const startTime = Date.now();

    supabase
      .from('user_access_logs')
      .insert({ user_id: user.id })
      .select()
      .single()
      .then(({ data }) => {
        if (data) {
          logRef.current = { id: data.id, startTime };
        }
      });

    const handleEnd = () => {
      if (logRef.current) {
        const duration = Math.round((Date.now() - logRef.current.startTime) / 1000);
        navigator.sendBeacon?.(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_access_logs?id=eq.${logRef.current.id}`,
          '' // fallback below
        );
        supabase
          .from('user_access_logs')
          .update({ ended_at: new Date().toISOString(), duration_seconds: duration })
          .eq('id', logRef.current.id)
          .then(() => {});
        logRef.current = null;
      }
    };

    window.addEventListener('beforeunload', handleEnd);
    return () => {
      handleEnd();
      window.removeEventListener('beforeunload', handleEnd);
    };
  }, [user?.id]);
}

export interface UserAccessStats {
  userId: string;
  userName: string;
  avatarUrl: string | null;
  lastAccess: string | null;
  totalSessions: number;
  totalTimeSeconds: number;
}

export function useUserAccessStats() {
  return useQuery({
    queryKey: ['user-access-stats'],
    queryFn: async () => {
      // Busca apenas usuários com role ativo (membros atuais da equipe)
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id');
      const activeUserIds = new Set((roles || []).map((r: any) => r.user_id));

      // Try RPC first
      const { data: rpcData, error: rpcError } = await (supabase as any).rpc('get_user_access_stats');
      if (!rpcError && rpcData) {
        return (rpcData as any[])
          .filter(row => activeUserIds.has(row.user_id))
          .map(row => ({
            userId: row.user_id,
            userName: row.user_name || 'Usuário',
            avatarUrl: row.avatar_url || null,
            lastAccess: row.last_access,
            totalSessions: Number(row.total_sessions),
            totalTimeSeconds: Number(row.total_time_seconds),
          })) as UserAccessStats[];
      }

      // Fallback: manual aggregation
      const { data: logs, error } = await supabase
        .from('user_access_logs')
        .select('user_id, started_at, duration_seconds')
        .order('started_at', { ascending: false })
        .limit(500);
      if (error) throw error;

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, avatar_url');

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, { name: p.name, avatar_url: p.avatar_url }])
      );

      const userMap = new Map<string, { lastAccess: string | null; sessions: number; totalTime: number }>();
      for (const log of logs || []) {
        // Ignora usuários que não têm mais role ativo
        if (!activeUserIds.has(log.user_id)) continue;
        const existing = userMap.get(log.user_id) || { lastAccess: null, sessions: 0, totalTime: 0 };
        existing.sessions += 1;
        existing.totalTime += log.duration_seconds || 0;
        if (!existing.lastAccess || log.started_at > existing.lastAccess) {
          existing.lastAccess = log.started_at;
        }
        userMap.set(log.user_id, existing);
      }

      const stats: UserAccessStats[] = [];
      for (const [userId, data] of userMap) {
        const profile = profileMap.get(userId);
        stats.push({
          userId,
          userName: profile?.name?.trim() || 'Usuário',
          avatarUrl: profile?.avatar_url || null,
          lastAccess: data.lastAccess,
          totalSessions: data.sessions,
          totalTimeSeconds: data.totalTime,
        });
      }

      stats.sort((a, b) => {
        if (!a.lastAccess) return 1;
        if (!b.lastAccess) return -1;
        return b.lastAccess.localeCompare(a.lastAccess);
      });

      return stats;
    },
    refetchInterval: 60000,
  });
}
