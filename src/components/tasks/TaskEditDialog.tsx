import { useState, useEffect } from 'react';
import { Task, TaskStatus, TaskPriority, TaskType, TaskRecurrence, Client, Project } from '@/types/database';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RecurrenceSelect } from './RecurrenceSelect';
import { SubtasksList } from './SubtasksList';
import { AssigneeSelectorForm } from './AssigneeSelectorForm';
import { useSubtasks } from '@/hooks/useSubtasks';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useUpdateTaskAssignees } from '@/hooks/useTaskAssignees';
import { TaskWithAssignees } from '@/hooks/useTasks';

interface TaskFormData {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  recurrence: TaskRecurrence;
  client_id: string;
  project_id: string;
  due_date: string;
  due_time: string;
}

interface TaskEditDialogProps {
  task: Task | TaskWithAssignees | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (task: Partial<Task> & { id: string }) => void;
  clients: Client[];
  projects: Project[];
  isPending?: boolean;
}

export function TaskEditDialog({ 
  task, 
  open, 
  onOpenChange, 
  onSave, 
  clients, 
  projects,
  isPending 
}: TaskEditDialogProps) {
  const { data: teamMembers } = useTeamMembers();
  const { data: subtasks, isLoading: subtasksLoading } = useSubtasks(task?.id || null);
  const updateTaskAssignees = useUpdateTaskAssignees();
  
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    status: 'A Fazer' as TaskStatus,
    priority: 'Média' as TaskPriority,
    type: 'Outro' as TaskType,
    recurrence: 'Nenhuma' as TaskRecurrence,
    client_id: '',
    project_id: '',
    due_date: '',
    due_time: '',
  });

  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        type: task.type,
        recurrence: (task as Task).recurrence || 'Nenhuma',
        client_id: task.client_id || '',
        project_id: task.project_id || '',
        due_date: task.due_date || '',
        due_time: (task as any).due_time || '',
      });
      
      const taskWithAssignees = task as TaskWithAssignees;
      if (taskWithAssignees.assignees) {
        setAssigneeIds(taskWithAssignees.assignees.map(a => a.member.id));
      } else {
        setAssigneeIds([]);
      }
    }
  }, [task]);

  const handleSave = async () => {
    if (!task) return;
    onSave({
      id: task.id,
      ...formData,
      client_id: formData.client_id || null,
      project_id: formData.project_id || null,
      due_date: formData.due_date || null,
      due_time: formData.due_time || null,
    } as any);
    await updateTaskAssignees.mutateAsync({
      taskId: task.id,
      memberIds: assigneeIds,
    });
  };

  const filteredProjects = formData.client_id 
    ? projects.filter(p => p.client_id === formData.client_id)
    : projects;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Editar Tarefa</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="space-y-4 p-6 pt-4">
            <div>
              <Label>Título</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Título da tarefa"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: TaskStatus) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-popover">
                    <SelectItem value="A Fazer">A Fazer</SelectItem>
                    <SelectItem value="Fazendo">Fazendo</SelectItem>
                    <SelectItem value="Atrasado">Atrasado</SelectItem>
                    <SelectItem value="Concluído">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data limite</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Horário</Label>
                <Input
                  type="time"
                  value={formData.due_time}
                  onChange={(e) => setFormData({ ...formData, due_time: e.target.value })}
                />
              </div>
              <div>
                <Label>Cliente</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value, project_id: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-popover">
                    <SelectItem value="none">Nenhum</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Projeto</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-popover">
                    <SelectItem value="none">Nenhum</SelectItem>
                    {filteredProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <RecurrenceSelect
              value={formData.recurrence}
              onChange={(value) => setFormData({ ...formData, recurrence: value })}
            />
            
            <AssigneeSelectorForm
              selectedIds={assigneeIds}
              teamMembers={teamMembers || []}
              onChange={setAssigneeIds}
            />
            
            {task && (
              <SubtasksList
                taskId={task.id}
                subtasks={subtasks || []}
                isLoading={subtasksLoading}
              />
            )}
            
            <Button 
              onClick={handleSave} 
              className="w-full" 
              disabled={isPending || updateTaskAssignees.isPending || !formData.title}
            >
              Salvar Alterações
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
