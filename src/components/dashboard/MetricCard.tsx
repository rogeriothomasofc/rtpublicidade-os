import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
}

const variantStyles = {
  default: 'bg-muted text-foreground',
  primary: 'bg-primary/15 text-primary',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  destructive: 'bg-destructive/15 text-destructive',
};

export function MetricCard({ title, value, icon: Icon, description, trend, variant = 'default' }: MetricCardProps) {
  return (
    <Card className="border-border hover:glow-primary-hover transition-all duration-300 overflow-hidden">
      <CardContent className="p-3 md:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-base md:text-xl font-bold mt-1 truncate">{value}</p>
            {description && (
              <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>
            )}
            {trend && (
              <p className={cn('text-[10px] md:text-xs mt-1 font-medium', trend.isPositive ? 'text-success' : 'text-destructive')}>
                {trend.isPositive ? '▲' : '▼'} {trend.value}% vs anterior
              </p>
            )}
          </div>
          <div className={cn('p-1.5 md:p-2 rounded-lg shrink-0', variantStyles[variant])}>
            <Icon className="w-3 h-3 md:w-3.5 md:h-3.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
