import { useMemo, ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, ChevronRight, Circle, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { TaskWithAssignees } from '@/hooks/useTasks';
import { TaskStatus } from '@/types/database';
import { cn } from '@/lib/utils';

interface Column {
  status: TaskStatus;
  label: string;
  icon: ReactNode;
  color: string;
  headerClass: string;
}

const COLUMNS: Column[] = [
  {
    status: 'A Fazer',
    label: 'A Fazer',
    icon: <Circle className="h-4 w-4" />,
    color: 'text-muted-foreground',
    headerClass: 'border-b-2 border-muted',
  },
  {
    status: 'Fazendo',
    label: 'Fazendo',
    icon: <Clock className="h-4 w-4 text-blue-500" />,
    color: 'text-blue-500',
    headerClass: 'border-b-2 border-blue-500',
  },
  {
    status: 'Atrasado',
    label: 'Atrasado',
    icon: <AlertTriangle className="h-4 w-4 text-destructive" />,
    color: 'text-destructive',
    headerClass: 'border-b-2 border-destructive',
  },
  {
    status: 'Concluído',
    label: 'Concluído',
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    color: 'text-emerald-500',
    headerClass: 'border-b-2 border-emerald-500',
  },
];

const PRIORITY_COLORS: Record<string, string> = {
  Urgente: 'bg-destructive/10 text-destructive border-destructive/20',
  Alta: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  Média: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  Baixa: 'bg-muted text-muted-foreground border-border',
};

const STATUS_NEXT: Record<TaskStatus, TaskStatus | null> = {
  'A Fazer': 'Fazendo',
  'Fazendo': 'Concluído',
  'Atrasado': 'Fazendo',
  'Concluído': null,
};

interface TasksKanbanProps {
  tasks: TaskWithAssignees[];
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onTaskClick: (task: TaskWithAssignees) => void;
}

function TaskCard({ task, onStatusChange, onTaskClick }: {
  task: TaskWithAssignees;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onTaskClick: (task: TaskWithAssignees) => void;
}) {
  const today = startOfDay(new Date());
  const isOverdue = task.due_date && task.status !== 'Concluído' && isBefore(parseISO(task.due_date), today);
  const nextStatus = STATUS_NEXT[task.status];

  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-md transition-all group border-border/60',
        task.status === 'Concluído' && 'opacity-60',
        isOverdue && 'border-destructive/30'
      )}
      onClick={() => onTaskClick(task)}
    >
      <CardContent className="p-3 space-y-2">
        {/* Title */}
        <p className={cn(
          'text-sm font-medium leading-snug',
          task.status === 'Concluído' && 'line-through text-muted-foreground'
        )}>
          {task.title}
        </p>

        {/* Client */}
        {task.client && (
          <p className="text-xs text-muted-foreground truncate">
            {task.client.name}
          </p>
        )}

        {/* Priority + Due date */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className={cn('text-[10px] px-1.5 py-0', PRIORITY_COLORS[task.priority])}
          >
            {task.priority}
          </Badge>
          {task.due_date && (
            <span className={cn(
              'flex items-center gap-1 text-[10px]',
              isOverdue ? 'text-destructive' : 'text-muted-foreground'
            )}>
              <CalendarDays className="h-3 w-3" />
              {format(parseISO(task.due_date), 'dd MMM', { locale: ptBR })}
            </span>
          )}
          {task.subtasks_count > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {task.subtasks_completed}/{task.subtasks_count} subtasks
            </span>
          )}
        </div>

        {/* Footer: assignees + advance button */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex -space-x-1">
            {(task.assignees || []).slice(0, 3).map(a => (
              <Avatar key={a.id} className="h-5 w-5 border border-background">
                <AvatarImage src={a.member.avatar_url ?? undefined} />
                <AvatarFallback className="text-[8px]">
                  {a.member.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          {nextStatus && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(task.id, nextStatus);
              }}
            >
              {nextStatus === 'Concluído' ? '✓ Concluir' : `→ ${nextStatus}`}
              <ChevronRight className="h-3 w-3 ml-0.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function TasksKanban({ tasks, onStatusChange, onTaskClick }: TasksKanbanProps) {
  const byStatus = useMemo(() => {
    const map: Record<TaskStatus, TaskWithAssignees[]> = {
      'A Fazer': [],
      'Fazendo': [],
      'Atrasado': [],
      'Concluído': [],
    };
    for (const t of tasks) {
      if (map[t.status]) map[t.status].push(t);
    }
    return map;
  }, [tasks]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
      {COLUMNS.map(col => {
        const colTasks = byStatus[col.status];
        return (
          <div key={col.status} className="flex flex-col gap-3">
            {/* Column header */}
            <div className={cn('pb-2', col.headerClass)}>
              <div className="flex items-center justify-between">
                <div className={cn('flex items-center gap-2 font-medium text-sm', col.color)}>
                  {col.icon}
                  {col.label}
                </div>
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                  {colTasks.length}
                </span>
              </div>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2 min-h-[60px]">
              {colTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Nenhuma tarefa</p>
              ) : (
                colTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={onStatusChange}
                    onTaskClick={onTaskClick}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
