import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  /** Quando há filtro ativo mas nenhum resultado — mensagem diferente */
  filtered?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
  filtered = false,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      <div className="w-14 h-14 rounded-2xl bg-muted/60 border border-border/50 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-5">{description}</p>
      {actionLabel && onAction && !filtered && (
        <Button size="sm" onClick={onAction} className="gap-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
