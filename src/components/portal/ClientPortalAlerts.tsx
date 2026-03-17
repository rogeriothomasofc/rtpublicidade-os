import { CheckCircle2, AlertTriangle, Clock, Megaphone } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

type AlertItem = {
  id: string;
  type: 'success' | 'warning' | 'danger' | 'info';
  icon: React.ReactNode;
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

interface ClientPortalAlertsProps {
  tasks: PortalTimelineTask[];
  finance: PortalTimelineFinance[];
  planning: PortalTimelinePlanning[];
}

export function ClientPortalAlerts({ tasks, finance, planning }: ClientPortalAlertsProps) {
  const alerts: AlertItem[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Tasks completed recently (last 7 days)
  tasks?.forEach((t) => {
    if (t.status === 'Concluído') {
      const updated = new Date(t.updated_at);
      const diffDays = Math.floor((today.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) {
        alerts.push({
          id: `task-done-${t.id}`,
          type: 'success',
          icon: <CheckCircle2 className="w-4 h-4" />,
          message: `Tarefa "${t.title}" foi concluída!`,
        });
      }
    }
  });

  // Finance: near due (next 3 days) or overdue
  finance?.forEach((f) => {
    if (f.status === 'Atrasado') {
      alerts.push({
        id: `fin-overdue-${f.id}`,
        type: 'danger',
        icon: <AlertTriangle className="w-4 h-4" />,
        message: `Fatura de ${formatCurrency(Number(f.amount))} está atrasada (vencimento: ${formatDate(f.due_date)})`,
      });
    } else if (f.status === 'Pendente' && f.due_date) {
      const due = new Date(f.due_date);
      due.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 3) {
        alerts.push({
          id: `fin-near-${f.id}`,
          type: 'warning',
          icon: <Clock className="w-4 h-4" />,
          message: `Fatura de ${formatCurrency(Number(f.amount))} vence ${diffDays === 0 ? 'hoje' : diffDays === 1 ? 'amanhã' : `em ${diffDays} dias`}`,
        });
      }
    }
  });

  // Planning: status Ativo (published/live)
  planning?.forEach((p) => {
    if (p.status === 'Ativo') {
      alerts.push({
        id: `plan-active-${p.id}`,
        type: 'info',
        icon: <Megaphone className="w-4 h-4" />,
        message: `Campanha "${p.name}" está ativa! 🚀`,
      });
    }
  });

  if (alerts.length === 0) return null;

  const styles: Record<string, string> = {
    success: 'bg-success/10 border-success/30 text-success',
    warning: 'bg-warning/10 border-warning/30 text-warning',
    danger: 'bg-destructive/10 border-destructive/30 text-destructive',
    info: 'bg-primary/10 border-primary/30 text-primary',
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Alertas</h3>
      <div className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${styles[alert.type]} transition-colors`}
          >
            {alert.icon}
            <span className="text-sm font-medium">{alert.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
