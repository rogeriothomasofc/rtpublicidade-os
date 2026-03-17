import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClients } from '@/hooks/useClients';
import { useCreatePlanningCampaign, useUpdatePlanningCampaign, type PlanningCampaign, type PlanningStatus } from '@/hooks/usePlanning';
import { useNavigate } from 'react-router-dom';

const PLATFORMS = ['Meta', 'Google', 'TikTok', 'LinkedIn', 'Other'];
const STATUS_OPTIONS: PlanningStatus[] = ['Rascunho', 'Em Aprovação', 'Pronto para Subir', 'Publicado', 'Em Teste', 'Escalando', 'Pausado'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editCampaign?: PlanningCampaign | null;
}

const emptyForm = {
  name: '',
  client_id: '',
  objective: '',
  platform: 'Meta',
  status: 'Rascunho' as PlanningStatus,
  start_date: '',
  end_date: '',
  total_budget: 0,
  daily_budget: 0,
};

export function NewPlanningDialog({ open, onOpenChange, editCampaign }: Props) {
  const navigate = useNavigate();
  const { data: clients = [] } = useClients();
  const createMutation = useCreatePlanningCampaign();
  const updateMutation = useUpdatePlanningCampaign();

  const isEditing = !!editCampaign;

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (open && editCampaign) {
      setForm({
        name: editCampaign.name,
        client_id: editCampaign.client_id || '',
        objective: editCampaign.objective || '',
        platform: editCampaign.platform,
        status: editCampaign.status,
        start_date: editCampaign.start_date || '',
        end_date: editCampaign.end_date || '',
        total_budget: editCampaign.total_budget || 0,
        daily_budget: editCampaign.daily_budget || 0,
      });
    } else if (open && !editCampaign) {
      setForm(emptyForm);
    }
  }, [open, editCampaign]);

  const handleSubmit = async () => {
    const payload = {
      ...form,
      client_id: form.client_id || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    };

    if (isEditing) {
      await updateMutation.mutateAsync({ id: editCampaign.id, ...payload });
      onOpenChange(false);
    } else {
      const result = await createMutation.mutateAsync({ ...payload, status: 'Rascunho' as PlanningStatus });
      if (result?.id) {
        onOpenChange(false);
        navigate(`/planning/${result.id}`);
      }
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Planejamento' : 'Novo Planejamento'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Nome do Planejamento *</Label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Campanha Black Friday" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Cliente</Label>
              <Select value={form.client_id} onValueChange={v => setForm({ ...form, client_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Plataforma</Label>
              <Select value={form.platform} onValueChange={v => setForm({ ...form, platform: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isEditing && (
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as PlanningStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Objetivo</Label>
            <Textarea value={form.objective} onChange={e => setForm({ ...form, objective: e.target.value })} placeholder="Ex: Gerar leads qualificados para o segmento X" rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data Início</Label>
              <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Budget Total (R$)</Label>
              <Input type="number" value={form.total_budget} onChange={e => setForm({ ...form, total_budget: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Budget Diário (R$)</Label>
              <Input type="number" value={form.daily_budget} onChange={e => setForm({ ...form, daily_budget: Number(e.target.value) })} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!form.name || isPending}>
            {isEditing ? 'Salvar' : 'Criar Planejamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
