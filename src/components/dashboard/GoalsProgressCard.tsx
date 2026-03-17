import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useCurrentMonthGoal } from '@/hooks/useMonthlyGoals';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Target, Users, DollarSign, UserPlus, Trophy } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GoalItemProps {
  icon: React.ElementType;
  label: string;
  current: number;
  target: number;
  format?: 'number' | 'currency';
}

function GoalItem({ icon: Icon, label, current, target, format: fmt = 'number' }: GoalItemProps) {
  const percentage = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  const displayCurrent = fmt === 'currency' ? formatCurrency(current) : current;
  const displayTarget = fmt === 'currency' ? formatCurrency(target) : target;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="w-3.5 h-3.5" />
          <span>{label}</span>
        </div>
        <span className="font-semibold">
          {displayCurrent} <span className="text-muted-foreground font-normal">/ {displayTarget}</span>
        </span>
      </div>
      <Progress value={percentage} className="h-2" />
      <p className="text-xs text-muted-foreground text-right">{percentage}%</p>
    </div>
  );
}

function useMonthlyPipelineStats() {
  const now = new Date();
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['pipeline-month-stats', monthStart],
    queryFn: async () => {
      // All leads created this month (new leads entered)
      const { data: allLeads, error: e1 } = await supabase
        .from('sales_pipeline')
        .select('id, stage, deal_value, created_at, updated_at')
        .eq('source', 'manual')
        .gte('created_at', `${monthStart}T00:00:00`)
        .lte('created_at', `${monthEnd}T23:59:59`);
      if (e1) throw e1;

      // Won leads updated this month (could have been created earlier)
      const { data: wonLeads, error: e2 } = await supabase
        .from('sales_pipeline')
        .select('id, deal_value, updated_at')
        .eq('stage', 'Ganho')
        .gte('updated_at', `${monthStart}T00:00:00`)
        .lte('updated_at', `${monthEnd}T23:59:59`);
      if (e2) throw e2;

      const newLeadsCount = allLeads?.length ?? 0;
      const wonCount = wonLeads?.length ?? 0;
      const wonRevenue = wonLeads?.reduce((sum, l) => sum + Number(l.deal_value || 0), 0) ?? 0;

      return { newLeadsCount, wonCount, wonRevenue };
    },
    staleTime: 30000,
  });
}

export function GoalsProgressCard() {
  const { data: goal, isLoading: goalLoading } = useCurrentMonthGoal();
  const { data: pipelineStats, isLoading: statsLoading } = useMonthlyPipelineStats();

  const isLoading = goalLoading || statsLoading;

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
        <CardContent><Skeleton className="h-32" /></CardContent>
      </Card>
    );
  }

  if (!goal) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Metas do Mês</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-center py-6 space-y-3">
          <p className="text-sm text-muted-foreground">Nenhuma meta definida para este mês.</p>
          <Button asChild variant="outline" size="sm">
            <Link to="/goals">Definir metas</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const monthLabel = format(new Date(), 'MMMM', { locale: ptBR });
  const { newLeadsCount = 0, wonCount = 0, wonRevenue = 0 } = pipelineStats ?? {};

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg capitalize">Metas de {monthLabel}</CardTitle>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-xs">
            <Link to="/goals">Ver detalhes</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {goal.leads_per_month > 0 && (
          <GoalItem
            icon={UserPlus}
            label="Leads captados no mês"
            current={newLeadsCount}
            target={goal.leads_per_month}
          />
        )}
        {goal.clients_to_close > 0 && (
          <GoalItem
            icon={Trophy}
            label="Leads ganhos"
            current={wonCount}
            target={goal.clients_to_close}
          />
        )}
        {goal.revenue_target > 0 && (
          <GoalItem
            icon={DollarSign}
            label="Faturamento (ganhos)"
            current={wonRevenue}
            target={goal.revenue_target}
            format="currency"
          />
        )}
      </CardContent>
    </Card>
  );
}
