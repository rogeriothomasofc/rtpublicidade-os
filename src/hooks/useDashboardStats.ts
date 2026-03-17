import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from './useDashboardFilters';
import { format } from 'date-fns';
import { Task } from '@/types/database';

export interface MonthlyFinanceData {
  month: string;
  revenue: number;
  expense: number;
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
}

/**
 * Fetches dashboard metrics via server-side RPC.
 * All aggregations run in PostgreSQL — no client-side computation.
 */
async function fetchDashboardStats(dateRange: DateRange): Promise<DashboardStats> {
  const startDate = format(dateRange.from, 'yyyy-MM-dd');
  const endDate = format(dateRange.to, 'yyyy-MM-dd');

  const { data, error } = await supabase.rpc('get_dashboard_metrics', {
    period_start: startDate,
    period_end: endDate,
  });

  if (error) throw error;

  const m = data as Record<string, unknown>;

  return {
    activeClients: (m.active_clients as number) ?? 0,
    overdueTasks: (m.overdue_tasks as number) ?? 0,
    pendingInvoices: (m.pending_invoices as number) ?? 0,
    overdueInvoicesAmount: Number(m.overdue_invoices_amount ?? 0),
    pipelineValue: Number(m.pipeline_value ?? 0),
    hotLeads: (m.hot_leads as number) ?? 0,
    revenueInPeriod: Number(m.revenue_in_period ?? 0),
    leadsWon: (m.leads_won as number) ?? 0,
    pausedClients: (m.paused_clients as number) ?? 0,
    tasksByStatus: ((m.tasks_by_status as Array<{ status: string; count: number }>) ?? []),
    recentTasks: ((m.recent_tasks as Task[]) ?? []),
    monthlyFinance: ((m.monthly_finance as Array<{ month: string; revenue: number; expense: number }>) ?? []).map(f => ({
      month: f.month,
      revenue: Number(f.revenue ?? 0),
      expense: Number(f.expense ?? 0),
    })),
  };
}

export function useDashboardStats(dateRange: DateRange) {
  return useQuery({
    queryKey: ['dashboard-stats', dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: () => fetchDashboardStats(dateRange),
    staleTime: 30000,
  });
}
