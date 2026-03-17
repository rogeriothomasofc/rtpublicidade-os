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
      <CardContent className="p-3 md:p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-lg md:text-3xl font-bold mt-1 md:mt-2 truncate">{value}</p>
            {description && (
              <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">{description}</p>
            )}
            {trend && (
              <p
                className={cn(
                  'text-xs md:text-sm mt-0.5 md:mt-1',
                  trend.isPositive ? 'text-success' : 'text-destructive'
                )}
              >
                {trend.isPositive ? '+' : ''}{trend.value}% vs mês anterior
              </p>
            )}
          </div>
          <div className={cn('p-2 md:p-2.5 rounded-lg shrink-0', variantStyles[variant])}>
            <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
