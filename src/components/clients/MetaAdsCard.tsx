import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, RefreshCw, AlertCircle, MousePointerClick, Eye, DollarSign, Users, Sparkles } from 'lucide-react';

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
  /** Pass accountId (meta_ads_account value) OR clientId — not both */
  accountId?: string;
  clientId?: string;
}

type Period = '7d' | '30d';

function fmt(val: string | undefined): string {
  const n = Number(val || 0);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('pt-BR');
}

function fmtCurrency(val: string | undefined): string {
  return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function MetaAdsCard({ accountId, clientId }: MetaAdsCardProps) {
  const { toast } = useToast();
  const [period, setPeriod] = useState<Period>('7d');
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<MetaInsights | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async (p: Period = period) => {
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, string> = { period: p };
      if (accountId) body.account_id = accountId;
      if (clientId) body.client_id = clientId;

      const { data, error: fnError } = await supabase.functions.invoke('meta-ads-insights', { body });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setInsights(data?.insights || null);
      setSummary(data?.summary || null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao buscar dados';
      setError(msg);
      toast({ title: 'Erro Meta Ads', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePeriodChange = (p: Period) => {
    setPeriod(p);
    fetchInsights(p);
  };

  const leads = insights?.actions?.find(
    (a) => a.action_type === 'lead' || a.action_type === 'onsite_conversion.lead_grouped'
  )?.value;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            Meta Ads — Performance
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <div className="flex rounded-md border border-border overflow-hidden text-xs">
              <button
                className={`px-2.5 py-1 ${period === '7d' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                onClick={() => handlePeriodChange('7d')}
              >
                7d
              </button>
              <button
                className={`px-2.5 py-1 ${period === '30d' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                onClick={() => handlePeriodChange('30d')}
              >
                30d
              </button>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => fetchInsights()} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {loading && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
            <p className="text-xs text-muted-foreground flex-1">{error}</p>
            <Button variant="outline" size="sm" className="text-xs h-7 shrink-0" onClick={() => fetchInsights()}>
              Tentar novamente
            </Button>
          </div>
        )}

        {!loading && !error && !insights && (
          <div className="text-center py-4">
            <Badge variant="outline" className="text-xs">Sem dados no período</Badge>
            <p className="text-xs text-muted-foreground mt-1">Nenhuma campanha ativa nos últimos {period === '7d' ? '7' : '30'} dias.</p>
          </div>
        )}

        {!loading && insights && (
          <>
            {/* Metrics grid — compact */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <Metric icon={<DollarSign className="w-3.5 h-3.5 text-emerald-500" />} label="Investido" value={fmtCurrency(insights.spend)} bg="bg-emerald-500/10" />
              <Metric icon={<Eye className="w-3.5 h-3.5 text-blue-500" />} label="Impressões" value={fmt(insights.impressions)} bg="bg-blue-500/10" />
              <Metric icon={<MousePointerClick className="w-3.5 h-3.5 text-violet-500" />} label="Cliques" value={fmt(insights.clicks)} bg="bg-violet-500/10" />
              <Metric icon={<Users className="w-3.5 h-3.5 text-orange-500" />} label="Alcance" value={fmt(insights.reach)} bg="bg-orange-500/10" />
              <Metric icon={<TrendingUp className="w-3.5 h-3.5 text-pink-500" />} label="CTR" value={`${Number(insights.ctr || 0).toFixed(2)}%`} bg="bg-pink-500/10" />
              <Metric icon={<DollarSign className="w-3.5 h-3.5 text-cyan-500" />} label="CPC" value={fmtCurrency(insights.cpc)} bg="bg-cyan-500/10" />
              {leads && (
                <Metric icon={<Users className="w-3.5 h-3.5 text-amber-500" />} label="Leads" value={fmt(leads)} bg="bg-amber-500/10" />
              )}
            </div>

            {/* AI Summary */}
            {summary && (
              <div className="flex gap-2 rounded-lg border border-border bg-muted/30 p-3">
                <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">{summary}</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: string; bg: string }) {
  return (
    <div className="rounded-lg border border-border p-2.5 space-y-1.5">
      <div className={`w-6 h-6 rounded-md ${bg} flex items-center justify-center`}>{icon}</div>
      <p className="text-[10px] text-muted-foreground leading-none">{label}</p>
      <p className="text-sm font-bold leading-none">{value}</p>
    </div>
  );
}
