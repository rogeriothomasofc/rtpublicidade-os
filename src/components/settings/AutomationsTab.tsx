import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Plus, Zap, ArrowRight, Activity, Play, Clock,
  MessageSquare, Bell, Users, MoreHorizontal, Pencil, Copy, Trash2, History,
} from 'lucide-react';
import { useAutomationRules, useCreateAutomationRule, useUpdateAutomationRule, useDeleteAutomationRule, type AutomationRule } from '@/hooks/useAutomationRules';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── Constants ──────────────────────────────────────────────────────────────

const TRIGGER_TYPES = [
  { value: 'pipeline_stage_change', label: 'Mudança de estágio no Pipeline' },
  { value: 'task_status_change', label: 'Mudança de status da Tarefa' },
  { value: 'client_status_change', label: 'Mudança de status do Cliente' },
  { value: 'finance_status_change', label: 'Mudança de status Financeiro' },
  { value: 'task_created', label: 'Tarefa criada' },
  { value: 'client_created', label: 'Cliente criado' },
  { value: 'new_conversation', label: 'Nova conversa iniciada' },
  { value: 'tag_applied', label: 'Tag aplicada' },
  { value: 'no_response', label: 'Sem resposta (tempo definido)' },
  { value: 'lead_created', label: 'Lead criado' },
  { value: 'finance_due_soon', label: 'Financeiro próximo do vencimento' },
];

const ACTION_TYPES = [
  { value: 'create_task', label: 'Criar Tarefa' },
  { value: 'create_finance', label: 'Criar Lançamento Financeiro' },
  { value: 'create_contract', label: 'Criar Contrato' },
  { value: 'send_notification', label: 'Enviar Notificação' },
  { value: 'send_message', label: 'Enviar Mensagem' },
  { value: 'move_pipeline_stage', label: 'Mover Etapa do Pipeline' },
  { value: 'assign_user', label: 'Atribuir Responsável' },
  { value: 'update_status', label: 'Atualizar Status' },
  { value: 'create_client', label: 'Criar Cliente' },
  { value: 'create_lead', label: 'Criar Lead' },
];

const PIPELINE_STAGES = ['Novo', 'Contatado', 'Proposta', 'Ganho', 'Perdido'];
const TASK_STATUSES = ['A Fazer', 'Fazendo', 'Atrasado', 'Concluído'];
const CLIENT_STATUSES = ['Lead', 'Ativo', 'Pausado', 'Cancelado'];
const FINANCE_STATUSES = ['Pendente', 'Pago', 'Atrasado'];
const TASK_PRIORITIES = ['Baixa', 'Média', 'Alta', 'Urgente'];
const TASK_TYPES = ['Campanha', 'Criativo', 'Relatório', 'Onboarding', 'Otimização', 'Outro'];

// ─── Templates ───────────────────────────────────────────────────────────────

const TEMPLATES = [
  {
    icon: Users,
    iconBg: 'bg-blue-500',
    title: 'Lead automático',
    description: 'Crie leads automaticamente para novas conversas',
    trigger_type: 'new_conversation',
    trigger_config: {},
    action_type: 'create_lead',
    action_config: {},
  },
  {
    icon: MessageSquare,
    iconBg: 'bg-green-500',
    title: 'Resposta rápida',
    description: 'Envie respostas automáticas baseadas em palavras-chave',
    trigger_type: 'tag_applied',
    trigger_config: {},
    action_type: 'send_message',
    action_config: {},
  },
  {
    icon: Bell,
    iconBg: 'bg-amber-500',
    title: 'Alerta de follow-up',
    description: 'Receba alertas para conversas sem resposta',
    trigger_type: 'no_response',
    trigger_config: {},
    action_type: 'send_notification',
    action_config: {},
  },
  {
    icon: ArrowRight,
    iconBg: 'bg-primary',
    title: 'Pipeline automático',
    description: 'Mova leads automaticamente entre etapas',
    trigger_type: 'tag_applied',
    trigger_config: {},
    action_type: 'move_pipeline_stage',
    action_config: {},
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTriggerLabel(type: string) {
  return TRIGGER_TYPES.find(t => t.value === type)?.label || type;
}
function getActionLabel(type: string) {
  return ACTION_TYPES.find(a => a.value === type)?.label || type;
}
function getRelativeTime(dateStr: string) {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
}

// ─── Trigger Config Fields ────────────────────────────────────────────────────

function TriggerConfigFields({ triggerType, config, onChange }: { triggerType: string; config: Record<string, any>; onChange: (c: Record<string, any>) => void }) {
  if (triggerType === 'pipeline_stage_change') {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">De estágio</Label>
          <Select value={config.from_stage || ''} onValueChange={v => onChange({ ...config, from_stage: v })}>
            <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
            <SelectContent>{PIPELINE_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Para estágio</Label>
          <Select value={config.to_stage || ''} onValueChange={v => onChange({ ...config, to_stage: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{PIPELINE_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
    );
  }
  if (triggerType === 'task_status_change') {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">De status</Label>
          <Select value={config.from_status || ''} onValueChange={v => onChange({ ...config, from_status: v })}>
            <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
            <SelectContent>{TASK_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Para status</Label>
          <Select value={config.to_status || ''} onValueChange={v => onChange({ ...config, to_status: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{TASK_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
    );
  }
  if (triggerType === 'client_status_change') {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">De status</Label>
          <Select value={config.from_status || ''} onValueChange={v => onChange({ ...config, from_status: v })}>
            <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
            <SelectContent>{CLIENT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Para status</Label>
          <Select value={config.to_status || ''} onValueChange={v => onChange({ ...config, to_status: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{CLIENT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
    );
  }
  if (triggerType === 'finance_status_change') {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">De status</Label>
          <Select value={config.from_status || ''} onValueChange={v => onChange({ ...config, from_status: v })}>
            <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
            <SelectContent>{FINANCE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Para status</Label>
          <Select value={config.to_status || ''} onValueChange={v => onChange({ ...config, to_status: v })}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{FINANCE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
    );
  }
  if (triggerType === 'no_response') {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs">Horas sem resposta</Label>
        <Input type="number" value={config.hours || ''} onChange={e => onChange({ ...config, hours: parseInt(e.target.value) || 24 })} placeholder="24" />
      </div>
    );
  }
  if (triggerType === 'tag_applied') {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs">Nome da tag</Label>
        <Input value={config.tag_name || ''} onChange={e => onChange({ ...config, tag_name: e.target.value })} placeholder="Ex: Qualificado" />
      </div>
    );
  }
  return null;
}

// ─── Action Config Fields ─────────────────────────────────────────────────────

function ActionConfigFields({ actionType, config, onChange }: { actionType: string; config: Record<string, any>; onChange: (c: Record<string, any>) => void }) {
  if (actionType === 'create_task') {
    return (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Título da tarefa</Label>
          <Input value={config.task_title || ''} onChange={e => onChange({ ...config, task_title: e.target.value })} placeholder="Ex: Onboarding do cliente" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Prioridade</Label>
            <Select value={config.priority || 'Média'} onValueChange={v => onChange({ ...config, priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TASK_PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo</Label>
            <Select value={config.type || 'Outro'} onValueChange={v => onChange({ ...config, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TASK_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Prazo (dias após gatilho)</Label>
          <Input type="number" value={config.due_days || ''} onChange={e => onChange({ ...config, due_days: parseInt(e.target.value) || 0 })} placeholder="30" />
        </div>
      </div>
    );
  }
  if (actionType === 'create_finance') {
    return (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Descrição</Label>
          <Input value={config.description || ''} onChange={e => onChange({ ...config, description: e.target.value })} placeholder="Ex: Mensalidade" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Valor (R$)</Label>
            <Input type="number" value={config.amount || ''} onChange={e => onChange({ ...config, amount: parseFloat(e.target.value) || 0 })} placeholder="0.00" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo</Label>
            <Select value={config.finance_type || 'Receita'} onValueChange={v => onChange({ ...config, finance_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Receita">Receita</SelectItem>
                <SelectItem value="Despesa">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );
  }
  if (actionType === 'send_notification') {
    return (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Título da notificação</Label>
          <Input value={config.notification_title || ''} onChange={e => onChange({ ...config, notification_title: e.target.value })} placeholder="Ex: Novo cliente convertido!" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Mensagem</Label>
          <Textarea value={config.notification_message || ''} onChange={e => onChange({ ...config, notification_message: e.target.value })} placeholder="Mensagem da notificação..." rows={2} />
        </div>
      </div>
    );
  }
  if (actionType === 'send_message') {
    return (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Mensagem</Label>
          <Textarea value={config.message || ''} onChange={e => onChange({ ...config, message: e.target.value })} placeholder="Olá! Vi que você iniciou uma conversa..." rows={3} />
        </div>
      </div>
    );
  }
  if (actionType === 'create_contract') {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Valor do contrato (R$)</Label>
            <Input type="number" value={config.value || ''} onChange={e => onChange({ ...config, value: parseFloat(e.target.value) || 0 })} placeholder="0.00" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Duração (meses)</Label>
            <Input type="number" value={config.duration_months || ''} onChange={e => onChange({ ...config, duration_months: parseInt(e.target.value) || 12 })} placeholder="12" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Descrição</Label>
          <Input value={config.description || ''} onChange={e => onChange({ ...config, description: e.target.value })} placeholder="Ex: Contrato de gestão de tráfego" />
        </div>
      </div>
    );
  }
  if (actionType === 'move_pipeline_stage') {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs">Mover para etapa</Label>
        <Select value={config.to_stage || ''} onValueChange={v => onChange({ ...config, to_stage: v })}>
          <SelectTrigger><SelectValue placeholder="Selecione a etapa" /></SelectTrigger>
          <SelectContent>{PIPELINE_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    );
  }
  if (actionType === 'update_status') {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs">Novo status</Label>
        <Input value={config.new_status || ''} onChange={e => onChange({ ...config, new_status: e.target.value })} placeholder="Ex: Ativo" />
      </div>
    );
  }
  return null;
}

// ─── Trigger Icon ─────────────────────────────────────────────────────────────

function getTriggerIcon(type: string) {
  const map: Record<string, React.ReactNode> = {
    pipeline_stage_change: <ArrowRight className="w-4 h-4" />,
    task_status_change: <Activity className="w-4 h-4" />,
    client_status_change: <Users className="w-4 h-4" />,
    new_conversation: <MessageSquare className="w-4 h-4" />,
    tag_applied: <ArrowRight className="w-4 h-4" />,
    no_response: <Clock className="w-4 h-4" />,
    lead_created: <Users className="w-4 h-4" />,
    finance_due_soon: <Bell className="w-4 h-4" />,
    finance_status_change: <Activity className="w-4 h-4" />,
    task_created: <Activity className="w-4 h-4" />,
    client_created: <Users className="w-4 h-4" />,
  };
  return map[type] ?? <Zap className="w-4 h-4" />;
}

// ─── Form State ───────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  description: string;
  trigger_type: string;
  trigger_config: Record<string, any>;
  action_type: string;
  action_config: Record<string, any>;
  is_active: boolean;
}

const emptyForm: FormState = {
  name: '',
  description: '',
  trigger_type: '',
  trigger_config: {},
  action_type: '',
  action_config: {},
  is_active: true,
};

// ─── Automation Row ───────────────────────────────────────────────────────────

function AutomationRow({ rule, onEdit, onDuplicate }: { rule: AutomationRule; onEdit: (r: AutomationRule) => void; onDuplicate: (r: AutomationRule) => void }) {
  const updateRule = useUpdateAutomationRule();
  const deleteRule = useDeleteAutomationRule();

  return (
    <div className="flex items-center gap-4 px-4 py-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      {/* Icon */}
      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
        {getTriggerIcon(rule.trigger_type)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold text-sm">{rule.name}</span>
          <Badge
            variant={rule.is_active ? 'default' : 'secondary'}
            className={`text-[10px] px-1.5 py-0 ${rule.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0' : ''}`}
          >
            {rule.is_active ? 'Ativa' : 'Pausada'}
          </Badge>
        </div>
        {rule.description && (
          <p className="text-xs text-muted-foreground truncate">{rule.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
          {rule.execution_count > 0 && (
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3" />
              {rule.execution_count} execuções
            </span>
          )}
          {rule.last_executed_at && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Última: {getRelativeTime(rule.last_executed_at)}
            </span>
          )}
        </div>
      </div>

      {/* Flow pill */}
      <div className="hidden md:flex items-center gap-1.5 shrink-0">
        <span className="text-xs bg-muted px-2.5 py-1 rounded-full border border-border font-medium">
          {getTriggerLabel(rule.trigger_type)}
        </span>
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs bg-muted px-2.5 py-1 rounded-full border border-border font-medium">
          {getActionLabel(rule.action_type)}
        </span>
      </div>

      {/* Toggle */}
      <Switch
        checked={rule.is_active}
        onCheckedChange={(checked) => updateRule.mutate({ id: rule.id, is_active: checked })}
        className="shrink-0"
      />

      {/* Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={() => onEdit(rule)}>
            <Pencil className="w-3.5 h-3.5 mr-2" /> Editar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDuplicate(rule)}>
            <Copy className="w-3.5 h-3.5 mr-2" /> Duplicar
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <History className="w-3.5 h-3.5 mr-2" /> Ver histórico
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem
                onSelect={e => e.preventDefault()}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir automação?</AlertDialogTitle>
                <AlertDialogDescription>
                  A automação "{rule.name}" será excluída permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteRule.mutate(rule.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export function AutomationsTab() {
  const { data: rules = [], isLoading } = useAutomationRules();
  const createRule = useCreateAutomationRule();
  const updateRule = useUpdateAutomationRule();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const activeCount = rules.filter(r => r.is_active).length;
  const totalExecutions = rules.reduce((acc, r) => acc + r.execution_count, 0);

  const openNew = (preset?: Partial<FormState>) => {
    setEditingRule(null);
    setForm({ ...emptyForm, ...preset });
    setDialogOpen(true);
  };

  const openEdit = (rule: AutomationRule) => {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      description: rule.description || '',
      trigger_type: rule.trigger_type,
      trigger_config: rule.trigger_config,
      action_type: rule.action_type,
      action_config: rule.action_config,
      is_active: rule.is_active,
    });
    setDialogOpen(true);
  };

  const handleDuplicate = (rule: AutomationRule) => {
    openNew({
      name: `${rule.name} (cópia)`,
      description: rule.description || '',
      trigger_type: rule.trigger_type,
      trigger_config: rule.trigger_config,
      action_type: rule.action_type,
      action_config: rule.action_config,
      is_active: false,
    });
  };

  const handleSave = () => {
    if (!form.name || !form.trigger_type || !form.action_type) return;

    const payload = {
      name: form.name,
      description: form.description || null,
      trigger_type: form.trigger_type,
      trigger_config: form.trigger_config,
      action_type: form.action_type,
      action_config: form.action_config,
      is_active: form.is_active,
    };

    if (editingRule) {
      updateRule.mutate({ id: editingRule.id, ...payload }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createRule.mutate(payload, { onSuccess: () => setDialogOpen(false) });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Automações</h2>
          <p className="text-sm text-muted-foreground">Configure fluxos automáticos para sua equipe</p>
        </div>
        <Button onClick={() => openNew()} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          Nova automação
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
              <Play className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">{activeCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Automações ativas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">{totalExecutions.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Execuções este mês</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">{Math.round(totalExecutions * 0.3 / 60)}h</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tempo economizado</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Templates */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Começar com um template</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {TEMPLATES.map((tpl) => {
            const Icon = tpl.icon;
            return (
              <button
                key={tpl.title}
                onClick={() => openNew({
                  name: tpl.title,
                  trigger_type: tpl.trigger_type,
                  trigger_config: tpl.trigger_config,
                  action_type: tpl.action_type,
                  action_config: tpl.action_config,
                })}
                className="flex flex-col gap-3 p-4 border border-border rounded-xl bg-card hover:bg-muted/50 hover:border-primary/40 transition-all text-left"
              >
                <div className={`h-10 w-10 rounded-lg ${tpl.iconBg} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight">{tpl.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">{tpl.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Rules List */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Suas automações</h3>
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="text-sm text-muted-foreground py-10 text-center">Carregando automações...</div>
          ) : rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                <Zap className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium">Nenhuma automação configurada</p>
              <p className="text-xs text-muted-foreground mt-1">Crie regras ou use um template acima.</p>
              <Button onClick={() => openNew()} variant="outline" size="sm" className="mt-4 gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Criar automação
              </Button>
            </div>
          ) : (
            <div>
              {rules.map(rule => (
                <AutomationRow key={rule.id} rule={rule} onEdit={openEdit} onDuplicate={handleDuplicate} />
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Editar Automação' : 'Nova Automação'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Converter lead ganho em cliente" />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição (opcional)</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descreva o que essa automação faz..." rows={2} />
            </div>

            <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quando (Gatilho)</p>
              <Select value={form.trigger_type} onValueChange={v => setForm(f => ({ ...f, trigger_type: v, trigger_config: {} }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o gatilho" /></SelectTrigger>
                <SelectContent>{TRIGGER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
              <TriggerConfigFields
                triggerType={form.trigger_type}
                config={form.trigger_config}
                onChange={c => setForm(f => ({ ...f, trigger_config: c }))}
              />
            </div>

            <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Então (Ação)</p>
              <Select value={form.action_type} onValueChange={v => setForm(f => ({ ...f, action_type: v, action_config: {} }))}>
                <SelectTrigger><SelectValue placeholder="Selecione a ação" /></SelectTrigger>
                <SelectContent>{ACTION_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
              </Select>
              <ActionConfigFields
                actionType={form.action_type}
                config={form.action_config}
                onChange={c => setForm(f => ({ ...f, action_config: c }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.trigger_type || !form.action_type}>
              {editingRule ? 'Salvar alterações' : 'Criar Automação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
