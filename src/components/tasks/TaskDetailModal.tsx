import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { CalendarDays, Clock, User, Tag, Building2, Pencil } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TaskWithAssignees } from '@/hooks/useTasks';
import { useSubtasks } from '@/hooks/useSubtasks';
import { Checkbox } from '@/components/ui/checkbox';
import { useUpdateSubtask } from '@/hooks/useSubtasks';
import { cn } from '@/lib/utils';

const PRIORITY_COLORS: Record<string, string> = {
  Urgente: 'bg-destructive/10 text-destructive border-destructive/20',
  Alta: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  Média: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  Baixa: 'bg-muted text-muted-foreground border-border',
};

const STATUS_COLORS: Record<string, string> = {
  'A Fazer': 'bg-muted text-muted-foreground',
  'Fazendo': 'bg-blue-500/10 text-blue-600',
  'Atrasado': 'bg-destructive/10 text-destructive',
  'Concluído': 'bg-emerald-500/10 text-emerald-600',
};

interface TaskDetailModalProps {
  task: TaskWithAssignees | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (task: TaskWithAssignees) => void;
}

export function TaskDetailModal({ task, open, onOpenChange, onEdit }: TaskDetailModalProps) {
  const { data: subtasks = [] } = useSubtasks(task?.id ?? null);
  const updateSubtask = useUpdateSubtask();

  if (!task) return null;

  const completedCount = subtasks.filter(s => s.is_completed).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-6">
            <DialogTitle className={cn(
              'text-lg font-semibold leading-snug',
              task.status === 'Concluído' && 'line-through text-muted-foreground'
            )}>
              {task.title}
            </DialogTitle>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 gap-1.5"
              onClick={() => {
                onOpenChange(false);
                onEdit(task);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Status + Priority */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={cn('text-xs', STATUS_COLORS[task.status])}>
              {task.status}
            </Badge>
            <Badge variant="outline" className={cn('text-xs', PRIORITY_COLORS[task.priority])}>
              {task.priority}
            </Badge>
            {task.type && (
              <Badge variant="secondary" className="text-xs">
                {task.type}
              </Badge>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {task.description}
            </p>
          )}

          <Separator />

          {/* Meta info */}
          <div className="space-y-2 text-sm">
            {task.client && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4 shrink-0" />
                <span>{task.client.name}</span>
              </div>
            )}
            {task.due_date && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="h-4 w-4 shrink-0" />
                <span>{format(parseISO(task.due_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
              </div>
            )}
            {(task as any).due_time && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0" />
                <span>{(task as any).due_time}</span>
              </div>
            )}
            {(task as any).recurrence && (task as any).recurrence !== 'Nenhuma' && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Tag className="h-4 w-4 shrink-0" />
                <span>Recorrência: {(task as any).recurrence}</span>
              </div>
            )}
          </div>

          {/* Assignees */}
          {task.assignees && task.assignees.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  Responsáveis
                </p>
                <div className="flex flex-wrap gap-2">
                  {task.assignees.map(a => (
                    <div key={a.id} className="flex items-center gap-2 bg-secondary/50 rounded-full pl-1 pr-3 py-0.5">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={a.member.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[8px]">
                          {a.member.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{a.member.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Subtasks */}
          {subtasks.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  Subtarefas · {completedCount}/{subtasks.length} concluídas
                </p>
                <div className="space-y-2">
                  {subtasks.map(s => (
                    <div key={s.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={s.is_completed}
                        onCheckedChange={() =>
                          updateSubtask.mutate({ id: s.id, taskId: task.id, is_completed: !s.is_completed })
                        }
                      />
                      <span className={cn(
                        'text-sm',
                        s.is_completed && 'line-through text-muted-foreground'
                      )}>
                        {s.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
