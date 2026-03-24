import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from './useDashboardFilters';
import { format, subMilliseconds } from 'date-fns';
import { Task } from '@/types/database';

export interface MonthlyFinanceData {
  month: string;
  revenue: number;
  expense: number;
}

export interface MetricTrend {
  value: number;
  isPositive: boolean;
}

export interface DashboardStats {
  activeClients: number;
  overdueTasks: number;
  pendingInvoices: number;
  overdueInvoicesAmount: number;
  pipelineValue: number;
  hotLeads: number;
  revenueInPeriod: number;
  leadsWon: number;
  pausedClients: number;
  tasksByStatus: { status: string; count: number }[];
  recentTasks: Task[];
  monthlyFinance: MonthlyFinanceData[];
  trends?: {
    revenueInPeriod: MetricTrend;
    pipelineValue: MetricTrend;
    activeClients: MetricTrend;
    leadsWon: MetricTrend;
    hotLeads: MetricTrend;
    overdueInvoicesAmount: MetricTrend;
    pendingInvoices: MetricTrend;
  };
}

function calcTrend(current: number, previous: number): MetricTrend {
  if (previous === 0) return { value: current > 0 ? 100 : 0, isPositive: current >= 0 };
  const pct = Math.round(((current - previous) / previous) * 100);
  return { value: Math.abs(pct), isPositive: pct >= 0 };
}

function isAllPeriod(dateRange: DateRange): boolean {
  return dateRange.from.getFullYear() <= 2000 && dateRange.to.getFullYear() >= 2099;
}

async function fetchRaw(startDate: string, endDate: string) {
  const { data, error } = await supabase.rpc('get_dashboard_metrics', {
    period_start: startDate,
    period_end: endDate,
  });
  if (error) throw error;
  return data as Record<string, unknown>;
}

async function fetchDashboardStats(dateRange: DateRange): Promise<DashboardStats> {
  const startDate = format(dateRange.from, 'yyyy-MM-dd');
  const endDate = format(dateRange.to, 'yyyy-MM-dd');

  const allPeriod = isAllPeriod(dateRange);

  // Período anterior com a mesma duração
  let prevData: Record<string, unknown> | null = null;
  if (!allPeriod) {
    const durationMs = dateRange.to.getTime() - dateRange.from.getTime();
    const prevTo = subMilliseconds(dateRange.from, 1);
    const prevFrom = subMilliseconds(dateRange.from, durationMs + 1);
    const [current, previous] = await Promise.all([
      fetchRaw(startDate, endDate),
      fetchRaw(format(prevFrom, 'yyyy-MM-dd'), format(prevTo, 'yyyy-MM-dd')),
    ]);
    const m = current;
    prevData = previous;

    return buildStats(m, prevData);
  }

  const m = await fetchRaw(startDate, endDate);
  return buildStats(m, null);
}

function buildStats(m: Record<string, unknown>, prev: Record<string, unknown> | null): DashboardStats {
  const current = {
    revenueInPeriod: Number(m.revenue_in_period ?? 0),
    pipelineValue: Number(m.pipeline_value ?? 0),
    activeClients: (m.active_clients as number) ?? 0,
    leadsWon: (m.leads_won as number) ?? 0,
    hotLeads: (m.hot_leads as number) ?? 0,
    overdueInvoicesAmount: Number(m.overdue_invoices_amount ?? 0),
    pendingInvoices: (m.pending_invoices as number) ?? 0,
  };

  const trends = prev
    ? {
        revenueInPeriod: calcTrend(current.revenueInPeriod, Number(prev.revenue_in_period ?? 0)),
        pipelineValue: calcTrend(current.pipelineValue, Number(prev.pipeline_value ?? 0)),
        activeClients: calcTrend(current.activeClients, Number(prev.active_clients ?? 0)),
        leadsWon: calcTrend(current.leadsWon, Number(prev.leads_won ?? 0)),
        hotLeads: calcTrend(current.hotLeads, Number(prev.hot_leads ?? 0)),
        overdueInvoicesAmount: calcTrend(current.overdueInvoicesAmount, Number(prev.overdue_invoices_amount ?? 0)),
        pendingInvoices: calcTrend(current.pendingInvoices, Number(prev.pending_invoices ?? 0)),
      }
    : undefined;

  return {
    ...current,
    overdueTasks: (m.overdue_tasks as number) ?? 0,
    pausedClients: (m.paused_clients as number) ?? 0,
    tasksByStatus: ((m.tasks_by_status as Array<{ status: string; count: number }>) ?? []),
    recentTasks: ((m.recent_tasks as Task[]) ?? []),
    monthlyFinance: ((m.monthly_finance as Array<{ month: string; revenue: number; expense: number }>) ?? []).map(f => ({
      month: f.month,
      revenue: Number(f.revenue ?? 0),
      expense: Number(f.expense ?? 0),
    })),
    trends,
  };
}

export function useDashboardStats(dateRange: DateRange) {
  return useQuery({
    queryKey: ['dashboard-stats', dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: () => fetchDashboardStats(dateRange),
    staleTime: 30000,
  });
}
