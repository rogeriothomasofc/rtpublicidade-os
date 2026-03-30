import { useState, useEffect, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Plus, ChevronRight, ChevronDown, MoreHorizontal, Send, RefreshCw,
  Search, Megaphone, Layers, Image, Trash2, Play, Pause, AlertCircle,
  Download, Copy, CheckSquare, Square, Loader2, Upload, X,
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

const OPTIMIZATION_GOALS = [
  { value: 'LINK_CLICKS', label: 'Cliques no link' },
  { value: 'LANDING_PAGE_VIEWS', label: 'Visualizações de página de destino' },
  { value: 'IMPRESSIONS', label: 'Impressões' },
  { value: 'REACH', label: 'Alcance' },
  { value: 'LEAD_GENERATION', label: 'Geração de leads' },
  { value: 'CONVERSIONS', label: 'Conversões' },
  { value: 'MESSAGES', label: 'Mensagens' },
  { value: 'POST_ENGAGEMENT', label: 'Engajamento com publicação' },
];

const CTA_TYPES = [
  { value: 'LEARN_MORE', label: 'Saiba mais' },
  { value: 'SHOP_NOW', label: 'Comprar agora' },
  { value: 'SIGN_UP', label: 'Cadastre-se' },
  { value: 'CONTACT_US', label: 'Fale conosco' },
  { value: 'SEND_MESSAGE', label: 'Enviar mensagem' },
  { value: 'GET_QUOTE', label: 'Solicitar orçamento' },
  { value: 'DOWNLOAD', label: 'Baixar' },
  { value: 'BOOK_TRAVEL', label: 'Reservar' },
];

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
  const { data, error } = await supabase.functions.invoke(`meta-campaigns-manager/${action}`, {
    body,
  });
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

// ─── Create Campaign Dialog ───────────────────────────────────
function CreateCampaignDialog({
  open,
  onClose,
  clients,
}: {
  open: boolean;
  onClose: () => void;
  clients: Client[];
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    client_id: '',
    name: '',
    objective: '',
    budget_type: 'daily',
    budget_value: '',
    notes: '',
  });

  const mutation = useMutation({
    mutationFn: () => invoke('create-campaign', {
      ...form,
      budget_value: form.budget_value ? Number(form.budget_value) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meta-campaigns'] });
      toast.success('Campanha criada como rascunho');
      onClose();
      setForm({ client_id: '', name: '', objective: '', budget_type: 'daily', budget_value: '', notes: '' });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const valid = form.client_id && form.name && form.objective;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5" /> Nova campanha
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Cliente *</Label>
            <Select value={form.client_id} onValueChange={(v) => setForm(f => ({ ...f, client_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
              <SelectContent>
                {clients.filter(c => c.meta_ads_account).map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
                {clients.filter(c => !c.meta_ads_account).length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs text-muted-foreground">Sem conta Meta configurada</div>
                    {clients.filter(c => !c.meta_ads_account).map(c => (
                      <SelectItem key={c.id} value={c.id} className="opacity-50">{c.name}</SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label>Nome da campanha *</Label>
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Black Friday 2026 - Conversas"
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Objetivo *</Label>
            <Select value={form.objective} onValueChange={(v) => setForm(f => ({ ...f, objective: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecionar objetivo" /></SelectTrigger>
              <SelectContent>
                {OBJECTIVES.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Tipo de orçamento</Label>
              <Select value={form.budget_type} onValueChange={(v) => setForm(f => ({ ...f, budget_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="lifetime">Vitalício</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.budget_value}
                onChange={e => setForm(f => ({ ...f, budget_value: e.target.value }))}
                placeholder="50,00"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Observações</Label>
            <Textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Notas internas..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!valid || mutation.isPending}
          >
            {mutation.isPending ? 'Criando...' : 'Criar rascunho'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create AdSet Dialog ──────────────────────────────────────
function CreateAdSetDialog({
  open,
  onClose,
  campaignId,
}: {
  open: boolean;
  onClose: () => void;
  campaignId: string;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    optimization_goal: 'LINK_CLICKS',
    billing_event: 'IMPRESSIONS',
    budget_type: 'daily',
    budget_value: '',
    age_min: '18',
    age_max: '65',
    notes: '',
  });

  const mutation = useMutation({
    mutationFn: () => invoke('create-adset', {
      campaign_id: campaignId,
      name: form.name,
      optimization_goal: form.optimization_goal,
      billing_event: form.billing_event,
      budget_type: form.budget_type || undefined,
      budget_value: form.budget_value ? Number(form.budget_value) : undefined,
      targeting: {
        age_min: Number(form.age_min),
        age_max: Number(form.age_max),
      },
      notes: form.notes,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meta-campaigns'] });
      toast.success('Conjunto criado como rascunho');
      onClose();
      setForm({ name: '', optimization_goal: 'LINK_CLICKS', billing_event: 'IMPRESSIONS', budget_type: 'daily', budget_value: '', age_min: '18', age_max: '65', notes: '' });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" /> Novo conjunto de anúncios
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Nome do conjunto *</Label>
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Público Lookalike 25-45"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Objetivo de otimização</Label>
              <Select value={form.optimization_goal} onValueChange={(v) => setForm(f => ({ ...f, optimization_goal: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OPTIMIZATION_GOALS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Evento de cobrança</Label>
              <Select value={form.billing_event} onValueChange={(v) => setForm(f => ({ ...f, billing_event: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IMPRESSIONS">Impressões</SelectItem>
                  <SelectItem value="LINK_CLICKS">Cliques no link</SelectItem>
                  <SelectItem value="PAGE_LIKES">Curtidas na página</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Tipo de orçamento</Label>
              <Select value={form.budget_type} onValueChange={(v) => setForm(f => ({ ...f, budget_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="lifetime">Vitalício</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.budget_value}
                onChange={e => setForm(f => ({ ...f, budget_value: e.target.value }))}
                placeholder="50,00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Idade mínima</Label>
              <Input
                type="number"
                min="13"
                max="65"
                value={form.age_min}
                onChange={e => setForm(f => ({ ...f, age_min: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Idade máxima</Label>
              <Input
                type="number"
                min="13"
                max="65"
                value={form.age_max}
                onChange={e => setForm(f => ({ ...f, age_max: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Observações</Label>
            <Textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Notas sobre a segmentação..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!form.name || mutation.isPending}
          >
            {mutation.isPending ? 'Criando...' : 'Criar conjunto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create Ad Dialog ─────────────────────────────────────────
function CreateAdDialog({
  open,
  onClose,
  adsetId,
  initialLinkUrl,
}: {
  open: boolean;
  onClose: () => void;
  adsetId: string;
  initialLinkUrl?: string;
}) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    format: 'IMAGE' as 'IMAGE' | 'VIDEO' | 'CAROUSEL',
    headline: '',
    body: '',
    description: '',
    cta_type: 'LEARN_MORE',
    image_url: '',
    link_url: initialLinkUrl ?? '',
    notes: '',
  });

  useEffect(() => {
    if (open) {
      setForm(f => ({ ...f, link_url: initialLinkUrl ?? f.link_url }));
    }
  }, [open, initialLinkUrl]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `ads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('creatives').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('creatives').getPublicUrl(path);
      setForm(f => ({ ...f, image_url: publicUrl }));
    } catch {
      toast.error('Erro ao fazer upload da imagem');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const mutation = useMutation({
    mutationFn: () => invoke('create-ad', { adset_id: adsetId, ...form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meta-campaigns'] });
      toast.success('Anúncio criado como rascunho');
      onClose();
      setForm({ name: '', format: 'IMAGE', headline: '', body: '', description: '', cta_type: 'LEARN_MORE', image_url: '', link_url: initialLinkUrl ?? '', notes: '' });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" /> Novo anúncio
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Nome do anúncio *</Label>
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Versão A - Imagem produto"
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Formato</Label>
            <Select value={form.format} onValueChange={(v) => setForm(f => ({ ...f, format: v as typeof form.format }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="IMAGE">Imagem</SelectItem>
                <SelectItem value="VIDEO">Vídeo</SelectItem>
                <SelectItem value="CAROUSEL">Carrossel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label>Título (headline)</Label>
            <Input
              value={form.headline}
              onChange={e => setForm(f => ({ ...f, headline: e.target.value }))}
              placeholder="Título do anúncio"
              maxLength={255}
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Texto principal</Label>
            <Textarea
              value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
              placeholder="Texto do anúncio..."
              rows={3}
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Descrição</Label>
            <Input
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Descrição opcional"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>URL de destino</Label>
              <Input
                value={form.link_url}
                onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))}
                placeholder="https://..."
                type="url"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Botão (CTA)</Label>
              <Select value={form.cta_type} onValueChange={(v) => setForm(f => ({ ...f, cta_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CTA_TYPES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.format === 'IMAGE' && (
            <div className="grid gap-1.5">
              <Label>Criativo (imagem)</Label>
              {form.image_url ? (
                <div className="relative rounded-lg overflow-hidden bg-muted border">
                  <img src={form.image_url} alt="Preview do criativo" className="w-full max-h-48 object-cover" />
                  <button
                    type="button"
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 rounded-full p-1 transition-colors"
                    onClick={() => setForm(f => ({ ...f, image_url: '' }))}
                  >
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              ) : (
                <label className={`flex flex-col items-center justify-center gap-2 cursor-pointer border-2 border-dashed rounded-lg p-6 transition-colors ${uploading ? 'opacity-50 cursor-wait border-muted' : 'border-muted hover:border-primary/50 hover:bg-muted/30'}`}>
                  {uploading ? (
                    <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                  ) : (
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {uploading ? 'Enviando...' : 'Clique para selecionar imagem'}
                  </span>
                  <span className="text-xs text-muted-foreground">JPG, PNG, WEBP até 10MB</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          )}

          <div className="grid gap-1.5">
            <Label>Observações</Label>
            <Textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Notas internas..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!form.name || mutation.isPending}
          >
            {mutation.isPending ? 'Criando...' : 'Criar anúncio'}
          </Button>
        </DialogFooter>
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
      toast.success(`${data.imported} campanha${data.imported !== 1 ? 's' : ''} importada${data.imported !== 1 ? 's' : ''} com seus conjuntos`);
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
          <Button
            onClick={handleImport}
            disabled={selected.size === 0 || importing}
          >
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
            Os anúncios não são duplicados — criativos precisam ser recriados.
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
function AdRow({ ad, onDelete }: { ad: MetaAd; onDelete: () => void }) {
  const qc = useQueryClient();

  const sendMutation = useMutation({
    mutationFn: () => invoke('send-ad', {
      local_id: ad.id,
      adset_id: ad.adset_id,
      name: ad.name,
      format: ad.format,
      headline: ad.headline,
      body: ad.body,
      image_url: ad.image_url,
      link_url: ad.link_url,
      cta_type: ad.cta_type,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meta-campaigns'] });
      toast.success('Anúncio enviado ao Meta como rascunho');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => supabase.from('meta_ads').delete().eq('id', ad.id).then(({ error }) => { if (error) throw error; }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meta-campaigns'] });
      toast.success('Anúncio removido');
      onDelete();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const FormatIcon = ad.format === 'VIDEO' ? Play : Image;

  return (
    <div className="flex items-center gap-3 py-2 px-3 ml-8 rounded-lg hover:bg-muted/30 group">
      <FormatIcon className="w-4 h-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{ad.name}</p>
        {ad.headline && <p className="text-xs text-muted-foreground truncate">{ad.headline}</p>}
      </div>
      <StatusBadge status={ad.local_status} />
      {ad.meta_id && (
        <span className="text-xs text-muted-foreground hidden group-hover:block">#{ad.meta_id.slice(-6)}</span>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {ad.local_status === 'Rascunho' && (
            <DropdownMenuItem onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending}>
              <Send className="w-4 h-4 mr-2" />
              {sendMutation.isPending ? 'Enviando...' : 'Enviar ao Meta'}
            </DropdownMenuItem>
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
  clientId,
}: {
  adset: MetaAdSet;
  clientId: string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showNewAd, setShowNewAd] = useState(false);

  const sendMutation = useMutation({
    mutationFn: () => invoke('send-adset', {
      local_id: adset.id,
      campaign_id: adset.campaign_id,
      name: adset.name,
      optimization_goal: adset.optimization_goal,
      billing_event: adset.billing_event,
      budget_type: adset.budget_type,
      budget_value: adset.budget_value,
      targeting: adset.targeting,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meta-campaigns'] });
      toast.success('Conjunto enviado ao Meta como rascunho');
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
  const existingLinkUrl = ads.find(a => a.link_url)?.link_url;

  return (
    <div className="ml-4">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-muted/30 group">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
              {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
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
              <DropdownMenuItem onClick={() => setShowNewAd(true)}>
                <Plus className="w-4 h-4 mr-2" /> Novo anúncio
              </DropdownMenuItem>
              {adset.local_status === 'Rascunho' && (
                <DropdownMenuItem onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending}>
                  <Send className="w-4 h-4 mr-2" />
                  {sendMutation.isPending ? 'Enviando...' : 'Enviar ao Meta'}
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
            {ads.map(ad => (
              <AdRow key={ad.id} ad={ad} onDelete={() => {}} />
            ))}
            <button
              className="flex items-center gap-2 py-2 px-3 ml-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowNewAd(true)}
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar anúncio
            </button>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <CreateAdDialog open={showNewAd} onClose={() => setShowNewAd(false)} adsetId={adset.id} initialLinkUrl={existingLinkUrl} />
    </div>
  );
}

// ─── Campaign Card ────────────────────────────────────────────
function CampaignCard({
  campaign,
  onDuplicate,
}: {
  campaign: MetaCampaign;
  onDuplicate: (c: MetaCampaign) => void;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showNewAdSet, setShowNewAdSet] = useState(false);

  const sendMutation = useMutation({
    mutationFn: () => invoke('send-campaign', {
      local_id: campaign.id,
      client_id: campaign.client_id,
      name: campaign.name,
      objective: campaign.objective,
      budget_type: campaign.budget_type,
      budget_value: campaign.budget_value,
      buying_type: campaign.buying_type,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meta-campaigns'] });
      toast.success('Campanha enviada ao Meta como rascunho');
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

          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setOpen(o => !o)}>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm">{campaign.name}</p>
              {campaign.client && (
                <span className="text-xs text-muted-foreground">{campaign.client.name}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {objectiveLabel} · {adsets.length} conjunto{adsets.length !== 1 ? 's' : ''} · {totalAds} anúncio{totalAds !== 1 ? 's' : ''}
              {campaign.budget_value && ` · R$ ${Number(campaign.budget_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ${campaign.budget_type === 'daily' ? '/dia' : 'total'}`}
            </p>
          </div>

          <StatusBadge status={campaign.local_status} />

          {campaign.meta_id && (
            <span className="text-xs text-muted-foreground hidden group-hover:inline">
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
              <DropdownMenuItem onClick={() => setShowNewAdSet(true)}>
                <Plus className="w-4 h-4 mr-2" /> Novo conjunto
              </DropdownMenuItem>
              {campaign.local_status === 'Rascunho' && (
                <DropdownMenuItem onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending}>
                  <Send className="w-4 h-4 mr-2" />
                  {sendMutation.isPending ? 'Enviando...' : 'Enviar ao Meta'}
                </DropdownMenuItem>
              )}
              {campaign.meta_id && campaign.local_status === 'Publicado' && (
                <DropdownMenuItem onClick={() => invoke('toggle-status', {
                  type: 'campaign', meta_id: campaign.meta_id, new_status: 'PAUSED', local_id: campaign.id,
                }).then(() => qc.invalidateQueries({ queryKey: ['meta-campaigns'] }))}>
                  <Pause className="w-4 h-4 mr-2" /> Pausar no Meta
                </DropdownMenuItem>
              )}
              {campaign.meta_id && campaign.local_status === 'Pausado' && (
                <DropdownMenuItem onClick={() => invoke('toggle-status', {
                  type: 'campaign', meta_id: campaign.meta_id, new_status: 'ACTIVE', local_id: campaign.id,
                }).then(() => qc.invalidateQueries({ queryKey: ['meta-campaigns'] }))}>
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
                <p className="text-sm text-muted-foreground">Nenhum conjunto criado ainda</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setShowNewAdSet(true)}
                >
                  <Plus className="w-4 h-4 mr-1" /> Criar conjunto
                </Button>
              </div>
            ) : (
              <>
                {adsets.map(adset => (
                  <AdSetRow key={adset.id} adset={adset} clientId={campaign.client_id} />
                ))}
                <button
                  className="flex items-center gap-2 py-2 px-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowNewAdSet(true)}
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar conjunto
                </button>
              </>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <CreateAdSetDialog
        open={showNewAdSet}
        onClose={() => setShowNewAdSet(false)}
        campaignId={campaign.id}
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function CampaignsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [duplicateTarget, setDuplicateTarget] = useState<MetaCampaign | null>(null);
  const [syncing, setSyncing] = useState(false);

  const { data: campaigns = [], isLoading } = useMetaCampaigns(clientFilter);
  const { data: clients = [] } = useClients();

  const filtered = campaigns.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.client?.name?.toLowerCase().includes(q)
    );
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
    rascunho: campaigns.filter(c => c.local_status === 'Rascunho').length,
    enviado: campaigns.filter(c => c.local_status === 'Enviado').length,
    publicado: campaigns.filter(c => c.local_status === 'Publicado').length,
    pausado: campaigns.filter(c => c.local_status === 'Pausado').length,
  };

  return (
    <MainLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Campanhas Meta Ads</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Crie e gerencie campanhas, conjuntos e anúncios. Tudo vai ao Meta como rascunho.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              Sincronizar status
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
              <Download className="w-4 h-4 mr-2" />
              Importar do Meta
            </Button>
            <Button size="sm" onClick={() => setShowNewCampaign(true)}>
              <Plus className="w-4 h-4 mr-2" /> Nova campanha
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-foreground' },
            { label: 'Rascunho', value: stats.rascunho, color: 'text-muted-foreground' },
            { label: 'Publicado', value: stats.publicado, color: 'text-green-600' },
            { label: 'Pausado', value: stats.pausado, color: 'text-amber-600' },
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
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todos os clientes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {clients.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
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
              {search || clientFilter !== 'all' ? 'Nenhuma campanha encontrada' : 'Nenhuma campanha criada ainda'}
            </p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {search || clientFilter !== 'all'
                ? 'Tente ajustar os filtros.'
                : 'Crie sua primeira campanha. Ela ficará como rascunho até você enviar ao Meta.'}
            </p>
            {!search && clientFilter === 'all' && (
              <Button className="mt-4" onClick={() => setShowNewCampaign(true)}>
                <Plus className="w-4 h-4 mr-2" /> Nova campanha
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(campaign => (
              <CampaignCard key={campaign.id} campaign={campaign} onDuplicate={setDuplicateTarget} />
            ))}
          </div>
        )}

        {/* Info box */}
        {campaigns.length > 0 && (
          <div className="flex items-start gap-2 p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Campanhas enviadas ficam como <strong>Pausado</strong> no Meta Ads Manager.
              Para publicar, ative-as diretamente no Meta ou use o botão &ldquo;Ativar no Meta&rdquo; aqui.
              Use <strong>Sincronizar status</strong> para atualizar o status de todas as campanhas.
            </span>
          </div>
        )}
      </div>

      <CreateCampaignDialog
        open={showNewCampaign}
        onClose={() => setShowNewCampaign(false)}
        clients={clients}
      />

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
    </MainLayout>
  );
}
