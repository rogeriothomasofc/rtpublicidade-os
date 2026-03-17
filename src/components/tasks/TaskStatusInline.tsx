import { useState } from 'react';
import { TaskStatus } from '@/types/database';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskStatusInlineProps {
  status: TaskStatus;
  onStatusChange: (status: TaskStatus) => Promise<void>;
  disabled?: boolean;
}

const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  'A Fazer': { 
    label: 'A Fazer', 
    className: 'bg-muted text-muted-foreground hover:bg-muted/80' 
  },
  'Fazendo': { 
    label: 'Fazendo', 
    className: 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400' 
  },
  'Atrasado': { 
    label: 'Atrasado', 
    className: 'bg-destructive/20 text-destructive hover:bg-destructive/30' 
  },
  'Concluído': { 
    label: 'Concluído', 
    className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400' 
  },
};

export function TaskStatusInline({ status, onStatusChange, disabled }: TaskStatusInlineProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (newStatus === status) return;
    
    setIsLoading(true);
    try {
      await onStatusChange(newStatus);
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  const config = statusConfig[status];

  return (
    <Select
      value={status}
      onValueChange={(value) => handleStatusChange(value as TaskStatus)}
      disabled={disabled || isLoading}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <SelectTrigger 
        className={cn(
          "w-[140px] h-7 border-0 px-2.5 py-0.5 text-xs font-medium rounded-full transition-colors focus:ring-1 focus:ring-offset-1",
          config.className,
          isLoading && "opacity-70"
        )}
      >
        <div className="flex items-center gap-1.5">
          {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent className="z-50 bg-popover">
        {Object.entries(statusConfig).map(([value, { label, className }]) => (
          <SelectItem 
            key={value} 
            value={value}
            className="cursor-pointer"
          >
            <Badge variant="secondary" className={cn("font-medium", className)}>
              {label}
            </Badge>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
