import { useState } from 'react';
import { TaskStatus } from '@/types/database';
import { TaskWithAssignees } from '@/hooks/useTasks';
import { TeamMember } from '@/hooks/useTeamMembers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface TaskCalendarProps {
  tasks: TaskWithAssignees[];
  teamMembers: TeamMember[];
  onTaskClick: (task: TaskWithAssignees) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => Promise<void>;
}

type CalendarView = 'month' | 'week';

const statusColors: Record<TaskStatus, string> = {
  'A Fazer': 'bg-muted border-muted-foreground/30',
  'Fazendo': 'bg-amber-100 border-amber-400 dark:bg-amber-900/30',
  'Atrasado': 'bg-destructive/20 border-destructive',
  'Concluído': 'bg-emerald-100 border-emerald-400 dark:bg-emerald-900/30',
};

const priorityDots: Record<string, string> = {
  'Low': 'bg-slate-400',
  'Medium': 'bg-blue-500',
  'High': 'bg-orange-500',
  'Urgent': 'bg-red-500',
};

export function TaskCalendar({ tasks, teamMembers, onTaskClick, onStatusChange }: TaskCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');

  const navigatePrev = () => {
    if (view === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (view === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getTasksForDay = (day: Date) => {
    return tasks.filter(task => {
      if (!task.due_date) return false;
      return isSameDay(new Date(task.due_date + 'T12:00:00'), day);
    });
  };

  const getDaysToShow = () => {
    if (view === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    } else {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    }
  };

  const days = getDaysToShow();
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const getAssigneesForTask = (task: TaskWithAssignees) => {
    return (task.assignees ?? []).map(a => a.member).filter(Boolean);
  };

  const renderTaskCard = (task: TaskWithAssignees, isCompact: boolean = false) => {
    const assignees = getAssigneesForTask(task);
    
    if (isCompact) {
      return (
        <Popover key={task.id}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "w-full text-left px-1.5 py-0.5 rounded text-xs truncate border-l-2 transition-colors hover:opacity-80",
                statusColors[task.status]
              )}
            >
              <div className="flex items-center gap-1">
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", priorityDots[task.priority])} />
                <span className="truncate">{task.title}</span>
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3 z-50" align="start">
            <div className="space-y-2">
              <h4 className="font-medium">{task.title}</h4>
              {task.description && (
                <p className="text-xs text-muted-foreground">{task.description}</p>
              )}
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">{task.type}</Badge>
                <Badge className={cn("text-xs", statusColors[task.status])}>{task.status}</Badge>
              </div>
              {assignees.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Responsáveis: {assignees.map((a: any) => a.name).join(', ')}
                </div>
              )}
              <Button size="sm" variant="outline" className="w-full" onClick={() => onTaskClick(task)}>
                Editar
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      );
    }

    return (
      <button
        key={task.id}
        onClick={() => onTaskClick(task)}
        className={cn(
          "w-full text-left p-2 rounded border-l-4 transition-colors hover:opacity-80",
          statusColors[task.status]
        )}
      >
        <div className="flex items-start gap-2">
          <span className={cn("w-2 h-2 rounded-full mt-1 shrink-0", priorityDots[task.priority])} />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{task.title}</p>
            {task.client?.name && (
              <p className="text-xs text-muted-foreground truncate">{task.client.name}</p>
            )}
            {assignees.length > 0 && (
              <div className="flex -space-x-1 mt-1">
                {assignees.slice(0, 2).map((a: any) => (
                  <div 
                    key={a.id} 
                    className="w-5 h-5 rounded-full bg-primary/20 text-[10px] flex items-center justify-center border border-background"
                  >
                    {a.name.charAt(0)}
                  </div>
                ))}
                {assignees.length > 2 && (
                  <span className="text-xs text-muted-foreground ml-1">+{assignees.length - 2}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={navigatePrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={navigateNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-lg font-semibold capitalize">
            {view === 'month' 
              ? format(currentDate, 'MMMM yyyy', { locale: ptBR })
              : `Semana de ${format(startOfWeek(currentDate, { weekStartsOn: 0 }), 'd MMM', { locale: ptBR })}`
            }
          </h2>
          <Button variant="ghost" size="sm" onClick={goToToday}>
            Hoje
          </Button>
        </div>
        
        <Tabs value={view} onValueChange={(v) => setView(v as CalendarView)}>
          <TabsList>
            <TabsTrigger value="month">Mês</TabsTrigger>
            <TabsTrigger value="week">Semana</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Calendar Grid */}
      <div className={cn(view === 'week' ? 'min-h-[500px]' : '')}>
        {/* Week days header */}
        <div className="grid grid-cols-7 border-b">
          {weekDays.map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        {view === 'month' ? (
          <div className="grid grid-cols-7">
            {days.map((day, index) => {
              const dayTasks = getTasksForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              
              return (
                <div 
                  key={index}
                  className={cn(
                    "min-h-[100px] p-1 border-r border-b last:border-r-0",
                    !isCurrentMonth && "bg-muted/30"
                  )}
                >
                  <div className={cn(
                    "text-sm font-medium mb-1 p-1 rounded-full w-7 h-7 flex items-center justify-center",
                    isToday(day) && "bg-primary text-primary-foreground",
                    !isCurrentMonth && "text-muted-foreground"
                  )}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5 overflow-hidden max-h-[80px]">
                    {dayTasks.slice(0, 3).map((task) => renderTaskCard(task, true))}
                    {dayTasks.length > 3 && (
                      <p className="text-xs text-muted-foreground px-1">+{dayTasks.length - 3} mais</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-7 h-[500px]">
            {days.map((day, index) => {
              const dayTasks = getTasksForDay(day);
              
              return (
                <div 
                  key={index}
                  className="p-2 border-r last:border-r-0 overflow-y-auto"
                >
                  <div className={cn(
                    "text-center mb-2 pb-2 border-b",
                    isToday(day) && "text-primary"
                  )}>
                    <div className={cn(
                      "text-2xl font-bold mx-auto w-10 h-10 flex items-center justify-center rounded-full",
                      isToday(day) && "bg-primary text-primary-foreground"
                    )}>
                      {format(day, 'd')}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {format(day, 'EEE', { locale: ptBR })}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {dayTasks.map((task) => renderTaskCard(task, false))}
                    {dayTasks.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        Sem tarefas
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
