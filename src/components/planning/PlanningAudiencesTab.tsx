import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Users, Pencil } from 'lucide-react';
import { usePlanningAudiences, useCreateAudience, useUpdateAudience, useDeleteAudience, type PlanningAudience } from '@/hooks/usePlanning';
import { cn } from '@/lib/utils';

const TYPES = ['Interesse', 'Lookalike', 'Remarketing', 'Custom', 'Broad', 'Outro'];
const SIZE_OPTIONS = ['< 50k', '50k – 200k', '200k – 500k', '500k – 1M', '1M – 5M', '> 5M', 'Broad (sem limite)'];
const COMMON_TAGS = ['Topo de funil', 'Fundo de funil', 'Frio', 'Quente', 'Mobile', 'Desktop', 'Retargeting', 'Comprador', 'Abandonou carrinho', 'Visitou site'];

const typeColors: Record<string, string> = {
  'Interesse': 'bg-blue-500/10 text-blue-600',
  'Lookalike': 'bg-purple-500/10 text-purple-600',
  'Remarketing': 'bg-amber-500/10 text-amber-600',
  'Custom': 'bg-green-500/10 text-green-600',
  'Broad': 'bg-muted text-muted-foreground',
  'Outro': 'bg-muted text-muted-foreground',
};

export function PlanningAudiencesTab({ planningId }: { planningId: string }) {
  const { data: audiences = [] } = usePlanningAudiences(planningId);
  const createMutation = useCreateAudience();
  const updateMutation = useUpdateAudience();
  const deleteMutation = useDeleteAudience();
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<PlanningAudience | null>(null);
  const [form, setForm] = useState({ name: '', type: 'Interesse', description: '', estimated_size: '', tags: [] as string[] });

  const resetForm = () => setForm({ name: '', type: 'Interesse', description: '', estimated_size: '', tags: [] });

  const toggleTag = (tag: string) => setForm(prev => ({
    ...prev,
    tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag],
  }));

  const handleCreate = async () => {
    await createMutation.mutateAsync({ name: form.name, type: form.type, description: form.description, estimated_size: form.estimated_size, tags: form.tags, planning_id: planningId });
    resetForm(); setOpen(false);
  };

  const handleEdit = (a: PlanningAudience) => {
    setEditItem(a);
    setForm({ name: a.name, type: a.type, description: a.description || '', estimated_size: a.estimated_size || '', tags: a.tags || [] });
  };

  const handleUpdate = async () => {
    if (!editItem) return;
    await updateMutation.mutateAsync({ id: editItem.id, planning_id: planningId, name: form.name, type: form.type, description: form.description, estimated_size: form.estimated_size, tags: form.tags });
    setEditItem(null); resetForm();
  };

  const formContent = (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Nome *</Label>
        <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: LAL 2% - Compradores" />
      </div>
      <div className="space-y-1.5">
        <Label>Tipo</Label>
        <div className="flex flex-wrap gap-2">
          {TYPES.map(t => (
            <button key={t} type="button" onClick={() => setForm({ ...form, type: t })}
              className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                form.type === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50 text-muted-foreground'
              )}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Tamanho estimado</Label>
        <Select value={form.estimated_size} onValueChange={v => setForm({ ...form, estimated_size: v })}>
          <SelectTrigger><SelectValue placeholder="Selecionar faixa..." /></SelectTrigger>
          <SelectContent>
            {SIZE_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Tags</Label>
        <div className="flex flex-wrap gap-2">
          {COMMON_TAGS.map(tag => (
            <button key={tag} type="button" onClick={() => toggleTag(tag)}
              className={cn('px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                form.tags.includes(tag) ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50 text-muted-foreground'
              )}>
              {tag}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Descrição</Label>
        <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder="Detalhes do público, segmentações específicas..." rows={2} />
      </div>
    </div>
  );

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Públicos</h3>
        <Button size="sm" className="gap-1.5" onClick={() => { resetForm(); setOpen(true); }}>
          <Plus className="w-4 h-4" />Adicionar
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Público</DialogTitle></DialogHeader>
          {formContent}
          <Button onClick={handleCreate} disabled={!form.name || createMutation.isPending} className="w-full mt-2">Criar</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={(v) => { if (!v) { setEditItem(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Público</DialogTitle></DialogHeader>
          {formContent}
          <Button onClick={handleUpdate} disabled={!form.name || updateMutation.isPending} className="w-full mt-2">Salvar</Button>
        </DialogContent>
      </Dialog>

      {audiences.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum público adicionado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {audiences.map(a => (
            <Card key={a.id} className="border-border/50">
              <CardContent className="pt-4 pb-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm leading-tight">{a.name}</p>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(a)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate({ id: a.id, planning_id: planningId })}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                <Badge className={cn('text-xs', typeColors[a.type] || typeColors['Outro'])} variant="secondary">{a.type}</Badge>
                {a.estimated_size && <p className="text-xs text-muted-foreground">Tamanho: {a.estimated_size}</p>}
                {a.description && <p className="text-xs text-muted-foreground line-clamp-2">{a.description}</p>}
                {a.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {a.tags.map((tag, i) => <Badge key={i} variant="outline" className="text-xs px-1.5 py-0">{tag}</Badge>)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
