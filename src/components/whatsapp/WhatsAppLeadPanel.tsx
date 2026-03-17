import { useState, useEffect } from 'react';
import { SalesPipeline } from '@/types/database';
import { WhatsAppLabel } from '@/hooks/useWhatsAppContacts';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, X, Clock, Trash2, Pencil, Check as CheckIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { WhatsAppLabelManager } from './WhatsAppLabelManager';
import { cn } from '@/lib/utils';
import { usePipelineStages } from '@/hooks/usePipelineStages';
import { useLeadReminders, useCreateReminder, useDismissReminder } from '@/hooks/useLeadReminders';
import { useRemoveLabel } from '@/hooks/useContactLabels';

interface WhatsAppLeadPanelProps {
  lead: SalesPipeline;
  labels: WhatsAppLabel[];
}

const STAGE_COLORS: Record<string, string> = {
  'Novo': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Qualificado': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Proposta Enviada': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'Negociação': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Ganho': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Perdido': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const LABEL_COLORS: Record<string, string> = {
  '0': '#00A884', '1': '#53BDEB', '2': '#FF9500', '3': '#FF2D55',
  '4': '#A78BFA', '5': '#34D399', '10': '#22C55E', '11': '#EF4444',
  '15': '#3B82F6', '16': '#8B5CF6', '18': '#F59E0B', '19': '#10B981',
  default: '#6B7B8D',
};

function getLabelColor(color: string | null): string {
  if (!color) return LABEL_COLORS.default;
  if (color.startsWith('#')) return color;
  return LABEL_COLORS[color] || LABEL_COLORS.default;
}

export function WhatsAppLeadPanel({ lead, labels }: WhatsAppLeadPanelProps) {
  const [notes, setNotes] = useState(lead.notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('09:00');
  const [reminderNote, setReminderNote] = useState('');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    lead_name: lead.lead_name,
    phone: lead.phone || '',
    email: lead.email || '',
    company: lead.company || '',
    deal_value: lead.deal_value?.toString() || '0',
    stage: lead.stage,
    probability: lead.probability?.toString() || '0',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const queryClient = useQueryClient();
  const { data: stages } = usePipelineStages();
  const { data: reminders } = useLeadReminders(lead.id);
  const createReminder = useCreateReminder();
  const dismissReminder = useDismissReminder();
  const removeLabel = useRemoveLabel();

  useEffect(() => {
    setEditForm({
      lead_name: lead.lead_name,
      phone: lead.phone || '',
      email: lead.email || '',
      company: lead.company || '',
      deal_value: lead.deal_value?.toString() || '0',
      stage: lead.stage,
      probability: lead.probability?.toString() || '0',
    });
    setNotes(lead.notes || '');
  }, [lead.id]);

  const initials = lead.lead_name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const stageColor = STAGE_COLORS[lead.stage] || 'bg-muted text-muted-foreground';

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from('sales_pipeline')
        .update({ notes })
        .eq('id', lead.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contacts'] });
      toast.success('Anotação salva');
    } catch {
      toast.error('Erro ao salvar anotação');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCreateReminder = () => {
    if (!reminderDate) {
      toast.error('Selecione uma data');
      return;
    }
    const remindAt = `${reminderDate}T${reminderTime}:00`;
    createReminder.mutate(
      { leadId: lead.id, remindAt, note: reminderNote || undefined },
      {
        onSuccess: () => {
          setReminderDate('');
          setReminderTime('09:00');
          setReminderNote('');
          setReminderOpen(false);
        },
      }
    );
  };

  const handleRemoveLabel = (labelId: string) => {
    removeLabel.mutate({ leadId: lead.id, labelId });
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('sales_pipeline')
        .update({
          lead_name: editForm.lead_name,
          phone: editForm.phone || null,
          email: editForm.email || null,
          company: editForm.company || null,
          deal_value: parseFloat(editForm.deal_value) || 0,
          stage: editForm.stage as any,
          probability: parseInt(editForm.probability) || 0,
        })
        .eq('id', lead.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contacts'] });
      toast.success('Perfil atualizado');
      setEditing(false);
    } catch {
      toast.error('Erro ao atualizar perfil');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="w-[300px] flex-shrink-0 border-l border-border bg-background flex flex-col overflow-y-auto">
      {/* Avatar + name */}
      <div className="flex flex-col items-center pt-8 pb-5 px-4 border-b border-border">
        {lead.avatar_url ? (
          <img
            src={lead.avatar_url}
            alt={lead.lead_name}
            className="h-20 w-20 rounded-full object-cover mb-3"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center text-2xl font-semibold text-muted-foreground mb-3">
            {initials}
          </div>
        )}
        <h3 className="font-semibold text-base text-center">{lead.lead_name}</h3>
        {lead.phone && (
          <p className="text-sm text-muted-foreground mt-0.5">{lead.phone}</p>
        )}
        <span className={cn('mt-2 text-xs font-medium px-2.5 py-0.5 rounded-full', stageColor)}>
          {lead.stage}
        </span>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
        <div className="flex flex-col items-center gap-1.5 py-3.5 text-xs text-muted-foreground relative">
          <WhatsAppLabelManager leadId={lead.id} currentLabels={labels} />
          <span className="pointer-events-none">Tags</span>
        </div>
        <Popover open={reminderOpen} onOpenChange={setReminderOpen}>
          <PopoverTrigger asChild>
            <button className="flex flex-col items-center gap-1.5 py-3.5 hover:bg-muted/50 transition-colors text-xs text-muted-foreground hover:text-foreground relative">
              <Bell className="h-4 w-4" />
              Lembrete
              {reminders && reminders.length > 0 && (
                <span className="absolute top-2 right-4 h-2 w-2 rounded-full bg-primary" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-3">
            <p className="text-xs font-semibold text-foreground mb-2">Novo Lembrete</p>
            <div className="space-y-2">
              <Input
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                className="text-xs h-8"
                min={new Date().toISOString().split('T')[0]}
              />
              <Input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="text-xs h-8"
              />
              <Input
                placeholder="Nota (opcional)"
                value={reminderNote}
                onChange={(e) => setReminderNote(e.target.value)}
                className="text-xs h-8"
              />
              <Button
                size="sm"
                className="w-full h-7 text-xs"
                onClick={handleCreateReminder}
                disabled={createReminder.isPending}
              >
                {createReminder.isPending ? 'Criando...' : 'Criar Lembrete'}
              </Button>
            </div>

            {reminders && reminders.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border space-y-2">
                <p className="text-xs font-semibold text-foreground">Lembretes ativos</p>
                {reminders.map((r) => (
                  <div key={r.id} className="flex items-start gap-2 text-xs bg-muted/40 rounded-md p-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">
                        {format(new Date(r.remind_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                      {r.note && <p className="text-muted-foreground truncate">{r.note}</p>}
                    </div>
                    <button
                      onClick={() => dismissReminder.mutate({ id: r.id, leadId: lead.id })}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Tags */}
      {labels.length > 0 && (
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-semibold text-foreground mb-2">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {labels.map((label) => (
              <span
                key={label.id}
                className="text-xs px-2 py-0.5 rounded-full text-white font-medium inline-flex items-center gap-1 group"
                style={{ backgroundColor: getLabelColor(label.color) }}
              >
                {label.name}
                <button
                  onClick={() => handleRemoveLabel(label.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/20 rounded-full p-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Anotações */}
      <div className="px-4 py-3 border-b border-border">
        <p className="text-xs font-semibold text-foreground mb-2">Anotações</p>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Adicione uma nota sobre este contato..."
          className="text-sm resize-none min-h-[80px] bg-muted/30 border-border/60"
          rows={3}
        />
        {notes !== (lead.notes || '') && (
          <Button
            size="sm"
            className="mt-2 w-full h-7 text-xs"
            onClick={saveNotes}
            disabled={savingNotes}
          >
            {savingNotes ? 'Salvando...' : 'Salvar'}
          </Button>
        )}
      </div>

      {/* Informações do Lead */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-foreground">Informações do Lead</p>
          {editing ? (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setEditing(false);
                  setEditForm({
                    lead_name: lead.lead_name,
                    phone: lead.phone || '',
                    email: lead.email || '',
                    company: lead.company || '',
                    deal_value: lead.deal_value?.toString() || '0',
                    stage: lead.stage,
                    probability: lead.probability?.toString() || '0',
                  });
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-primary hover:text-primary"
                onClick={saveProfile}
                disabled={savingProfile}
              >
                <CheckIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {editing ? (
          <div className="space-y-2.5">
            <div>
              <label className="text-[10px] text-muted-foreground mb-0.5 block">Nome</label>
              <Input
                value={editForm.lead_name}
                onChange={(e) => setEditForm({ ...editForm, lead_name: e.target.value })}
                className="h-7 text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-0.5 block">Telefone</label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="h-7 text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-0.5 block">E-mail</label>
              <Input
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="h-7 text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-0.5 block">Empresa</label>
              <Input
                value={editForm.company}
                onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                className="h-7 text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-0.5 block">Valor Estimado</label>
              <Input
                type="number"
                value={editForm.deal_value}
                onChange={(e) => setEditForm({ ...editForm, deal_value: e.target.value })}
                className="h-7 text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-0.5 block">Etapa</label>
              <Select value={editForm.stage} onValueChange={(v: string) => setEditForm({ ...editForm, stage: v as any })}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages?.map((s) => (
                    <SelectItem key={s.id} value={s.name} className="text-xs">
                      {s.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-0.5 block">Probabilidade (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={editForm.probability}
                onChange={(e) => setEditForm({ ...editForm, probability: e.target.value })}
                className="h-7 text-xs"
              />
            </div>
          </div>
        ) : (
          <dl className="space-y-2">
            <div className="flex justify-between items-center">
              <dt className="text-xs text-muted-foreground">Etapa</dt>
              <dd className="text-xs font-medium text-right">{lead.stage}</dd>
            </div>
            {lead.deal_value ? (
              <div className="flex justify-between items-center">
                <dt className="text-xs text-muted-foreground">Valor Estimado</dt>
                <dd className="text-xs font-medium">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.deal_value)}
                </dd>
              </div>
            ) : null}
            {lead.company && (
              <div className="flex justify-between items-center">
                <dt className="text-xs text-muted-foreground">Empresa</dt>
                <dd className="text-xs font-medium text-right truncate max-w-[140px]">{lead.company}</dd>
              </div>
            )}
            {lead.email && (
              <div className="flex justify-between items-center">
                <dt className="text-xs text-muted-foreground">E-mail</dt>
                <dd className="text-xs font-medium text-right truncate max-w-[140px]">{lead.email}</dd>
              </div>
            )}
            <div className="flex justify-between items-center">
              <dt className="text-xs text-muted-foreground">Criado em</dt>
              <dd className="text-xs font-medium">
                {format(new Date(lead.created_at), 'dd/MM/yyyy', { locale: ptBR })}
              </dd>
            </div>
            {lead.probability != null && (
              <div className="flex justify-between items-center">
                <dt className="text-xs text-muted-foreground">Probabilidade</dt>
                <dd className="text-xs font-medium">{lead.probability}%</dd>
              </div>
            )}
          </dl>
        )}
      </div>
    </div>
  );
}
