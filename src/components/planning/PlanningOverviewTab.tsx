import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { type PlanningCampaign, usePlanningStructures, usePlanningAudiences, usePlanningCreatives, useUpdatePlanningCampaign } from '@/hooks/usePlanning';
import { Calendar, DollarSign, Target, Users, Sparkles, Loader2, RefreshCw, Pencil, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function fmtDate(d: string | null) {
  if (!d) return 'Não definida';
  try {
    const dt = /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + 'T12:00:00') : new Date(d);
    return format(dt, 'dd/MM/yyyy');
  } catch { return d; }
}

interface InlineFieldProps {
  label: string;
  value: string;
  onSave: (v: string) => void;
  type?: 'text' | 'date' | 'number';
  placeholder?: string;
  icon?: React.ReactNode;
}

function InlineField({ label, value, onSave, type = 'text', placeholder, icon }: InlineFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => { onSave(draft); setEditing(false); };
  const cancel = () => { setDraft(value); setEditing(false); };

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <Input
          type={type}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          className="h-7 text-sm"
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
        />
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={commit}><Check className="w-3 h-3 text-success" /></Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={cancel}><X className="w-3 h-3" /></Button>
      </div>
    );
  }

  return (
    <button
      className="group flex items-center gap-1.5 hover:bg-muted/50 rounded px-1 -mx-1 py-0.5 text-left w-full"
      onClick={() => { setDraft(value); setEditing(true); }}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className={cn('text-sm flex-1', !value && 'text-muted-foreground italic')}>
        {value || placeholder || 'Clique para editar'}
      </span>
      <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-40 shrink-0 transition-opacity" />
    </button>
  );
}

interface Props {
  campaign: PlanningCampaign;
  planningId: string;
}

export function PlanningOverviewTab({ campaign, planningId }: Props) {
  const { data: structures = [] } = usePlanningStructures(planningId);
  const { data: audiences = [] } = usePlanningAudiences(planningId);
  const { data: creatives = [] } = usePlanningCreatives(planningId);
  const updateMutation = useUpdatePlanningCampaign();

  const [aiSummary, setAiSummary] = useState<string | null>(campaign.ai_summary || null);
  const [isGenerating, setIsGenerating] = useState(false);

  const save = (field: keyof PlanningCampaign) => (value: string) => {
    const parsed = field === 'total_budget' || field === 'daily_budget' ? Number(value) : value || null;
    updateMutation.mutate({ id: planningId, [field]: parsed });
  };

  const generateSummary = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('planning-ai-summary', {
        body: {
          campaign: { name: campaign.name, objective: campaign.objective, platform: campaign.platform, status: campaign.status, total_budget: campaign.total_budget, daily_budget: campaign.daily_budget, kpis: campaign.kpis },
          structures: structures.map(s => ({ name: s.name, type: s.type, objective: s.objective, budget: s.budget })),
          audiences: audiences.map(a => ({ name: a.name, type: a.type, description: a.description, estimated_size: a.estimated_size, tags: a.tags })),
          creatives: creatives.map(c => ({ name: c.name, format: c.format, status: c.status, headline: c.headline, copy_text: c.copy_text, cta: c.cta })),
        },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      setAiSummary(data.summary);
      await supabase.from('planning_campaigns').update({ ai_summary: data.summary }).eq('id', planningId);
    } catch {
      toast.error('Erro ao gerar resumo com IA');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-5 pt-4">
      {/* Info grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Cliente */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2 uppercase tracking-wide">
              <Users className="w-3.5 h-3.5" />Cliente
            </div>
            <p className="font-semibold">{campaign.client?.name || 'Sem cliente'}</p>
            <p className="text-sm text-muted-foreground">{campaign.client?.company || ''}</p>
          </CardContent>
        </Card>

        {/* Objetivo — editável */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2 uppercase tracking-wide">
              <Target className="w-3.5 h-3.5" />Objetivo
            </div>
            <InlineField
              label="Objetivo"
              value={campaign.objective || ''}
              onSave={save('objective')}
              placeholder="Definir objetivo..."
            />
          </CardContent>
        </Card>

        {/* Período — editável */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2 uppercase tracking-wide">
              <Calendar className="w-3.5 h-3.5" />Período
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-8 shrink-0">Início</span>
                <InlineField label="Início" value={campaign.start_date || ''} onSave={save('start_date')} type="date" placeholder="Definir..." />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-8 shrink-0">Fim</span>
                <InlineField label="Fim" value={campaign.end_date || ''} onSave={save('end_date')} type="date" placeholder="Definir..." />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget grid — editável */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2 uppercase tracking-wide">
              <DollarSign className="w-3.5 h-3.5" />Budget Diário
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-muted-foreground">R$</span>
              <InlineField
                label="Budget diário"
                value={String(campaign.daily_budget || 0)}
                onSave={save('daily_budget')}
                type="number"
              />
            </div>
            <p className="text-lg font-bold text-primary mt-1">{fmt(campaign.daily_budget || 0)}</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2 uppercase tracking-wide">
              <DollarSign className="w-3.5 h-3.5" />Budget Total
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-muted-foreground">R$</span>
              <InlineField
                label="Budget total"
                value={String(campaign.total_budget || 0)}
                onSave={save('total_budget')}
                type="number"
              />
            </div>
            <p className="text-lg font-bold mt-1">{fmt(campaign.total_budget || 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Progresso por seção */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Estruturas', count: structures.length },
          { label: 'Públicos', count: audiences.length },
          { label: 'Criativos', count: creatives.length },
        ].map(({ label, count }) => (
          <div key={label} className={cn(
            'rounded-lg border px-3 py-2.5 text-center',
            count > 0 ? 'border-primary/30 bg-primary/5' : 'border-border/50 bg-muted/20'
          )}>
            <p className={cn('text-xl font-bold', count > 0 ? 'text-primary' : 'text-muted-foreground')}>{count}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* AI Summary */}
      <Separator />
      <Card className="border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="text-base font-semibold">Resumo Estratégico com IA</h3>
            </div>
            <Button variant={aiSummary ? 'outline' : 'default'} size="sm" onClick={generateSummary} disabled={isGenerating}>
              {isGenerating
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando...</>
                : aiSummary
                  ? <><RefreshCw className="w-4 h-4 mr-2" />Regerar</>
                  : <><Sparkles className="w-4 h-4 mr-2" />Gerar com IA</>}
            </Button>
          </div>
          {aiSummary ? (
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">{aiSummary}</div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Clique em <span className="font-medium text-foreground">"Gerar com IA"</span> para criar um resumo estratégico com base nas estruturas, públicos e criativos cadastrados.</p>
              <p className="text-xs mt-1 opacity-70">{structures.length} estrutura(s) · {audiences.length} público(s) · {creatives.length} criativo(s)</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
