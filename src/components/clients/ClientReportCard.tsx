import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { BarChart2, Loader2, Save, Clock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReportConfig {
  id?: string;
  client_id: string;
  enabled: boolean;
  include_campaigns: boolean;
  include_sales: boolean;
  top_creatives: number;
  include_ai: boolean;
  ai_context: string | null;
  frequency: 'daily' | 'weekly' | 'monthly';
  day_of_week: number | null;
  day_of_month: number | null;
  send_hour: number;
  next_send_at: string | null;
  last_sent_at: string | null;
}

const DAYS_OF_WEEK = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function calcNextSendAt(config: Partial<ReportConfig>): string {
  const now = new Date();
  const hour = config.send_hour ?? 9;
  let next = new Date();
  next.setMinutes(0, 0, 0);
  next.setHours(hour);

  if (config.frequency === 'daily') {
    if (next <= now) next.setDate(next.getDate() + 1);
  } else if (config.frequency === 'weekly') {
    const dow = config.day_of_week ?? 1;
    const diff = (dow - now.getDay() + 7) % 7;
    next.setDate(now.getDate() + (diff === 0 && next <= now ? 7 : diff));
  } else {
    const dom = config.day_of_month ?? 1;
    next.setDate(dom);
    if (next <= now) next.setMonth(next.getMonth() + 1);
  }
  return next.toISOString();
}

export function ClientReportCard({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: config, isLoading } = useQuery({
    queryKey: ['client_report_config', clientId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('client_report_configs')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();
      return data as ReportConfig | null;
    },
  });

  const defaultForm: ReportConfig = {
    client_id: clientId,
    enabled: true,
    include_campaigns: true,
    include_sales: true,
    top_creatives: 0,
    include_ai: true,
    ai_context: '',
    frequency: 'weekly',
    day_of_week: 1,
    day_of_month: 1,
    send_hour: 9,
    next_send_at: null,
    last_sent_at: null,
  };

  const [form, setForm] = useState<ReportConfig>(defaultForm);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (config) setForm(config);
  }, [config]);

  const set = (patch: Partial<ReportConfig>) => {
    setForm(f => ({ ...f, ...patch }));
    setDirty(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const next_send_at = calcNextSendAt(form);
      const payload = { ...form, next_send_at, ai_context: form.ai_context || null };

      if (config?.id) {
        const { error } = await (supabase as any)
          .from('client_report_configs')
          .update(payload)
          .eq('id', config.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('client_report_configs')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client_report_config', clientId] });
      setDirty(false);
      toast({ title: 'Configuração de relatório salva!' });
    },
    onError: (err: Error) => toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' }),
  });

  if (isLoading) return null;

  const hasAnyMetric = form.include_campaigns || form.include_sales;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart2 className="w-5 h-5" />
            Relatório Automático
          </CardTitle>
          <div className="flex items-center gap-2">
            {config && (
              <Badge variant={form.enabled ? 'default' : 'secondary'} className="text-[10px]">
                {form.enabled ? 'Ativo' : 'Pausado'}
              </Badge>
            )}
            <Switch
              checked={form.enabled}
              onCheckedChange={v => set({ enabled: v })}
            />
          </div>
        </div>
        {config?.last_sent_at && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3" />
            Último envio: {formatDistanceToNow(new Date(config.last_sent_at), { addSuffix: true, locale: ptBR })}
            <span className="opacity-60">({format(new Date(config.last_sent_at), 'dd/MM HH:mm')})</span>
          </p>
        )}
        {form.next_send_at && form.enabled && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Próximo envio: {format(new Date(form.next_send_at), "dd/MM/yyyy 'às' HH'h'", { locale: ptBR })}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Métricas */}
        <div>
          <Label className="text-sm font-semibold mb-3 block">Métricas incluídas</Label>
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <Switch id="campaigns" checked={form.include_campaigns} onCheckedChange={v => set({ include_campaigns: v })} />
              <Label htmlFor="campaigns" className="text-sm font-normal cursor-pointer">Campanhas (investimento, cliques, conversões)</Label>
            </div>
            <div className="flex items-center gap-2.5">
              <Switch id="sales" checked={form.include_sales} onCheckedChange={v => set({ include_sales: v })} />
              <Label htmlFor="sales" className="text-sm font-normal cursor-pointer">Vendas registradas no painel</Label>
            </div>
          </div>
        </div>

        {/* Melhores criativos */}
        <div className="flex items-center gap-3">
          <Label className="text-sm font-semibold shrink-0">Melhores criativos</Label>
          <Select value={String(form.top_creatives)} onValueChange={v => set({ top_creatives: Number(v) })}>
            <SelectTrigger className="h-8 w-36">
              <SelectValue />
            </SelectTrigger>
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
            <Switch id="ai" checked={form.include_ai} onCheckedChange={v => set({ include_ai: v })} />
            <Label htmlFor="ai" className="text-sm font-semibold cursor-pointer">Resumo da IA</Label>
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
            {/* Frequência */}
            <div className="flex-1 min-w-[130px]">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Frequência</Label>
              <Select value={form.frequency} onValueChange={v => set({ frequency: v as ReportConfig['frequency'] })}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dia da semana */}
            {form.frequency === 'weekly' && (
              <div className="flex-1 min-w-[130px]">
                <Label className="text-xs text-muted-foreground mb-1.5 block">Dia da semana</Label>
                <Select value={String(form.day_of_week ?? 1)} onValueChange={v => set({ day_of_week: Number(v) })}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((d, i) => (
                      <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Dia do mês */}
            {form.frequency === 'monthly' && (
              <div className="flex-1 min-w-[130px]">
                <Label className="text-xs text-muted-foreground mb-1.5 block">Dia do mês</Label>
                <Select value={String(form.day_of_month ?? 1)} onValueChange={v => set({ day_of_month: Number(v) })}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                      <SelectItem key={d} value={String(d)}>Dia {d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Horário */}
            <div className="flex-1 min-w-[110px]">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Horário</Label>
              <Select value={String(form.send_hour)} onValueChange={v => set({ send_hour: Number(v) })}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map(h => (
                    <SelectItem key={h} value={String(h)}>{String(h).padStart(2, '0')}h</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Aviso sem métricas */}
        {!hasAnyMetric && (
          <p className="text-xs text-destructive">Selecione ao menos uma métrica para ativar o relatório.</p>
        )}

        {/* Salvar */}
        {dirty && (
          <Button
            size="sm"
            className="w-full"
            onClick={() => save.mutate()}
            disabled={save.isPending || !hasAnyMetric}
          >
            {save.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar configuração
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
