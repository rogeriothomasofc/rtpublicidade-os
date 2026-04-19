import { useState } from 'react';
import { Task, TaskStatus, TaskPriority, TaskType, TaskRecurrence } from '@/types/database';
import { TaskWithAssignees } from '@/hooks/useTasks';
import { TeamMember } from '@/hooks/useTeamMembers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { TaskStatusInline } from './TaskStatusInline';
import { TaskAssigneeSelector } from './TaskAssigneeSelector';
import { TaskRowSubtasks } from './TaskRowSubtasks';
import { Edit, Check, ArrowUpDown, ArrowUp, ArrowDown, Repeat, ListChecks, Trash2, CheckSquare } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const recurrenceLabels: Record<TaskRecurrence, string> = {
  'Nenhuma': '',
  'Diária': 'Diária',
  'Semanal': 'Semanal',
  'Mensal': 'Mensal',
  'Trimestral': 'Trimestral',
};

type SortField = 'due_date' | 'priority' | 'status' | 'title' | 'type' | 'created_at';
type SortOrder = 'asc' | 'desc';

interface TaskTableProps {
  tasks: TaskWithAssignees[];
  isLoading: boolean;
  teamMembers: TeamMember[];
  onStatusChange: (id: string, status: TaskStatus) => void | Promise<void>;
  onAssigneesChange: (taskId: string, memberIds: string[]) => void | Promise<void>;
  onEdit: (task: TaskWithAssignees) => void;
  onComplete: (task: TaskWithAssignees) => void;
  onDelete: (taskId: string) => void;
  onCreateTask?: () => void;
  hasActiveFilters?: boolean;
}

const priorityConfig: Record<TaskPriority, { label: string; className: string; order: number }> = {
  'Baixa': { label: 'Baixa', className: 'bg-muted text-muted-foreground', order: 1 },
  'Média': { label: 'Média', className: 'bg-primary/10 text-primary', order: 2 },
  'Alta': { label: 'Alta', className: 'bg-warning/20 text-warning-foreground dark:text-warning', order: 3 },
  'Urgente': { label: 'Urgente', className: 'bg-destructive/20 text-destructive', order: 4 },
};

const typeConfig: Record<TaskType, { label: string }> = {
  'Campanha': { label: 'Campanha' },
  'Criativo': { label: 'Criativo' },
  'Relatório': { label: 'Relatório' },
  'Onboarding': { label: 'Onboarding' },
  'Otimização': { label: 'Otimização' },
  'Outro': { label: 'Outro' },
};

const statusOrder: Record<TaskStatus, number> = {
  'A Fazer': 1,
  'Fazendo': 2,
  'Atrasado': 3,
  'Concluído': 4,
};

export function TaskTable({ tasks, isLoading, teamMembers, onStatusChange, onAssigneesChange, onEdit, onComplete, onDelete, onCreateTask, hasActiveFilters }: TaskTableProps) {
  const [sortField, setSortField] = useState<SortField>('due_date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const toggleExpanded = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const isOverdue = (task: TaskWithAssignees) => {
    return task.status === 'Atrasado';
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'due_date':
        const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        comparison = dateA - dateB;
        break;
      case 'priority':
        comparison = priorityConfig[a.priority].order - priorityConfig[b.priority].order;
        break;
      case 'status':
        comparison = statusOrder[a.status] - statusOrder[b.status];
        break;
      case 'created_at':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    return sortOrder === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" /> 
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const getAssignees = (task: TaskWithAssignees) => {
    return (task.assignees || [])
      .filter(a => a.member)
      .map(a => ({ id: a.member.id, name: a.member.name, avatar_url: a.member.avatar_url }));
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {['Título', 'Cliente', 'Projeto', 'Tipo', 'Prioridade', 'Status', 'Responsável', 'Vencimento', 'Criado em', 'Ações'].map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i}>
                {Array(10).fill(0).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border bg-card">
        <EmptyState
          icon={CheckSquare}
          title={hasActiveFilters ? 'Nenhuma tarefa encontrada' : 'Nenhuma tarefa cadastrada'}
          description={hasActiveFilters
            ? 'Tente ajustar os filtros ou a busca.'
            : 'Crie tarefas e atribua responsáveis para organizar as entregas da agência.'}
          actionLabel="+ Nova Tarefa"
          onAction={onCreateTask}
          filtered={hasActiveFilters}
        />
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-[200px]">Título</TableHead>
              <TableHead className="min-w-[120px]">Cliente</TableHead>
              <TableHead className="min-w-[120px]">Projeto</TableHead>
              <TableHead className="min-w-[100px]">Tipo</TableHead>
              <TableHead 
                className="min-w-[100px] cursor-pointer select-none"
                onClick={() => handleSort('priority')}
              >
                <div className="flex items-center">
                  Prioridade
                  <SortIcon field="priority" />
                </div>
              </TableHead>
              <TableHead 
                className="min-w-[140px] cursor-pointer select-none"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center">
                  Status
                  <SortIcon field="status" />
                </div>
              </TableHead>
              <TableHead 
                className="min-w-[110px] cursor-pointer select-none"
                onClick={() => handleSort('due_date')}
              >
                <div className="flex items-center">
                  Vencimento
                  <SortIcon field="due_date" />
                </div>
              </TableHead>
              <TableHead className="min-w-[100px]">Responsável</TableHead>
              <TableHead 
                className="min-w-[110px] cursor-pointer select-none"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center">
                  Criado em
                  <SortIcon field="created_at" />
                </div>
              </TableHead>
              <TableHead className="min-w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTasks.map((task, index) => {
              const overdue = isOverdue(task);
              const hasSubtasks = (task.subtasks_count ?? 0) > 0;
              const isExpanded = expandedTasks.has(task.id);
              
              return (
                <>
                  <TableRow 
                    key={task.id}
                    className={cn(
                      index % 2 === 0 ? 'bg-transparent' : 'bg-muted/30',
                      overdue && 'bg-destructive/5 border-l-2 border-l-destructive',
                      hasSubtasks && 'cursor-pointer hover:bg-muted/50'
                    )}
                    onClick={hasSubtasks ? () => toggleExpanded(task.id) : undefined}
                  >
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(overdue && 'text-destructive')}>
                            {task.title}
                          </span>
                          <div className="flex items-center gap-1">
                            {task.recurrence && task.recurrence !== 'Nenhuma' && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary">
                                      <Repeat className="h-3 w-3" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Recorrência: {recurrenceLabels[task.recurrence]}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {hasSubtasks && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className={cn(
                                      "flex items-center gap-1 h-5 px-1.5 rounded-full text-xs font-medium",
                                      task.subtasks_completed === task.subtasks_count
                                        ? "bg-success/10 text-success"
                                        : "bg-muted text-muted-foreground"
                                    )}>
                                      <ListChecks className="h-3 w-3" />
                                      <span>{task.subtasks_completed}/{task.subtasks_count}</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{task.subtasks_completed} de {task.subtasks_count} subtarefas concluídas</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                        {task.description && (
                          <span className="text-xs text-muted-foreground truncate max-w-[200px] ml-6">
                            {task.description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {task.client?.name || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {task.project?.name || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {typeConfig[task.type].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('font-medium', priorityConfig[task.priority].className)}>
                        {priorityConfig[task.priority].label}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <TaskStatusInline
                        status={task.status}
                        onStatusChange={async (status) => { await onStatusChange(task.id, status); }}
                      />
                    </TableCell>
                    <TableCell className={cn(overdue && 'text-destructive font-medium')}>
                      {task.due_date 
                        ? <>
                            {format(new Date(task.due_date + 'T12:00:00'), 'dd MMM yyyy', { locale: ptBR })}
                            {(task as any).due_time && <span className="text-muted-foreground ml-1 text-xs">{(task as any).due_time}</span>}
                          </>
                        : '—'
                      }
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <TaskAssigneeSelector
                        taskId={task.id}
                        assignees={getAssignees(task)}
                        teamMembers={teamMembers}
                        onAssigneesChange={async (taskId, memberIds) => { await onAssigneesChange(taskId, memberIds); }}
                        compact
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(parseISO(task.created_at), 'dd/MM/yy', { locale: ptBR })}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onEdit(task)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {task.status !== 'Concluído' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-success hover:text-success hover:bg-success/10"
                            onClick={() => onComplete(task)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir tarefa</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir "{task.title}"? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => onDelete(task.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                  {hasSubtasks && isExpanded && (
                    <TableRow key={`${task.id}-subtasks`} className="bg-muted/20 hover:bg-muted/20">
                      <TableCell colSpan={10} className="p-0 border-l-4 border-l-primary/30">
                        <TaskRowSubtasks taskId={task.id} />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
