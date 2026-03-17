import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  startOfDay, 
  endOfDay, 
  subDays,
  startOfMonth, 
  endOfMonth, 
  subMonths,
  parseISO,
  format
} from 'date-fns';

export type PeriodPreset = 
  | 'all'
  | 'yesterday'
  | 'today' 
  | 'last7days' 
  | 'last15days'
  | 'last30days' 
  | 'thisMonth' 
  | 'lastMonth' 
  | 'custom';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface DashboardFilters {
  preset: PeriodPreset;
  dateRange: DateRange;
}

const getPresetDateRange = (preset: PeriodPreset): DateRange => {
  const now = new Date();
  
  switch (preset) {
    case 'all':
      return { from: new Date(2000, 0, 1), to: new Date(2099, 11, 31) };
    case 'yesterday':
      const yesterday = subDays(now, 1);
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'last7days':
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case 'last15days':
      return { from: startOfDay(subDays(now, 14)), to: endOfDay(now) };
    case 'last30days':
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case 'thisMonth':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'lastMonth':
      const lastMonth = subMonths(now, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    case 'custom':
    default:
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
  }
};

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  all: 'Todo período',
  yesterday: 'Ontem',
  today: 'Hoje',
  last7days: 'Últimos 7 dias',
  last15days: 'Últimos 15 dias',
  last30days: 'Últimos 30 dias',
  thisMonth: 'Este mês',
  lastMonth: 'Mês passado',
  custom: 'Personalizado',
};

export function useDashboardFilters(defaultPreset: PeriodPreset = 'all') {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialPreset = (searchParams.get('period') as PeriodPreset) || defaultPreset;
  const initialFrom = searchParams.get('from');
  const initialTo = searchParams.get('to');

  const [preset, setPreset] = useState<PeriodPreset>(initialPreset);
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    if (initialPreset === 'custom' && initialFrom && initialTo) {
      return {
        from: parseISO(initialFrom),
        to: parseISO(initialTo),
      };
    }
    return getPresetDateRange(initialPreset);
  });

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('period', preset);
    
    if (preset === 'custom') {
      params.set('from', format(dateRange.from, 'yyyy-MM-dd'));
      params.set('to', format(dateRange.to, 'yyyy-MM-dd'));
    }
    
    setSearchParams(params, { replace: true });
  }, [preset, dateRange, setSearchParams]);

  const handlePresetChange = useCallback((newPreset: PeriodPreset) => {
    setPreset(newPreset);
    if (newPreset !== 'custom') {
      setDateRange(getPresetDateRange(newPreset));
    }
  }, []);

  const handleCustomRangeChange = useCallback((range: DateRange) => {
    setPreset('custom');
    setDateRange({
      from: startOfDay(range.from),
      to: endOfDay(range.to),
    });
  }, []);

  const filters = useMemo<DashboardFilters>(() => ({
    preset,
    dateRange,
  }), [preset, dateRange]);

  return {
    filters,
    preset,
    dateRange,
    setPreset: handlePresetChange,
    setDateRange: handleCustomRangeChange,
  };
}
