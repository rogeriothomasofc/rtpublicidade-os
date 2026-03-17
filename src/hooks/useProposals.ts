import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ProposalStatus = 'Rascunho' | 'Enviada' | 'Em negociação' | 'Aprovada' | 'Perdida' | 'Expirada';

export interface Proposal {
  id: string;
  client_id: string | null;
  pipeline_lead_id: string | null;
  responsible_member_id: string | null;
  company: string | null;
  campaign_objective: string | null;
  media_budget: number;
  segment: string | null;
  platforms: string[];
  services_included: string | null;
  creatives: string | null;
  landing_pages: string | null;
  automations: string | null;
  sla: string | null;
  monthly_fee: number;
  setup_fee: number;
  commission: number;
  tax_rate: number;
  margin: number;
  plan_type: string | null;
  validity_months: number;
  cancellation_terms: string | null;
  penalty: string | null;
  renewal_terms: string | null;
  response_deadline: number | null;
  notes: string | null;
  status: ProposalStatus;
  probability: number;
  version: number;
  parent_proposal_id: string | null;
  created_at: string;
  updated_at: string;
  client?: any;
  responsible?: any;
  pipeline_lead?: any;
}

export function useProposals() {
  return useQuery({
    queryKey: ['proposals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposals' as any)
        .select('*, client:clients(*), responsible:team_members(*), pipeline_lead:sales_pipeline(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as Proposal[];
    },
    staleTime: 60_000,   // 1 min
    gcTime: 300_000,
  });
}

export function useCreateProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (proposal: Partial<Proposal>) => {
      const { data, error } = await supabase
        .from('proposals' as any)
        .insert(proposal as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast.success('Proposta criada!');
    },
    onError: (error) => {
      toast.error('Erro ao criar proposta: ' + error.message);
    },
  });
}

export function useUpdateProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Proposal> & { id: string }) => {
      const { data, error } = await supabase
        .from('proposals' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast.success('Proposta atualizada!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar proposta: ' + error.message);
    },
  });
}

export function useDeleteProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('proposals' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast.success('Proposta removida!');
    },
    onError: (error) => {
      toast.error('Erro ao remover proposta: ' + error.message);
    },
  });
}

export function useDuplicateProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (proposal: Proposal) => {
      const { id, created_at, updated_at, client, responsible, pipeline_lead, ...rest } = proposal;
      const { data, error } = await supabase
        .from('proposals' as any)
        .insert({
          ...rest,
          status: 'Rascunho',
          version: (rest.version || 1) + 1,
          parent_proposal_id: id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast.success('Proposta duplicada!');
    },
    onError: (error) => {
      toast.error('Erro ao duplicar proposta: ' + error.message);
    },
  });
}
