import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Target, DollarSign, Pencil } from 'lucide-react';
import { usePlanningStructures, useCreateStructure, useUpdateStructure, useDeleteStructure, type PlanningStructure } from '@/hooks/usePlanning';

const TYPES = ['Prospecção', 'Remarketing', 'Lookalike', 'Retenção', 'Branding', 'Conversão', 'Outro'];

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
    resetForm();
    setOpen(false);
  };

  const handleEdit = (s: PlanningStructure) => {
    setEditItem(s);
    setForm({ name: s.name, type: s.type, objective: s.objective || '', budget: s.budget || 0 });
  };

  const handleUpdate = async () => {
    if (!editItem) return;
    await updateMutation.mutateAsync({ id: editItem.id, planning_id: planningId, name: form.name, type: form.type, objective: form.objective, budget: form.budget });
    setEditItem(null);
    resetForm();
  };

  const formDialog = (
    <div className="space-y-4">
      <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Prospecção - Interesses" /></div>
      <div>
        <Label>Tipo</Label>
        <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>Objetivo</Label><Textarea value={form.objective} onChange={e => setForm({ ...form, objective: e.target.value })} placeholder="KPI principal desta estrutura" /></div>
      <div><Label>Budget (R$)</Label><Input type="number" value={form.budget} onChange={e => setForm({ ...form, budget: Number(e.target.value) })} /></div>
    </div>
  );

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Estruturas de Campanha</h3>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Adicionar</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Estrutura</DialogTitle></DialogHeader>
            {formDialog}
            <Button onClick={handleCreate} disabled={!form.name || createMutation.isPending} className="w-full">Criar</Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(v) => { if (!v) { setEditItem(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Estrutura</DialogTitle></DialogHeader>
          {formDialog}
          <Button onClick={handleUpdate} disabled={!form.name || updateMutation.isPending} className="w-full">Salvar</Button>
        </DialogContent>
      </Dialog>

      {structures.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma estrutura criada. Adicione blocos como Prospecção, Remarketing, etc.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {structures.map(s => (
            <Card key={s.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    {s.name}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(s)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate({ id: s.id, planning_id: planningId })}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span className="font-medium">{s.type}</span>
                </div>
                {s.objective && <p className="text-sm text-muted-foreground">{s.objective}</p>}
                <div className="flex items-center gap-1 text-sm">
                  <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>R$ {(s.budget || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
