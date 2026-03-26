import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ProspectStatus =
  | 'Identificado'
  | 'Mensagem Enviada'
  | 'Respondeu'
  | 'Reunião Marcada'
  | 'Proposta Enviada'
  | 'Ganho'
  | 'Perdido';

export interface InstagramProspect {
  id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  followers_count: number | null;
  following_count: number | null;
  posts_count: number | null;
  engagement_rate: number | null;
  niche: string | null;
  website: string | null;
  whatsapp: string | null;
  email: string | null;
  profile_url: string | null;
  ai_analysis: string | null;
  ai_dm_message: string | null;
  ai_proposal_brief: string | null;
  ai_creative_concept: string | null;
  status: ProspectStatus;
  meeting_date: string | null;
  loss_reason: string | null;
  notes: string | null;
  pipeline_lead_id: string | null;
  created_at: string;
  updated_at: string;
}

export type InsertProspect = Omit<InstagramProspect, 'id' | 'profile_url' | 'created_at' | 'updated_at'>;
export type UpdateProspect = Partial<InsertProspect> & { id: string };

const QUERY_KEY = ['instagram_prospects'];

export function useInstagramProspects() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instagram_prospects' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as InstagramProspect[];
    },
  });
}

export function useCreateProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (prospect: InsertProspect) => {
      const { data, error } = await supabase
        .from('instagram_prospects' as any)
        .insert(prospect)
        .select()
        .single();
      if (error) throw error;
      return data as InstagramProspect;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Prospect criado com sucesso!');
    },
    onError: () => toast.error('Erro ao criar prospect'),
  });
}

export function useUpdateProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateProspect) => {
      const { data, error } = await supabase
        .from('instagram_prospects' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as InstagramProspect;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
    onError: () => toast.error('Erro ao atualizar prospect'),
  });
}

export function useDeleteProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('instagram_prospects' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Prospect removido');
    },
    onError: () => toast.error('Erro ao remover prospect'),
  });
}

export async function analyzeInstagramProspect(prospect: {
  username: string;
  full_name?: string;
  bio?: string;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
  niche?: string;
  website?: string;
  whatsapp?: string;
  email?: string;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Não autenticado');

  const res = await supabase.functions.invoke('analyze-instagram-prospect', {
    body: prospect,
  });

  if (res.error) throw res.error;
  return res.data as {
    analysis: string;
    dm_message: string;
    whatsapp_message: string;
    proposal_brief: string;
    creative_concept: string;
  };
}

export const PROSPECT_STATUSES: ProspectStatus[] = [
  'Identificado',
  'Mensagem Enviada',
  'Respondeu',
  'Reunião Marcada',
  'Proposta Enviada',
  'Ganho',
  'Perdido',
];

export const STATUS_COLORS: Record<ProspectStatus, string> = {
  'Identificado': 'bg-slate-500',
  'Mensagem Enviada': 'bg-blue-500',
  'Respondeu': 'bg-yellow-500',
  'Reunião Marcada': 'bg-purple-500',
  'Proposta Enviada': 'bg-orange-500',
  'Ganho': 'bg-green-500',
  'Perdido': 'bg-red-500',
};
