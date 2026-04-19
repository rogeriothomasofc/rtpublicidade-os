import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { type PlanningCampaign, usePlanningStructures, usePlanningAudiences, usePlanningCreatives } from '@/hooks/usePlanning';
import { Calendar, DollarSign, Target, Users, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const STATUS_COLORS: Record<string, string> = {
  'Rascunho': 'bg-muted text-muted-foreground',
  'Em Aprovação': 'bg-warning/15 text-warning',
  'Pronto para Subir': 'bg-primary/15 text-primary',
  'Publicado': 'bg-success/15 text-success',
  'Em Teste': 'bg-accent text-accent-foreground',
  'Escalando': 'bg-success/15 text-success',
  'Pausado': 'bg-destructive/15 text-destructive',
};

interface Props {
  campaign: PlanningCampaign;
  planningId: string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(date: string | null) {
  if (!date) return 'Não definida';
  try {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(date + 'T12:00:00') : new Date(date);
    return format(d, 'dd/MM/yyyy');
  } catch { return date; }
}

export function PlanningOverviewTab({ campaign, planningId }: Props) {
  

  const { data: structures = [] } = usePlanningStructures(planningId);
  const { data: audiences = [] } = usePlanningAudiences(planningId);
  const { data: creatives = [] } = usePlanningCreatives(planningId);

  const [aiSummary, setAiSummary] = useState<string | null>(campaign.ai_summary || null);
  const [isGenerating, setIsGenerating] = useState(false);

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
    } catch (e: unknown) {
      toast.error('Erro ao gerar resumo com IA');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 pt-4">
      {/* Row 1: Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
              <Users className="w-4 h-4" />
              Cliente & Produto
            </div>
            <p className="text-lg font-bold">{campaign.client?.name || 'Sem cliente'}</p>
            <p className="text-sm text-muted-foreground">{campaign.client?.company || 'Empresa não definida'}</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
              <Target className="w-4 h-4" />
              Objetivo
            </div>
            <p className="text-lg font-bold">{campaign.objective || 'Não definido'}</p>
            <Badge className={`mt-1 ${STATUS_COLORS[campaign.status] || ''}`} variant="secondary">
              {campaign.status}
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
              <Calendar className="w-4 h-4" />
              Período
            </div>
            <p className="text-lg font-bold">{formatDate(campaign.start_date)}</p>
            <p className="text-sm text-muted-foreground">até {formatDate(campaign.end_date)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Budget cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
              <DollarSign className="w-4 h-4" />
              Budget Diário
            </div>
            <p className="text-2xl font-bold text-primary">{formatCurrency(campaign.daily_budget || 0)}</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
              <DollarSign className="w-4 h-4" />
              Budget Total
            </div>
            <p className="text-2xl font-bold">{formatCurrency(campaign.total_budget || 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Strategy Summary */}
      <Separator />
      <Card className="border-border bg-card">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Resumo Estratégico da Campanha</h3>
            </div>
            <Button variant={aiSummary ? 'outline' : 'default'} size="sm" onClick={generateSummary} disabled={isGenerating}>
              {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...</> : aiSummary ? <><RefreshCw className="w-4 h-4 mr-2" /> Regerar</> : <><Sparkles className="w-4 h-4 mr-2" /> Gerar com IA</>}
            </Button>
          </div>
          {aiSummary ? (
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">{aiSummary}</div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Clique em <span className="font-medium text-foreground">"Gerar com IA"</span> para criar um resumo estratégico com base nas estruturas, públicos e criativos cadastrados.</p>
              <p className="text-xs mt-1 text-muted-foreground/70">{structures.length} estrutura(s) · {audiences.length} público(s) · {creatives.length} criativo(s)</p>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
