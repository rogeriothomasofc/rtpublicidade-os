import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardStats } from '@/hooks/useDashboardStats';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DashboardSummaryAIProps {
  stats: DashboardStats | undefined;
  isLoading: boolean;
}

function getDashboardCacheKey() {
  return `dashboard_summary_${new Date().toISOString().slice(0, 10)}`;
}

function readDashboardCache(): string | null {
  try {
    const raw = localStorage.getItem(getDashboardCacheKey());
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeDashboardCache(summary: string) {
  try { localStorage.setItem(getDashboardCacheKey(), JSON.stringify(summary)); } catch { /* noop */ }
}

export function DashboardSummaryAI({ stats, isLoading }: DashboardSummaryAIProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = async (force = false) => {
    if (!stats) return;

    if (!force) {
      const cached = readDashboardCache();
      if (cached) { setSummary(cached); return; }
    }

    setIsGenerating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('dashboard-summary', {
        body: { stats },
      });

      if (fnError) {
        throw fnError;
      }

      if (data?.error) {
        if (data.error.includes('Rate limit')) {
          toast.error('Limite de requisições excedido. Tente novamente em alguns segundos.');
        } else if (data.error.includes('Payment')) {
          toast.error('Créditos esgotados. Adicione créditos ao workspace.');
        }
        throw new Error(data.error);
      }

      const text = data?.summary || null;
      setSummary(text);
      if (text) writeDashboardCache(text);
    } catch (err) {
      console.error('Error generating summary:', err);
      setError('Não foi possível gerar o resumo. Tente novamente.');
      // Fallback to deterministic summary
      const fallback = generateFallbackSummary(stats);
      setSummary(fallback);
      writeDashboardCache(fallback);
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-generate on stats load (with cache check)
  useEffect(() => {
    if (stats && !isLoading) {
      generateSummary();
    }
  }, [stats?.overdueTasks, stats?.pausedClients, stats?.overdueInvoicesAmount]);

  const generateFallbackSummary = (stats: DashboardStats): string => {
    const parts: string[] = [];

    if (stats.overdueTasks > 0) {
      parts.push(`Há ${stats.overdueTasks} tarefa${stats.overdueTasks > 1 ? 's' : ''} atrasada${stats.overdueTasks > 1 ? 's' : ''} que precisam de atenção imediata`);
    }

    if (stats.overdueInvoicesAmount > 0) {
      parts.push(`R$ ${stats.overdueInvoicesAmount.toLocaleString('pt-BR')} em faturas vencidas aguardando cobrança`);
    }

    if (stats.hotLeads > 0) {
      parts.push(`${stats.hotLeads} lead${stats.hotLeads > 1 ? 's' : ''} quente${stats.hotLeads > 1 ? 's' : ''} em Proposal para fechar`);
    }

    if (stats.pausedClients > 0) {
      parts.push(`${stats.pausedClients} cliente${stats.pausedClients > 1 ? 's' : ''} pausado${stats.pausedClients > 1 ? 's' : ''}`);
    }

    if (parts.length === 0) {
      return 'Tudo sob controle! Nenhum alerta crítico no momento. Continue acompanhando o pipeline e as entregas.';
    }

    return parts.join('. ') + '. Priorize resolver pendências financeiras e destravar vendas.';
  };

  if (isLoading) {
    return (
      <Card className="border-primary/30 bg-gradient-to-r from-slate-900 to-slate-800">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <Skeleton className="h-6 w-40" />
          </div>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent" />
      <CardContent className="p-4 md:p-6 relative">
        <div className="flex items-center justify-between gap-2 mb-3 md:mb-4">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <div className="p-1.5 md:p-2 rounded-lg bg-primary/10 shrink-0">
              <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            </div>
            <h2 className="text-sm md:text-lg font-semibold text-foreground truncate">Resumo do Dia</h2>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => generateSummary(true)}
            disabled={isGenerating}
            className="text-muted-foreground hover:text-foreground shrink-0 h-8 px-2 md:px-3"
          >
            <RefreshCw className={`h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        </div>

        {isGenerating ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        ) : error && !summary ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        ) : (
          <p className="text-sm md:text-base text-foreground/90 leading-relaxed">
            {summary}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
