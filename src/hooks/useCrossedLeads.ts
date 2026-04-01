import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useInstagramProspects, type InstagramProspect } from './useInstagramProspects';
import { useGmbLeads, type GmbLead } from './useGmbLeads';
import type { LeadCadence, CadenceStep } from '@/types/database';

// ─── Normalização de URL ──────────────────────────────────────────────────────
function normalizeWebsite(url: string | null): string {
  if (!url) return '';
  return url
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
    .trim();
}

// ─── Cálculo de heat score ────────────────────────────────────────────────────
function calcHeatScore(ig: InstagramProspect | null, gmb: GmbLead | null): {
  heat_score: number;
  instagram_score: number;
  gmb_score: number;
} {
  let base = 50;
  let igScore = 0;
  let gmbScore = 0;

  if (ig) {
    // Seguidores
    const followers = ig.followers_count ?? 0;
    if (followers > 10000) igScore += 10;
    else if (followers > 5000) igScore += 5;
    else if (followers < 1000) igScore -= 5;

    // Engajamento
    const eng = ig.engagement_rate ?? 0;
    if (eng > 3) igScore += 10;
    else if (eng > 1) igScore += 5;
    else if (eng < 0.5) igScore -= 5;

    // Website score: site fraco = oportunidade (+)
    const wsScore = ig.website_issues?.score ?? null;
    if (wsScore !== null) {
      if (wsScore < 50) igScore += 5;
      else if (wsScore > 80) igScore -= 5;
    }
  }

  if (gmb) {
    // Rating
    const rating = gmb.rating ?? 0;
    if (rating >= 4.0) gmbScore += 10;
    else if (rating >= 3.0) gmbScore += 0;
    else if (rating > 0) gmbScore -= 10;

    // Reviews
    const reviews = gmb.reviews ?? 0;
    if (reviews > 50) gmbScore += 10;
    else if (reviews > 20) gmbScore += 5;
    else if (reviews < 10) gmbScore -= 5;

    // Website score do GMB
    const wsScore = gmb.website_issues?.score ?? null;
    if (wsScore !== null) {
      if (wsScore < 50) gmbScore += 5;
      else if (wsScore > 80) gmbScore -= 5;
    }
  }

  // Bônus por ter os dois canais
  if (ig && gmb) base += 10;

  const total = Math.min(100, Math.max(0, base + igScore + gmbScore));
  return { heat_score: total, instagram_score: igScore, gmb_score: gmbScore };
}

// ─── Tipo de lead cruzado (antes de salvar) ───────────────────────────────────
export interface CrossedLead {
  id: string; // combinação dos IDs
  instagram_prospect: InstagramProspect | null;
  gmb_lead: GmbLead | null;
  website: string;
  lead_name: string;
  phone: string | null;
  email: string | null;
  heat_score: number;
  instagram_score: number;
  gmb_score: number;
  cadence?: LeadCadence;
}

// ─── Hook principal: cruzamento client-side ───────────────────────────────────
export function useCrossedLeads() {
  const { data: igLeads = [], isLoading: igLoading } = useInstagramProspects();
  const { data: gmbLeads = [], isLoading: gmbLoading } = useGmbLeads();
  const { data: cadences = [] } = useLeadCadences();

  const crossed: CrossedLead[] = [];
  const usedGmb = new Set<string>();
  const usedIg = new Set<string>();

  // Match por website
  for (const ig of igLeads) {
    const igSite = normalizeWebsite(ig.website);
    if (!igSite) continue;

    const matchedGmb = gmbLeads.find(
      g => !usedGmb.has(g.id) && normalizeWebsite(g.website) === igSite
    );

    if (matchedGmb) {
      usedGmb.add(matchedGmb.id);
      usedIg.add(ig.id);
      const scores = calcHeatScore(ig, matchedGmb);
      const cadence = cadences.find(
        c => c.instagram_prospect_id === ig.id || c.gmb_lead_id === matchedGmb.id
      );
      crossed.push({
        id: `${ig.id}_${matchedGmb.id}`,
        instagram_prospect: ig,
        gmb_lead: matchedGmb,
        website: igSite,
        lead_name: ig.full_name || matchedGmb.nome_empresa,
        phone: ig.whatsapp || matchedGmb.telefone || matchedGmb.whatsapp_jid,
        email: ig.email,
        cadence,
        ...scores,
      });
    }
  }

  // Leads do GMB sem match no Instagram (aparecem como parciais)
  for (const gmb of gmbLeads) {
    if (usedGmb.has(gmb.id)) continue;
    const scores = calcHeatScore(null, gmb);
    const cadence = cadences.find(c => c.gmb_lead_id === gmb.id);
    crossed.push({
      id: `gmb_${gmb.id}`,
      instagram_prospect: null,
      gmb_lead: gmb,
      website: normalizeWebsite(gmb.website),
      lead_name: gmb.nome_empresa,
      phone: gmb.telefone || gmb.whatsapp_jid,
      email: null,
      cadence,
      ...scores,
    });
  }

  // Leads do Instagram sem match no GMB
  for (const ig of igLeads) {
    if (usedIg.has(ig.id)) continue;
    const scores = calcHeatScore(ig, null);
    const cadence = cadences.find(c => c.instagram_prospect_id === ig.id);
    crossed.push({
      id: `ig_${ig.id}`,
      instagram_prospect: ig,
      gmb_lead: null,
      website: normalizeWebsite(ig.website),
      lead_name: ig.full_name || ig.username,
      phone: ig.whatsapp,
      email: ig.email,
      cadence,
      ...scores,
    });
  }

  // Ordenar por heat_score desc
  crossed.sort((a, b) => b.heat_score - a.heat_score);

  return {
    data: crossed,
    isLoading: igLoading || gmbLoading,
    matchedCount: crossed.filter(c => c.instagram_prospect && c.gmb_lead).length,
    igOnlyCount: crossed.filter(c => c.instagram_prospect && !c.gmb_lead).length,
    gmbOnlyCount: crossed.filter(c => !c.instagram_prospect && c.gmb_lead).length,
  };
}

// ─── Hook: CRUD da tabela lead_cadence ───────────────────────────────────────
const CADENCE_KEY = ['lead_cadence'];

export function useLeadCadences() {
  return useQuery({
    queryKey: CADENCE_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_cadence' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as LeadCadence[];
    },
  });
}

export function useCreateCadence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<LeadCadence, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('lead_cadence' as any)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as LeadCadence;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CADENCE_KEY });
      toast.success('Cadência criada!');
    },
    onError: () => toast.error('Erro ao criar cadência'),
  });
}

export function useUpdateCadence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LeadCadence> & { id: string }) => {
      const { data, error } = await supabase
        .from('lead_cadence' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as LeadCadence;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CADENCE_KEY }),
    onError: () => toast.error('Erro ao atualizar cadência'),
  });
}

export function useDeleteCadence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lead_cadence' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CADENCE_KEY });
      toast.success('Cadência removida');
    },
    onError: () => toast.error('Erro ao remover cadência'),
  });
}

// ─── Gerar cadência via IA ────────────────────────────────────────────────────
export interface GenerateCadenceResult {
  analysis: string;
  cadence_steps: CadenceStep[];
  heat_score: number;
}

export async function generateLeadCadence(
  lead: CrossedLead
): Promise<GenerateCadenceResult> {
  const res = await supabase.functions.invoke('generate-lead-cadence', {
    body: {
      lead_name: lead.lead_name,
      website: lead.website,
      phone: lead.phone,
      email: lead.email,
      heat_score: lead.heat_score,
      instagram: lead.instagram_prospect ? {
        username: lead.instagram_prospect.username,
        bio: lead.instagram_prospect.bio,
        followers_count: lead.instagram_prospect.followers_count,
        engagement_rate: lead.instagram_prospect.engagement_rate,
        niche: lead.instagram_prospect.niche,
        website_issues: lead.instagram_prospect.website_issues,
        diagnosis_report: lead.instagram_prospect.diagnosis_report,
        ai_dm_message: lead.instagram_prospect.ai_dm_message,
      } : null,
      gmb: lead.gmb_lead ? {
        nome_empresa: lead.gmb_lead.nome_empresa,
        endereco: lead.gmb_lead.endereco,
        rating: lead.gmb_lead.rating,
        reviews: lead.gmb_lead.reviews,
        especialidades: lead.gmb_lead.especialidades,
        website_issues: lead.gmb_lead.website_issues,
        ai_diagnosis: lead.gmb_lead.ai_diagnosis,
        ai_messages: lead.gmb_lead.ai_messages,
      } : null,
    },
  });
  if (res.error) throw res.error;
  return res.data as GenerateCadenceResult;
}

// ─── Registrar primeiro contato na cadência ───────────────────────────────────
// Chamada quando o usuário envia a primeira mensagem (DM ou WhatsApp).
// Marca o primeiro step pendente como 'done' e ativa a cadência.
export async function markFirstContactInCadence(
  gmbLeadId: string | null,
  instagramProspectId: string | null,
  channel: string
): Promise<void> {
  // Buscar cadência existente para este lead
  const filters: string[] = [];
  if (gmbLeadId) filters.push(`gmb_lead_id.eq.${gmbLeadId}`);
  if (instagramProspectId) filters.push(`instagram_prospect_id.eq.${instagramProspectId}`);
  if (!filters.length) return;

  const { data } = await supabase
    .from('lead_cadence' as any)
    .select('*')
    .or(filters.join(','))
    .limit(1)
    .single();

  if (!data) return; // sem cadência criada, nada a fazer
  const cadence = data as LeadCadence;

  const steps = [...(cadence.cadence_steps || [])];
  const firstPendingIdx = steps.findIndex(s => s.status === 'pending');
  if (firstPendingIdx === -1) return; // todos já marcados

  steps[firstPendingIdx] = { ...steps[firstPendingIdx], status: 'done' };

  await supabase
    .from('lead_cadence' as any)
    .update({
      cadence_steps: steps,
      status: 'active',
      current_step: firstPendingIdx + 1,
    })
    .eq('id', cadence.id);
}

export const CHANNEL_LABELS: Record<string, string> = {
  instagram_dm: 'Instagram DM',
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  ligacao: 'Ligação',
};

export const CHANNEL_COLORS: Record<string, string> = {
  instagram_dm: 'bg-pink-500',
  whatsapp: 'bg-green-500',
  email: 'bg-blue-500',
  ligacao: 'bg-purple-500',
};
