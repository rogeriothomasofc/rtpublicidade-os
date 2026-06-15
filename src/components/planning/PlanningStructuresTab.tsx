import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Target, DollarSign, Pencil } from 'lucide-react';
import { usePlanningStructures, useCreateStructure, useUpdateStructure, useDeleteStructure, type PlanningStructure } from '@/hooks/usePlanning';
import { cn } from '@/lib/utils';

const TYPES = ['Prospecção', 'Remarketing', 'Lookalike', 'Retenção', 'Branding', 'Conversão', 'Outro'];

const typeColors: Record<string, string> = {
  'Prospecção': 'bg-blue-500/10 text-blue-600',
  'Remarketing': 'bg-amber-500/10 text-amber-600',
  'Lookalike': 'bg-purple-500/10 text-purple-600',
  'Retenção': 'bg-green-500/10 text-green-600',
  'Branding': 'bg-pink-500/10 text-pink-600',
  'Conversão': 'bg-emerald-500/10 text-emerald-600',
  'Outro': 'bg-muted text-muted-foreground',
};

export function PlanningStructuresTab({ planningId }: { planningId: string }) {
  const { data: structures = [] } = usePlanningStructures(planningId);
  const createMutation = useCreateStructure();
  const updateMutation = useUpdateStructure();
  const deleteMutation = useDeleteStructure();
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<PlanningStructure | null>(null);
  const [form, setForm] = useState({ name: '', type: 'Prospecção', objective: '', budget: 0 });

  const resetForm = () => setForm({ name: '', type: 'Prospecção', objective: '', budget: 0 });

  const handleCreate = async () => {
    await createMutation.mutateAsync({ ...form, planning_id: planningId, position: structures.length });
    resetForm(); setOpen(false);
  };

  const handleEdit = (s: PlanningStructure) => {
    setEditItem(s);
    setForm({ name: s.name, type: s.type, objective: s.objective || '', budget: s.budget || 0 });
  };

  const handleUpdate = async () => {
    if (!editItem) return;
    await updateMutation.mutateAsync({ id: editItem.id, planning_id: planningId, name: form.name, type: form.type, objective: form.objective, budget: form.budget });
    setEditItem(null); resetForm();
  };

  const formContent = (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Nome *</Label>
        <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Prospecção - Interesses frios" />
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
        <Label>Objetivo / KPI principal</Label>
        <Textarea value={form.objective} onChange={e => setForm({ ...form, objective: e.target.value })}
          placeholder="Ex: CPA < R$ 50, ROAS > 3x, CPL < R$ 20..." rows={2} />
      </div>
      <div className="space-y-1.5">
        <Label>Budget (R$)</Label>
        <Input type="number" value={form.budget || ''} onChange={e => setForm({ ...form, budget: Number(e.target.value) })} placeholder="0,00" />
      </div>
    </div>
  );

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Estruturas de Campanha</h3>
        <Button size="sm" className="gap-1.5" onClick={() => { resetForm(); setOpen(true); }}>
          <Plus className="w-4 h-4" />Adicionar
        </Button>
      </div>

      {/* Create Dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Estrutura</DialogTitle></DialogHeader>
          {formContent}
          <Button onClick={handleCreate} disabled={!form.name || createMutation.isPending} className="w-full mt-2">Criar</Button>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(v) => { if (!v) { setEditItem(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Estrutura</DialogTitle></DialogHeader>
          {formContent}
          <Button onClick={handleUpdate} disabled={!form.name || updateMutation.isPending} className="w-full mt-2">Salvar</Button>
        </DialogContent>
      </Dialog>

      {structures.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-muted-foreground">
            <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma estrutura criada.</p>
            <p className="text-xs mt-1">Adicione blocos como Prospecção, Remarketing, etc.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {structures.map(s => (
            <Card key={s.id} className="border-border/50">
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-semibold">{s.name}</CardTitle>
                    <Badge className={cn('mt-1 text-xs', typeColors[s.type] || typeColors['Outro'])} variant="secondary">{s.type}</Badge>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(s)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate({ id: s.id, planning_id: planningId })}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-4 space-y-1.5">
                {s.objective && <p className="text-sm text-muted-foreground">{s.objective}</p>}
                {(s.budget || 0) > 0 && (
                  <div className="flex items-center gap-1 text-sm">
                    <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-medium">{(s.budget || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
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
