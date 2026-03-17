import { parseISO, isBefore, isWithinInterval } from 'date-fns';
import { TaskFiltersState } from '@/components/tasks/TaskFilters';

export interface FilterableTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  type: string;
  client_id?: string | null;
  project_id?: string | null;
  due_date?: string | null;
}

const DEFAULT_FILTERS: TaskFiltersState = {
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

/**
 * Checks if any filter is active (differs from defaults).
 * Used to show "(filtradas)" indicator in UI.
 */
export function isFilterActive(filters: TaskFiltersState): boolean {
  return (
    filters.search !== DEFAULT_FILTERS.search ||
    (filters.client_id !== DEFAULT_FILTERS.client_id && filters.client_id !== 'all') ||
    (filters.project_id !== DEFAULT_FILTERS.project_id && filters.project_id !== 'all') ||
    (filters.status !== DEFAULT_FILTERS.status && filters.status !== 'all') ||
    (filters.type !== DEFAULT_FILTERS.type && filters.type !== 'all') ||
    (filters.priority !== DEFAULT_FILTERS.priority && filters.priority !== 'all') ||
    filters.overdueOnly !== DEFAULT_FILTERS.overdueOnly ||
    filters.showCompleted !== DEFAULT_FILTERS.showCompleted ||
    filters.dateFrom !== DEFAULT_FILTERS.dateFrom ||
    filters.dateTo !== DEFAULT_FILTERS.dateTo
  );
}

/**
 * Returns the count of active filter fields (excluding search and showCompleted).
 */
export function activeFilterCount(filters: TaskFiltersState): number {
  let count = 0;
  if (filters.client_id && filters.client_id !== 'all') count++;
  if (filters.project_id && filters.project_id !== 'all') count++;
  if (filters.status && filters.status !== 'all') count++;
  if (filters.type && filters.type !== 'all') count++;
  if (filters.priority && filters.priority !== 'all') count++;
  if (filters.overdueOnly) count++;
  if (filters.dateFrom) count++;
  if (filters.dateTo) count++;
  return count;
}

/**
 * Pure function to filter tasks based on filter state.
 * Extracted from TasksPage for testability and reuse.
 */
export function filterTasks<T extends FilterableTask>(
  tasks: T[],
  filters: TaskFiltersState
): T[] {
  return tasks.filter((task) => {
    // Search filter
    if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }

    // Client filter
    if (filters.client_id && filters.client_id !== 'all' && task.client_id !== filters.client_id) {
      return false;
    }

    // Project filter
    if (filters.project_id && filters.project_id !== 'all' && task.project_id !== filters.project_id) {
      return false;
    }

    // Status filter - hide completed by default unless toggle is on or explicitly filtered
    if (filters.status && filters.status !== 'all') {
      if (task.status !== filters.status) return false;
    } else if (!filters.showCompleted) {
      if (task.status === 'Concluído') return false;
    }

    // Type filter
    if (filters.type && filters.type !== 'all' && task.type !== filters.type) {
      return false;
    }

    // Priority filter
    if (filters.priority && filters.priority !== 'all' && task.priority !== filters.priority) {
      return false;
    }

    // Overdue filter
    if (filters.overdueOnly) {
      if (task.status !== 'Atrasado') return false;
    }

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      if (!task.due_date) return false;
      const taskDate = parseISO(task.due_date);

      if (filters.dateFrom && filters.dateTo) {
        if (
          !isWithinInterval(taskDate, {
            start: parseISO(filters.dateFrom),
            end: parseISO(filters.dateTo),
          })
        ) {
          return false;
        }
      } else if (filters.dateFrom) {
        if (isBefore(taskDate, parseISO(filters.dateFrom))) return false;
      } else if (filters.dateTo) {
        if (isBefore(parseISO(filters.dateTo), taskDate)) return false;
      }
    }

    return true;
  });
}
