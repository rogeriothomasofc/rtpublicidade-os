import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface Integration {
  id: string;
  provider: string;
  name: string;
  status: string;
  config: Json;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntegrationAccount {
  id: string;
  integration_id: string;
  account_external_id: string;
  account_name: string;
  client_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IntegrationLog {
  id: string;
  integration_id: string;
  action: string;
  status: string;
  message: string | null;
  details: Json;
  created_at: string;
}

export function useIntegrations() {
  return useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Integration[];
    },
  });
}

export function useIntegrationAccounts(integrationId?: string) {
  return useQuery({
    queryKey: ['integration-accounts', integrationId],
    enabled: !!integrationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_accounts')
        .select('*')
        .eq('integration_id', integrationId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as IntegrationAccount[];
    },
  });
}

export function useIntegrationLogs(integrationId?: string) {
  return useQuery({
    queryKey: ['integration-logs', integrationId],
    enabled: !!integrationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_logs')
        .select('*')
        .eq('integration_id', integrationId!)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as IntegrationLog[];
    },
  });
}

export function useUpsertIntegration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (integration: Partial<Integration> & { provider: string }) => {
      const payload = {
        ...integration,
        config: integration.config ?? ({} as Json),
      } as any;

      const { data: existing } = await supabase
        .from('integrations')
        .select('id')
        .eq('provider', integration.provider)
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('integrations')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('integrations')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast({ title: 'Integração atualizada' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDisconnectIntegration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('integrations')
        .update({ status: 'disconnected', config: {} })
        .eq('id', id);
      if (error) throw error;

      // Log disconnection
      await supabase.from('integration_logs').insert({
        integration_id: id,
        action: 'disconnect',
        status: 'success',
        message: 'Integração desconectada manualmente',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['integration-logs'] });
      toast({ title: 'Integração desconectada' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCreateIntegrationLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (log: Omit<IntegrationLog, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('integration_logs')
        .insert(log as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['integration-logs', variables.integration_id] });
    },
  });
}
