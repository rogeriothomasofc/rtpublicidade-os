import { MainLayout } from '@/components/layout/MainLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { RevenueExpenseChart } from '@/components/dashboard/RevenueExpenseChart';
import { DashboardSummaryAI } from '@/components/dashboard/DashboardSummaryAI';
import { GoalsProgressCard } from '@/components/dashboard/GoalsProgressCard';
import { PipelineFunnelCard } from '@/components/dashboard/PipelineFunnelCard';
import { ExpiringContractsCard } from '@/components/dashboard/ExpiringContractsCard';
import { TaskWorkloadBar } from '@/components/dashboard/TaskWorkloadBar';
import { useDashboardFilters, PeriodPreset } from '@/hooks/useDashboardFilters';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useContracts } from '@/hooks/useContracts';
import { Users, DollarSign, TrendingUp, Trophy, FileWarning, Repeat, Rocket, Flame } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { TeamAccessCard } from '@/components/dashboard/TeamAccessCard';

const PERIOD_PILLS: { label: string; value: PeriodPreset }[] = [
  { label: 'Total',       value: 'all' },
  { label: 'Hoje',        value: 'today' },
  { label: 'Ontem',       value: 'yesterday' },
  { label: '7 dias',      value: 'last7days' },
  { label: '30 dias',     value: 'last30days' },
  { label: 'Este mês',    value: 'thisMonth' },
  { label: 'Mês passado', value: 'lastMonth' },
];

function EmptyState() {
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-card">
      <CardContent className="p-8 flex flex-col items-center text-center gap-4">
        <div className="p-4 rounded-full bg-primary/10">
          <Rocket className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-1">Tudo pronto para começar!</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Adicione seus primeiros clientes, crie projetos e tarefas, e cadastre transações financeiras para ver os dados aqui.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center text-xs text-muted-foreground">
          <span className="px-3 py-1 rounded-full border border-border bg-card">→ Clientes</span>
          <span className="px-3 py-1 rounded-full border border-border bg-card">→ Pipeline</span>
          <span className="px-3 py-1 rounded-full border border-border bg-card">→ Financeiro</span>
          <span className="px-3 py-1 rounded-full border border-border bg-card">→ Tarefas</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { preset, dateRange, setPreset } = useDashboardFilters();
  const { data: stats, isLoading } = useDashboardStats(dateRange);
  const { data: contracts } = useContracts();

  const mrr = (contracts || [])
    .filter((c: any) => c.status === 'Ativo')
    .reduce((sum: number, c: any) => sum + Number(c.value || 0), 0);

  const isEmpty =
    !isLoading &&
    stats &&
    stats.activeClients === 0 &&
    stats.revenueInPeriod === 0 &&
    stats.pipelineValue === 0 &&
    stats.pendingInvoices === 0;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-4 md:space-y-6">
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {PERIOD_PILLS.map(p => <Skeleton key={p.value} className="h-8 w-16 rounded-full shrink-0" />)}
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

        {/* Period pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {PERIOD_PILLS.map(p => (
            <button
              key={p.value}
              onClick={() => setPreset(p.value)}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0',
                preset === p.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Empty state */}
        {isEmpty && (
          <>
            <DashboardSummaryAI stats={stats} isLoading={isLoading} />
            <EmptyState />
          </>
        )}

        {!isEmpty && (
          <>
            {/* Linha 1: IA + 4 KPIs principais */}
            <div className="grid gap-4 md:gap-5 grid-cols-1 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <DashboardSummaryAI stats={stats} isLoading={isLoading} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard
                  title="MRR"
                  value={formatCurrency(mrr)}
                  icon={Repeat}
                  variant="primary"
                />
                <MetricCard
                  title="Receita"
                  value={formatCurrency(stats?.revenueInPeriod || 0)}
                  icon={DollarSign}
                  variant="primary"
                  trend={stats?.trends?.revenueInPeriod}
                />
                <MetricCard
                  title="Pipeline"
                  value={formatCurrency(stats?.pipelineValue || 0)}
                  icon={TrendingUp}
                  variant="primary"
                  trend={stats?.trends?.pipelineValue}
                />
                <MetricCard
                  title="Clientes"
                  value={stats?.activeClients || 0}
                  icon={Users}
                  variant="primary"
                  trend={stats?.trends?.activeClients}
                />
              </div>
            </div>

            {/* Linha 2: Barra de workload */}
            {stats?.tasksByStatus && stats.tasksByStatus.length > 0 && (
              <TaskWorkloadBar tasksByStatus={stats.tasksByStatus} />
            )}

            {/* Linha 3: Métricas de alerta */}
            <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-4">
              <MetricCard
                title="Leads Ganhos"
                value={stats?.leadsWon || 0}
                icon={Trophy}
                variant="success"
                trend={stats?.trends?.leadsWon}
              />
              <MetricCard
                title="Leads Quentes"
                value={stats?.hotLeads || 0}
                icon={Flame}
                variant={(stats?.hotLeads || 0) > 0 ? 'warning' : 'success'}
                trend={stats?.trends?.hotLeads}
              />
              <MetricCard
                title="Faturas Vencidas"
                value={formatCurrency(stats?.overdueInvoicesAmount || 0)}
                icon={FileWarning}
                variant={(stats?.overdueInvoicesAmount || 0) > 0 ? 'destructive' : 'success'}
                trend={stats?.trends?.overdueInvoicesAmount}
              />
              <MetricCard
                title="Faturas Pendentes"
                value={stats?.pendingInvoices || 0}
                icon={DollarSign}
                variant={(stats?.pendingInvoices || 0) > 0 ? 'warning' : 'success'}
                trend={stats?.trends?.pendingInvoices}
              />
            </div>

            {/* Linha 4: Gráficos */}
            <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
              <RevenueExpenseChart data={stats?.monthlyFinance || []} />
              <PipelineFunnelCard />
            </div>

            {/* Linha 5: Tarefas atrasadas (tabela expandida) */}
            <Card className="border-border/50">
              <CardHeader className="p-4 md:p-5 pb-2">
                <CardTitle className="text-base md:text-lg">Tarefas do Dia & Atrasadas</CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-5 pt-2">
                {stats?.recentTasks && stats.recentTasks.length > 0 ? (
                  <div className="divide-y divide-border/50">
                    {stats.recentTasks.map((task: any) => {
                      const isOverdue = task.is_overdue || task.status === 'Atrasado';
                      return (
                        <div key={task.id} className="flex items-center justify-between gap-3 py-2.5">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className={cn(
                              'w-1.5 h-1.5 rounded-full shrink-0',
                              isOverdue ? 'bg-destructive' : 'bg-primary'
                            )} />
                            <p className="text-sm font-medium truncate">{task.title}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {task.due_date && (
                              <span className="text-xs text-muted-foreground hidden sm:block">
                                {new Date(task.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                              </span>
                            )}
                            <Badge
                              variant={isOverdue || task.priority === 'Alta' || task.priority === 'Urgente' ? 'destructive' : 'secondary'}
                              className="text-[10px] md:text-xs"
                            >
                              {isOverdue ? 'Atrasada' : task.priority}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhuma tarefa para hoje</p>
                )}
              </CardContent>
            </Card>

            {/* Linha 6: Metas + Contratos + Equipe */}
            <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-3">
              <GoalsProgressCard />
              <ExpiringContractsCard />
              <TeamAccessCard />
            </div>
          </>
        )}

      </div>
    </MainLayout>
  );
}
