import { useState } from 'react';
import { Task } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface KanbanCardProps {
  task: Task;
}

const priorityColors = {
  Low: 'bg-muted text-muted-foreground',
  Medium: 'bg-primary/10 text-primary',
  High: 'bg-warning/10 text-warning',
  Urgent: 'bg-destructive/10 text-destructive',
};

const typeColors = {
  Campaign: 'bg-primary text-primary-foreground',
  Creative: 'bg-success text-success-foreground',
  Report: 'bg-muted text-foreground',
  Onboarding: 'bg-warning text-warning-foreground',
  Other: 'bg-secondary text-secondary-foreground',
};

export function KanbanCard({ task }: KanbanCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <Card
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        'cursor-grab active:cursor-grabbing hover:shadow-md transition-all border-border/50 select-none',
        isDragging && 'opacity-40 scale-95 shadow-lg ring-2 ring-primary/30'
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <Badge className={cn('text-xs', typeColors[task.type])}>
            {task.type}
          </Badge>
          <Badge variant="outline" className={cn('text-xs', priorityColors[task.priority])}>
            {task.priority}
          </Badge>
        </div>
        <h4 className="font-medium text-sm mb-2 line-clamp-2">{task.title}</h4>
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {task.description}
          </p>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {task.client && (
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span className="truncate max-w-20">{task.client.name}</span>
            </div>
          )}
          {task.due_date && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{format(new Date(task.due_date), 'dd/MM')}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
