import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { BarChart2, Loader2, Save, Clock, ChevronDown, Eye, EyeOff, Plus, Trash2, ChevronUp } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const RESULT_TYPES = [
  { label: 'Leads', types: ['lead', 'onsite_conversion.lead_grouped'] },
  { label: 'Conversas iniciadas', types: ['onsite_conversion.messaging_conversation_started_7d', 'onsite_conversion.messaging_first_reply'] },
  { label: 'Compras', types: ['purchase', 'offsite_conversion.fb_pixel_purchase'] },
  { label: 'Cadastros', types: ['complete_registration', 'offsite_conversion.fb_pixel_complete_registration'] },
  { label: 'Cliques no link', types: ['link_click'] },
] as const;

type ResultTypeLabel = (typeof RESULT_TYPES)[number]['label'];
type Period = '7d' | '30d' | 'current_month' | 'last_month';

const PERIOD_OPTIONS: { value: Period; label: string; reportLabel: string }[] = [
  { value: '7d',            label: 'Últimos 7 dias',  reportLabel: 'Últimos 7 Dias' },
  { value: '30d',           label: 'Últimos 30 dias', reportLabel: 'Últimos 30 Dias' },
  { value: 'current_month', label: 'Mês atual',       reportLabel: 'Mensal' },
  { value: 'last_month',    label: 'Mês anterior',    reportLabel: 'Mês Anterior' },
];

interface ReportConfig {
  id?: string;
  client_id: string;
  config_name: string;
  enabled: boolean;
  include_campaigns: boolean;
  include_sales: boolean;
  top_creatives: number;
  result_type: ResultTypeLabel;
  include_ai: boolean;
  ai_context: string | null;
  frequency: 'daily' | 'weekly' | 'monthly';
  day_of_week: number | null;
  day_of_month: number | null;
  send_hour: number;
  next_send_at: string | null;
  last_sent_at: string | null;
  period: Period;
  intro_text: string | null;
}

const DAYS_OF_WEEK = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function makeDefault(clientId: string): ReportConfig {
  return {
    client_id: clientId,
    config_name: 'Relatório',
    enabled: true,
    include_campaigns: true,
    include_sales: true,
    top_creatives: 0,
    result_type: 'Conversas iniciadas',
    include_ai: true,
    ai_context: '',
    frequency: 'weekly',
    day_of_week: 1,
    day_of_month: 1,
    send_hour: 9,
    next_send_at: null,
    last_sent_at: null,
    period: '7d',
    intro_text: null,
  };
}

function calcNextSendAt(cfg: Partial<ReportConfig>): string {
  const now = new Date();
  const hour = cfg.send_hour ?? 9;
  let next = new Date();
  next.setMinutes(0, 0, 0);
  next.setHours(hour);

  if (cfg.frequency === 'daily') {
    if (next <= now) next.setDate(next.getDate() + 1);
  } else if (cfg.frequency === 'weekly') {
    const dow = cfg.day_of_week ?? 1;
    const diff = (dow - now.getDay() + 7) % 7;
    next.setDate(now.getDate() + (diff === 0 && next <= now ? 7 : diff));
  } else {
    const dom = cfg.day_of_month ?? 1;
    next.setDate(dom);
    if (next <= now) next.setMonth(next.getMonth() + 1);
  }
  return next.toISOString();
}

function getPeriodDateRange(period: Period): string {
  const today = new Date();
  const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  if (period === '7d') {
    const from = new Date(today); from.setDate(today.getDate() - 7);
    return `${fmt(from)} a ${fmt(today)}`;
  }
  if (period === '30d') {
    const from = new Date(today); from.setDate(today.getDate() - 30);
    return `${fmt(from)} a ${fmt(today)}`;
  }
  if (period === 'current_month') {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return `${fmt(from)} a ${fmt(today)}`;
  }
  const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const to   = new Date(today.getFullYear(), today.getMonth(), 0);
  return `${fmt(from)} a ${fmt(to)}`;
}

function MessagePreview({ form, clientName }: { form: ReportConfig; clientName?: string }) {
  const periodOption = PERIOD_OPTIONS.find(p => p.value === form.period) ?? PERIOD_OPTIONS[0];
  const dateRange = getPeriodDateRange(form.period);
  const company = clientName || 'Cliente';
  const lines: string[] = [];

  lines.push(`📊 *Relatório ${periodOption.reportLabel}*`);
  lines.push(company);
  lines.push(`📅 ${dateRange}`);
  if (form.intro_text?.trim()) { lines.push(''); lines.push(form.intro_text.trim()); }
  if (form.include_campaigns) {
    lines.push(''); lines.push('📣 *Campanhas*');
    lines.push('Investido: R$ 1.200,00');
    lines.push(`Cliques: 850 | ${form.result_type}: 42`);
    lines.push('CPC: R$ 1,41 | CPA: R$ 28,57');
  }
  if (form.include_campaigns && form.top_creatives > 0) {
    lines.push(''); lines.push('🏆 *Melhores criativos*');
    if (form.top_creatives >= 1) lines.push('1️⃣ "Criativo A" — 22 conv | CPA R$ 25,00');
    if (form.top_creatives >= 2) lines.push('2️⃣ "Criativo B" — 13 conv | CPA R$ 31,00');
    if (form.top_creatives >= 3) lines.push('3️⃣ "Criativo C" — 7 conv | CPA R$ 40,00');
  }
  if (form.include_sales) {
    lines.push(''); lines.push('🛒 *Vendas registradas*');
    lines.push('18 vendas — Total: R$ 9.450,00');
  }
  if (form.include_ai) {
    lines.push(''); lines.push('🤖 *Análise da RT Publicidade*');
    lines.push('As campanhas apresentaram boa performance no período, com CPA dentro da meta. Recomendamos escalar o criativo A que teve o menor custo por conversão.');
  }
  lines.push(''); lines.push('_RT Publicidade_');

  return (
    <div className="rounded-xl bg-[#0b141a] p-3 font-mono text-xs leading-relaxed overflow-x-auto">
      <p className="text-[10px] text-zinc-500 mb-2 font-sans">Preview da mensagem WhatsApp</p>
      <div className="bg-[#202c33] rounded-lg p-3 max-w-sm inline-block text-left">
        {lines.map((line, i) => (
          <p key={i} className={`text-zinc-200 ${line === '' ? 'h-2' : ''}`}
            dangerouslySetInnerHTML={{ __html: line.replace(/\*(.*?)\*/g, '<strong>$1</strong>').replace(/_(.*?)_/g, '<em>$1</em>') || '&nbsp;' }} />
        ))}
        <p className="text-[10px] text-zinc-500 text-right mt-1">✓✓ agora</p>
      </div>
    </div>
  );
}

// ─── Single config form ───────────────────────────────────────────────────────

function ReportConfigForm({
  clientId,
  clientName,
  initialConfig,
  onSaved,
  onDeleted,
}: {
  clientId: string;
  clientName?: string;
  initialConfig: ReportConfig;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<ReportConfig>(initialConfig);
  const [dirty, setDirty] = useState(!initialConfig.id); // new records start dirty
  const [showPreview, setShowPreview] = useState(false);
  const [collapsed, setCollapsed] = useState(!!initialConfig.id); // existing start collapsed

  useEffect(() => { setForm(initialConfig); }, [initialConfig.id]);

  const set = (patch: Partial<ReportConfig>) => { setForm(f => ({ ...f, ...patch })); setDirty(true); };

  const save = useMutation({
    mutationFn: async () => {
      const next_send_at = calcNextSendAt(form);
      const payload = { ...form, next_send_at, ai_context: form.ai_context || null, intro_text: form.intro_text || null };
      if (form.id) {
        const { error } = await (supabase as any).from('client_report_configs').update(payload).eq('id', form.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('client_report_configs').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { setDirty(false); setCollapsed(true); toast({ title: 'Configuração salva!' }); onSaved(); },
    onError: (err: Error) => toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' }),
  });

  const del = useMutation({
    mutationFn: async () => {
      if (!form.id) return;
      const { error } = await (supabase as any).from('client_report_configs').delete().eq('id', form.id);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: 'Relatório removido.' }); onDeleted(); },
    onError: (err: Error) => toast({ title: 'Erro ao remover', description: err.message, variant: 'destructive' }),
  });

  const hasAnyMetric = form.include_campaigns || form.include_sales;
  const periodOption = PERIOD_OPTIONS.find(p => p.value === form.period) ?? PERIOD_OPTIONS[0];
  const freqLabel = form.frequency === 'daily' ? 'Diário' : form.frequency === 'weekly' ? `Semanal (${DAYS_OF_WEEK[form.day_of_week ?? 1]})` : `Mensal (dia ${form.day_of_month ?? 1})`;

  return (
    <Card className="border-border/50">
      {/* Header row */}
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Switch checked={form.enabled} onCheckedChange={v => set({ enabled: v })} />
          <div className="flex-1 min-w-0">
            {collapsed ? (
              <div>
                <p className="text-sm font-semibold truncate">{form.config_name}</p>
                <p className="text-xs text-muted-foreground">{periodOption.label} · {freqLabel} · {String(form.send_hour).padStart(2, '0')}h</p>
              </div>
            ) : (
              <Input
                value={form.config_name}
                onChange={e => set({ config_name: e.target.value })}
                className="h-8 text-sm font-semibold"
                placeholder="Nome do relatório"
              />
            )}
          </div>
          <div className="flex items-center gap-1">
            {form.last_sent_at && collapsed && (
              <span className="text-xs text-muted-foreground hidden sm:block">
                Enviado {formatDistanceToNow(new Date(form.last_sent_at), { addSuffix: true, locale: ptBR })}
              </span>
            )}
            <Badge variant={form.enabled ? 'default' : 'secondary'} className="text-[10px] px-1.5">
              {form.enabled ? 'Ativo' : 'Pausado'}
            </Badge>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setCollapsed(c => !c)}>
              {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        {!collapsed && form.last_sent_at && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3" />
            Último envio: {formatDistanceToNow(new Date(form.last_sent_at), { addSuffix: true, locale: ptBR })}
            <span className="opacity-60">({format(new Date(form.last_sent_at), 'dd/MM HH:mm')})</span>
          </p>
        )}
        {!collapsed && form.next_send_at && form.enabled && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Próximo envio: {format(new Date(form.next_send_at), "dd/MM/yyyy 'às' HH'h'", { locale: ptBR })}
          </p>
        )}
      </CardHeader>

      {!collapsed && (
        <CardContent className="space-y-5">
          {/* Período */}
          <div className="flex items-center gap-3">
            <Label className="text-sm font-semibold shrink-0">Período dos dados</Label>
            <Select value={form.period} onValueChange={v => set({ period: v as Period })}>
              <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Introdução */}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Introdução da mensagem</Label>
            <Textarea
              placeholder="Ex: Olá! Segue o relatório de performance da semana."
              value={form.intro_text ?? ''}
              onChange={e => set({ intro_text: e.target.value })}
              className="text-sm resize-none h-14"
            />
          </div>

          {/* Métricas */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">Métricas incluídas</Label>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <Switch id={`campaigns-${form.id}`} checked={form.include_campaigns} onCheckedChange={v => set({ include_campaigns: v })} />
                <Label htmlFor={`campaigns-${form.id}`} className="text-sm font-normal cursor-pointer">Campanhas (investimento, cliques, conversões)</Label>
              </div>
              <div className="flex items-center gap-2.5">
                <Switch id={`sales-${form.id}`} checked={form.include_sales} onCheckedChange={v => set({ include_sales: v })} />
                <Label htmlFor={`sales-${form.id}`} className="text-sm font-normal cursor-pointer">Vendas registradas no painel</Label>
              </div>
            </div>
          </div>

          {/* Resultado principal */}
          {form.include_campaigns && (
            <div className="flex items-center gap-3">
              <Label className="text-sm font-semibold shrink-0">Resultado principal</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                    {form.result_type}<ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {RESULT_TYPES.map(r => (
                    <DropdownMenuItem key={r.label} onClick={() => set({ result_type: r.label })}
                      className={form.result_type === r.label ? 'bg-muted' : ''}>{r.label}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Criativos */}
          <div className="flex items-center gap-3">
            <Label className="text-sm font-semibold shrink-0">Melhores criativos</Label>
            <Select value={String(form.top_creatives)} onValueChange={v => set({ top_creatives: Number(v) })}>
              <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Não incluir</SelectItem>
                <SelectItem value="1">Top 1</SelectItem>
                <SelectItem value="2">Top 2</SelectItem>
                <SelectItem value="3">Top 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* IA */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <Switch id={`ai-${form.id}`} checked={form.include_ai} onCheckedChange={v => set({ include_ai: v })} />
              <Label htmlFor={`ai-${form.id}`} className="text-sm font-semibold cursor-pointer">Resumo da IA</Label>
            </div>
            {form.include_ai && (
              <Textarea
                placeholder="Contexto extra pra IA (ex: meta é 50 vendas/mês, foco em custo por clique)..."
                value={form.ai_context ?? ''}
                onChange={e => set({ ai_context: e.target.value })}
                className="text-sm resize-none h-20"
              />
            )}
          </div>

          {/* Agendamento */}
          <div className="space-y-3 pt-1 border-t border-border">
            <Label className="text-sm font-semibold block">Agendamento</Label>
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[130px]">
                <Label className="text-xs text-muted-foreground mb-1.5 block">Frequência</Label>
                <Select value={form.frequency} onValueChange={v => set({ frequency: v as ReportConfig['frequency'] })}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diário</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.frequency === 'weekly' && (
                <div className="flex-1 min-w-[130px]">
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Dia da semana</Label>
                  <Select value={String(form.day_of_week ?? 1)} onValueChange={v => set({ day_of_week: Number(v) })}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {form.frequency === 'monthly' && (
                <div className="flex-1 min-w-[130px]">
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Dia do mês</Label>
                  <Select value={String(form.day_of_month ?? 1)} onValueChange={v => set({ day_of_month: Number(v) })}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                        <SelectItem key={d} value={String(d)}>Dia {d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex-1 min-w-[110px]">
                <Label className="text-xs text-muted-foreground mb-1.5 block">Horário</Label>
                <Select value={String(form.send_hour)} onValueChange={v => set({ send_hour: Number(v) })}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HOURS.map(h => <SelectItem key={h} value={String(h)}>{String(h).padStart(2, '0')}h</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="pt-1 border-t border-border space-y-3">
            <button type="button" onClick={() => setShowPreview(v => !v)}
              className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showPreview ? 'Ocultar preview' : 'Ver preview da mensagem'}
            </button>
            {showPreview && <MessagePreview form={form} clientName={clientName} />}
          </div>

          {!hasAnyMetric && (
            <p className="text-xs text-destructive">Selecione ao menos uma métrica para ativar o relatório.</p>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {dirty && (
              <Button size="sm" className="flex-1" onClick={() => save.mutate()} disabled={save.isPending || !hasAnyMetric}>
                {save.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar
              </Button>
            )}
            {form.id && (
              <Button size="sm" variant="outline" className="text-destructive hover:text-destructive"
                onClick={() => del.mutate()} disabled={del.isPending}>
                {del.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ClientReportCard({ clientId, clientName }: { clientId: string; clientName?: string }) {
  const qc = useQueryClient();
  const [newConfigs, setNewConfigs] = useState<ReportConfig[]>([]);

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['client_report_configs', clientId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('client_report_configs')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: true });
      return (data ?? []) as ReportConfig[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['client_report_configs', clientId] });
    setNewConfigs([]);
  };

  const addNew = () => {
    setNewConfigs(prev => [...prev, makeDefault(clientId)]);
  };

  if (isLoading) return null;

  const allConfigs = [...configs, ...newConfigs];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Relatórios Automáticos</h2>
          {allConfigs.length > 0 && (
            <Badge variant="secondary" className="text-xs">{allConfigs.length}</Badge>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={addNew} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Novo relatório
        </Button>
      </div>

      {allConfigs.length === 0 && (
        <Card className="border-dashed border-border/50">
          <CardContent className="py-10 text-center text-muted-foreground">
            <BarChart2 className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhum relatório configurado</p>
            <p className="text-xs mt-1">Clique em "Novo relatório" para começar</p>
          </CardContent>
        </Card>
      )}

      {configs.map(cfg => (
        <ReportConfigForm
          key={cfg.id}
          clientId={clientId}
          clientName={clientName}
          initialConfig={cfg}
          onSaved={refresh}
          onDeleted={refresh}
        />
      ))}

      {newConfigs.map((cfg, i) => (
        <ReportConfigForm
          key={`new-${i}`}
          clientId={clientId}
          clientName={clientName}
          initialConfig={cfg}
          onSaved={refresh}
          onDeleted={() => setNewConfigs(prev => prev.filter((_, j) => j !== i))}
        />
      ))}
    </div>
  );
}
