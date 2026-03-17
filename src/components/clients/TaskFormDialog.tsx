import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateTask } from '@/hooks/useTasks';
import { TaskPriority, TaskType, Project } from '@/types/database';

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  projects: Project[];
}

export function TaskFormDialog({ open, onOpenChange, clientId, projects }: TaskFormDialogProps) {
  const createTask = useCreateTask();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Média' as TaskPriority,
    type: 'Outro' as TaskType,
    project_id: '',
    due_date: '',
  });

  useEffect(() => {
    if (open) {
      setFormData({
        title: '',
        description: '',
        priority: 'Média',
        type: 'Outro',
        project_id: '',
        due_date: '',
      });
    }
  }, [open]);

  const clientProjects = projects.filter(p => p.client_id === clientId);

  const handleSubmit = async () => {
    await createTask.mutateAsync({
      title: formData.title,
      description: formData.description || null,
      priority: formData.priority,
      type: formData.type,
      client_id: clientId,
      project_id: formData.project_id || null,
      due_date: formData.due_date || null,
      status: 'A Fazer',
      recurrence: 'Nenhuma',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Título *</Label>
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
                <SelectContent>
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
                <SelectContent>
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
              <Label>Projeto</Label>
              <Select
                value={formData.project_id}
                onValueChange={(value) => setFormData({ ...formData, project_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {clientProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
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
          <Button 
            onClick={handleSubmit} 
            className="w-full" 
            disabled={createTask.isPending || !formData.title}
          >
            {createTask.isPending ? 'Criando...' : 'Criar Tarefa'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
