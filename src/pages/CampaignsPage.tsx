import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ChevronRight, ChevronDown, MoreHorizontal, RefreshCw,
  Search, Megaphone, Layers, Image, Trash2, Play, Pause,
  Download, Copy, CheckSquare, Square, Loader2, ExternalLink, Eye,
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
  budget_type?: string;
  budget_value?: number;
  optimization_goal: string;
  billing_event: string;
  targeting?: Record<string, unknown>;
  meta_id?: string;
  meta_status?: string;
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
  buying_type?: string;
  notes?: string;
  client?: { id: string; name: string };
  adsets?: MetaAdSet[];
}

interface Client {
  id: string;
  name: string;
  meta_ads_account?: string;
}

// ─── Constants ───────────────────────────────────────────────
const OBJECTIVES = [
  { value: 'OUTCOME_AWARENESS', label: 'Reconhecimento' },
  { value: 'OUTCOME_TRAFFIC', label: 'Tráfego' },
  { value: 'OUTCOME_ENGAGEMENT', label: 'Engajamento' },
  { value: 'OUTCOME_LEADS', label: 'Leads' },
  { value: 'OUTCOME_SALES', label: 'Vendas' },
  { value: 'MESSAGES', label: 'Mensagens' },
];

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
  Enviado:  'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  Publicado:'bg-green-500/15 text-green-700 dark:text-green-400',
  Pausado:  'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  Arquivado:'bg-red-500/15 text-red-700 dark:text-red-400',
};

// ─── Data hooks ───────────────────────────────────────────────
function useMetaCampaigns(clientId?: string) {
  return useQuery<MetaCampaign[]>({
    queryKey: ['meta-campaigns', clientId],
    queryFn: async () => {
      let q = supabase
        .from('meta_campaigns')
        .select(`
          *,
          client:clients(id, name),
          adsets:meta_adsets(
            *,
            ads:meta_ads(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (clientId && clientId !== 'all') q = q.eq('client_id', clientId);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as MetaCampaign[];
    },
  });
}

function useClients() {
  return useQuery<Client[]>({
    queryKey: ['clients-for-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, meta_ads_account')
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });
}

async function invoke(action: string, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(`meta-campaigns-manager/${action}`, { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

// ─── Status badge ─────────────────────────────────────────────
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
  const domain = ad.link_url ? (() => { try { return new URL(ad.link_url).hostname.replace('www.', ''); } catch { return ad.link_url; } })() : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-base flex items-center gap-2">
            <Eye className="w-4 h-4" /> Preview do criativo
          </DialogTitle>
        </DialogHeader>

        {/* Mock Facebook ad card */}
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

          {/* Ad body text */}
          {ad.body && (
            <p className="px-3 pb-2 text-sm leading-relaxed">{ad.body}</p>
          )}

          {/* Creative */}
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

          {/* Headline + CTA bar */}
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-muted/40 border-t border-border">
            <div className="flex-1 min-w-0">
              {domain && <p className="text-[10px] text-muted-foreground uppercase tracking-wide truncate">{domain}</p>}
              {ad.headline && <p className="text-sm font-semibold leading-tight truncate">{ad.headline}</p>}
            </div>
            <button className="shrink-0 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold px-3 py-1.5 rounded-md border border-border transition-colors">
              {ctaLabel}
            </button>
          </div>

          {/* Reactions bar */}
          <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground border-t border-border">
            <span>👍 ❤️  Curtir · Comentar · Compartilhar</span>
          </div>
        </div>

        {/* Meta info */}
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

// ─── Import From Meta Dialog ──────────────────────────────────
interface MetaCampaignFromApi {
  id: string;
  name: string;
  objective: string;
  status: string;
  effective_status: string;
  daily_budget?: string;
  lifetime_budget?: string;
  buying_type?: string;
  created_time: string;
  already_imported: boolean;
}

function ImportFromMetaDialog({
  open,
  onClose,
  clients,
}: {
  open: boolean;
  onClose: () => void;
  clients: Client[];
}) {
  const qc = useQueryClient();
  const [clientId, setClientId] = useState('');
  const [metaCampaigns, setMetaCampaigns] = useState<MetaCampaignFromApi[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [fetching, setFetching] = useState(false);
  const [importing, setImporting] = useState(false);

  const clientsWithMeta = clients.filter(c => c.meta_ads_account);

  const handleFetch = async () => {
    if (!clientId) return;
    setFetching(true);
    setMetaCampaigns([]);
    setSelected(new Set());
    try {
      const data = await invoke('fetch-meta-campaigns', { client_id: clientId });
      setMetaCampaigns(data.campaigns ?? []);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao buscar campanhas');
    } finally {
      setFetching(false);
    }
  };

  const toggleAll = () => {
    const importable = metaCampaigns.filter(c => !c.already_imported).map(c => c.id);
    if (selected.size === importable.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(importable));
    }
  };

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleImport = async () => {
    if (!selected.size) return;
    setImporting(true);
    try {
      const toImport = metaCampaigns
        .filter(c => selected.has(c.id))
        .map(c => ({
          meta_id: c.id,
          name: c.name,
          objective: c.objective,
          meta_status: c.effective_status || c.status,
          daily_budget: c.daily_budget,
          lifetime_budget: c.lifetime_budget,
          buying_type: c.buying_type,
        }));

      const data = await invoke('import-campaigns', { client_id: clientId, campaigns: toImport });
      qc.invalidateQueries({ queryKey: ['meta-campaigns'] });
      toast.success(`${data.imported} campanha${data.imported !== 1 ? 's' : ''} importada${data.imported !== 1 ? 's' : ''} com seus conjuntos e anúncios`);
      onClose();
      setMetaCampaigns([]);
      setSelected(new Set());
      setClientId('');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao importar');
    } finally {
      setImporting(false);
    }
  };

  const statusColor = (s: string) => {
    if (s === 'ACTIVE') return 'text-green-600';
    if (s === 'PAUSED') return 'text-amber-600';
    return 'text-muted-foreground';
  };

  const importable = metaCampaigns.filter(c => !c.already_imported);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" /> Importar campanhas do Meta Ads Manager
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Selecionar cliente" />
            </SelectTrigger>
            <SelectContent>
              {clientsWithMeta.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleFetch} disabled={!clientId || fetching} variant="outline">
            {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
          </Button>
        </div>

        {fetching && (
          <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Buscando campanhas no Meta...</span>
          </div>
        )}

        {!fetching && metaCampaigns.length > 0 && (
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="flex items-center justify-between py-2 border-b mb-1">
              <button
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                onClick={toggleAll}
              >
                {selected.size === importable.length && importable.length > 0
                  ? <CheckSquare className="w-4 h-4" />
                  : <Square className="w-4 h-4" />}
                Selecionar todas ({importable.length} disponíveis)
              </button>
              <span className="text-xs text-muted-foreground">{metaCampaigns.length} campanha{metaCampaigns.length !== 1 ? 's' : ''} encontrada{metaCampaigns.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="space-y-1">
              {metaCampaigns.map(c => {
                const objective = OBJECTIVES.find(o => o.value === c.objective)?.label ?? c.objective;
                const budget = c.daily_budget
                  ? `R$ ${(Number(c.daily_budget) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/dia`
                  : c.lifetime_budget
                  ? `R$ ${(Number(c.lifetime_budget) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} total`
                  : 'Sem orçamento';

                return (
                  <div
                    key={c.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      c.already_imported
                        ? 'opacity-40 cursor-not-allowed bg-muted/30'
                        : selected.has(c.id)
                        ? 'border-primary bg-primary/5 cursor-pointer'
                        : 'border-border hover:border-primary/50 cursor-pointer'
                    }`}
                    onClick={() => !c.already_imported && toggle(c.id)}
                  >
                    {c.already_imported ? (
                      <CheckSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                    ) : selected.has(c.id) ? (
                      <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{objective} · {budget}</p>
                    </div>
                    <span className={`text-xs font-medium ${statusColor(c.effective_status || c.status)}`}>
                      {c.already_imported ? 'Já importada' : (c.effective_status || c.status)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!fetching && metaCampaigns.length === 0 && clientId && (
          <p className="text-sm text-muted-foreground text-center py-6">
            Clique em &ldquo;Buscar&rdquo; para carregar as campanhas desta conta.
          </p>
        )}

        <DialogFooter className="pt-2 border-t">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleImport} disabled={selected.size === 0 || importing}>
            {importing
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importando...</>
              : <><Download className="w-4 h-4 mr-2" />Importar {selected.size > 0 ? `(${selected.size})` : ''}</>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Duplicate Campaign Dialog ────────────────────────────────
function DuplicateCampaignDialog({
  open,
  onClose,
  campaign,
}: {
  open: boolean;
  onClose: () => void;
  campaign: MetaCampaign | null;
}) {
  const qc = useQueryClient();
  const [newName, setNewName] = useState('');

  const mutation = useMutation({
    mutationFn: () => invoke('duplicate-campaign', {
      id: campaign!.id,
      new_name: newName || `${campaign!.name} (cópia)`,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meta-campaigns'] });
      toast.success('Campanha duplicada com sucesso');
      onClose();
      setNewName('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5" /> Duplicar campanha
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <p className="text-sm text-muted-foreground">
            Será criada uma cópia de <strong>{campaign?.name}</strong> com todos os seus conjuntos.
          </p>
          <div className="grid gap-1.5">
            <Label>Nome da cópia</Label>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder={`${campaign?.name ?? ''} (cópia)`}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Duplicando...' : 'Duplicar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Ad Row ───────────────────────────────────────────────────
function AdRow({ ad, onPreview }: { ad: MetaAd; onPreview: (ad: MetaAd) => void }) {
  const qc = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: (newStatus: 'ACTIVE' | 'PAUSED') => invoke('toggle-status', {
      type: 'ad',
      meta_id: ad.meta_id,
      local_id: ad.id,
      new_status: newStatus,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meta-campaigns'] });
      toast.success('Status do anúncio atualizado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => supabase.from('meta_ads').delete().eq('id', ad.id).then(({ error }) => { if (error) throw error; }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meta-campaigns'] });
      toast.success('Anúncio removido');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const FormatIcon = ad.format === 'VIDEO' ? Play : Image;
  const hasCreative = !!(ad.image_url || ad.headline || ad.body);

  return (
    <div className="flex items-center gap-3 py-2 px-3 ml-8 rounded-lg hover:bg-muted/30 group">
      <FormatIcon className="w-4 h-4 text-muted-foreground shrink-0" />

      {/* Creative thumbnail */}
      {ad.image_url ? (
        <div
          className="w-8 h-8 rounded overflow-hidden bg-muted shrink-0 cursor-pointer ring-0 hover:ring-2 hover:ring-primary transition-all"
          onClick={() => onPreview(ad)}
        >
          {ad.format === 'VIDEO' ? (
            <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
              <Play className="w-3 h-3 text-white" />
            </div>
          ) : (
            <img src={ad.image_url} alt="" className="w-full h-full object-cover" />
          )}
        </div>
      ) : (
        <div className="w-8 h-8 rounded bg-muted shrink-0 flex items-center justify-center">
          <Image className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{ad.name}</p>
        {ad.headline && <p className="text-xs text-muted-foreground truncate">{ad.headline}</p>}
      </div>

      <StatusBadge status={ad.local_status} />

      {hasCreative && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100"
          onClick={() => onPreview(ad)}
          title="Ver preview"
        >
          <Eye className="w-4 h-4" />
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {hasCreative && (
            <DropdownMenuItem onClick={() => onPreview(ad)}>
              <Eye className="w-4 h-4 mr-2" /> Ver criativo
            </DropdownMenuItem>
          )}
          {ad.meta_id && ad.local_status === 'Publicado' && (
            <DropdownMenuItem onClick={() => toggleMutation.mutate('PAUSED')} disabled={toggleMutation.isPending}>
              <Pause className="w-4 h-4 mr-2" /> Pausar no Meta
            </DropdownMenuItem>
          )}
          {ad.meta_id && ad.local_status === 'Pausado' && (
            <DropdownMenuItem onClick={() => toggleMutation.mutate('ACTIVE')} disabled={toggleMutation.isPending}>
              <Play className="w-4 h-4 mr-2" /> Ativar no Meta
            </DropdownMenuItem>
          )}
          {ad.link_url && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" /> Abrir URL de destino
                </a>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="w-4 h-4 mr-2" /> Remover
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ─── AdSet Row ────────────────────────────────────────────────
function AdSetRow({
  adset,
  onPreview,
}: {
  adset: MetaAdSet;
  onPreview: (ad: MetaAd) => void;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const toggleMutation = useMutation({
    mutationFn: (newStatus: 'ACTIVE' | 'PAUSED') => invoke('toggle-status', {
      type: 'adset',
      meta_id: adset.meta_id,
      local_id: adset.id,
      new_status: newStatus,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meta-campaigns'] });
      toast.success('Status do conjunto atualizado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => supabase.from('meta_adsets').delete().eq('id', adset.id).then(({ error }) => { if (error) throw error; }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meta-campaigns'] });
      toast.success('Conjunto removido');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ads = adset.ads ?? [];

  return (
    <div className="ml-4">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-muted/30 group">
          <CollapsibleTrigger asChild>
            <button className="h-6 w-6 flex items-center justify-center shrink-0 rounded hover:bg-muted">
              {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </CollapsibleTrigger>
          <Layers className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setOpen(o => !o)}>
            <p className="text-sm font-medium truncate">{adset.name}</p>
            <p className="text-xs text-muted-foreground">
              {ads.length} anúncio{ads.length !== 1 ? 's' : ''} · {adset.optimization_goal.toLowerCase().replace(/_/g, ' ')}
            </p>
          </div>
          <StatusBadge status={adset.local_status} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {adset.meta_id && adset.local_status === 'Publicado' && (
                <DropdownMenuItem onClick={() => toggleMutation.mutate('PAUSED')} disabled={toggleMutation.isPending}>
                  <Pause className="w-4 h-4 mr-2" /> Pausar no Meta
                </DropdownMenuItem>
              )}
              {adset.meta_id && adset.local_status === 'Pausado' && (
                <DropdownMenuItem onClick={() => toggleMutation.mutate('ACTIVE')} disabled={toggleMutation.isPending}>
                  <Play className="w-4 h-4 mr-2" /> Ativar no Meta
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Remover conjunto
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <CollapsibleContent>
          <div className="border-l-2 border-muted ml-7 mt-1 mb-2">
            {ads.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 px-3 ml-4">Nenhum anúncio neste conjunto</p>
            ) : (
              ads.map(ad => (
                <AdRow key={ad.id} ad={ad} onPreview={onPreview} />
              ))
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// ─── Campaign Card ────────────────────────────────────────────
function CampaignCard({
  campaign,
  onDuplicate,
  onPreview,
}: {
  campaign: MetaCampaign;
  onDuplicate: (c: MetaCampaign) => void;
  onPreview: (ad: MetaAd) => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const toggleMutation = useMutation({
    mutationFn: (newStatus: 'ACTIVE' | 'PAUSED') => invoke('toggle-status', {
      type: 'campaign',
      meta_id: campaign.meta_id,
      local_id: campaign.id,
      new_status: newStatus,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meta-campaigns'] });
      toast.success('Status da campanha atualizado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => invoke('delete-campaign', { id: campaign.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meta-campaigns'] });
      toast.success('Campanha removida');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const adsets = campaign.adsets ?? [];
  const totalAds = adsets.reduce((acc, a) => acc + (a.ads?.length ?? 0), 0);
  const objectiveLabel = OBJECTIVES.find(o => o.value === campaign.objective)?.label ?? campaign.objective;

  // Collect all ad thumbnails for preview strip
  const allAds = adsets.flatMap(a => a.ads ?? []).filter(a => a.image_url);

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-3 p-4 group">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
              {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>

          <Megaphone className="w-5 h-5 text-primary shrink-0" />

          <div className="flex-1 min-w-0">
            <div
              className="flex items-center gap-2 flex-wrap cursor-pointer hover:text-primary transition-colors"
              onClick={() => navigate(`/campaigns/${campaign.id}`)}
            >
              <p className="font-semibold text-sm">{campaign.name}</p>
              {campaign.client && (
                <span className="text-xs text-muted-foreground">{campaign.client.name}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 cursor-pointer" onClick={() => setOpen(o => !o)}>
              {objectiveLabel} · {adsets.length} conjunto{adsets.length !== 1 ? 's' : ''} · {totalAds} anúncio{totalAds !== 1 ? 's' : ''}
              {campaign.budget_value && ` · R$ ${Number(campaign.budget_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ${campaign.budget_type === 'daily' ? '/dia' : 'total'}`}
            </p>
          </div>

          {/* Creatives strip preview */}
          {!open && allAds.length > 0 && (
            <div className="flex -space-x-1.5 shrink-0">
              {allAds.slice(0, 4).map(ad => (
                <div
                  key={ad.id}
                  className="w-7 h-7 rounded-md overflow-hidden border-2 border-card cursor-pointer hover:scale-110 transition-transform"
                  onClick={(e) => { e.stopPropagation(); onPreview(ad); }}
                  title={ad.name}
                >
                  <img src={ad.image_url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
              {allAds.length > 4 && (
                <div className="w-7 h-7 rounded-md bg-muted border-2 border-card flex items-center justify-center">
                  <span className="text-[9px] font-bold text-muted-foreground">+{allAds.length - 4}</span>
                </div>
              )}
            </div>
          )}

          <StatusBadge status={campaign.local_status} />

          {campaign.meta_id && (
            <span className="text-xs text-muted-foreground hidden group-hover:inline font-mono">
              #{campaign.meta_id.slice(-6)}
            </span>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {campaign.meta_id && campaign.local_status === 'Publicado' && (
                <DropdownMenuItem onClick={() => toggleMutation.mutate('PAUSED')} disabled={toggleMutation.isPending}>
                  <Pause className="w-4 h-4 mr-2" /> Pausar no Meta
                </DropdownMenuItem>
              )}
              {campaign.meta_id && campaign.local_status === 'Pausado' && (
                <DropdownMenuItem onClick={() => toggleMutation.mutate('ACTIVE')} disabled={toggleMutation.isPending}>
                  <Play className="w-4 h-4 mr-2" /> Ativar no Meta
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onDuplicate(campaign)}>
                <Copy className="w-4 h-4 mr-2" /> Duplicar campanha
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Excluir campanha
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <CollapsibleContent>
          <div className="border-t border-border bg-muted/20 px-3 py-3 space-y-1">
            {adsets.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <Layers className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum conjunto importado</p>
              </div>
            ) : (
              adsets.map(adset => (
                <AdSetRow key={adset.id} adset={adset} onPreview={onPreview} />
              ))
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function CampaignsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showImport, setShowImport] = useState(false);
  const [duplicateTarget, setDuplicateTarget] = useState<MetaCampaign | null>(null);
  const [previewAd, setPreviewAd] = useState<MetaAd | null>(null);
  const [syncing, setSyncing] = useState(false);

  const { data: campaigns = [], isLoading } = useMetaCampaigns(clientFilter);
  const { data: clients = [] } = useClients();

  const filtered = campaigns.filter(c => {
    if (search) {
      const q = search.toLowerCase();
      if (!c.name.toLowerCase().includes(q) && !c.client?.name?.toLowerCase().includes(q)) return false;
    }
    if (statusFilter !== 'all' && c.local_status !== statusFilter) return false;
    return true;
  });

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('meta-campaigns-sync', { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      qc.invalidateQueries({ queryKey: ['meta-campaigns'] });
      toast.success(`Sincronizado: ${data.synced ?? 0} atualização${(data.synced ?? 0) !== 1 ? 'ões' : ''}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  const stats = {
    total: campaigns.length,
    publicado: campaigns.filter(c => c.local_status === 'Publicado').length,
    pausado: campaigns.filter(c => c.local_status === 'Pausado').length,
    arquivado: campaigns.filter(c => c.local_status === 'Arquivado').length,
  };

  return (
    <MainLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Campanhas Meta Ads</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gerencie e monitore campanhas importadas do Meta Ads Manager.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              Sincronizar status
            </Button>
            <Button size="sm" onClick={() => setShowImport(true)}>
              <Download className="w-4 h-4 mr-2" />
              Importar do Meta
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-foreground' },
            { label: 'Ativas', value: stats.publicado, color: 'text-green-600' },
            { label: 'Pausadas', value: stats.pausado, color: 'text-amber-600' },
            { label: 'Arquivadas', value: stats.arquivado, color: 'text-red-500' },
          ].map(s => (
            <div key={s.label} className="border border-border rounded-lg p-3 bg-card">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar campanha ou cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Todos os clientes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {clients.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="Publicado">Ativas</SelectItem>
              <SelectItem value="Pausado">Pausadas</SelectItem>
              <SelectItem value="Arquivado">Arquivadas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Campaign list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Megaphone className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="font-semibold">
              {search || clientFilter !== 'all' || statusFilter !== 'all'
                ? 'Nenhuma campanha encontrada'
                : 'Nenhuma campanha importada ainda'}
            </p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {search || clientFilter !== 'all' || statusFilter !== 'all'
                ? 'Tente ajustar os filtros.'
                : 'Importe campanhas do Meta Ads Manager para gerenciá-las aqui.'}
            </p>
            {!search && clientFilter === 'all' && statusFilter === 'all' && (
              <Button className="mt-4" onClick={() => setShowImport(true)}>
                <Download className="w-4 h-4 mr-2" /> Importar do Meta
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(campaign => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onDuplicate={setDuplicateTarget}
                onPreview={setPreviewAd}
              />
            ))}
          </div>
        )}
      </div>

      <ImportFromMetaDialog
        open={showImport}
        onClose={() => setShowImport(false)}
        clients={clients}
      />

      <DuplicateCampaignDialog
        open={!!duplicateTarget}
        onClose={() => setDuplicateTarget(null)}
        campaign={duplicateTarget}
      />

      <AdPreviewDialog
        open={!!previewAd}
        ad={previewAd}
        onClose={() => setPreviewAd(null)}
      />
    </MainLayout>
  );
}
