import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Users, Pencil } from 'lucide-react';
import { usePlanningAudiences, useCreateAudience, useUpdateAudience, useDeleteAudience, type PlanningAudience } from '@/hooks/usePlanning';

const TYPES = ['Interesse', 'Lookalike', 'Remarketing', 'Custom', 'Broad', 'Outro'];

export function PlanningAudiencesTab({ planningId }: { planningId: string }) {
  const { data: audiences = [] } = usePlanningAudiences(planningId);
  const createMutation = useCreateAudience();
  const updateMutation = useUpdateAudience();
  const deleteMutation = useDeleteAudience();
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<PlanningAudience | null>(null);
  const [form, setForm] = useState({ name: '', type: 'Interesse', description: '', estimated_size: '', tagsInput: '' });

  const resetForm = () => setForm({ name: '', type: 'Interesse', description: '', estimated_size: '', tagsInput: '' });

  const handleCreate = async () => {
    const tags = form.tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    await createMutation.mutateAsync({ name: form.name, type: form.type, description: form.description, estimated_size: form.estimated_size, tags, planning_id: planningId });
    resetForm();
    setOpen(false);
  };

  const handleEdit = (a: PlanningAudience) => {
    setEditItem(a);
    setForm({ name: a.name, type: a.type, description: a.description || '', estimated_size: a.estimated_size || '', tagsInput: (a.tags || []).join(', ') });
  };

  const handleUpdate = async () => {
    if (!editItem) return;
    const tags = form.tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    await updateMutation.mutateAsync({ id: editItem.id, planning_id: planningId, name: form.name, type: form.type, description: form.description, estimated_size: form.estimated_size, tags });
    setEditItem(null);
    resetForm();
  };

  const formDialog = (
    <div className="space-y-4">
      <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Interesse - Marketing Digital" /></div>
      <div>
        <Label>Tipo</Label>
        <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>Descrição</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
      <div><Label>Tamanho Estimado</Label><Input value={form.estimated_size} onChange={e => setForm({ ...form, estimated_size: e.target.value })} placeholder="Ex: 500k - 1M" /></div>
      <div><Label>Tags (separadas por vírgula)</Label><Input value={form.tagsInput} onChange={e => setForm({ ...form, tagsInput: e.target.value })} placeholder="ex: topo, frio, interesse" /></div>
    </div>
  );

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Públicos</h3>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2" /> Adicionar</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Público</DialogTitle></DialogHeader>
            {formDialog}
            <Button onClick={handleCreate} disabled={!form.name || createMutation.isPending} className="w-full">Criar</Button>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editItem} onOpenChange={(v) => { if (!v) { setEditItem(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Público</DialogTitle></DialogHeader>
          {formDialog}
          <Button onClick={handleUpdate} disabled={!form.name || updateMutation.isPending} className="w-full">Salvar</Button>
        </DialogContent>
      </Dialog>

      {audiences.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum público adicionado</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {audiences.map(a => (
            <Card key={a.id}>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-medium"><Users className="w-4 h-4 text-primary" />{a.name}</div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(a)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate({ id: a.id, planning_id: planningId })}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">{a.type}</Badge>
                {a.estimated_size && <p className="text-xs text-muted-foreground">Tamanho: {a.estimated_size}</p>}
                {a.description && <p className="text-sm text-muted-foreground">{a.description}</p>}
                {a.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">{a.tags.map((tag, i) => <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>)}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
