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
  // Diagnóstico completo
  website_issues: { critical: string[]; warnings: string[]; positives: string[]; score: number } | null;
  google_rating: number | null;
  google_reviews_count: number | null;
  google_address: string | null;
  diagnosis_report: string | null;
  status: ProspectStatus;
  meeting_date: string | null;
  loss_reason: string | null;
  notes: string | null;
  pipeline_lead_id: string | null;
  followup_at: string | null;
  created_at: string;
  updated_at: string;
}

export type InsertProspect = Omit<InstagramProspect, 'id' | 'profile_url' | 'created_at' | 'updated_at'> & {
  website_issues?: { critical: string[]; warnings: string[]; positives: string[]; score: number } | null;
};
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

export interface AnalyzeResult {
  profile: {
    full_name: string | null;
    bio: string | null;
    followers_count: number | null;
    following_count: number | null;
    posts_count: number | null;
    website: string | null;
    niche: string | null;
    is_business: boolean;
    avatar_url: string | null;
  } | null;
  profile_fetched: boolean;
  needs_manual_bio: boolean;
  website_audit: { critical: string[]; warnings: string[]; positives: string[]; score: number } | null;
  google_data: { rating: number | null; reviews_count: number | null; address: string | null; name: string | null } | null;
  diagnosis_report?: string;
  dm_message?: string;
  whatsapp_message?: string;
  proposal_brief?: string;
  creative_concept?: string;
  extracted_whatsapp?: string | null;
  extracted_email?: string | null;
}

export async function analyzeInstagramProspect(
  username: string,
  manual_bio?: string,
  website_url?: string
): Promise<AnalyzeResult> {
  const res = await supabase.functions.invoke('analyze-instagram-prospect', {
    body: { username, manual_bio, website_url },
  });
  if (res.error) throw res.error;
  return res.data as AnalyzeResult;
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
