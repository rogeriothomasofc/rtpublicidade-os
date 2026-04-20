import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ShoppingCart, Loader2, Play, Clock, CheckCircle2, XCircle, Edit2, Check, X,
  AlertCircle, DollarSign, ChevronDown, ChevronUp, History,
} from 'lucide-react';

// Instagram icon
function IgIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

interface AutomationConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  threshold_days: number | null;
  cron_expression: string;
  last_run_at: string | null;
  last_run_status: string | null;
  last_run_summary: unknown;
}

interface RunLog {
  id: string;
  automation_id: string;
  run_at: string;
  status: 'success' | 'error';
  processed: number;
  summary: unknown;
}

const AUTOMATION_META: Record<string, {
  icon: React.ElementType;
  color: string;
  scheduleLabel: string;
  canRun: boolean;
  fnName: string;
}> = {
  'instagram-alert':  { icon: IgIcon,       color: 'text-pink-500',    scheduleLabel: 'A cada 3 dias às 9h',  canRun: true, fnName: 'instagram-alert-cron' },
  'vendas-alert':     { icon: ShoppingCart,  color: 'text-emerald-500', scheduleLabel: 'Todo dia às 9h',  canRun: true, fnName: 'vendas-alerta-cron' },
  'financeiro-alert': { icon: DollarSign,    color: 'text-amber-500',   scheduleLabel: 'Todo dia às 9h',  canRun: true, fnName: 'financeiro-alerta-cron' },
};

const VISIBLE_IDS = ['instagram-alert', 'vendas-alert', 'financeiro-alert'];

function useAutomations() {
  return useQuery({
    queryKey: ['automation_configs'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('automation_configs')
        .select('id, name, description, enabled, threshold_days, cron_expression, last_run_at, last_run_status')
        .order('id');
      if (error) throw new Error(error.message ?? JSON.stringify(error));
      return ((data ?? []) as AutomationConfig[]).filter(a => VISIBLE_IDS.includes(a.id));
    },
  });
}

function useRunLog(automationId: string | null) {
  return useQuery({
    queryKey: ['automation_run_log', automationId],
    enabled: !!automationId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('automation_run_log')
        .select('id, automation_id, run_at, status, processed, summary')
        .eq('automation_id', automationId)
        .order('run_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as RunLog[];
    },
  });
}

function useUpdateAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<AutomationConfig> }) => {
      const { error } = await (supabase as any).from('automation_configs').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automation_configs'] }),
  });
}

function useRunAutomation() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const meta = AUTOMATION_META[id];
      if (!meta?.fnName) throw new Error('Automação não suporta execução manual.');
      const { data, error } = await supabase.functions.invoke(meta.fnName, {
        headers: { 'x-cron-secret': '4a8f2ba802c6e9dc955fb095f4f1a3debb22a7a19164ffe2' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data, id) => {
      qc.invalidateQueries({ queryKey: ['automation_configs'] });
      qc.invalidateQueries({ queryKey: ['automation_run_log', id] });
      const processed = (data as Record<string, unknown>)?.processed ?? 0;
      toast({ title: 'Automação executada!', description: `${processed} cliente(s) processado(s).` });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao executar', description: err.message, variant: 'destructive' });
    },
  });
}

// ─── Run History Panel ────────────────────────────────────────────────────────

function RunHistory({ automationId }: { automationId: string }) {
  const { data: logs = [], isLoading } = useRunLog(automationId);

  if (isLoading) return <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>;
  if (!logs.length) return <p className="text-xs text-muted-foreground text-center py-4">Nenhuma execução registrada ainda.</p>;

  return (
    <div className="space-y-2">
      {logs.map(log => {
        const summary = log.summary as any[];
        const sent    = Array.isArray(summary) ? summary.filter((r: any) => r.sent).length : 0;
        const skipped = Array.isArray(summary) ? summary.filter((r: any) => r.skipped).length : 0;
        const errors  = Array.isArray(summary) ? summary.filter((r: any) => r.error).length : 0;

        return (
          <div key={log.id} className="flex items-start gap-3 text-xs border-b border-border/40 pb-2 last:border-0">
            <div className="mt-0.5 shrink-0">
              {log.status === 'success'
                ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                : <XCircle className="w-3.5 h-3.5 text-destructive" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{format(new Date(log.run_at), "dd/MM/yyyy 'às' HH:mm")}</span>
                <span className="text-muted-foreground">
                  {formatDistanceToNow(new Date(log.run_at), { addSuffix: true, locale: ptBR })}
                </span>
              </div>
              {log.status === 'success' ? (
                <p className="text-muted-foreground mt-0.5">
                  {log.processed} processado(s)
                  {sent > 0 && ` · ${sent} enviado(s)`}
                  {skipped > 0 && ` · ${skipped} ignorado(s)`}
                  {errors > 0 && ` · ${errors} erro(s)`}
                </p>
              ) : (
                <p className="text-destructive mt-0.5 truncate">
                  {Array.isArray(summary) && summary[0]?.error ? summary[0].error : 'Erro desconhecido'}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Automation Card ──────────────────────────────────────────────────────────

function AutomationCard({ a }: { a: AutomationConfig }) {
  const meta = AUTOMATION_META[a.id];
  const update = useUpdateAutomation();
  const run = useRunAutomation();
  const { toast } = useToast();

  const [editingThreshold, setEditingThreshold] = useState(false);
  const [thresholdValue, setThresholdValue] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  if (!meta) return null;
  const Icon = meta.icon;
  const isRunning = run.isPending && run.variables === a.id;

  const handleToggle = () => {
    update.mutate(
      { id: a.id, patch: { enabled: !a.enabled } },
      { onSuccess: () => toast({ title: a.enabled ? 'Automação pausada' : 'Automação ativada' }) }
    );
  };

  const handleSaveThreshold = () => {
    const val = parseInt(thresholdValue);
    if (isNaN(val) || val < 0) {
      toast({ title: 'Valor inválido', description: 'Mínimo 0 dias.', variant: 'destructive' });
      return;
    }
    update.mutate(
      { id: a.id, patch: { threshold_days: val } },
      { onSuccess: () => { setEditingThreshold(false); toast({ title: 'Threshold atualizado!' }); } }
    );
  };

  return (
    <Card className={`transition-opacity ${!a.enabled ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${a.enabled ? 'bg-primary/10' : 'bg-muted'}`}>
              <Icon className={`w-5 h-5 ${a.enabled ? meta.color : 'text-muted-foreground'}`} />
            </div>
            <div>
              <CardTitle className="text-base">{a.name}</CardTitle>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant={a.enabled ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                  {a.enabled ? 'Ativa' : 'Pausada'}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />{meta.scheduleLabel}
                </span>
              </div>
            </div>
          </div>
          <Switch checked={a.enabled} onCheckedChange={handleToggle} disabled={update.isPending} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{a.description}</p>

        {/* Threshold */}
        {a.threshold_days !== null && (
          <div className="flex items-center gap-2">
            <Label className="text-sm shrink-0">Disparar após</Label>
            {editingThreshold ? (
              <div className="flex items-center gap-1.5">
                <Input
                  type="number" min={0} value={thresholdValue}
                  onChange={e => setThresholdValue(e.target.value)}
                  className="h-7 w-16 text-sm" autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveThreshold(); if (e.key === 'Escape') setEditingThreshold(false); }}
                />
                <span className="text-sm text-muted-foreground">dias</span>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveThreshold} disabled={update.isPending}>
                  <Check className="w-3.5 h-3.5 text-green-500" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingThreshold(false)}>
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold">{a.threshold_days} dias</span>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditingThreshold(true); setThresholdValue(String(a.threshold_days ?? 0)); }}>
                  <Edit2 className="w-3 h-3 text-muted-foreground" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Último disparo + Executar */}
        <div className="flex items-center justify-between pt-1 border-t border-border">
          <div className="text-xs text-muted-foreground">
            {a.last_run_at ? (
              <span className="flex items-center gap-1.5">
                {a.last_run_status === 'success'
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  : <XCircle className="w-3.5 h-3.5 text-destructive" />}
                {formatDistanceToNow(new Date(a.last_run_at), { addSuffix: true, locale: ptBR })}
                <span className="opacity-60">({format(new Date(a.last_run_at), 'dd/MM HH:mm')})</span>
              </span>
            ) : (
              <span className="opacity-60">Nunca executada</span>
            )}
          </div>
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs"
            onClick={() => run.mutate(a.id)} disabled={!a.enabled || isRunning}>
            {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            {isRunning ? 'Executando…' : 'Executar agora'}
          </Button>
        </div>

        {/* Histórico colapsável */}
        <div className="border-t border-border pt-2">
          <button
            type="button"
            onClick={() => setShowHistory(v => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <History className="w-3.5 h-3.5" />
            Histórico de execuções
            {showHistory ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
          </button>
          {showHistory && (
            <div className="mt-3">
              <RunHistory automationId={a.id} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AutomationsPage() {
  const { data: automations, isLoading, isError, error } = useAutomations();

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Automações</h1>
          <p className="text-sm text-muted-foreground">
            Alertas automáticos enviados via WhatsApp e portal do cliente. Os relatórios são configurados individualmente em cada cliente.
          </p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Erro ao carregar automações</p>
              <p className="text-xs text-muted-foreground mt-0.5">{error instanceof Error ? error.message : JSON.stringify(error)}</p>
            </div>
          </div>
        )}

        {!isLoading && !isError && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {automations?.map(a => <AutomationCard key={a.id} a={a} />)}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          As mensagens são geradas automaticamente pela IA. Os relatórios de performance são configurados dentro de cada cliente (Meta Ads + Vendas). O horário de disparo é gerenciado via pg_cron.
        </p>
      </div>
    </MainLayout>
  );
}
