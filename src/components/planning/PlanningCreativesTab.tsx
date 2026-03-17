import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Palette, Pencil, ExternalLink } from 'lucide-react';
import { usePlanningCreatives, useCreateCreative, useUpdateCreative, useDeleteCreative, type PlanningCreative } from '@/hooks/usePlanning';

const FORMATS = ['Imagem', 'Vídeo', 'Carrossel', 'Story', 'Reels', 'Coleção'];
const STATUSES = ['Pendente', 'Em Produção', 'Em Revisão', 'Aprovado', 'Reprovado'];

const statusColor: Record<string, string> = {
  'Pendente': 'bg-muted text-muted-foreground',
  'Em Produção': 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  'Em Revisão': 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  'Aprovado': 'bg-green-500/15 text-green-700 dark:text-green-400',
  'Reprovado': 'bg-red-500/15 text-red-700 dark:text-red-400',
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
    resetForm();
    setOpen(false);
  };

  const handleEdit = (c: PlanningCreative) => {
    setEditItem(c);
    setForm({ name: c.name, format: c.format, status: c.status, headline: c.headline || '', copy_text: c.copy_text || '', cta: c.cta || '', file_url: c.file_url || '' });
  };

  const handleUpdate = async () => {
    if (!editItem) return;
    await updateMutation.mutateAsync({ id: editItem.id, planning_id: planningId, ...form });
    setEditItem(null);
    resetForm();
  };

  const formDialog = (
    <div className="space-y-4">
      <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Criativo 01 - Oferta" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Formato</Label>
          <Select value={form.format} onValueChange={v => setForm({ ...form, format: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{FORMATS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {editItem && (
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
      </div>
      <div><Label>Headline</Label><Input value={form.headline} onChange={e => setForm({ ...form, headline: e.target.value })} /></div>
      <div><Label>Copy</Label><Textarea value={form.copy_text} onChange={e => setForm({ ...form, copy_text: e.target.value })} /></div>
      <div><Label>CTA</Label><Input value={form.cta} onChange={e => setForm({ ...form, cta: e.target.value })} placeholder="Ex: Saiba Mais" /></div>
      <div><Label>Link do Criativo</Label><Input value={form.file_url} onChange={e => setForm({ ...form, file_url: e.target.value })} placeholder="https://drive.google.com/... ou link do Canva" /></div>
    </div>
  );

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Criativos</h3>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-2" /> Adicionar</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Criativo</DialogTitle></DialogHeader>
            {formDialog}
            <Button onClick={handleCreate} disabled={!form.name || createMutation.isPending} className="w-full">Criar</Button>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editItem} onOpenChange={(v) => { if (!v) { setEditItem(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Criativo</DialogTitle></DialogHeader>
          {formDialog}
          <Button onClick={handleUpdate} disabled={!form.name || updateMutation.isPending} className="w-full">Salvar</Button>
        </DialogContent>
      </Dialog>

      {creatives.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum criativo adicionado</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {creatives.map(c => (
            <Card key={c.id}>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-medium"><Palette className="w-4 h-4 text-primary" />{c.name}</div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate({ id: c.id, planning_id: planningId })}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">{c.format}</Badge>
                  <Badge className={statusColor[c.status] || ''} variant="secondary">{c.status}</Badge>
                  <Badge variant="outline" className="text-xs">v{c.version}</Badge>
                </div>
                {c.headline && <p className="text-sm font-medium">{c.headline}</p>}
                {c.copy_text && <p className="text-sm text-muted-foreground line-clamp-2">{c.copy_text}</p>}
                {c.cta && <p className="text-xs text-primary">CTA: {c.cta}</p>}
                {c.file_url && (
                  <a href={c.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <ExternalLink className="w-3 h-3" /> Ver criativo
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
