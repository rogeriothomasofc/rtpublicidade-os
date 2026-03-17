import { describe, it, expect } from 'vitest';
import { filterTasks, isFilterActive, activeFilterCount } from '../filterTasks';
import { TaskFiltersState } from '@/components/tasks/TaskFilters';

const defaultFilters: TaskFiltersState = {
  search: '',
  client_id: '',
  project_id: '',
  status: '',
  type: '',
  priority: '',
  overdueOnly: false,
  showCompleted: false,
  dateFrom: '',
  dateTo: '',
};

const mockTasks = [
  { id: '1', title: 'Criar campanha Meta', status: 'A Fazer', priority: 'High', type: 'Campaign', client_id: 'c1', project_id: 'p1', due_date: '2025-06-15' },
  { id: '2', title: 'Relatório mensal', status: 'Fazendo', priority: 'Medium', type: 'Report', client_id: 'c2', project_id: null, due_date: '2025-06-20' },
  { id: '3', title: 'Onboarding cliente', status: 'Concluído', priority: 'Low', type: 'Onboarding', client_id: 'c1', project_id: 'p2', due_date: '2025-06-10' },
  { id: '4', title: 'Design criativo', status: 'Atrasado', priority: 'Urgent', type: 'Creative', client_id: 'c3', project_id: null, due_date: '2025-05-01' },
  { id: '5', title: 'Task sem data', status: 'A Fazer', priority: 'Medium', type: 'Other', client_id: null, project_id: null, due_date: null },
];

describe('filterTasks', () => {
  it('returns all non-completed tasks with default filters', () => {
    const result = filterTasks(mockTasks, defaultFilters);
    expect(result).toHaveLength(4);
    expect(result.find(t => t.status === 'Concluído')).toBeUndefined();
  });

  it('shows completed tasks when showCompleted is true', () => {
    const result = filterTasks(mockTasks, { ...defaultFilters, showCompleted: true });
    expect(result).toHaveLength(5);
  });

  it('filters by search term (case-insensitive)', () => {
    const result = filterTasks(mockTasks, { ...defaultFilters, search: 'campanha' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by client_id', () => {
    const result = filterTasks(mockTasks, { ...defaultFilters, client_id: 'c1' });
    expect(result).toHaveLength(1); // c1 has 2 tasks but one is Concluído
  });

  it('filters by status', () => {
    const result = filterTasks(mockTasks, { ...defaultFilters, status: 'Atrasado' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('4');
  });

  it('filters by priority', () => {
    const result = filterTasks(mockTasks, { ...defaultFilters, priority: 'Urgent' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('4');
  });

  it('filters by type', () => {
    const result = filterTasks(mockTasks, { ...defaultFilters, type: 'Report' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('filters overdue only', () => {
    const result = filterTasks(mockTasks, { ...defaultFilters, overdueOnly: true });
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('Atrasado');
  });

  it('filters by date range', () => {
    const result = filterTasks(mockTasks, {
      ...defaultFilters,
      dateFrom: '2025-06-10',
      dateTo: '2025-06-15',
    });
    // Tasks with due_date between 10-15 June, excluding completed
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('excludes tasks without due_date when date filter is active', () => {
    const result = filterTasks(mockTasks, { ...defaultFilters, dateFrom: '2025-01-01' });
    expect(result.find(t => t.id === '5')).toBeUndefined();
  });

  it('ignores "all" as filter value', () => {
    const result = filterTasks(mockTasks, {
      ...defaultFilters,
      client_id: 'all',
      status: 'all',
      type: 'all',
      priority: 'all',
      project_id: 'all',
    });
    expect(result).toHaveLength(4); // same as defaults
  });

  it('combines multiple filters', () => {
    const result = filterTasks(mockTasks, {
      ...defaultFilters,
      client_id: 'c1',
      type: 'Campaign',
    });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Criar campanha Meta');
  });
});

describe('isFilterActive', () => {
  it('returns false for default filters', () => {
    expect(isFilterActive(defaultFilters)).toBe(false);
  });

  it('returns true when search is active', () => {
    expect(isFilterActive({ ...defaultFilters, search: 'test' })).toBe(true);
  });

  it('returns true when client filter is active', () => {
    expect(isFilterActive({ ...defaultFilters, client_id: 'c1' })).toBe(true);
  });

  it('returns false when filter value is "all"', () => {
    expect(isFilterActive({ ...defaultFilters, client_id: 'all' })).toBe(false);
  });

  it('returns true when overdueOnly is active', () => {
    expect(isFilterActive({ ...defaultFilters, overdueOnly: true })).toBe(true);
  });

  it('returns true when showCompleted is active', () => {
    expect(isFilterActive({ ...defaultFilters, showCompleted: true })).toBe(true);
  });

  it('returns true when date range is active', () => {
    expect(isFilterActive({ ...defaultFilters, dateFrom: '2025-01-01' })).toBe(true);
  });
});

describe('activeFilterCount', () => {
  it('returns 0 for default filters', () => {
    expect(activeFilterCount(defaultFilters)).toBe(0);
  });

  it('counts individual active filters', () => {
    expect(activeFilterCount({ ...defaultFilters, client_id: 'c1', status: 'A Fazer' })).toBe(2);
  });

  it('does not count "all" values', () => {
    expect(activeFilterCount({ ...defaultFilters, client_id: 'all' })).toBe(0);
  });

  it('counts date range filters individually', () => {
    expect(activeFilterCount({ ...defaultFilters, dateFrom: '2025-01-01', dateTo: '2025-12-31' })).toBe(2);
  });
});
