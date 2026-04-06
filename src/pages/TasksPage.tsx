import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { TaskTable } from '@/components/tasks/TaskTable';
import { TaskFilters, TaskFiltersState } from '@/components/tasks/TaskFilters';
import { TaskEditDialog } from '@/components/tasks/TaskEditDialog';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';
import { TasksDashboard } from '@/components/tasks/TasksDashboard';
import { TasksKanban } from '@/components/tasks/TasksKanban';
import { AssigneeSelectorForm } from '@/components/tasks/AssigneeSelectorForm';
import { RecurrenceSelect } from '@/components/tasks/RecurrenceSelect';
import { NewTaskSubtasks } from '@/components/tasks/NewTaskSubtasks';
import { useTasks, TaskWithAssignees, useUpdateTask, useUpdateTaskStatus, useDeleteTask } from '@/hooks/useTasks';
import { useClients } from '@/hooks/useClients';
import { useProjects } from '@/hooks/useProjects';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useUpdateTaskAssignees } from '@/hooks/useTaskAssignees';
import { useCreateTaskWithRelations } from '@/hooks/useCreateTaskWithRelations';
import { Task, TaskStatus, TaskPriority, TaskType, TaskRecurrence } from '@/types/database';
import { filterTasks, isFilterActive } from '@/utils/filterTasks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, List, LayoutDashboard, Kanban } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

export default function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState(searchParams.get('view') || 'dashboard');
  
  const { data: tasks, isLoading } = useTasks();
  const { data: clients } = useClients();
  const { data: projects } = useProjects();
  const { data: teamMembers } = useTeamMembers();
  const createTaskWithRelations = useCreateTaskWithRelations();
  const updateTask = useUpdateTask();
  const updateTaskStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();
  const updateTaskAssignees = useUpdateTaskAssignees();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewingTask, setViewingTask] = useState<TaskWithAssignees | null>(null);
  const [editingTask, setEditingTask] = useState<TaskWithAssignees | null>(null);
  
  const [filters, setFilters] = useState<TaskFiltersState>({
    search: '',
    client_id: '',
    project_id: '',
    status: '',
    type: '',
    priority: '',
    overdueOnly: false,
    showCompleted: false,
    dateFrom: '',
    dateTo: '',
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'A Fazer' as TaskStatus,
    priority: 'Média' as TaskPriority,
    type: 'Outro' as TaskType,
    recurrence: 'Nenhuma' as TaskRecurrence,
    client_id: '',
    due_date: '',
    due_time: '',
    assignee_ids: [] as string[],
    subtasks: [] as string[],
  });

  const handleViewChange = (view: string) => {
    setViewMode(view);
    setSearchParams({ view }, { replace: true });
  };

  // Uses atomic RPC — single transaction for task + assignees + subtasks
  const handleCreateSubmit = async () => {
    await createTaskWithRelations.mutateAsync({
      title: formData.title,
      description: formData.description || undefined,
      status: formData.status,
      priority: formData.priority,
      type: formData.type,
      recurrence: formData.recurrence,
      client_id: formData.client_id || null,
      due_date: formData.due_date || null,
      due_time: formData.due_time || null,
      assignee_ids: formData.assignee_ids,
      subtask_titles: formData.subtasks,
    });

    setFormData({
      title: '',
      description: '',
      status: 'A Fazer',
      priority: 'Média',
      type: 'Outro',
      recurrence: 'Nenhuma',
      client_id: '',
      due_date: '',
      due_time: '',
      assignee_ids: [],
      subtasks: [],
    });
    setIsCreateDialogOpen(false);
  };

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    await updateTaskStatus.mutateAsync({ id: taskId, status });
  };

  const handleAssigneesChange = async (taskId: string, memberIds: string[]) => {
    await updateTaskAssignees.mutateAsync({ taskId, memberIds });
  };

  const handleEditSave = async (taskData: Partial<Task> & { id: string }) => {
    await updateTask.mutateAsync(taskData);
    setEditingTask(null);
  };

  const handleComplete = async (task: TaskWithAssignees) => {
    await updateTaskStatus.mutateAsync({ id: task.id, status: 'Concluído' });
  };

  // Debounce only the text search — other filter changes (status, client…) stay immediate
  const debouncedSearch = useDebounce(filters.search, 300);
  const effectiveFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch],
  );

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    return filterTasks(tasks, effectiveFilters);
  }, [tasks, effectiveFilters]);

  const hasFilters = isFilterActive(effectiveFilters);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex gap-4">
            {viewMode === 'calendar' ? (
              <div className="w-full">
                <Skeleton className="h-12 w-full mb-4" />
                <Skeleton className="h-[500px] w-full" />
              </div>
            ) : (
              <div className="w-full">
                <Skeleton className="h-12 w-full mb-4" />
                <Skeleton className="h-[400px] w-full" />
              </div>
            )}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Tabs value={viewMode} onValueChange={handleViewChange}>
              <TabsList>
                <TabsTrigger value="dashboard" className="gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Painel
                </TabsTrigger>
                <TabsTrigger value="kanban" className="gap-2">
                  <Kanban className="h-4 w-4" />
                  Kanban
                </TabsTrigger>
                <TabsTrigger value="list" className="gap-2">
                  <List className="h-4 w-4" />
                  Lista
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 w-full sm:w-auto">
                  <Plus className="w-4 h-4" />
                  Nova Tarefa
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px] max-h-[90vh] p-0">
                <DialogHeader className="p-6 pb-0">
                  <DialogTitle>Nova Tarefa</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[calc(90vh-120px)]">
                  <div className="space-y-4 p-6 pt-4">
                    <div>
                      <Label>Título</Label>
                      <Input
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Título da tarefa"
                      />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Textarea
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Descrição opcional"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Tipo</Label>
                        <Select
                          value={formData.type}
                          onValueChange={(value: TaskType) => setFormData({ ...formData, type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-50 bg-popover">
                            <SelectItem value="Campanha">Campanha</SelectItem>
                            <SelectItem value="Criativo">Criativo</SelectItem>
                            <SelectItem value="Relatório">Relatório</SelectItem>
                            <SelectItem value="Onboarding">Onboarding</SelectItem>
                            <SelectItem value="Otimização">Otimização</SelectItem>
                            <SelectItem value="Outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Prioridade</Label>
                        <Select
                          value={formData.priority}
                          onValueChange={(value: TaskPriority) => setFormData({ ...formData, priority: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-50 bg-popover">
                            <SelectItem value="Baixa">Baixa</SelectItem>
                            <SelectItem value="Média">Média</SelectItem>
                            <SelectItem value="Alta">Alta</SelectItem>
                            <SelectItem value="Urgente">Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Cliente (opcional)</Label>
                        <Select
                          value={formData.client_id}
                          onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar" />
                          </SelectTrigger>
                          <SelectContent className="z-50 bg-popover">
                            {clients?.map(client => (
                              <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Data limite</Label>
                        <Input
                          type="date"
                          value={formData.due_date}
                          onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Horário</Label>
                        <Input
                          type="time"
                          value={formData.due_time}
                          onChange={e => setFormData({ ...formData, due_time: e.target.value })}
                          placeholder="00:00"
                        />
                      </div>
                    </div>
                    
                    <RecurrenceSelect
                      value={formData.recurrence}
                      onChange={(value) => setFormData({ ...formData, recurrence: value })}
                    />
                    
                    <AssigneeSelectorForm
                      selectedIds={formData.assignee_ids}
                      teamMembers={teamMembers || []}
                      onChange={(ids) => setFormData({ ...formData, assignee_ids: ids })}
                    />
                    
                    <NewTaskSubtasks
                      subtasks={formData.subtasks}
                      onChange={(subtasks) => setFormData({ ...formData, subtasks })}
                    />
                    
                    <Button 
                      onClick={handleCreateSubmit} 
                      className="w-full" 
                      disabled={createTaskWithRelations.isPending || !formData.title}
                    >
                      Criar Tarefa
                    </Button>
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {viewMode === 'dashboard' ? (
          <TasksDashboard
            tasks={tasks || []}
            onTaskClick={setViewingTask}
          />
        ) : viewMode === 'kanban' ? (
          <>
            <TaskFilters
              filters={filters}
              onFiltersChange={setFilters}
              clients={clients || []}
              projects={projects || []}
            />
            <TasksKanban
              tasks={filteredTasks}
              onStatusChange={handleStatusChange}
              onTaskClick={setViewingTask}
            />
          </>
        ) : (
          <>
            <TaskFilters
              filters={filters}
              onFiltersChange={setFilters}
              clients={clients || []}
              projects={projects || []}
            />
            <TaskTable
              tasks={filteredTasks}
              isLoading={isLoading}
              teamMembers={teamMembers || []}
              onStatusChange={handleStatusChange}
              onAssigneesChange={handleAssigneesChange}
              onEdit={setViewingTask}
              onComplete={handleComplete}
              onDelete={(id) => deleteTask.mutate(id)}
              onCreateTask={() => setIsCreateDialogOpen(true)}
              hasActiveFilters={hasFilters}
            />
          </>
        )}

        <TaskDetailModal
          task={viewingTask}
          open={!!viewingTask}
          onOpenChange={(open) => !open && setViewingTask(null)}
          onEdit={(task) => {
            setViewingTask(null);
            setEditingTask(task);
          }}
        />

        <TaskEditDialog
          task={editingTask}
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
          onSave={handleEditSave}
          clients={clients || []}
          projects={projects || []}
          isPending={updateTask.isPending}
        />
      </div>
    </MainLayout>
  );
}
