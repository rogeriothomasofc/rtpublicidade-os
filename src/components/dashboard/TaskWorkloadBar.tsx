import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface TaskWorkloadBarProps {
  tasksByStatus: { status: string; count: number }[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  'Pendente':      { label: 'Pendente',      color: 'bg-muted-foreground/40' },
  'Em andamento':  { label: 'Em andamento',  color: 'bg-primary' },
  'Concluído':     { label: 'Concluído',     color: 'bg-success' },
  'Concluida':     { label: 'Concluído',     color: 'bg-success' },
  'Atrasado':      { label: 'Atrasado',      color: 'bg-destructive' },
  'Em Revisão':    { label: 'Em Revisão',    color: 'bg-warning' },
};

export function TaskWorkloadBar({ tasksByStatus }: TaskWorkloadBarProps) {
  const total = tasksByStatus.reduce((sum, s) => sum + s.count, 0);
  if (total === 0) return null;

  return (
    <Card className="border-border/50">
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">Carga de trabalho por status</p>
          <p className="text-sm font-semibold">{total} tarefas</p>
        </div>

        {/* Barra segmentada */}
        <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
          {tasksByStatus.map((s) => {
            const config = STATUS_CONFIG[s.status] ?? { label: s.status, color: 'bg-muted' };
            const pct = (s.count / total) * 100;
            return (
              <div
                key={s.status}
                className={cn('transition-all duration-500', config.color)}
                style={{ width: `${pct}%` }}
                title={`${config.label}: ${s.count}`}
              />
            );
          })}
        </div>

        {/* Legenda */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
          {tasksByStatus.map((s) => {
            const config = STATUS_CONFIG[s.status] ?? { label: s.status, color: 'bg-muted' };
            const pct = Math.round((s.count / total) * 100);
            return (
              <div key={s.status} className="flex items-center gap-1.5">
                <span className={cn('w-2.5 h-2.5 rounded-sm shrink-0', config.color)} />
                <span className="text-xs text-muted-foreground">{config.label}</span>
                <span className="text-xs font-semibold">{s.count}</span>
                <span className="text-xs text-muted-foreground/60">({pct}%)</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
