import { Task, TaskStatus } from '@/types/database';
import { KanbanColumn } from './KanbanColumn';
import { useUpdateTask } from '@/hooks/useTasks';

interface KanbanBoardProps {
  tasks: Task[];
}

const columns: { status: TaskStatus; title: string; color: string }[] = [
  { status: 'A Fazer', title: 'A Fazer', color: 'bg-muted' },
  { status: 'Fazendo', title: 'Fazendo', color: 'bg-kanban-progress' },
  { status: 'Atrasado', title: 'Atrasado', color: 'bg-destructive' },
  { status: 'Concluído', title: 'Concluído', color: 'bg-kanban-done' },
];

export function KanbanBoard({ tasks }: KanbanBoardProps) {
  const updateTask = useUpdateTask();

  const handleMoveTask = (taskId: string, newStatus: TaskStatus) => {
    updateTask.mutate({ id: taskId, status: newStatus });
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => (
        <KanbanColumn
          key={column.status}
          title={column.title}
          status={column.status}
          color={column.color}
          tasks={tasks.filter((task) => task.status === column.status)}
          onMoveTask={handleMoveTask}
        />
      ))}
    </div>
  );
}
