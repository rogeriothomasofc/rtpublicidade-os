import { useState, useEffect } from 'react';
import { SalesPipeline, PipelineStage } from '@/types/database';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Building2, Mail, Phone, DollarSign, Calendar, Percent, StickyNote, Pencil, Save, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateLead } from '@/hooks/useSalesPipeline';
import { usePipelineStages } from '@/hooks/usePipelineStages';
import { toast } from 'sonner';

interface LeadProfileDialogProps {
  lead: SalesPipeline | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const stageColors: Record<string, string> = {
  Novo: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  'Qualificação': 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
  'Diagnóstico': 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  'Reunião Agendada': 'bg-violet-500/10 text-violet-700 dark:text-violet-400',
  'Proposta Enviada': 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
  'Negociação': 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  Ganho: 'bg-green-500/10 text-green-700 dark:text-green-400',
  Perdido: 'bg-red-500/10 text-red-700 dark:text-red-400',
};

export function LeadProfileDialog({ lead, open, onOpenChange }: LeadProfileDialogProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    lead_name: '',
    company: '',
    email: '',
    phone: '',
    deal_value: 0,
    probability: 0,
    duration_months: 12,
    stage: 'New' as string,
    notes: '',
  });

  const updateLead = useUpdateLead();
  const { data: stages } = usePipelineStages();

  useEffect(() => {
    if (lead) {
      setForm({
        lead_name: lead.lead_name || '',
        company: lead.company || '',
        email: lead.email || '',
        phone: lead.phone || '',
        deal_value: Number(lead.deal_value) || 0,
        probability: lead.probability || 0,
        duration_months: lead.duration_months || 12,
        stage: lead.stage,
        notes: lead.notes || '',
      });
      setEditing(false);
    }
  }, [lead, open]);

  if (!lead) return null;


  const handleSave = () => {
    updateLead.mutate(
      {
        id: lead.id,
        lead_name: form.lead_name,
        company: form.company || null,
        email: form.email || null,
        phone: form.phone || null,
        deal_value: form.deal_value,
        probability: form.probability,
        duration_months: form.duration_months,
        stage: form.stage as PipelineStage,
        notes: form.notes || null,
      },
      {
        onSuccess: () => {
          toast.success('Lead atualizado!');
          setEditing(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg shrink-0">
              {lead.lead_name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              {editing ? (
                <Input
                  value={form.lead_name}
                  onChange={(e) => setForm((f) => ({ ...f, lead_name: e.target.value }))}
                  className="h-8 text-base font-semibold"
                />
              ) : (
                <>
                  <p className="truncate">{lead.lead_name}</p>
                  {lead.company && (
                    <p className="text-sm font-normal text-muted-foreground flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {lead.company}
                    </p>
                  )}
                </>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => {
                if (editing) {
                  // Reset form
                  setForm({
                    lead_name: lead.lead_name || '',
                    company: lead.company || '',
                    email: lead.email || '',
                    phone: lead.phone || '',
                    deal_value: Number(lead.deal_value) || 0,
                    probability: lead.probability || 0,
                    duration_months: lead.duration_months || 12,
                    stage: lead.stage,
                    notes: lead.notes || '',
                  });
                  setEditing(false);
                } else {
                  setEditing(true);
                }
              }}
            >
              {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Stage Badge */}
          <div className="flex items-center gap-2">
            {editing ? (
              <Select value={form.stage} onValueChange={(v) => setForm((f) => ({ ...f, stage: v }))}>
                <SelectTrigger className="h-8 w-[160px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(stages || []).map((s) => (
                    <SelectItem key={s.name} value={s.name}>
                      {s.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
            <Badge className={stageColors[lead.stage] || 'bg-muted text-muted-foreground'} variant="secondary">
              {lead.stage}
            </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {editing ? '' : `${lead.probability}% probabilidade`}
            </span>
          </div>

          <Separator />

          {/* Contact Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Contato</h4>
            {editing ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Input
                    placeholder="Empresa"
                    value={form.company}
                    onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Input
                    placeholder="Telefone"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            ) : (
              <>
                {lead.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                    <a href={`mailto:${lead.email}`} className="text-primary hover:underline truncate">
                      {lead.email}
                    </a>
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>{lead.phone}</span>
                  </div>
                )}
                {!lead.email && !lead.phone && (
                  <p className="text-sm text-muted-foreground italic">Sem informações de contato</p>
                )}
              </>
            )}
          </div>

          <Separator />

          {/* Deal Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Negociação</h4>
            {editing ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Valor (R$)</label>
                  <Input
                    type="number"
                    value={form.deal_value}
                    onChange={(e) => setForm((f) => ({ ...f, deal_value: Number(e.target.value) }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Probabilidade (%)</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={form.probability}
                    onChange={(e) => setForm((f) => ({ ...f, probability: Number(e.target.value) }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Duração (meses)</label>
                  <Input
                    type="number"
                    value={form.duration_months}
                    onChange={(e) => setForm((f) => ({ ...f, duration_months: Number(e.target.value) }))}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Valor</p>
                    <p className="font-medium">{formatCurrency(Number(lead.deal_value))}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Percent className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Probabilidade</p>
                    <p className="font-medium">{lead.probability}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Duração</p>
                    <p className="font-medium">{lead.duration_months || 12} meses</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Criado em</p>
                    <p className="font-medium">
                      {format(new Date(lead.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <Separator />
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <StickyNote className="w-3.5 h-3.5" />
              Notas
            </h4>
            {editing ? (
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Adicionar notas..."
                className="text-sm min-h-[80px]"
              />
            ) : lead.notes ? (
              <p className="text-sm bg-muted/50 rounded-md p-3 whitespace-pre-wrap">{lead.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">Sem notas</p>
            )}
          </div>

          {/* Actions */}
          {editing && (
            <Button onClick={handleSave} disabled={updateLead.isPending || !form.lead_name.trim()} className="w-full gap-2">
              {updateLead.isPending ? <span className="animate-spin">⏳</span> : <Save className="w-4 h-4" />}
              Salvar alterações
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
