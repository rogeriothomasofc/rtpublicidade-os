import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type GmbLeadStatus =
  | 'Novo'
  | 'Contatado'
  | 'Respondeu'
  | 'Reunião Marcada'
  | 'Proposta Enviada'
  | 'Ganho'
  | 'Perdido';

export interface GmbLead {
  id: string;
  nome_empresa: string;
  telefone: string | null;
  whatsapp_jid: string | null;
  endereco: string | null;
  website: string | null;
  rating: number | null;
  reviews: number | null;
  especialidades: string | null;
  status: GmbLeadStatus;
  notes: string | null;
  mensagem_enviada: string | null;
  ai_diagnosis: string | null;
  ai_message: string | null;
  ai_messages: Array<{ part: number; message: string }> | null;
  website_issues: { critical: string[]; warnings: string[]; positives: string[]; score: number } | null;
  pipeline_lead_id: string | null;
  followup_at: string | null;
  instagram_username: string | null;
  instagram_found_via: string | null;
  icp_score: number | null;
  icp_qualificado: boolean | null;
  auto_prospectado_em: string | null;
  created_at: string;
  updated_at: string;
}

export interface GmbAnalyzeResult {
  diagnosis: string;
  website_issues: { critical: string[]; warnings: string[]; positives: string[]; score: number } | null;
  messages: Array<{ part: number; message: string }>;
  instagram_username: string | null;
  instagram_found_via: string | null;
}

export async function analyzeGmbLead(
  lead: Pick<GmbLead, 'id' | 'nome_empresa' | 'endereco' | 'website' | 'rating' | 'reviews' | 'especialidades' | 'telefone'>,
  instagram?: { username: string | null; bio: string | null; followers_count: number | null; niche: string | null } | null
): Promise<GmbAnalyzeResult> {
  const res = await supabase.functions.invoke('analyze-gmb-lead', { body: { lead, instagram: instagram ?? null } });
  if (res.error) throw res.error;
  return res.data as GmbAnalyzeResult;
}

export async function sendWhatsAppMessages(phone: string, messages: Array<{ message: string; delay?: number }>): Promise<void> {
  const res = await supabase.functions.invoke('send-whatsapp', { body: { phone, messages, source: 'pipeline' } });
  if (res.error) throw res.error;
  if (res.data?.error) throw new Error(res.data.error);
}

export type InsertGmbLead = Omit<GmbLead, 'id' | 'created_at' | 'updated_at'>;
export type UpdateGmbLead = Partial<InsertGmbLead> & { id: string };

const QUERY_KEY = ['gmb_leads'];

export function useGmbLeads() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gmb_leads' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as GmbLead[];
    },
  });
}

export function useUpdateGmbLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateGmbLead) => {
      const { data, error } = await supabase
        .from('gmb_leads' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as GmbLead;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
    onError: () => toast.error('Erro ao atualizar lead'),
  });
}

export function useDeleteGmbLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gmb_leads' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Lead removido');
    },
    onError: () => toast.error('Erro ao remover lead'),
  });
}

export const GMB_STATUSES: GmbLeadStatus[] = [
  'Novo', 'Contatado', 'Respondeu', 'Reunião Marcada',
  'Proposta Enviada', 'Ganho', 'Perdido',
];

export const GMB_STATUS_COLORS: Record<GmbLeadStatus, string> = {
  'Novo': 'bg-slate-500',
  'Contatado': 'bg-blue-500',
  'Respondeu': 'bg-yellow-500',
  'Reunião Marcada': 'bg-purple-500',
  'Proposta Enviada': 'bg-orange-500',
  'Ganho': 'bg-green-500',
  'Perdido': 'bg-red-500',
};
