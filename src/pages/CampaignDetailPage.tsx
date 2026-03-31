import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ArrowLeft, RefreshCw, Megaphone, Image, Play,
  ExternalLink, Eye, Layers, MoreHorizontal, Loader2,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────
type LocalStatus = 'Rascunho' | 'Enviado' | 'Publicado' | 'Pausado' | 'Arquivado';

interface MetaAd {
  id: string;
  adset_id: string;
  name: string;
  format: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
  headline?: string;
  body?: string;
  image_url?: string;
  link_url?: string;
  cta_type?: string;
  meta_id?: string;
  meta_status?: string;
  local_status: LocalStatus;
}

interface MetaAdSet {
  id: string;
  campaign_id: string;
  name: string;
  optimization_goal: string;
  meta_id?: string;
  local_status: LocalStatus;
  ads?: MetaAd[];
}

interface MetaCampaign {
  id: string;
  client_id: string;
  name: string;
  objective: string;
  budget_type: string;
  budget_value?: number;
  start_time?: string;
  end_time?: string;
  meta_id?: string;
  meta_status?: string;
  local_status: LocalStatus;
  notes?: string;
  client?: { id: string; name: string };
  adsets?: MetaAdSet[];
}

// ─── Constants ───────────────────────────────────────────────
const OBJECTIVES: Record<string, string> = {
  OUTCOME_AWARENESS: 'Reconhecimento',
  OUTCOME_TRAFFIC: 'Tráfego',
  OUTCOME_ENGAGEMENT: 'Engajamento',
  OUTCOME_LEADS: 'Leads',
  OUTCOME_SALES: 'Vendas',
  MESSAGES: 'Mensagens',
};

const CTA_LABELS: Record<string, string> = {
  LEARN_MORE: 'Saiba mais',
  SHOP_NOW: 'Comprar agora',
  SIGN_UP: 'Cadastre-se',
  CONTACT_US: 'Fale conosco',
  SEND_MESSAGE: 'Enviar mensagem',
  GET_QUOTE: 'Solicitar orçamento',
  DOWNLOAD: 'Baixar',
  BOOK_TRAVEL: 'Reservar',
};

const STATUS_COLORS: Record<LocalStatus, string> = {
  Rascunho: 'bg-muted text-muted-foreground',
  Enviado: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  Publicado: 'bg-green-500/15 text-green-700 dark:text-green-400',
  Pausado: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  Arquivado: 'bg-red-500/15 text-red-700 dark:text-red-400',
};

// ─── Hook ────────────────────────────────────────────────────
function useCampaign(id: string) {
  return useQuery<MetaCampaign>({
    queryKey: ['meta-campaign-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_campaigns')
        .select(`
          *,
          client:clients(id, name),
          adsets:meta_adsets(
            *,
            ads:meta_ads(*)
          )
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as MetaCampaign;
    },
    enabled: !!id,
  });
}

// ─── Status Badge ─────────────────────────────────────────────
function StatusBadge({ status }: { status: LocalStatus }) {
  return (
    <Badge className={`text-xs font-medium ${STATUS_COLORS[status] ?? STATUS_COLORS.Rascunho}`}>
      {status}
    </Badge>
  );
}

// ─── Ad Preview Dialog ────────────────────────────────────────
function AdPreviewDialog({ ad, open, onClose }: { ad: MetaAd | null; open: boolean; onClose: () => void }) {
  if (!ad) return null;

  const ctaLabel = ad.cta_type ? (CTA_LABELS[ad.cta_type] ?? ad.cta_type) : 'Saiba mais';
  const domain = ad.link_url
    ? (() => { try { return new URL(ad.link_url).hostname.replace('www.', ''); } catch { return ad.link_url; } })()
    : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-base flex items-center gap-2">
            <Eye className="w-4 h-4" /> Preview do criativo
          </DialogTitle>
        </DialogHeader>

        <div className="mx-4 mb-4 border border-border rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
          {/* Page header */}
          <div className="flex items-center gap-2 p-3">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Megaphone className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight truncate">Página do anunciante</p>
              <p className="text-xs text-muted-foreground">Patrocinado · <span className="inline-flex items-center gap-0.5">🌐</span></p>
            </div>
            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
          </div>

          {ad.body && <p className="px-3 pb-2 text-sm leading-relaxed">{ad.body}</p>}

          {ad.image_url ? (
            ad.format === 'VIDEO' ? (
              <video src={ad.image_url} controls className="w-full max-h-72 object-cover bg-black" />
            ) : (
              <img src={ad.image_url} alt={ad.name} className="w-full max-h-72 object-cover" />
            )
          ) : (
            <div className="w-full h-48 bg-muted flex flex-col items-center justify-center gap-2">
              <Image className="w-10 h-10 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Sem imagem</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-muted/40 border-t border-border">
            <div className="flex-1 min-w-0">
              {domain && <p className="text-[10px] text-muted-foreground uppercase tracking-wide truncate">{domain}</p>}
              {ad.headline && <p className="text-sm font-semibold leading-tight truncate">{ad.headline}</p>}
            </div>
            <button className="shrink-0 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold px-3 py-1.5 rounded-md border border-border transition-colors">
              {ctaLabel}
            </button>
          </div>

          <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground border-t border-border">
            <span>👍 ❤️  Curtir · Comentar · Compartilhar</span>
          </div>
        </div>

        <div className="px-4 pb-4 space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-foreground">Formato:</span>
            <span>{ad.format === 'IMAGE' ? 'Imagem' : ad.format === 'VIDEO' ? 'Vídeo' : 'Carrossel'}</span>
          </div>
          {ad.link_url && (
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-foreground">Destino:</span>
              <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-0.5 truncate max-w-[220px]">
                {ad.link_url}
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-foreground">Status:</span>
            <StatusBadge status={ad.local_status} />
          </div>
          {ad.meta_id && (
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-foreground">ID Meta:</span>
              <span className="font-mono">{ad.meta_id}</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Creative Card ────────────────────────────────────────────
function CreativeCard({ ad, adsetName, onPreview }: { ad: MetaAd; adsetName: string; onPreview: (ad: MetaAd) => void }) {
  const hasPreview = !!(ad.image_url || ad.headline || ad.body);

  return (
    <div
      className={`border border-border rounded-xl overflow-hidden bg-card flex flex-col ${hasPreview ? 'cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all' : ''}`}
      onClick={() => hasPreview && onPreview(ad)}
    >
      {/* Thumbnail */}
      <div className="aspect-square bg-muted relative">
        {ad.image_url ? (
          ad.format === 'VIDEO' ? (
            <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
              <Play className="w-8 h-8 text-white" />
            </div>
          ) : (
            <img src={ad.image_url} alt={ad.name} className="w-full h-full object-cover" />
          )
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <Image className="w-8 h-8 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Sem imagem</span>
          </div>
        )}

        {/* Format badge */}
        <div className="absolute top-2 left-2">
          <span className="text-[10px] font-semibold bg-black/60 text-white px-1.5 py-0.5 rounded">
            {ad.format === 'IMAGE' ? 'IMG' : ad.format === 'VIDEO' ? 'VID' : 'CAR'}
          </span>
        </div>

        {hasPreview && (
          <div className="absolute inset-0 bg-black/0 hover:bg-black/10 flex items-center justify-center opacity-0 hover:opacity-100 transition-all">
            <Eye className="w-6 h-6 text-white drop-shadow-md" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="text-sm font-medium leading-tight line-clamp-2">{ad.name}</p>
        {ad.headline && (
          <p className="text-xs text-muted-foreground truncate">{ad.headline}</p>
        )}
        <div className="flex items-center justify-between mt-auto pt-1">
          <span className="text-[10px] text-muted-foreground truncate max-w-[100px]" title={adsetName}>
            {adsetName}
          </span>
          <StatusBadge status={ad.local_status} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [previewAd, setPreviewAd] = useState<MetaAd | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [adsetFilter, setAdsetFilter] = useState<string>('all');

  const { data: campaign, isLoading } = useCampaign(id!);

  const adsets = campaign?.adsets ?? [];
  const allAds = adsets.flatMap(as => (as.ads ?? []).map(ad => ({ ...ad, adsetName: as.name })));

  const filteredAds = adsetFilter === 'all'
    ? allAds
    : allAds.filter(ad => ad.adset_id === adsetFilter);

  const objectiveLabel = campaign ? (OBJECTIVES[campaign.objective] ?? campaign.objective) : '';

  const handleRefresh = async () => {
    if (!campaign?.meta_id) {
      toast.error('Esta campanha não tem ID do Meta para sincronizar');
      return;
    }
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('meta-campaigns-manager/refresh-campaign', {
        body: { campaign_id: campaign.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      qc.invalidateQueries({ queryKey: ['meta-campaign-detail', id] });
      qc.invalidateQueries({ queryKey: ['meta-campaigns'] });
      toast.success(`Campanha atualizada: ${data.new_ads ?? 0} novo${data.new_ads !== 1 ? 's' : ''} anúncio${data.new_ads !== 1 ? 's' : ''}, ${data.updated ?? 0} atualizado${data.updated !== 1 ? 's' : ''}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao atualizar campanha');
    } finally {
      setRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-5">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="aspect-square rounded-xl" />)}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!campaign) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center py-20">
          <Megaphone className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="font-semibold">Campanha não encontrada</p>
          <Button className="mt-4" variant="outline" onClick={() => navigate('/campaigns')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start gap-3 flex-wrap">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 mt-0.5" onClick={() => navigate('/campaigns')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold truncate">{campaign.name}</h1>
              <StatusBadge status={campaign.local_status} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {campaign.client?.name && <span>{campaign.client.name} · </span>}
              {objectiveLabel}
              {campaign.budget_value && ` · R$ ${Number(campaign.budget_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ${campaign.budget_type === 'daily' ? '/dia' : 'total'}`}
              {campaign.meta_id && <span className="font-mono text-xs ml-1">#{campaign.meta_id.slice(-6)}</span>}
            </p>
          </div>
          {campaign.meta_id && (
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Atualizando...' : 'Atualizar do Meta'}
            </Button>
          )}
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3">
          <div className="border border-border rounded-lg p-3 bg-card">
            <p className="text-xs text-muted-foreground">Conjuntos</p>
            <p className="text-2xl font-bold">{adsets.length}</p>
          </div>
          <div className="border border-border rounded-lg p-3 bg-card">
            <p className="text-xs text-muted-foreground">Anúncios</p>
            <p className="text-2xl font-bold">{allAds.length}</p>
          </div>
          <div className="border border-border rounded-lg p-3 bg-card">
            <p className="text-xs text-muted-foreground">Com imagem</p>
            <p className="text-2xl font-bold">{allAds.filter(a => a.image_url).length}</p>
          </div>
        </div>

        {/* Adset filter tabs */}
        {adsets.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            <button
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${adsetFilter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50'}`}
              onClick={() => setAdsetFilter('all')}
            >
              Todos ({allAds.length})
            </button>
            {adsets.map(as => (
              <button
                key={as.id}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5 ${adsetFilter === as.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50'}`}
                onClick={() => setAdsetFilter(as.id)}
              >
                <Layers className="w-3 h-3" />
                <span className="max-w-[120px] truncate">{as.name}</span>
                <span className="opacity-70">({as.ads?.length ?? 0})</span>
              </button>
            ))}
          </div>
        )}

        {/* Creatives grid */}
        {filteredAds.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Image className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="font-semibold">Nenhum criativo encontrado</p>
            {campaign.meta_id && (
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Clique em &ldquo;Atualizar do Meta&rdquo; para buscar os criativos mais recentes.
              </p>
            )}
            {campaign.meta_id && (
              <Button className="mt-4" onClick={handleRefresh} disabled={refreshing}>
                {refreshing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Atualizando...</> : <><RefreshCw className="w-4 h-4 mr-2" />Atualizar do Meta</>}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredAds.map(ad => (
              <CreativeCard key={ad.id} ad={ad} adsetName={ad.adsetName} onPreview={setPreviewAd} />
            ))}
          </div>
        )}
      </div>

      <AdPreviewDialog
        open={!!previewAd}
        ad={previewAd}
        onClose={() => setPreviewAd(null)}
      />
    </MainLayout>
  );
}
