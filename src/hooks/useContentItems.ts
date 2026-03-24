import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ContentCategory = 'Ideia' | 'A Criar' | 'Postado';
export type ContentStatus = 'Briefing' | 'Em Produção' | 'Revisão' | 'Aprovado' | 'Postado';
export type ContentPlatform = 'Instagram' | 'Facebook' | 'TikTok' | 'YouTube' | 'LinkedIn' | 'Twitter' | 'Outro';

export interface ContentItem {
  id: string;
  title: string;
  description: string | null;
  category: ContentCategory;
  platform: string;
  client_id: string | null;
  status: ContentStatus;
  scheduled_date: string | null;
  posted_date: string | null;
  post_link: string | null;
  image_urls: string[];
  run_id: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  client?: { id: string; name: string; company: string } | null;
}

export interface CreateContentItem {
  title: string;
  description?: string | null;
  category: ContentCategory;
  platform: string;
  client_id?: string | null;
  status?: ContentStatus;
  scheduled_date?: string | null;
  posted_date?: string | null;
  post_link?: string | null;
  tags?: string[];
}

const QUERY_KEY = ['content_items'];

export function useContentItems(category?: ContentCategory) {
  return useQuery({
    queryKey: [...QUERY_KEY, category],
    queryFn: async () => {
      let query = supabase
        .from('content_items' as any)
        .select('*, client:clients(id, name, company)')
        .order('created_at', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ContentItem[];
    },
  });
}

export function useCreateContentItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: CreateContentItem) => {
      const { data, error } = await supabase
        .from('content_items' as any)
        .insert(item)
        .select()
        .single();
      if (error) throw error;
      return data as ContentItem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Item criado!');
    },
    onError: () => toast.error('Erro ao criar item'),
  });
}

export function useUpdateContentItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContentItem> & { id: string }) => {
      const { error } = await supabase
        .from('content_items' as any)
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Item atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar item'),
  });
}

export function useDeleteContentItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('content_items' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Item excluído!');
    },
    onError: () => toast.error('Erro ao excluir item'),
  });
}

// ── Instagram publishing ──────────────────────────────────────────────────────

const IG_TOKEN  = import.meta.env.VITE_INSTAGRAM_ACCESS_TOKEN;
const IG_USER   = import.meta.env.VITE_INSTAGRAM_USER_ID;
const IG_BASE   = 'https://graph.facebook.com/v20.0';

export function usePublishToInstagram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ item, caption }: { item: ContentItem; caption: string }) => {
      if (!IG_TOKEN || !IG_USER) throw new Error('Credenciais do Instagram não configuradas');
      if (!item.image_urls?.length) throw new Error('Nenhuma imagem disponível para publicar');

      const images = item.image_urls;

      // 1. Criar containers para cada imagem
      const containerIds: string[] = [];
      for (const url of images) {
        const res = await fetch(
          `${IG_BASE}/${IG_USER}/media?image_url=${encodeURIComponent(url)}&is_carousel_item=true&access_token=${IG_TOKEN}`,
          { method: 'POST' }
        );
        const data = await res.json();
        if (!res.ok || !data.id) throw new Error(`Erro ao criar container: ${JSON.stringify(data)}`);
        containerIds.push(data.id);
      }

      // 2. Criar container do carrossel
      const carouselRes = await fetch(
        `${IG_BASE}/${IG_USER}/media?media_type=CAROUSEL&children=${containerIds.join(',')}&caption=${encodeURIComponent(caption)}&access_token=${IG_TOKEN}`,
        { method: 'POST' }
      );
      const carousel = await carouselRes.json();
      if (!carouselRes.ok || !carousel.id) throw new Error(`Erro ao criar carrossel: ${JSON.stringify(carousel)}`);

      // 3. Publicar
      const publishRes = await fetch(
        `${IG_BASE}/${IG_USER}/media_publish?creation_id=${carousel.id}&access_token=${IG_TOKEN}`,
        { method: 'POST' }
      );
      const published = await publishRes.json();
      if (!publishRes.ok || !published.id) throw new Error(`Erro ao publicar: ${JSON.stringify(published)}`);

      // 4. Atualizar item no banco
      const { error } = await supabase
        .from('content_items' as any)
        .update({
          category: 'Postado',
          status: 'Postado',
          posted_date: new Date().toISOString().split('T')[0],
          post_link: `https://www.instagram.com/p/${published.id}/`,
        })
        .eq('id', item.id);
      if (error) throw error;

      return published.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Publicado no Instagram!');
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}

export function useMoveContentItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, category }: { id: string; category: ContentCategory }) => {
      const updates: Record<string, unknown> = { category };
      if (category === 'Postado') {
        updates.status = 'Postado';
        updates.posted_date = new Date().toISOString().split('T')[0];
      }
      if (category === 'A Criar') {
        updates.status = 'Briefing';
      }
      const { error } = await supabase
        .from('content_items' as any)
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      const label = vars.category === 'A Criar' ? 'A Criar' : 'Postados';
      toast.success(`Movido para ${label}!`);
    },
    onError: () => toast.error('Erro ao mover item'),
  });
}
