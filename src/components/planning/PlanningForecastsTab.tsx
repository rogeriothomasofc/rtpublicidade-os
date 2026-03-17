import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { usePlanningForecasts, useCreateForecast, useUpdateForecast, useDeleteForecast, type PlanningForecast } from '@/hooks/usePlanning';

export function PlanningForecastsTab({ planningId }: { planningId: string }) {
  const { data: forecasts = [] } = usePlanningForecasts(planningId);
  const createMutation = useCreateForecast();
  const updateMutation = useUpdateForecast();
  const deleteMutation = useDeleteForecast();
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<PlanningForecast | null>(null);
  const [form, setForm] = useState({ label: '', spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 });

  const resetForm = () => setForm({ label: '', spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 });

  const computed = {
    ctr: form.impressions > 0 ? (form.clicks / form.impressions) * 100 : 0,
    cpc: form.clicks > 0 ? form.spend / form.clicks : 0,
    cpm: form.impressions > 0 ? (form.spend / form.impressions) * 1000 : 0,
    cpa: form.conversions > 0 ? form.spend / form.conversions : 0,
    roas: form.spend > 0 ? form.revenue / form.spend : 0,
  };

  const handleCreate = async () => {
    await createMutation.mutateAsync({ ...form, ...computed, planning_id: planningId, is_custom: true });
    resetForm();
    setOpen(false);
  };

  const handleEdit = (f: PlanningForecast) => {
    setEditItem(f);
    setForm({ label: f.label, spend: f.spend, impressions: f.impressions, clicks: f.clicks, conversions: f.conversions, revenue: f.revenue });
  };

  const handleUpdate = async () => {
    if (!editItem) return;
    await updateMutation.mutateAsync({ id: editItem.id, planning_id: planningId, ...form, ...computed });
    setEditItem(null);
    resetForm();
  };

  const fmt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  const fmtCur = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const formDialog = (
    <div className="space-y-4">
      <div><Label>Cenário</Label><Input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="Ex: Cenário Otimista" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Investimento (R$)</Label><Input type="number" value={form.spend} onChange={e => setForm({ ...form, spend: Number(e.target.value) })} /></div>
        <div><Label>Impressões</Label><Input type="number" value={form.impressions} onChange={e => setForm({ ...form, impressions: Number(e.target.value) })} /></div>
        <div><Label>Cliques</Label><Input type="number" value={form.clicks} onChange={e => setForm({ ...form, clicks: Number(e.target.value) })} /></div>
        <div><Label>Conversões</Label><Input type="number" value={form.conversions} onChange={e => setForm({ ...form, conversions: Number(e.target.value) })} /></div>
        <div><Label>Receita (R$)</Label><Input type="number" value={form.revenue} onChange={e => setForm({ ...form, revenue: Number(e.target.value) })} /></div>
      </div>
      {form.spend > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="pt-3 grid grid-cols-3 gap-2 text-sm">
            <div><span className="text-muted-foreground">CTR:</span> {fmt(computed.ctr)}%</div>
            <div><span className="text-muted-foreground">CPC:</span> {fmtCur(computed.cpc)}</div>
            <div><span className="text-muted-foreground">CPM:</span> {fmtCur(computed.cpm)}</div>
            <div><span className="text-muted-foreground">CPA:</span> {fmtCur(computed.cpa)}</div>
            <div><span className="text-muted-foreground">ROAS:</span> {fmt(computed.roas)}x</div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Projeções</h3>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2" /> Nova Projeção</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Nova Projeção</DialogTitle></DialogHeader>
            {formDialog}
            <Button onClick={handleCreate} disabled={!form.label || createMutation.isPending} className="w-full">Criar</Button>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editItem} onOpenChange={(v) => { if (!v) { setEditItem(null); resetForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar Projeção</DialogTitle></DialogHeader>
          {formDialog}
          <Button onClick={handleUpdate} disabled={!form.label || updateMutation.isPending} className="w-full">Salvar</Button>
        </DialogContent>
      </Dialog>

      {forecasts.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma projeção criada</CardContent></Card>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cenário</TableHead>
                <TableHead className="text-right">Invest.</TableHead>
                <TableHead className="text-right">Impr.</TableHead>
                <TableHead className="text-right">Cliques</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">CPC</TableHead>
                <TableHead className="text-right">Conv.</TableHead>
                <TableHead className="text-right">CPA</TableHead>
                <TableHead className="text-right">Receita</TableHead>
                <TableHead className="text-right">ROAS</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {forecasts.map(f => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.label}</TableCell>
                  <TableCell className="text-right">{fmtCur(f.spend)}</TableCell>
                  <TableCell className="text-right">{fmt(f.impressions)}</TableCell>
                  <TableCell className="text-right">{fmt(f.clicks)}</TableCell>
                  <TableCell className="text-right">{fmt(f.ctr)}%</TableCell>
                  <TableCell className="text-right">{fmtCur(f.cpc)}</TableCell>
                  <TableCell className="text-right">{fmt(f.conversions)}</TableCell>
                  <TableCell className="text-right">{fmtCur(f.cpa)}</TableCell>
                  <TableCell className="text-right">{fmtCur(f.revenue)}</TableCell>
                  <TableCell className="text-right">{fmt(f.roas)}x</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(f)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate({ id: f.id, planning_id: planningId })}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
