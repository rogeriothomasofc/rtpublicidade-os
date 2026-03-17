import { usePortalAccessStats, usePortalAccessLogs } from '@/hooks/usePortalAccessLogs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Eye, Timer, CalendarClock } from 'lucide-react';
import { formatDate } from '@/lib/utils';

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min ${Math.round(seconds % 60)}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}min`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Agora mesmo';
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Ontem';
  return `${days} dias atrás`;
}

interface PortalAccessCardProps {
  clientId: string;
}

export function PortalAccessCard({ clientId }: PortalAccessCardProps) {
  const { stats, isLoading } = usePortalAccessStats(clientId);
  const { data: recentLogs } = usePortalAccessLogs(clientId);

  if (isLoading) return null;

  const last5 = recentLogs?.slice(0, 5) || [];

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Atividade no Portal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Eye className="w-4 h-4 mx-auto mb-1 text-primary" />
            <p className="text-xl font-bold">{stats.totalVisits}</p>
            <p className="text-xs text-muted-foreground">Visitas</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Timer className="w-4 h-4 mx-auto mb-1 text-blue-500" />
            <p className="text-xl font-bold">{formatDuration(stats.totalTimeSeconds)}</p>
            <p className="text-xs text-muted-foreground">Tempo Total</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Clock className="w-4 h-4 mx-auto mb-1 text-warning" />
            <p className="text-xl font-bold">{formatDuration(stats.averageTimeSeconds)}</p>
            <p className="text-xs text-muted-foreground">Média/Visita</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <CalendarClock className="w-4 h-4 mx-auto mb-1 text-success" />
            <p className="text-sm font-bold">{stats.lastAccess ? timeAgo(stats.lastAccess) : '—'}</p>
            <p className="text-xs text-muted-foreground">Último Acesso</p>
          </div>
        </div>

        {last5.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Acessos Recentes</p>
            <div className="space-y-1.5">
              {last5.map(log => (
                <div key={log.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-muted/30">
                  <span className="text-muted-foreground">{formatDate(log.started_at)}</span>
                  <Badge variant="outline" className="text-xs">
                    {log.duration_seconds ? formatDuration(log.duration_seconds) : 'Em andamento'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats.totalVisits === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            O cliente ainda não acessou o portal.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
