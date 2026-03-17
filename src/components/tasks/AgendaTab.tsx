import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import {
  useGoogleCalendarStatus,
  useGoogleCalendarAuth,
  useGoogleCalendarSync,
  useGoogleCalendarEvents,
  useGoogleCalendarDisconnect,
} from '@/hooks/useGoogleCalendar';
import { CalendarDays, RefreshCw, Link2, Unlink, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { date?: string; dateTime?: string };
  end: { date?: string; dateTime?: string };
  colorId?: string;
}

const colorMap: Record<string, string> = {
  '3': 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30',
  '5': 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30',
  '6': 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30',
  '8': 'bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30',
  '10': 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  '11': 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30',
};

export function AgendaTab() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const queryClient = useQueryClient();

  const { data: status, isLoading: statusLoading } = useGoogleCalendarStatus();
  const authMutation = useGoogleCalendarAuth();
  const syncMutation = useGoogleCalendarSync();
  const disconnectMutation = useGoogleCalendarDisconnect();

  const timeMin = startOfMonth(currentMonth).toISOString();
  const timeMax = endOfMonth(currentMonth).toISOString();
  const { data: events = [], isLoading: eventsLoading } = useGoogleCalendarEvents(
    status?.connected ? timeMin : undefined,
    status?.connected ? timeMax : undefined
  );

  useEffect(() => {
    const handleFocus = () => {
      queryClient.invalidateQueries({ queryKey: ['google-calendar-status'] });
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [queryClient]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDay = useCallback((day: Date) => {
    return (events as CalendarEvent[]).filter(event => {
      const eventDate = event.start?.date || event.start?.dateTime;
      if (!eventDate) return false;
      return isSameDay(parseISO(eventDate), day);
    });
  }, [events]);

  const today = new Date();

  if (statusLoading) {
    return <Skeleton className="h-[500px] w-full" />;
  }

  if (!status?.connected) {
    return (
      <Card className="p-12 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <CalendarDays className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Conecte seu Google Calendar</h3>
        <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
          Sincronize tarefas, datas de revisão de projetos e vencimentos financeiros automaticamente com sua agenda do Google.
        </p>
        <Button onClick={() => authMutation.mutate()} disabled={authMutation.isPending} className="gap-2">
          <Link2 className="h-4 w-4" />
          Conectar agora
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <Badge variant="outline" className="gap-1.5 text-emerald-600 border-emerald-600/30 bg-emerald-500/10">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Conectado
        </Badge>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
        >
          <RefreshCw className={cn("h-4 w-4", syncMutation.isPending && "animate-spin")} />
          Sincronizar
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 text-destructive">
              <Unlink className="h-4 w-4" />
              Desconectar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Desconectar Google Calendar</AlertDialogTitle>
              <AlertDialogDescription>
                Os eventos criados no Google Calendar serão mantidos, mas a sincronização será interrompida.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => disconnectMutation.mutate()}
                className="bg-destructive text-destructive-foreground"
              >
                Desconectar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-lg capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          {eventsLoading ? (
            <Skeleton className="h-[500px] w-full" />
          ) : (
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="bg-muted/50 p-2 text-center text-xs font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
              {calendarDays.map((day, i) => {
                const dayEvents = getEventsForDay(day);
                const isToday = isSameDay(day, today);
                const isCurrentMonth = isSameMonth(day, currentMonth);

                return (
                  <div
                    key={i}
                    className={cn(
                      "bg-card min-h-[80px] sm:min-h-[100px] p-1",
                      !isCurrentMonth && "opacity-40"
                    )}
                  >
                    <div className={cn(
                      "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                      isToday && "bg-primary text-primary-foreground"
                    )}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className={cn(
                            "text-[10px] sm:text-xs px-1 py-0.5 rounded truncate border",
                            colorMap[event.colorId || ''] || 'bg-primary/10 text-primary border-primary/20'
                          )}
                          title={event.summary}
                        >
                          {event.summary}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-muted-foreground text-center">
                          +{dayEvents.length - 3} mais
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
