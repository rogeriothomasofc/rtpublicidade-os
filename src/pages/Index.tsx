import { MainLayout } from '@/components/layout/MainLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { RevenueExpenseChart } from '@/components/dashboard/RevenueExpenseChart';
import { DateRangePickerDashboard } from '@/components/dashboard/DateRangePickerDashboard';
import { DashboardSummaryAI } from '@/components/dashboard/DashboardSummaryAI';
import { GoalsProgressCard } from '@/components/dashboard/GoalsProgressCard';
import { PipelineFunnelCard } from '@/components/dashboard/PipelineFunnelCard';
import { ExpiringContractsCard } from '@/components/dashboard/ExpiringContractsCard';
import { useDashboardFilters } from '@/hooks/useDashboardFilters';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useContracts } from '@/hooks/useContracts';
import { Users, CheckSquare, AlertTriangle, DollarSign, TrendingUp, Trophy, FileWarning, Repeat } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { TeamAccessCard } from '@/components/dashboard/TeamAccessCard';


export default function Dashboard() {
  const { preset, dateRange, setPreset, setDateRange } = useDashboardFilters();
  const { data: stats, isLoading } = useDashboardStats(dateRange);
  const { data: contracts } = useContracts();

  const mrr = (contracts || [])
    .filter((c: any) => c.status === 'Ativo')
    .reduce((sum: number, c: any) => sum + Number(c.value || 0), 0);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-4 md:space-y-6">
          <div className="flex justify-end">
            <Skeleton className="h-10 w-[180px]" />
          </div>
          <Card className="border-primary/30 bg-card">
            <CardContent className="p-4 md:p-6">
              <Skeleton className="h-6 w-40 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-4 md:space-y-6 animate-fade-in">
        {/* Header with Filter */}
        <div className="flex justify-end">
          <DateRangePickerDashboard
            preset={preset}
            dateRange={dateRange}
            onPresetChange={setPreset}
            onCustomRangeChange={setDateRange}
          />
        </div>

        {/* AI Summary */}
        <DashboardSummaryAI stats={stats} isLoading={isLoading} />

        {/* Metrics - 2 cols on mobile, 5 on xl */}
        <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          <MetricCard
            title="Clientes Ativos"
            value={stats?.activeClients || 0}
            icon={Users}
            variant="primary"
          />
          <MetricCard
            title="MRR (Mensal)"
            value={formatCurrency(mrr)}
            icon={Repeat}
            variant="primary"
          />
          <MetricCard
            title="Receita no Período"
            value={formatCurrency(stats?.revenueInPeriod || 0)}
            icon={DollarSign}
            variant="primary"
          />
          <MetricCard
            title="Leads Ganhos"
            value={stats?.leadsWon || 0}
            icon={Trophy}
            variant="success"
          />
          <MetricCard
            title="Faturas Vencidas"
            value={formatCurrency(stats?.overdueInvoicesAmount || 0)}
            icon={FileWarning}
            variant={(stats?.overdueInvoicesAmount || 0) > 0 ? 'destructive' : 'success'}
          />
        </div>

        {/* Pipeline Value Card - stack on mobile */}
        <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            title="Pipeline Ativo"
            value={formatCurrency(stats?.pipelineValue || 0)}
            icon={TrendingUp}
            variant="primary"
          />
          <MetricCard
            title="Leads Quentes"
            value={stats?.hotLeads || 0}
            description="Em Proposal"
            icon={CheckSquare}
            variant={(stats?.hotLeads || 0) > 0 ? 'warning' : 'success'}
          />
          <MetricCard
            title="Faturas Pendentes"
            value={stats?.pendingInvoices || 0}
            icon={DollarSign}
            variant={(stats?.pendingInvoices || 0) > 0 ? 'warning' : 'success'}
          />
        </div>

        {/* Charts, Goals, Tasks & Team Activity */}
        <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
          <RevenueExpenseChart data={stats?.monthlyFinance || []} />
          <GoalsProgressCard />
          <TeamAccessCard />
          {/* Today & Overdue Tasks */}
          <Card className="border-border/50">
            <CardHeader className="p-4 md:p-6 pb-2 md:pb-2">
              <CardTitle className="text-base md:text-lg">Tarefas do Dia & Atrasadas</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-2 md:pt-0">
              <div className="space-y-2 md:space-y-3">
                {stats?.recentTasks && stats.recentTasks.length > 0 ? (
                  stats.recentTasks.map((task: any) => {
                    const isOverdue = task.is_overdue || task.status === 'Atrasado';
                    return (
                      <div key={task.id} className="flex items-center justify-between gap-2 p-2.5 md:p-3 bg-secondary/50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs md:text-sm font-medium truncate">{task.title}</p>
                          <p className="text-[10px] md:text-xs text-muted-foreground">
                            {isOverdue ? '⚠️ Atrasada' : '📅 Hoje'}
                            {task.due_date && ` · ${new Date(task.due_date).toLocaleDateString('pt-BR')}`}
                          </p>
                        </div>
                        <Badge 
                          variant={isOverdue || task.priority === 'Alta' || task.priority === 'Urgente' ? 'destructive' : 'secondary'}
                          className="text-[10px] md:text-xs shrink-0"
                        >
                          {isOverdue ? 'Atrasada' : task.priority}
                        </Badge>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma tarefa para hoje 🎉</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pipeline Funnel & Expiring Contracts */}
        <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
          <PipelineFunnelCard />
          <ExpiringContractsCard />
        </div>
      </div>
    </MainLayout>
  );
}
