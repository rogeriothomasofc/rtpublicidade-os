import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Plus, Trash2, Pencil, ChevronDown, ChevronRight,
  Users, DollarSign, ExternalLink, Image, Video, LayoutGrid, Layers,
} from 'lucide-react';
import {
  usePlanningAdSets, useCreateAdSet, useUpdateAdSet, useDeleteAdSet,
  usePlanningAds, useCreateAd, useUpdateAd, useDeleteAd,
  type PlanningAdSet, type PlanningAd,
} from '@/hooks/usePlanning';
import { cn } from '@/lib/utils';

// ── Constants ──────────────────────────────────────────────────────────────

const AUDIENCE_TYPES = ['Interesse', 'Lookalike', 'Remarketing', 'Custom', 'Broad'];
const SIZE_OPTIONS = ['< 50k', '50k – 200k', '200k – 500k', '500k – 1M', '1M – 5M', '> 5M', 'Broad'];
const PLACEMENTS = ['Feed', 'Stories', 'Reels', 'Marketplace', 'Audience Network', 'Messenger'];
const AD_FORMATS = ['Imagem', 'Vídeo', 'Carrossel', 'Story', 'Reels', 'Coleção'];
const AD_STATUSES = ['Pendente', 'Em Produção', 'Em Revisão', 'Aprovado', 'Reprovado'];
const CTA_OPTIONS = ['Saiba Mais', 'Comprar Agora', 'Cadastre-se', 'Agendar', 'Fale Conosco', 'Baixar App', 'Ver Oferta', 'Enviar Mensagem'];

const audienceColors: Record<string, string> = {
  'Interesse': 'bg-blue-500/10 text-blue-600',
  'Lookalike': 'bg-purple-500/10 text-purple-600',
  'Remarketing': 'bg-amber-500/10 text-amber-600',
  'Custom': 'bg-green-500/10 text-green-600',
  'Broad': 'bg-muted text-muted-foreground',
};

const adStatusColor: Record<string, string> = {
  'Pendente':     'bg-muted text-muted-foreground',
  'Em Produção':  'bg-blue-500/15 text-blue-600',
  'Em Revisão':   'bg-amber-500/15 text-amber-600',
  'Aprovado':     'bg-green-500/15 text-green-700',
  'Reprovado':    'bg-red-500/15 text-red-600',
};

const formatIcon = (format: string) => {
  if (format === 'Vídeo' || format === 'Reels') return <Video className="w-3.5 h-3.5" />;
  if (format === 'Carrossel' || format === 'Coleção') return <LayoutGrid className="w-3.5 h-3.5" />;
  if (format === 'Story') return <Layers className="w-3.5 h-3.5" />;
  return <Image className="w-3.5 h-3.5" />;
};

// ── Chips helper ──────────────────────────────────────────────────────────
function Chips({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => (
        <button key={o} type="button" onClick={() => onChange(o)}
          className={cn('px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
            value === o ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50 text-muted-foreground'
          )}>
          {o}
        </button>
      ))}
    </div>
  );
}

function MultiChips({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter(x => x !== o) : [...value, o]);
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => (
        <button key={o} type="button" onClick={() => toggle(o)}
          className={cn('px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
            value.includes(o) ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50 text-muted-foreground'
          )}>
          {o}
        </button>
      ))}
    </div>
  );
}

// ── Ad Form ───────────────────────────────────────────────────────────────
interface AdFormState { name: string; format: string; status: string; headline: string; copy_text: string; cta: string; file_url: string; }
const defaultAdForm: AdFormState = { name: '', format: 'Imagem', status: 'Pendente', headline: '', copy_text: '', cta: '', file_url: '' };

function AdFormDialog({ open, onClose, onSave, initial, title, isPending }: {
  open: boolean; onClose: () => void; onSave: (f: AdFormState) => void;
  initial?: AdFormState; title: string; isPending: boolean;
}) {
  const [form, setForm] = useState<AdFormState>(initial || defaultAdForm);
  // reset when opened
  useState(() => { if (open) setForm(initial || defaultAdForm); });

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Anúncio 01 – Oferta principal" />
          </div>
          <div className="space-y-1.5">
            <Label>Formato</Label>
            <Chips options={AD_FORMATS} value={form.format} onChange={v => setForm({ ...form, format: v })} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Chips options={AD_STATUSES} value={form.status} onChange={v => setForm({ ...form, status: v })} />
          </div>
          <div className="space-y-1.5">
            <Label>Headline</Label>
            <Input value={form.headline} onChange={e => setForm({ ...form, headline: e.target.value })} placeholder="Título principal do anúncio" />
          </div>
          <div className="space-y-1.5">
            <Label>Copy</Label>
            <Textarea value={form.copy_text} onChange={e => setForm({ ...form, copy_text: e.target.value })} rows={3} placeholder="Texto do anúncio..." />
          </div>
          <div className="space-y-1.5">
            <Label>CTA</Label>
            <Select value={form.cta} onValueChange={v => setForm({ ...form, cta: v })}>
              <SelectTrigger><SelectValue placeholder="Selecionar CTA..." /></SelectTrigger>
              <SelectContent>{CTA_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Link do Criativo</Label>
            <Input value={form.file_url} onChange={e => setForm({ ...form, file_url: e.target.value })} placeholder="Drive, Canva, Dropbox..." />
          </div>
        </div>
        <Button onClick={() => onSave(form)} disabled={!form.name || isPending} className="w-full mt-2">
          {isPending ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ── Ad Set Form ───────────────────────────────────────────────────────────
interface AdSetFormState { name: string; audience_type: string; audience_description: string; estimated_size: string; budget_type: string; budget: number; placements: string[]; }
const defaultAdSetForm: AdSetFormState = { name: '', audience_type: 'Interesse', audience_description: '', estimated_size: '', budget_type: 'Diário', budget: 0, placements: [] };

function AdSetFormDialog({ open, onClose, onSave, initial, title, isPending }: {
  open: boolean; onClose: () => void; onSave: (f: AdSetFormState) => void;
  initial?: AdSetFormState; title: string; isPending: boolean;
}) {
  const [form, setForm] = useState<AdSetFormState>(initial || defaultAdSetForm);
  useState(() => { if (open) setForm(initial || defaultAdSetForm); });

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome do Conjunto *</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: LAL 2% – Compradores" />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo de Público</Label>
            <Chips options={AUDIENCE_TYPES} value={form.audience_type} onChange={v => setForm({ ...form, audience_type: v })} />
          </div>
          <div className="space-y-1.5">
            <Label>Tamanho Estimado</Label>
            <Select value={form.estimated_size} onValueChange={v => setForm({ ...form, estimated_size: v })}>
              <SelectTrigger><SelectValue placeholder="Selecionar faixa..." /></SelectTrigger>
              <SelectContent>{SIZE_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Placements</Label>
            <MultiChips options={PLACEMENTS} value={form.placements} onChange={v => setForm({ ...form, placements: v })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo de Budget</Label>
              <Chips options={['Diário', 'Total']} value={form.budget_type} onChange={v => setForm({ ...form, budget_type: v })} />
            </div>
            <div className="space-y-1.5">
              <Label>Budget (R$)</Label>
              <Input type="number" value={form.budget || ''} onChange={e => setForm({ ...form, budget: Number(e.target.value) })} placeholder="0,00" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Segmentação / Público Detalhado</Label>
            <Textarea value={form.audience_description} onChange={e => setForm({ ...form, audience_description: e.target.value })}
              rows={2} placeholder="Ex: Interesse em academia, saúde, 25-45 anos, mulheres, SP..." />
          </div>
        </div>
        <Button onClick={() => onSave(form)} disabled={!form.name || isPending} className="w-full mt-2">
          {isPending ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ── Ad Row ────────────────────────────────────────────────────────────────
function AdRow({ ad, planningId, onEdit }: { ad: PlanningAd; planningId: string; onEdit: (a: PlanningAd) => void }) {
  const updateMutation = useUpdateAd();
  const deleteMutation = useDeleteAd();

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/30 group">
      <span className="text-muted-foreground">{formatIcon(ad.format)}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{ad.name}</p>
        {ad.headline && <p className="text-xs text-muted-foreground truncate">{ad.headline}</p>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Inline status */}
        <Select value={ad.status} onValueChange={v => updateMutation.mutate({ id: ad.id, planning_id: planningId, status: v })}>
          <SelectTrigger className="h-5 w-auto border-none shadow-none p-0 focus:ring-0">
            <Badge className={cn('text-xs cursor-pointer', adStatusColor[ad.status] || '')} variant="secondary">{ad.status}</Badge>
          </SelectTrigger>
          <SelectContent>
            {AD_STATUSES.map(s => <SelectItem key={s} value={s}><Badge className={adStatusColor[s] || ''} variant="secondary">{s}</Badge></SelectItem>)}
          </SelectContent>
        </Select>
        {ad.cta && <span className="text-xs text-primary hidden sm:block">{ad.cta}</span>}
        {ad.file_url && (
          <a href={ad.file_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
          </a>
        )}
        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => onEdit(ad)}>
          <Pencil className="w-3 h-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
          onClick={() => deleteMutation.mutate({ id: ad.id, planning_id: planningId })}>
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// ── Ad Set Card ───────────────────────────────────────────────────────────
function AdSetCard({ adSet, ads, planningId }: { adSet: PlanningAdSet; ads: PlanningAd[]; planningId: string }) {
  const [expanded, setExpanded] = useState(true);
  const [addAdOpen, setAddAdOpen] = useState(false);
  const [editAdOpen, setEditAdOpen] = useState(false);
  const [editAd, setEditAd] = useState<PlanningAd | null>(null);
  const [editSetOpen, setEditSetOpen] = useState(false);
  const createAd = useCreateAd();
  const updateAd = useUpdateAd();
  const updateAdSet = useUpdateAdSet();
  const deleteAdSet = useDeleteAdSet();

  const setAds = ads.filter(a => a.ad_set_id === adSet.id);

  const handleAddAd = async (form: AdFormState) => {
    await createAd.mutateAsync({ ...form, planning_id: planningId, ad_set_id: adSet.id, version: 1 });
    setAddAdOpen(false);
  };

  const handleEditAd = (a: PlanningAd) => { setEditAd(a); setEditAdOpen(true); };

  const handleUpdateAd = async (form: AdFormState) => {
    if (!editAd) return;
    await updateAd.mutateAsync({ ...form, id: editAd.id, planning_id: planningId });
    setEditAdOpen(false); setEditAd(null);
  };

  const handleUpdateAdSet = async (form: AdSetFormState) => {
    await updateAdSet.mutateAsync({ ...form, id: adSet.id, planning_id: planningId });
    setEditSetOpen(false);
  };

  const fmtBudget = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <>
      <Card className="border-border/50">
        {/* Ad Set header */}
        <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/20 rounded-t-lg"
          onClick={() => setExpanded(e => !e)}>
          <button type="button" className="text-muted-foreground shrink-0">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm">{adSet.name}</p>
              <Badge className={cn('text-xs', audienceColors[adSet.audience_type] || audienceColors['Broad'])} variant="secondary">
                {adSet.audience_type}
              </Badge>
              {adSet.estimated_size && <span className="text-xs text-muted-foreground">{adSet.estimated_size}</span>}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
              {adSet.budget > 0 && (
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />{fmtBudget(adSet.budget)}/{adSet.budget_type === 'Diário' ? 'dia' : 'total'}
                </span>
              )}
              {adSet.placements?.length > 0 && <span>{adSet.placements.join(', ')}</span>}
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />{setAds.length} anúncio{setAds.length !== 1 ? 's' : ''}
              </span>
            </div>
            {adSet.audience_description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-md">{adSet.audience_description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditSetOpen(true)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
              onClick={() => deleteAdSet.mutate({ id: adSet.id, planning_id: planningId })}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Ads */}
        {expanded && (
          <CardContent className="pt-0 pb-3 px-4 border-t border-border/30">
            <div className="space-y-0.5 mt-2">
              {setAds.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 text-center">Nenhum anúncio — clique em + Anúncio para adicionar</p>
              ) : (
                setAds.map(ad => <AdRow key={ad.id} ad={ad} planningId={planningId} onEdit={handleEditAd} />)
              )}
            </div>
            <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => setAddAdOpen(true)}>
              <Plus className="w-3.5 h-3.5" />Novo Anúncio
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Dialogs */}
      <AdFormDialog open={addAdOpen} onClose={() => setAddAdOpen(false)} onSave={handleAddAd}
        title="Novo Anúncio" isPending={createAd.isPending} />
      {editAd && (
        <AdFormDialog open={editAdOpen} onClose={() => { setEditAdOpen(false); setEditAd(null); }}
          onSave={handleUpdateAd} initial={{ name: editAd.name, format: editAd.format, status: editAd.status, headline: editAd.headline || '', copy_text: editAd.copy_text || '', cta: editAd.cta || '', file_url: editAd.file_url || '' }}
          title="Editar Anúncio" isPending={updateAd.isPending} />
      )}
      <AdSetFormDialog open={editSetOpen} onClose={() => setEditSetOpen(false)} onSave={handleUpdateAdSet}
        initial={{ name: adSet.name, audience_type: adSet.audience_type, audience_description: adSet.audience_description || '', estimated_size: adSet.estimated_size || '', budget_type: adSet.budget_type, budget: adSet.budget, placements: adSet.placements || [] }}
        title="Editar Conjunto" isPending={updateAdSet.isPending} />
    </>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────────────
export function PlanningAdSetsTab({ planningId }: { planningId: string }) {
  const { data: adSets = [] } = usePlanningAdSets(planningId);
  const { data: ads = [] } = usePlanningAds(planningId);
  const createAdSet = useCreateAdSet();
  const [addSetOpen, setAddSetOpen] = useState(false);

  const handleCreateAdSet = async (form: AdSetFormState) => {
    await createAdSet.mutateAsync({ ...form, planning_id: planningId, status: 'Ativo', position: adSets.length });
    setAddSetOpen(false);
  };

  const totalAds = ads.length;
  const approvedAds = ads.filter(a => a.status === 'Aprovado').length;

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Conjuntos de Anúncios</h3>
          {totalAds > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {adSets.length} conjunto{adSets.length !== 1 ? 's' : ''} · {totalAds} anúncio{totalAds !== 1 ? 's' : ''} · {approvedAds} aprovado{approvedAds !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setAddSetOpen(true)}>
          <Plus className="w-4 h-4" />Novo Conjunto
        </Button>
      </div>

      {adSets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">Nenhum conjunto criado</p>
            <p className="text-xs mt-1">Cada conjunto agrupa um público com seus anúncios, igual ao Meta Ads.</p>
            <Button size="sm" className="mt-4 gap-1.5" onClick={() => setAddSetOpen(true)}>
              <Plus className="w-4 h-4" />Criar primeiro conjunto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {adSets.map(adSet => (
            <AdSetCard key={adSet.id} adSet={adSet} ads={ads} planningId={planningId} />
          ))}
        </div>
      )}

      <AdSetFormDialog open={addSetOpen} onClose={() => setAddSetOpen(false)} onSave={handleCreateAdSet}
        title="Novo Conjunto de Anúncios" isPending={createAdSet.isPending} />
    </div>
  );
}
