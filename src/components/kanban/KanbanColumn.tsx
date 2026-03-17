import { Task, TaskStatus } from '@/types/database';
import { KanbanCard } from './KanbanCard';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  title: string;
  status: TaskStatus;
  color: string;
  tasks: Task[];
  onMoveTask: (taskId: string, newStatus: TaskStatus) => void;
}

export function KanbanColumn({ title, status, color, tasks, onMoveTask }: KanbanColumnProps) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      onMoveTask(taskId, status);
    }
  };

  return (
    <div
      className="flex-shrink-0 w-72 bg-secondary/50 rounded-lg p-3"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={cn('w-3 h-3 rounded-full', color)} />
        <h3 className="font-semibold text-sm">{title}</h3>
        <span className="text-xs text-muted-foreground ml-auto bg-muted px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>
      <div className="space-y-2">
        {tasks.map((task) => (
          <KanbanCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}
