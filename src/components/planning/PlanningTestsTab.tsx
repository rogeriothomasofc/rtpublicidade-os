import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, FlaskConical, Pencil } from 'lucide-react';
import { usePlanningTests, useCreateTest, useUpdateTest, useDeleteTest, type PlanningTest } from '@/hooks/usePlanning';

const STATUSES = ['Planejado', 'Em Andamento', 'Concluído'];
const statusColor: Record<string, string> = {
  'Planejado': 'bg-muted text-muted-foreground',
  'Em Andamento': 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  'Concluído': 'bg-green-500/15 text-green-700 dark:text-green-400',
};

export function PlanningTestsTab({ planningId }: { planningId: string }) {
  const { data: tests = [] } = usePlanningTests(planningId);
  const createMutation = useCreateTest();
  const updateMutation = useUpdateTest();
  const deleteMutation = useDeleteTest();
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<PlanningTest | null>(null);
  const [form, setForm] = useState({ hypothesis: '', variable: '', metric: '', variantsText: '', status: 'Planejado', winner: '', results: '' });

  const resetForm = () => setForm({ hypothesis: '', variable: '', metric: '', variantsText: '', status: 'Planejado', winner: '', results: '' });

  const handleCreate = async () => {
    const variants = form.variantsText.split(',').map(v => v.trim()).filter(Boolean).map(v => ({ name: v }));
    await createMutation.mutateAsync({ hypothesis: form.hypothesis, variable: form.variable, metric: form.metric, variants, planning_id: planningId });
    resetForm();
    setOpen(false);
  };

  const handleEdit = (t: PlanningTest) => {
    setEditItem(t);
    const variantsText = Array.isArray(t.variants) ? (t.variants as any[]).map(v => v.name).join(', ') : '';
    setForm({ hypothesis: t.hypothesis, variable: t.variable, metric: t.metric || '', variantsText, status: t.status, winner: t.winner || '', results: t.results || '' });
  };

  const handleUpdate = async () => {
    if (!editItem) return;
    const variants = form.variantsText.split(',').map(v => v.trim()).filter(Boolean).map(v => ({ name: v }));
    await updateMutation.mutateAsync({ id: editItem.id, planning_id: planningId, hypothesis: form.hypothesis, variable: form.variable, metric: form.metric, variants, status: form.status, winner: form.winner || null, results: form.results || null });
    setEditItem(null);
    resetForm();
  };

  const formDialog = (isEdit: boolean) => (
    <div className="space-y-4">
      <div><Label>Hipótese</Label><Textarea value={form.hypothesis} onChange={e => setForm({ ...form, hypothesis: e.target.value })} placeholder="Se usarmos X, esperamos Y porque Z" /></div>
      <div><Label>Variável</Label><Input value={form.variable} onChange={e => setForm({ ...form, variable: e.target.value })} placeholder="Ex: Headline, Criativo, Público" /></div>
      <div><Label>Métrica Principal</Label><Input value={form.metric} onChange={e => setForm({ ...form, metric: e.target.value })} placeholder="Ex: CTR, CPA, ROAS" /></div>
      <div><Label>Variantes (separadas por vírgula)</Label><Input value={form.variantsText} onChange={e => setForm({ ...form, variantsText: e.target.value })} placeholder="Variante A, Variante B" /></div>
      {isEdit && (
        <>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Vencedor</Label><Input value={form.winner} onChange={e => setForm({ ...form, winner: e.target.value })} placeholder="Nome da variante vencedora" /></div>
          <div><Label>Resultados</Label><Textarea value={form.results} onChange={e => setForm({ ...form, results: e.target.value })} placeholder="Resumo dos resultados" /></div>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Testes A/B</h3>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2" /> Novo Teste</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Teste A/B</DialogTitle></DialogHeader>
            {formDialog(false)}
            <Button onClick={handleCreate} disabled={!form.hypothesis || !form.variable || createMutation.isPending} className="w-full">Criar</Button>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editItem} onOpenChange={(v) => { if (!v) { setEditItem(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Teste A/B</DialogTitle></DialogHeader>
          {formDialog(true)}
          <Button onClick={handleUpdate} disabled={!form.hypothesis || !form.variable || updateMutation.isPending} className="w-full">Salvar</Button>
        </DialogContent>
      </Dialog>

      {tests.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum teste planejado</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {tests.map(t => (
            <Card key={t.id}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <FlaskConical className="w-4 h-4 text-primary mt-1" />
                    <div>
                      <p className="font-medium">{t.hypothesis}</p>
                      <p className="text-sm text-muted-foreground">Variável: {t.variable} · Métrica: {t.metric || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColor[t.status] || ''} variant="secondary">{t.status}</Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(t)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate({ id: t.id, planning_id: planningId })}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                {Array.isArray(t.variants) && t.variants.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(t.variants as any[]).map((v, i) => (
                      <Badge key={i} variant={t.winner === v.name ? 'default' : 'outline'} className="text-xs">
                        {v.name} {t.winner === v.name ? '🏆' : ''}
                      </Badge>
                    ))}
                  </div>
                )}
                {t.winner && <p className="text-sm text-green-600 dark:text-green-400">Vencedor: {t.winner}</p>}
                {t.results && <p className="text-sm text-muted-foreground">{t.results}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
