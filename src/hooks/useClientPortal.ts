import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useClientPortalAccess() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['client-portal-access', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('client_portal_access')
        .select('*, clients(*)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useClientTimeline(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-timeline', clientId],
    queryFn: async () => {
      if (!clientId) return { tasks: [], finance: [], planning: [] };

      const [tasksRes, financeRes, planningRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('id, title, status, priority, type, due_date, created_at, updated_at')
          .eq('client_id', clientId)
          .order('updated_at', { ascending: false }),
        supabase
          .from('finance')
          .select('id, description, amount, due_date, status, type, created_at, updated_at')
          .eq('client_id', clientId)
          .order('due_date', { ascending: false }),
        supabase
          .from('planning_campaigns')
          .select('id, name, platform, objective, status, start_date, end_date, total_budget, created_at, updated_at')
          .eq('client_id', clientId)
          .order('updated_at', { ascending: false }),
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (financeRes.error) throw financeRes.error;
      if (planningRes.error) throw planningRes.error;

      return {
        tasks: tasksRes.data || [],
        finance: financeRes.data || [],
        planning: planningRes.data || [],
      };
    },
    enabled: !!clientId,
  });
}

export function useClientComments(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-comments', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('client_activity_comments')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });
}

export function useAddClientComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (comment: {
      client_id: string;
      user_id: string;
      entity_type: string;
      entity_id: string;
      message: string;
    }) => {
      const { data, error } = await supabase
        .from('client_activity_comments')
        .insert(comment)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-comments', variables.client_id] });
    },
  });
}

export function useIsClientRole() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['is-client-role', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'client');
      
      if (error) return false;
      return (data?.length ?? 0) > 0;
    },
    enabled: !!user,
  });
}
