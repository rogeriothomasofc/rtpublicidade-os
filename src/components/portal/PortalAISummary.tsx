import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PortalTimelineTask {
  id: string;
  title: string;
  status: string;
  type: string;
  due_date: string | null;
  updated_at: string;
}

interface PortalTimelineFinance {
  id: string;
  amount: number;
  due_date: string;
  status: string;
  type: string;
  description?: string | null;
  updated_at?: string;
}

interface PortalTimelinePlanning {
  id: string;
  name: string;
  status: string;
  platform: string;
  updated_at?: string;
}

interface PortalAISummaryProps {
  clientId: string;
  clientName: string;
  tasks: PortalTimelineTask[];
  finance: PortalTimelineFinance[];
  planning: PortalTimelinePlanning[];
}

export function PortalAISummary({ clientId, clientName, tasks, finance, planning }: PortalAISummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Current week: Monday to Sunday
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const cutoff = weekStart.toISOString();

  const recentTasks = tasks.filter(t => t.updated_at >= cutoff);
  const recentFinance = finance.filter(f => f.updated_at >= cutoff || f.due_date >= cutoff.slice(0, 10));
  const recentPlanning = planning.filter(p => p.updated_at >= cutoff);

  // Auto-regenerate when data changes during the week
  const dataFingerprint = JSON.stringify({
    tasks: recentTasks.map(t => `${t.id}-${t.status}-${t.updated_at}`),
    finance: recentFinance.map(f => `${f.id}-${f.status}-${f.updated_at}`),
    planning: recentPlanning.map(p => `${p.id}-${p.status}-${p.updated_at}`),
  });

  // Load saved summary from database
  const loadSavedSummary = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('portal_ai_summaries')
        .select('summary, generated_at')
        .eq('client_id', clientId)
        .maybeSingle();

      if (error) throw error;
      if (data?.summary) {
        setSummary(data.summary);
        setIsLoading(false);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error loading saved summary:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Save summary to database
  const saveSummary = async (text: string) => {
    try {
      const { error } = await supabase
        .from('portal_ai_summaries')
        .upsert({
          client_id: clientId,
          summary: text,
          generated_at: new Date().toISOString(),
        }, { onConflict: 'client_id' });

      if (error) console.error('Error saving summary:', error);
    } catch (err) {
      console.error('Error saving summary:', err);
    }
  };

  const generateSummary = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('portal-ai-summary', {
        body: {
          clientId,
          clientName,
          tasks: recentTasks.map(t => ({ title: t.title, status: t.status, type: t.type })),
          finance: recentFinance.map(f => ({ description: f.description, amount: f.amount, status: f.status, type: f.type, due_date: f.due_date })),
          planning: recentPlanning.map(p => ({ name: p.name, status: p.status, platform: p.platform })),
        },
      });

      if (error) throw error;
      if (data?.error) {
        if (data.error.includes('Rate limit')) toast.error('Tente novamente em alguns segundos.');
        throw new Error(data.error);
      }
      const text = data?.summary || null;
      setSummary(text);
      if (text) await saveSummary(text);
    } catch (err) {
      console.error('Portal AI summary error:', err);
      const parts: string[] = [];
      const done = recentTasks.filter(t => t.status === 'Concluído').length;
      if (done > 0) parts.push(`${done} tarefa${done > 1 ? 's' : ''} concluída${done > 1 ? 's' : ''}`);
      const pending = recentFinance.filter(f => f.status === 'Pendente').length;
      if (pending > 0) parts.push(`${pending} fatura${pending > 1 ? 's' : ''} pendente${pending > 1 ? 's' : ''}`);
      if (recentPlanning.length > 0) parts.push(`${recentPlanning.length} planejamento${recentPlanning.length > 1 ? 's' : ''} atualizado${recentPlanning.length > 1 ? 's' : ''}`);
      const fallback = parts.length > 0 ? `Nos últimos 7 dias: ${parts.join(', ')}.` : 'Tudo em dia! Nenhuma atualização relevante nos últimos 7 dias.';
      setSummary(fallback);
      await saveSummary(fallback);
    } finally {
      setIsGenerating(false);
    }
  };

  // Load saved summary on mount
  useEffect(() => {
    loadSavedSummary();
  }, [clientId]);

  // Auto-regenerate when data changes
  const prevFingerprintRef = useState<string | null>(null);
  useEffect(() => {
    if (isGenerating) return;
    if (prevFingerprintRef[0] === null) {
      prevFingerprintRef[0] = dataFingerprint;
      // On first load, generate if no saved summary
      if (!summary && (recentTasks.length > 0 || recentFinance.length > 0 || recentPlanning.length > 0)) {
        generateSummary();
      }
      return;
    }
    if (prevFingerprintRef[0] !== dataFingerprint) {
      prevFingerprintRef[0] = dataFingerprint;
      generateSummary();
    }
  }, [dataFingerprint]);

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background overflow-hidden relative">
      <CardContent className="p-5 relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Relatório Semanal</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={generateSummary}
            disabled={isGenerating}
            className="text-muted-foreground hover:text-foreground h-8"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isGenerating ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
        {isLoading || isGenerating ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        ) : (
          <div className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">{summary}</div>
        )}
      </CardContent>
    </Card>
  );
}
