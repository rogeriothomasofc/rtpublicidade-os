import { useState } from 'react';
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
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      onMoveTask(taskId, status);
    }
  };

  return (
    <div
      className={cn(
        'flex-shrink-0 w-72 rounded-lg p-3 transition-all duration-150',
        isDragOver
          ? 'bg-primary/10 ring-2 ring-primary/40 ring-inset'
          : 'bg-secondary/50'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={cn('w-3 h-3 rounded-full', color)} />
        <h3 className="font-semibold text-sm">{title}</h3>
        <span className="text-xs text-muted-foreground ml-auto bg-muted px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>
      <div className="space-y-2 min-h-[40px]">
        {tasks.map((task) => (
          <KanbanCard key={task.id} task={task} />
        ))}
        {isDragOver && tasks.length === 0 && (
          <div className="h-16 rounded-lg border-2 border-dashed border-primary/40 flex items-center justify-center">
            <span className="text-xs text-primary/50">Soltar aqui</span>
          </div>
        )}
      </div>
    </div>
  );
}
