import { useSalesPipeline } from '@/hooks/useSalesPipeline';
import { useGmbLeads } from '@/hooks/useGmbLeads';
import { useInstagramProspects } from '@/hooks/useInstagramProspects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, TrendingUp, Percent, MapPin, Target, MessageCircle, Filter, Camera } from 'lucide-react';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function fmt(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
}

function pct(part: number, total: number) {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

// ──────────────────────────────────────────────
// KPI Card
// ──────────────────────────────────────────────
interface KpiProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}
function KpiCard({ label, value, sub, icon, color }: KpiProps) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg ${color}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────
// Funil Visual do Pipeline
// ──────────────────────────────────────────────
interface FunnelStep {
  label: string;
  count: number;
  color: string;
}

function PipelineVisualFunnel({ steps, total }: { steps: FunnelStep[]; total: number }) {
  const maxCount = steps[0]?.count || 1;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-blue-500" />
          Funil do Pipeline
          <Badge variant="secondary" className="ml-auto">{total} leads</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {steps.map((step, idx) => {
          const widthPct = Math.max(Math.round((step.count / maxCount) * 100), 10);
          const prevCount = idx > 0 ? steps[idx - 1].count : step.count;
          const fromPrev = idx > 0 && prevCount > 0 ? pct(step.count, prevCount) : null;

          return (
            <div key={step.label} className="flex flex-col items-center">
              <div
                className="w-full transition-all duration-300"
                style={{
                  paddingLeft: `${(100 - widthPct) / 2}%`,
                  paddingRight: `${(100 - widthPct) / 2}%`,
                }}
              >
                <div className={`${step.color} rounded px-3 py-2 flex items-center justify-between text-white text-xs`}>
                  <span className="font-medium truncate mr-2">{step.label}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-bold">{step.count}</span>
                    <span className="opacity-75">({pct(step.count, total)}%)</span>
                  </div>
                </div>
              </div>
              {fromPrev !== null && (
                <span className="text-[10px] text-muted-foreground py-0.5">
                  ↓ {fromPrev}% da etapa anterior
                </span>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────
// Funil de um canal (barra de progresso)
// ──────────────────────────────────────────────
interface FunnelItem {
  label: string;
  count: number;
  color: string;
}
interface ChannelFunnelProps {
  title: string;
  icon: React.ReactNode;
  total: number;
  steps: FunnelItem[];
}
function ChannelFunnel({ title, icon, total, steps }: ChannelFunnelProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-1.5">
          {icon}
          {title}
          <Badge variant="secondary" className="ml-auto">{total} total</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((step) => (
          <div key={step.label} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{step.label}</span>
              <span className="font-medium">{step.count} <span className="text-muted-foreground">({pct(step.count, total)}%)</span></span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${step.color}`}
                style={{ width: `${pct(step.count, total)}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────
// Stage colors
// ──────────────────────────────────────────────
const STAGE_COLORS: Record<string, string> = {
  'Novo': 'bg-slate-500',
  'Qualificação': 'bg-blue-400',
  'Diagnóstico': 'bg-cyan-500',
  'Reunião Agendada': 'bg-purple-500',
  'Proposta Enviada': 'bg-orange-500',
  'Negociação': 'bg-yellow-500',
  'Ganho': 'bg-green-500',
  'Perdido': 'bg-red-500',
};

// ──────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────
export function ProspectionDashboard() {
  const { data: pipelineLeads = [], isLoading: loadingPipeline } = useSalesPipeline();
  const { data: gmbLeads = [], isLoading: loadingGmb } = useGmbLeads();
  const { data: igProspects = [], isLoading: loadingIg } = useInstagramProspects();

  const isLoading = loadingPipeline || loadingGmb || loadingIg;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-80 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      </div>
    );
  }

  // ── KPIs ──
  const totalProspects = pipelineLeads.length + gmbLeads.length + igProspects.length;

  const leadsNoFunil = pipelineLeads.filter(l => l.stage !== 'Ganho' && l.stage !== 'Perdido').length;

  // Leads prospectados = GMB contactados + IG com mensagem enviada
  const gmbContacted = gmbLeads.filter(l => l.status !== 'Novo');
  const igContacted = igProspects.filter(l => l.status !== 'Identificado');
  const totalProspectados = gmbContacted.length + igContacted.length;

  // Taxa de resposta
  const responded = [
    ...gmbContacted.filter(l => ['Respondeu', 'Reunião Marcada', 'Proposta Enviada', 'Ganho'].includes(l.status)),
    ...igContacted.filter(l => ['Respondeu', 'Reunião Marcada', 'Proposta Enviada', 'Ganho'].includes(l.status as string)),
  ].length;
  const responseRate = pct(responded, totalProspectados);

  const totalGanhos = [
    ...pipelineLeads.filter(l => l.stage === 'Ganho'),
    ...gmbLeads.filter(l => l.status === 'Ganho'),
    ...igProspects.filter(l => l.status === 'Ganho'),
  ].length;
  const conversionRate = pct(totalGanhos, totalProspects);

  // ── Funil visual do Pipeline (excl. Perdido, em ordem) ──
  const FUNNEL_ORDER = ['Novo', 'Qualificação', 'Diagnóstico', 'Reunião Agendada', 'Proposta Enviada', 'Negociação', 'Ganho'];
  const FUNNEL_COLORS: Record<string, string> = {
    'Novo': 'bg-slate-500',
    'Qualificação': 'bg-blue-500',
    'Diagnóstico': 'bg-cyan-600',
    'Reunião Agendada': 'bg-purple-600',
    'Proposta Enviada': 'bg-orange-500',
    'Negociação': 'bg-yellow-600',
    'Ganho': 'bg-green-600',
  };

  const funnelSteps: FunnelStep[] = FUNNEL_ORDER
    .map(stage => ({
      label: stage,
      count: pipelineLeads.filter(l => l.stage === stage).length,
      color: FUNNEL_COLORS[stage],
    }))
    .filter(s => s.count > 0);

  // ── Funnels por canal ──
  const pipelineSteps: FunnelItem[] = [
    { label: 'Novo', count: pipelineLeads.filter(l => l.stage === 'Novo').length, color: 'bg-slate-400' },
    { label: 'Qualificação', count: pipelineLeads.filter(l => l.stage === 'Qualificação').length, color: 'bg-blue-400' },
    { label: 'Diagnóstico', count: pipelineLeads.filter(l => l.stage === 'Diagnóstico').length, color: 'bg-cyan-500' },
    { label: 'Reunião Agendada', count: pipelineLeads.filter(l => l.stage === 'Reunião Agendada').length, color: 'bg-purple-500' },
    { label: 'Proposta Enviada', count: pipelineLeads.filter(l => l.stage === 'Proposta Enviada').length, color: 'bg-orange-500' },
    { label: 'Negociação', count: pipelineLeads.filter(l => l.stage === 'Negociação').length, color: 'bg-yellow-500' },
    { label: 'Ganho', count: pipelineLeads.filter(l => l.stage === 'Ganho').length, color: 'bg-green-500' },
    { label: 'Perdido', count: pipelineLeads.filter(l => l.stage === 'Perdido').length, color: 'bg-red-500' },
  ].filter(s => s.count > 0);

  const gmbSteps: FunnelItem[] = [
    { label: 'Novo', count: gmbLeads.filter(l => l.status === 'Novo').length, color: 'bg-slate-400' },
    { label: 'Contatado', count: gmbLeads.filter(l => l.status === 'Contatado').length, color: 'bg-blue-400' },
    { label: 'Respondeu', count: gmbLeads.filter(l => l.status === 'Respondeu').length, color: 'bg-yellow-500' },
    { label: 'Reunião Marcada', count: gmbLeads.filter(l => l.status === 'Reunião Marcada').length, color: 'bg-purple-500' },
    { label: 'Proposta Enviada', count: gmbLeads.filter(l => l.status === 'Proposta Enviada').length, color: 'bg-orange-500' },
    { label: 'Ganho', count: gmbLeads.filter(l => l.status === 'Ganho').length, color: 'bg-green-500' },
    { label: 'Perdido', count: gmbLeads.filter(l => l.status === 'Perdido').length, color: 'bg-red-500' },
  ].filter(s => s.count > 0);

  const igSteps: FunnelItem[] = [
    { label: 'Identificado', count: igProspects.filter(l => l.status === 'Identificado').length, color: 'bg-slate-400' },
    { label: 'Mensagem Enviada', count: igProspects.filter(l => l.status === 'Mensagem Enviada').length, color: 'bg-blue-400' },
    { label: 'Respondeu', count: igProspects.filter(l => l.status === 'Respondeu').length, color: 'bg-yellow-500' },
    { label: 'Reunião Marcada', count: igProspects.filter(l => l.status === 'Reunião Marcada').length, color: 'bg-purple-500' },
    { label: 'Proposta Enviada', count: igProspects.filter(l => l.status === 'Proposta Enviada').length, color: 'bg-orange-500' },
    { label: 'Ganho', count: igProspects.filter(l => l.status === 'Ganho').length, color: 'bg-green-500' },
    { label: 'Perdido', count: igProspects.filter(l => l.status === 'Perdido').length, color: 'bg-red-500' },
  ].filter(s => s.count > 0);

  // Top leads por valor
  const topLeads = [...pipelineLeads]
    .filter(l => l.stage !== 'Perdido')
    .sort((a, b) => (b.deal_value || 0) - (a.deal_value || 0))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Leads no Funil"
          value={leadsNoFunil}
          sub={`de ${totalProspects} captados no total`}
          icon={<Users className="w-4 h-4 text-blue-600" />}
          color="bg-blue-100 dark:bg-blue-900/30"
        />
        <KpiCard
          label="Leads Prospectados"
          value={totalProspectados}
          sub="GMB + Instagram contactados"
          icon={<MessageCircle className="w-4 h-4 text-emerald-600" />}
          color="bg-emerald-100 dark:bg-emerald-900/30"
        />
        <KpiCard
          label="Taxa de Resposta"
          value={`${responseRate}%`}
          sub={`${responded} responderam de ${totalProspectados}`}
          icon={<TrendingUp className="w-4 h-4 text-orange-600" />}
          color="bg-orange-100 dark:bg-orange-900/30"
        />
        <KpiCard
          label="Taxa de Conversão"
          value={`${conversionRate}%`}
          sub={`${totalGanhos} ganhos de ${totalProspects}`}
          icon={<Percent className="w-4 h-4 text-purple-600" />}
          color="bg-purple-100 dark:bg-purple-900/30"
        />
      </div>

      {/* Funil visual do Pipeline */}
      {funnelSteps.length > 0 && (
        <PipelineVisualFunnel steps={funnelSteps} total={pipelineLeads.length} />
      )}

      {/* Funnels por canal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChannelFunnel
          title="Pipeline de Vendas"
          icon={<Filter className="w-3.5 h-3.5 text-blue-500" />}
          total={pipelineLeads.length}
          steps={pipelineSteps}
        />
        <ChannelFunnel
          title="Google Maps (GMB)"
          icon={<MapPin className="w-3.5 h-3.5 text-red-500" />}
          total={gmbLeads.length}
          steps={gmbSteps}
        />
        <ChannelFunnel
          title="Prospecção Instagram"
          icon={<Camera className="w-3.5 h-3.5 text-pink-500" />}
          total={igProspects.length}
          steps={igSteps}
        />
      </div>

      {/* Top leads por valor */}
      {topLeads.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-orange-500" />
              Principais Oportunidades no Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topLeads.map((lead) => {
                const maxVal = topLeads[0]?.deal_value || 1;
                return (
                  <div key={lead.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate">{lead.company || lead.lead_name}</span>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <Badge
                            className={`text-white text-[10px] px-1.5 py-0 ${STAGE_COLORS[lead.stage] || 'bg-slate-500'}`}
                          >
                            {lead.stage}
                          </Badge>
                          <span className="text-sm font-semibold text-emerald-600">{fmt(lead.deal_value || 0)}</span>
                        </div>
                      </div>
                      <Progress
                        value={pct(lead.deal_value || 0, maxVal)}
                        className="h-1.5"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
