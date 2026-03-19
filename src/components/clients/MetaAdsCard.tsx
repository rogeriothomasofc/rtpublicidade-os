import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, RefreshCw, AlertCircle, MousePointerClick, Eye, DollarSign, Users } from 'lucide-react';

interface MetaInsights {
  spend: string;
  impressions: string;
  clicks: string;
  reach: string;
  ctr: string;
  cpc: string;
  actions?: { action_type: string; value: string }[];
}

interface MetaAdsCardProps {
  accountId: string;
}

type Period = '7d' | '30d';

function formatNumber(val: string | undefined): string {
  const n = Number(val || 0);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('pt-BR');
}

function formatCurrency(val: string | undefined): string {
  return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPercent(val: string | undefined): string {
  return `${Number(val || 0).toFixed(2)}%`;
}

export function MetaAdsCard({ accountId }: MetaAdsCardProps) {
  const { toast } = useToast();
  const [period, setPeriod] = useState<Period>('7d');
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<MetaInsights | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const fetchInsights = async (p: Period = period) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('meta-ads-insights', {
        body: { account_id: accountId, period: p },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setInsights(data?.insights || null);
      setLoaded(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao buscar dados';
      setError(msg);
      toast({ title: 'Erro ao buscar Meta Ads', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (p: Period) => {
    setPeriod(p);
    if (loaded) fetchInsights(p);
  };

  const leads = insights?.actions?.find(
    (a) => a.action_type === 'lead' || a.action_type === 'onsite_conversion.lead_grouped'
  )?.value;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Meta Ads — Performance
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-border overflow-hidden text-sm">
              <button
                className={`px-3 py-1 ${period === '7d' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                onClick={() => handlePeriodChange('7d')}
              >
                7 dias
              </button>
              <button
                className={`px-3 py-1 ${period === '30d' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                onClick={() => handlePeriodChange('30d')}
              >
                30 dias
              </button>
            </div>
            {loaded && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => fetchInsights()} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground font-mono">
          Conta: act_{accountId.replace(/^act_/, '')}
        </p>
      </CardHeader>

      <CardContent>
        {!loaded && !loading && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <TrendingUp className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Clique para carregar as métricas desta conta</p>
            <Button onClick={() => fetchInsights()} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Carregar dados
            </Button>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Erro ao carregar dados</p>
              <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto shrink-0" onClick={() => fetchInsights()}>
              Tentar novamente
            </Button>
          </div>
        )}

        {!loading && loaded && !error && !insights && (
          <div className="text-center py-6 text-sm text-muted-foreground">
            <Badge variant="outline">Sem dados no período</Badge>
            <p className="mt-2 text-xs">Nenhuma campanha ativa nos últimos {period === '7d' ? '7' : '30'} dias.</p>
          </div>
        )}

        {!loading && insights && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <MetricCard
              icon={<DollarSign className="w-4 h-4 text-emerald-500" />}
              label="Investimento"
              value={formatCurrency(insights.spend)}
              bg="bg-emerald-500/10"
            />
            <MetricCard
              icon={<Eye className="w-4 h-4 text-blue-500" />}
              label="Impressões"
              value={formatNumber(insights.impressions)}
              bg="bg-blue-500/10"
            />
            <MetricCard
              icon={<MousePointerClick className="w-4 h-4 text-violet-500" />}
              label="Cliques"
              value={formatNumber(insights.clicks)}
              bg="bg-violet-500/10"
            />
            <MetricCard
              icon={<Users className="w-4 h-4 text-orange-500" />}
              label="Alcance"
              value={formatNumber(insights.reach)}
              bg="bg-orange-500/10"
            />
            <MetricCard
              icon={<TrendingUp className="w-4 h-4 text-pink-500" />}
              label="CTR"
              value={formatPercent(insights.ctr)}
              bg="bg-pink-500/10"
            />
            <MetricCard
              icon={<DollarSign className="w-4 h-4 text-cyan-500" />}
              label="CPC"
              value={formatCurrency(insights.cpc)}
              bg="bg-cyan-500/10"
            />
            {leads && (
              <MetricCard
                icon={<Users className="w-4 h-4 text-amber-500" />}
                label="Leads"
                value={formatNumber(leads)}
                bg="bg-amber-500/10"
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricCard({
  icon,
  label,
  value,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bg: string;
}) {
  return (
    <div className="rounded-lg border border-border p-4 space-y-2">
      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold tracking-tight">{value}</p>
    </div>
  );
}
