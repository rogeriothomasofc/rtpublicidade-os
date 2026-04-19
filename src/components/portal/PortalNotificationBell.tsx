import { useState } from 'react';
import { Bell, CheckCircle2, AlertTriangle, Clock, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

type PortalAlert = {
  id: string;
  type: 'success' | 'warning' | 'danger' | 'info';
  icon: React.ReactNode;
  title: string;
  message: string;
};

interface PortalTimelineTask {
  id: string;
  title: string;
  status: string;
  updated_at: string;
}

interface PortalTimelineFinance {
  id: string;
  amount: number;
  due_date: string;
  status: string;
}

interface PortalTimelinePlanning {
  id: string;
  name: string;
  status: string;
}

interface PortalNotificationBellProps {
  tasks: PortalTimelineTask[];
  finance: PortalTimelineFinance[];
  planning: PortalTimelinePlanning[];
}

function buildAlerts(tasks: PortalTimelineTask[], finance: PortalTimelineFinance[], planning: PortalTimelinePlanning[]): PortalAlert[] {
  const alerts: PortalAlert[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Completed tasks (last 7 days)
  tasks?.forEach((t) => {
    if (t.status === 'Concluído') {
      const updated = new Date(t.updated_at);
      const diffDays = Math.floor((today.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) {
        alerts.push({
          id: `task-done-${t.id}`,
          type: 'success',
          icon: <CheckCircle2 className="w-4 h-4 text-success" />,
          title: 'Tarefa concluída',
          message: `"${t.title}" foi concluída!`,
        });
      }
    }
  });

  // Overdue invoices
  finance?.forEach((f) => {
    if (f.status === 'Atrasado') {
      alerts.push({
        id: `fin-overdue-${f.id}`,
        type: 'danger',
        icon: <AlertTriangle className="w-4 h-4 text-destructive" />,
        title: 'Fatura atrasada',
        message: `${formatCurrency(Number(f.amount))} venceu em ${formatDate(f.due_date)}`,
      });
    } else if (f.status === 'Pendente' && f.due_date) {
      const due = new Date(f.due_date + 'T12:00:00');
      due.setHours(12, 0, 0, 0);
      const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 3) {
        alerts.push({
          id: `fin-near-${f.id}`,
          type: 'warning',
          icon: <Clock className="w-4 h-4 text-warning" />,
          title: 'Fatura próxima do vencimento',
          message: `${formatCurrency(Number(f.amount))} vence ${diffDays === 0 ? 'hoje' : diffDays === 1 ? 'amanhã' : `em ${diffDays} dias`}`,
        });
      }
    }
  });

  // Active campaigns
  planning?.forEach((p) => {
    if (p.status === 'Ativo') {
      alerts.push({
        id: `plan-active-${p.id}`,
        type: 'info',
        icon: <Megaphone className="w-4 h-4 text-primary" />,
        title: 'Campanha ativa',
        message: `"${p.name}" está no ar! 🚀`,
      });
    }
  });

  return alerts;
}

const alertBorderColors: Record<string, string> = {
  success: 'border-l-success',
  warning: 'border-l-warning',
  danger: 'border-l-destructive',
  info: 'border-l-primary',
};

export function PortalNotificationBell({ tasks, finance, planning }: PortalNotificationBellProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const allAlerts = buildAlerts(tasks, finance, planning);
  const alerts = allAlerts.filter((a) => !dismissed.has(a.id));
  const count = alerts.length;

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className={cn('h-5 w-5 transition-transform', count > 0 && 'animate-pulse')} />
          {count > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {count > 9 ? '9+' : count}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold text-sm">Notificações</h4>
          {count > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setDismissed(new Set(allAlerts.map((a) => a.id)))}
            >
              Limpar tudo
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[340px]">
          {alerts.length > 0 ? (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  'p-3 border-b last:border-b-0 border-l-4 cursor-pointer hover:bg-muted/50 transition-colors',
                  alertBorderColors[alert.type]
                )}
                onClick={() => handleDismiss(alert.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{alert.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{alert.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
