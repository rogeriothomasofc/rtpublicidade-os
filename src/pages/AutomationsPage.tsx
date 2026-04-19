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
  Instagram, ShoppingCart, BarChart2, Loader2, Play, Clock, CheckCircle2, XCircle, Edit2, Check, X,
} from 'lucide-react';

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

const AUTOMATION_META: Record<string, { icon: React.ElementType; color: string; scheduleLabel: string }> = {
  'instagram-alert': { icon: Instagram, color: 'text-pink-500', scheduleLabel: 'Todo dia às 9h' },
  'vendas-alert':    { icon: ShoppingCart, color: 'text-emerald-500', scheduleLabel: 'Todo dia às 9h' },
  'relatorio':       { icon: BarChart2,   color: 'text-blue-500',   scheduleLabel: 'A cada hora (por cliente)' },
};

function useAutomations() {
  return useQuery({
    queryKey: ['automation_configs'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('automation_configs')
        .select('*')
        .order('id');
      if (error) throw error;
      return (data ?? []) as AutomationConfig[];
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
      const fnName = id === 'instagram-alert' ? 'instagram-alert-cron' : 'vendas-alerta-cron';
      const { data, error } = await supabase.functions.invoke(fnName, {
        headers: { 'x-cron-secret': '4a8f2ba802c6e9dc955fb095f4f1a3debb22a7a19164ffe2' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data, id) => {
      qc.invalidateQueries({ queryKey: ['automation_configs'] });
      const processed = (data as Record<string, unknown>)?.processed ?? 0;
      toast({ title: 'Automação executada!', description: `${processed} cliente(s) processado(s).` });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao executar', description: err.message, variant: 'destructive' });
    },
  });
}

export default function AutomationsPage() {
  const { data: automations, isLoading } = useAutomations();
  const update = useUpdateAutomation();
  const run = useRunAutomation();
  const { toast } = useToast();

  const [editingThreshold, setEditingThreshold] = useState<string | null>(null);
  const [thresholdValue, setThresholdValue] = useState('');

  const handleToggle = (a: AutomationConfig) => {
    update.mutate(
      { id: a.id, patch: { enabled: !a.enabled } },
      { onSuccess: () => toast({ title: a.enabled ? 'Automação pausada' : 'Automação ativada' }) }
    );
  };

  const handleEditThreshold = (a: AutomationConfig) => {
    setEditingThreshold(a.id);
    setThresholdValue(String(a.threshold_days ?? ''));
  };

  const handleSaveThreshold = (id: string) => {
    const val = parseInt(thresholdValue);
    if (isNaN(val) || val < 1) {
      toast({ title: 'Valor inválido', description: 'Mínimo 1 dia.', variant: 'destructive' });
      return;
    }
    update.mutate(
      { id, patch: { threshold_days: val } },
      { onSuccess: () => { setEditingThreshold(null); toast({ title: 'Threshold atualizado!' }); } }
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Automações</h1>
          <p className="text-sm text-muted-foreground">Alertas automáticos enviados via WhatsApp e portal do cliente</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {automations?.map((a) => {
              const meta = AUTOMATION_META[a.id];
              const Icon = meta?.icon ?? Clock;
              const isRunning = run.isPending && run.variables === a.id;

              return (
                <Card key={a.id} className={`transition-opacity ${!a.enabled ? 'opacity-60' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${a.enabled ? 'bg-primary/10' : 'bg-muted'}`}>
                          <Icon className={`w-5 h-5 ${a.enabled ? (meta?.color ?? 'text-primary') : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <CardTitle className="text-base">{a.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant={a.enabled ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                              {a.enabled ? 'Ativa' : 'Pausada'}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {meta?.scheduleLabel ?? a.cron_expression}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Switch checked={a.enabled} onCheckedChange={() => handleToggle(a)} disabled={update.isPending} />
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{a.description}</p>

                    {/* Threshold */}
                    {a.threshold_days !== null && (
                      <div className="flex items-center gap-2">
                        <Label className="text-sm shrink-0">Disparar após</Label>
                        {editingThreshold === a.id ? (
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              min={1}
                              value={thresholdValue}
                              onChange={(e) => setThresholdValue(e.target.value)}
                              className="h-7 w-16 text-sm"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveThreshold(a.id);
                                if (e.key === 'Escape') setEditingThreshold(null);
                              }}
                            />
                            <span className="text-sm text-muted-foreground">dias</span>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSaveThreshold(a.id)} disabled={update.isPending}>
                              <Check className="w-3.5 h-3.5 text-green-500" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingThreshold(null)}>
                              <X className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold">{a.threshold_days} dias</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleEditThreshold(a)}>
                              <Edit2 className="w-3 h-3 text-muted-foreground" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Último disparo */}
                    <div className="flex items-center justify-between pt-1 border-t border-border">
                      <div className="text-xs text-muted-foreground">
                        {a.last_run_at ? (
                          <span className="flex items-center gap-1.5">
                            {a.last_run_status === 'success'
                              ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                              : <XCircle className="w-3.5 h-3.5 text-destructive" />}
                            Último disparo: {formatDistanceToNow(new Date(a.last_run_at), { addSuffix: true, locale: ptBR })}
                            <span className="opacity-60">({format(new Date(a.last_run_at), 'dd/MM HH:mm')})</span>
                          </span>
                        ) : (
                          <span className="opacity-60">Nunca executada</span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1.5 text-xs"
                        onClick={() => run.mutate(a.id)}
                        disabled={!a.enabled || isRunning}
                      >
                        {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                        {isRunning ? 'Executando…' : 'Executar agora'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          As mensagens são geradas automaticamente pela IA com base no perfil de cada cliente. O horário de disparo é configurado via Supabase (pg_cron).
        </p>
      </div>
    </MainLayout>
  );
}
