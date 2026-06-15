import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Palette, Pencil, ExternalLink } from 'lucide-react';
import { usePlanningCreatives, useCreateCreative, useUpdateCreative, useDeleteCreative, type PlanningCreative } from '@/hooks/usePlanning';
import { cn } from '@/lib/utils';

const FORMATS = ['Imagem', 'Vídeo', 'Carrossel', 'Story', 'Reels', 'Coleção'];
const STATUSES = ['Pendente', 'Em Produção', 'Em Revisão', 'Aprovado', 'Reprovado'];
const CTA_OPTIONS = ['Saiba Mais', 'Comprar Agora', 'Cadastre-se', 'Agendar', 'Fale Conosco', 'Baixar App', 'Ver Oferta', 'Enviar Mensagem', 'Ligar Agora'];

const statusColor: Record<string, string> = {
  'Pendente':      'bg-muted text-muted-foreground',
  'Em Produção':   'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  'Em Revisão':    'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  'Aprovado':      'bg-green-500/15 text-green-700 dark:text-green-400',
  'Reprovado':     'bg-red-500/15 text-red-600 dark:text-red-400',
};

export function PlanningCreativesTab({ planningId }: { planningId: string }) {
  const { data: creatives = [] } = usePlanningCreatives(planningId);
  const createMutation = useCreateCreative();
  const updateMutation = useUpdateCreative();
  const deleteMutation = useDeleteCreative();
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<PlanningCreative | null>(null);
  const [form, setForm] = useState({ name: '', format: 'Imagem', status: 'Pendente', headline: '', copy_text: '', cta: '', file_url: '' });

  const resetForm = () => setForm({ name: '', format: 'Imagem', status: 'Pendente', headline: '', copy_text: '', cta: '', file_url: '' });

  const handleCreate = async () => {
    await createMutation.mutateAsync({ ...form, planning_id: planningId });
    resetForm(); setOpen(false);
  };

  const handleEdit = (c: PlanningCreative) => {
    setEditItem(c);
    setForm({ name: c.name, format: c.format, status: c.status, headline: c.headline || '', copy_text: c.copy_text || '', cta: c.cta || '', file_url: c.file_url || '' });
  };

  const handleUpdate = async () => {
    if (!editItem) return;
    await updateMutation.mutateAsync({ id: editItem.id, planning_id: planningId, ...form });
    setEditItem(null); resetForm();
  };

  const changeStatus = (c: PlanningCreative, status: string) => {
    updateMutation.mutate({ id: c.id, planning_id: planningId, status });
  };

  const formContent = (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Nome *</Label>
        <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Criativo 01 - Oferta Principal" />
      </div>
      <div className="space-y-1.5">
        <Label>Formato</Label>
        <div className="flex flex-wrap gap-2">
          {FORMATS.map(f => (
            <button key={f} type="button" onClick={() => setForm({ ...form, format: f })}
              className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                form.format === f ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50 text-muted-foreground'
              )}>
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Status</Label>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map(s => (
            <button key={s} type="button" onClick={() => setForm({ ...form, status: s })}
              className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                form.status === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50 text-muted-foreground'
              )}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Headline</Label>
        <Input value={form.headline} onChange={e => setForm({ ...form, headline: e.target.value })} placeholder="Título principal do anúncio" />
      </div>
      <div className="space-y-1.5">
        <Label>Copy</Label>
        <Textarea value={form.copy_text} onChange={e => setForm({ ...form, copy_text: e.target.value })} placeholder="Texto do anúncio..." rows={3} />
      </div>
      <div className="space-y-1.5">
        <Label>CTA</Label>
        <Select value={form.cta} onValueChange={v => setForm({ ...form, cta: v })}>
          <SelectTrigger><SelectValue placeholder="Selecionar CTA..." /></SelectTrigger>
          <SelectContent>
            {CTA_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Link do Criativo</Label>
        <Input value={form.file_url} onChange={e => setForm({ ...form, file_url: e.target.value })} placeholder="Drive, Canva, Dropbox..." />
      </div>
    </div>
  );

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Criativos</h3>
        <Button size="sm" className="gap-1.5" onClick={() => { resetForm(); setOpen(true); }}>
          <Plus className="w-4 h-4" />Adicionar
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Criativo</DialogTitle></DialogHeader>
          {formContent}
          <Button onClick={handleCreate} disabled={!form.name || createMutation.isPending} className="w-full mt-2">Criar</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={(v) => { if (!v) { setEditItem(null); resetForm(); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Criativo</DialogTitle></DialogHeader>
          {formContent}
          <Button onClick={handleUpdate} disabled={!form.name || updateMutation.isPending} className="w-full mt-2">Salvar</Button>
        </DialogContent>
      </Dialog>

      {creatives.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-muted-foreground">
            <Palette className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum criativo adicionado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {creatives.map(c => (
            <Card key={c.id} className="border-border/50">
              <CardContent className="pt-4 pb-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm leading-tight">{c.name}</p>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate({ id: c.id, planning_id: planningId })}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>

                {/* Inline status */}
                <div className="flex gap-1.5 flex-wrap">
                  <Badge variant="outline" className="text-xs">{c.format}</Badge>
                  <Select value={c.status} onValueChange={v => changeStatus(c, v)}>
                    <SelectTrigger className="h-5 w-auto border-none shadow-none p-0 focus:ring-0">
                      <Badge className={cn('text-xs cursor-pointer', statusColor[c.status] || '')} variant="secondary">{c.status}</Badge>
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => (
                        <SelectItem key={s} value={s}>
                          <Badge className={statusColor[s] || ''} variant="secondary">{s}</Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Badge variant="outline" className="text-xs">v{c.version}</Badge>
                </div>

                {c.headline && <p className="text-sm font-medium line-clamp-1">{c.headline}</p>}
                {c.copy_text && <p className="text-xs text-muted-foreground line-clamp-2">{c.copy_text}</p>}
                {c.cta && <p className="text-xs text-primary font-medium">CTA: {c.cta}</p>}
                {c.file_url && (
                  <a href={c.file_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <ExternalLink className="w-3 h-3" />Ver criativo
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
