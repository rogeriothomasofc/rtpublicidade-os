import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Task } from '@/types/database';

interface TasksByStatus {
  status: string;
  count: number;
}

interface TasksChartProps {
  tasks: Task[] | TasksByStatus[];
  isFiltered?: boolean;
}

const statusColors: Record<string, string> = {
  'A Fazer': 'hsl(var(--muted))',
  'Fazendo': 'hsl(var(--kanban-progress))',
  'Atrasado': 'hsl(var(--destructive))',
  'Concluído': 'hsl(var(--kanban-done))',
};

const isTasksByStatus = (tasks: Task[] | TasksByStatus[]): tasks is TasksByStatus[] => {
  return tasks.length === 0 || 'count' in tasks[0];
};

export function TasksChart({ tasks, isFiltered = false }: TasksChartProps) {
  const data = isFiltered && isTasksByStatus(tasks)
    ? [
        { name: 'A Fazer', count: tasks.find(t => t.status === 'A Fazer')?.count || 0 },
        { name: 'Fazendo', count: tasks.find(t => t.status === 'Fazendo')?.count || 0 },
        { name: 'Atrasado', count: tasks.find(t => t.status === 'Atrasado')?.count || 0 },
        { name: 'Concluído', count: tasks.find(t => t.status === 'Concluído')?.count || 0 },
      ]
    : [
        { name: 'A Fazer', count: (tasks as Task[]).filter(t => t.status === 'A Fazer').length },
        { name: 'Fazendo', count: (tasks as Task[]).filter(t => t.status === 'Fazendo').length },
        { name: 'Atrasado', count: (tasks as Task[]).filter(t => t.status === 'Atrasado').length },
        { name: 'Concluído', count: (tasks as Task[]).filter(t => t.status === 'Concluído').length },
      ];

  const chartTitle = isFiltered ? 'Tarefas por Status (no período)' : 'Tarefas por Status';

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-lg">{chartTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={statusColors[entry.name]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
