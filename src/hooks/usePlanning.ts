import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
export type PlanningStatus = 'Rascunho' | 'Em Aprovação' | 'Pronto para Subir' | 'Publicado' | 'Em Teste' | 'Escalando' | 'Pausado';

export interface PlanningCampaign {
  id: string;
  client_id: string | null;
  name: string;
  objective: string | null;
  status: PlanningStatus;
  platform: string;
  start_date: string | null;
  end_date: string | null;
  total_budget: number;
  daily_budget: number;
  kpis: any[];
  notes: string | null;
  ai_summary: string | null;
  created_at: string;
  updated_at: string;
  client?: { id: string; name: string; company: string } | null;
}

export interface PlanningStructure {
  id: string;
  planning_id: string;
  name: string;
  type: string;
  objective: string | null;
  budget: number;
  kpis: any[];
  position: number;
  created_at: string;
  updated_at: string;
}

export interface PlanningAudience {
  id: string;
  planning_id: string;
  structure_id: string | null;
  name: string;
  type: string;
  description: string | null;
  estimated_size: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface PlanningCreative {
  id: string;
  planning_id: string;
  structure_id: string | null;
  name: string;
  format: string;
  status: string;
  file_url: string | null;
  copy_text: string | null;
  headline: string | null;
  cta: string | null;
  version: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanningTest {
  id: string;
  planning_id: string;
  hypothesis: string;
  variable: string;
  variants: any[];
  metric: string | null;
  status: string;
  winner: string | null;
  results: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanningChecklist {
  id: string;
  planning_id: string;
  title: string;
  is_completed: boolean;
  category: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface PlanningForecast {
  id: string;
  planning_id: string;
  label: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  cpa: number;
  revenue: number;
  roas: number;
  is_custom: boolean;
  created_at: string;
  updated_at: string;
}

// Cast to any because the new planning tables aren't in the auto-generated types yet
const sb = supabase as any;

// === CAMPAIGNS ===
export function usePlanningCampaigns() {
  return useQuery({
    queryKey: ['planning-campaigns'],
    queryFn: async () => {
      const { data, error } = await sb
        .from('planning_campaigns')
        .select('*, client:clients(id, name, company)')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as unknown as PlanningCampaign[];
    },
  });
}

export function usePlanningCampaign(id: string) {
  return useQuery({
    queryKey: ['planning-campaign', id],
    queryFn: async () => {
      const { data, error } = await sb
        .from('planning_campaigns')
        .select('*, client:clients(id, name, company)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as unknown as PlanningCampaign;
    },
    enabled: !!id,
  });
}

export function useCreatePlanningCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<PlanningCampaign>) => {
      const { data: result, error } = await sb
        .from('planning_campaigns')
        .insert(data as any)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planning-campaigns'] });
      toast.success('Planejamento criado!');
    },
    onError: () => toast.error('Erro ao criar planejamento'),
  });
}

export function useUpdatePlanningCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<PlanningCampaign> & { id: string }) => {
      const { error } = await sb.from('planning_campaigns').update(data as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['planning-campaigns'] });
      qc.invalidateQueries({ queryKey: ['planning-campaign', vars.id] });
      toast.success('Planejamento atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar'),
  });
}

export function useDeletePlanningCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('planning_campaigns').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planning-campaigns'] });
      toast.success('Planejamento excluído!');
    },
    onError: () => toast.error('Erro ao excluir'),
  });
}

export function useDuplicatePlanningCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: original, error: fetchErr } = await sb
        .from('planning_campaigns')
        .select('*')
        .eq('id', id)
        .single();
      if (fetchErr || !original) throw fetchErr;
      const { id: _, created_at, updated_at, ...rest } = original as any;
      const { data: newCampaign, error } = await sb
        .from('planning_campaigns')
        .insert({ ...rest, name: `${rest.name} (cópia)`, status: 'Rascunho' })
        .select()
        .single();
      if (error) throw error;
      return newCampaign;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planning-campaigns'] });
      toast.success('Planejamento duplicado!');
    },
    onError: () => toast.error('Erro ao duplicar'),
  });
}

// === GENERIC CRUD for sub-tables ===

function useSubTable<T>(table: string, planningId: string, key: string) {
  return useQuery({
    queryKey: [key, planningId],
    queryFn: async () => {
      const { data, error } = await sb
        .from(table)
        .select('*')
        .eq('planning_id', planningId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as T[];
    },
    enabled: !!planningId,
  });
}

function useCreateSub(table: string, key: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const { data: result, error } = await sb.from(table).insert(data).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: (_, vars: any) => {
      qc.invalidateQueries({ queryKey: [key, vars.planning_id] });
    },
    onError: () => toast.error('Erro ao salvar'),
  });
}

function useUpdateSub(table: string, key: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, planning_id, ...data }: any) => {
      const { error } = await sb.from(table).update(data).eq('id', id);
      if (error) throw error;
      return planning_id;
    },
    onSuccess: (planningId: string) => {
      qc.invalidateQueries({ queryKey: [key, planningId] });
    },
    onError: () => toast.error('Erro ao atualizar'),
  });
}

function useDeleteSub(table: string, key: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, planning_id }: { id: string; planning_id: string }) => {
      const { error } = await sb.from(table).delete().eq('id', id);
      if (error) throw error;
      return planning_id;
    },
    onSuccess: (planningId: string) => {
      qc.invalidateQueries({ queryKey: [key, planningId] });
    },
    onError: () => toast.error('Erro ao excluir'),
  });
}

// Structures
export const usePlanningStructures = (pid: string) => useSubTable<PlanningStructure>('planning_structures', pid, 'planning-structures');
export const useCreateStructure = () => useCreateSub('planning_structures', 'planning-structures');
export const useUpdateStructure = () => useUpdateSub('planning_structures', 'planning-structures');
export const useDeleteStructure = () => useDeleteSub('planning_structures', 'planning-structures');

// Audiences
export const usePlanningAudiences = (pid: string) => useSubTable<PlanningAudience>('planning_audiences', pid, 'planning-audiences');
export const useCreateAudience = () => useCreateSub('planning_audiences', 'planning-audiences');
export const useUpdateAudience = () => useUpdateSub('planning_audiences', 'planning-audiences');
export const useDeleteAudience = () => useDeleteSub('planning_audiences', 'planning-audiences');

// Creatives
export const usePlanningCreatives = (pid: string) => useSubTable<PlanningCreative>('planning_creatives', pid, 'planning-creatives');
export const useCreateCreative = () => useCreateSub('planning_creatives', 'planning-creatives');
export const useUpdateCreative = () => useUpdateSub('planning_creatives', 'planning-creatives');
export const useDeleteCreative = () => useDeleteSub('planning_creatives', 'planning-creatives');

// Tests
export const usePlanningTests = (pid: string) => useSubTable<PlanningTest>('planning_tests', pid, 'planning-tests');
export const useCreateTest = () => useCreateSub('planning_tests', 'planning-tests');
export const useUpdateTest = () => useUpdateSub('planning_tests', 'planning-tests');
export const useDeleteTest = () => useDeleteSub('planning_tests', 'planning-tests');

// Checklists
export const usePlanningChecklists = (pid: string) => useSubTable<PlanningChecklist>('planning_checklists', pid, 'planning-checklists');
export const useCreateChecklist = () => useCreateSub('planning_checklists', 'planning-checklists');
export const useUpdateChecklist = () => useUpdateSub('planning_checklists', 'planning-checklists');
export const useDeleteChecklist = () => useDeleteSub('planning_checklists', 'planning-checklists');

// Forecasts
export const usePlanningForecasts = (pid: string) => useSubTable<PlanningForecast>('planning_forecasts', pid, 'planning-forecasts');
export const useCreateForecast = () => useCreateSub('planning_forecasts', 'planning-forecasts');
export const useUpdateForecast = () => useUpdateSub('planning_forecasts', 'planning-forecasts');
export const useDeleteForecast = () => useDeleteSub('planning_forecasts', 'planning-forecasts');
