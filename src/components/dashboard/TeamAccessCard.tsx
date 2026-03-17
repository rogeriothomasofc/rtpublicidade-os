import { useUserAccessStats } from '@/hooks/useUserAccessTracking';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}min`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Online agora';
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Ontem';
  return `${days} dias atrás`;
}

function isOnline(dateStr: string): boolean {
  const diff = Date.now() - new Date(dateStr).getTime();
  return diff < 5 * 60 * 1000; // 5 min
}

export function TeamAccessCard() {
  const { data: stats, isLoading } = useUserAccessStats();

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Atividade da Equipe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const onlineCount = stats?.filter(s => s.lastAccess && isOnline(s.lastAccess)).length || 0;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3 p-4 md:p-6 md:pb-3">
        <CardTitle className="text-base md:text-lg flex items-center gap-2">
          <Activity className="w-4 h-4 md:w-5 md:h-5 text-primary" />
          Atividade da Equipe
          {onlineCount > 0 && (
            <Badge variant="outline" className="ml-auto text-[10px] md:text-xs border-success/50 text-success bg-success/10">
              {onlineCount} online
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0">
        {stats && stats.length > 0 ? (
          <div className="space-y-3">
            {stats.slice(0, 6).map(user => {
              const online = user.lastAccess ? isOnline(user.lastAccess) : false;
              const initials = user.userName
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

              return (
                <div
                  key={user.userId}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="relative">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.avatarUrl || undefined} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
                        online ? 'bg-success' : 'bg-muted-foreground/40'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.userName}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.lastAccess ? timeAgo(user.lastAccess) : 'Nunca acessou'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="w-3 h-3" />
                      <span>{user.totalSessions}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{formatDuration(user.totalTimeSeconds)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum acesso registrado ainda.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
