import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, CalendarDays, AlertTriangle, DollarSign } from 'lucide-react';
import { format, isToday, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TaskWithAssignees } from '@/hooks/useTasks';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

interface TasksDashboardProps {
  tasks: TaskWithAssignees[];
  userName?: string;
  onTaskClick?: (task: TaskWithAssignees) => void;
}

export function TasksDashboard({ tasks, userName, onTaskClick }: TasksDashboardProps) {
  const today = startOfDay(new Date());

  const todayTasks = useMemo(() =>
    tasks.filter(t => t.due_date && isToday(new Date(t.due_date + 'T12:00:00')) && t.status !== 'Concluído'),
    [tasks]
  );

  const todayCompleted = useMemo(() =>
    tasks.filter(t => t.due_date && isToday(new Date(t.due_date + 'T12:00:00')) && t.status === 'Concluído'),
    [tasks]
  );

  const overdueTasks = useMemo(() =>
    tasks.filter(t => {
      if (!t.due_date || t.status === 'Concluído') return false;
      return isBefore(new Date(t.due_date + 'T12:00:00'), today);
    }),
    [tasks, today]
  );

  const priorityTasks = useMemo(() =>
    tasks.filter(t =>
      t.status !== 'Concluído' &&
      (t.priority === 'Urgente' || t.priority === 'Alta')
    ).slice(0, 5),
    [tasks]
  );

  const todayTotal = todayTasks.length + todayCompleted.length;
  const todayDone = todayCompleted.length;
  const todayProgress = todayTotal > 0 ? (todayDone / todayTotal) * 100 : 0;

  const agendaTasks = useMemo(() => {
    const combined = [...todayTasks, ...overdueTasks];
    const unique = Array.from(new Map(combined.map(t => [t.id, t])).values());
    return unique.sort((a, b) => {
      if (a.priority === 'Urgente' && b.priority !== 'Urgente') return -1;
      if (b.priority === 'Urgente' && a.priority !== 'Urgente') return 1;
      return ((a as any).due_time || '').localeCompare((b as any).due_time || '');
    });
  }, [todayTasks, overdueTasks]);

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold">
          {getGreeting()}{userName ? `, ${userName}` : ''}! 👋
        </h1>
        <p className="text-muted-foreground capitalize">
          {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Tarefas Hoje</p>
                <p className="text-2xl font-bold mt-1">{todayDone}/{todayTotal}</p>
              </div>
              <Progress value={todayProgress} className="w-16 h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Agenda do Mês</p>
                <p className="text-2xl font-bold text-emerald-500 mt-1">
                  {tasks.filter(t => {
                    if (!t.due_date) return false;
                    const d = new Date(t.due_date + 'T12:00:00');
                    const now = new Date();
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold text-amber-500 mt-1">
                  {tasks.filter(t => t.status === 'A Fazer').length}
                </p>
              </div>
              <DollarSign className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Alertas</p>
                <p className={cn("text-2xl font-bold mt-1", overdueTasks.length > 0 ? "text-destructive" : "")}>
                  {overdueTasks.length}
                </p>
              </div>
              <AlertTriangle className={cn("h-5 w-5", overdueTasks.length > 0 ? "text-destructive" : "text-muted-foreground")} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agenda + Priority */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agenda do Dia */}
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Agenda do Dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            {agendaTasks.length > 0 ? (
              <div className="space-y-3">
                {agendaTasks.map(task => {
                  const isOverdue = task.due_date && isBefore(new Date(task.due_date + 'T12:00:00'), today);
                  return (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg cursor-pointer hover:bg-secondary/80 transition-colors"
                      onClick={() => onTaskClick?.(task)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {isOverdue ? '⚠️ Atrasada' : (task as any).due_time ? `🕐 ${(task as any).due_time}` : '📅 Hoje'}
                          {task.client?.name && ` · ${task.client.name}`}
                        </p>
                      </div>
                      <Badge variant={
                        isOverdue ? 'destructive' :
                        task.priority === 'Urgente' ? 'destructive' :
                        task.priority === 'Alta' ? 'destructive' :
                        'secondary'
                      }>
                        {isOverdue ? 'Atrasada' : task.priority}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                </div>
                <p className="font-medium">Nenhuma tarefa para hoje!</p>
                <p className="text-sm text-muted-foreground mt-1">Aproveite para planejar ou adiantar trabalho.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ações Prioritárias */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              🔥 Ações Prioritárias
            </CardTitle>
          </CardHeader>
          <CardContent>
            {priorityTasks.length > 0 ? (
              <div className="space-y-3">
                {priorityTasks.map(task => (
                  <div
                    key={task.id}
                    className="p-3 bg-secondary/50 rounded-lg cursor-pointer hover:bg-secondary/80 transition-colors"
                    onClick={() => onTaskClick?.(task)}
                  >
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={task.priority === 'Urgente' ? 'destructive' : 'secondary'} className="text-[10px]">
                        {task.priority}
                      </Badge>
                      {task.due_date && (
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(task.due_date + 'T12:00:00'), 'dd MMM', { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma ação prioritária no momento</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
