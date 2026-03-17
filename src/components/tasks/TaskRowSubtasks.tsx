import { useSubtasks, useUpdateSubtask } from '@/hooks/useSubtasks';
import { useUpdateTaskStatus } from '@/hooks/useTasks';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

interface TaskRowSubtasksProps {
  taskId: string;
}

export function TaskRowSubtasks({ taskId }: TaskRowSubtasksProps) {
  const { data: subtasks, isLoading } = useSubtasks(taskId);
  const updateSubtask = useUpdateSubtask();
  const updateTaskStatus = useUpdateTaskStatus();

  const handleToggle = async (subtaskId: string, isCompleted: boolean) => {
    await updateSubtask.mutateAsync({
      id: subtaskId,
      taskId,
      is_completed: !isCompleted,
    });
  };

  // Auto-complete parent task when all subtasks are completed
  useEffect(() => {
    if (!subtasks || subtasks.length === 0) return;
    
    const allCompleted = subtasks.every(s => s.is_completed);
    if (allCompleted) {
      updateTaskStatus.mutate({ id: taskId, status: 'Concluído' });
    }
  }, [subtasks]);

  if (isLoading) {
    return (
      <div className="py-3 px-4 space-y-2 animate-fade-in">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-6 w-64" />
        ))}
      </div>
    );
  }

  if (!subtasks || subtasks.length === 0) {
    return (
      <div className="py-3 px-4 text-sm text-muted-foreground animate-fade-in">
        Nenhuma subtarefa
      </div>
    );
  }

  return (
    <div className="py-3 px-4 space-y-2 animate-fade-in">
      {subtasks.map((subtask, index) => (
        <div
          key={subtask.id}
          className="flex items-center gap-3 group animate-fade-in"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <Checkbox
            checked={subtask.is_completed}
            onCheckedChange={() => handleToggle(subtask.id, subtask.is_completed)}
            className="data-[state=checked]:bg-success data-[state=checked]:border-success transition-all duration-200"
          />
          <span
            className={cn(
              'text-sm transition-all duration-200',
              subtask.is_completed && 'line-through text-muted-foreground'
            )}
          >
            {subtask.title}
          </span>
        </div>
      ))}
    </div>
  );
}
