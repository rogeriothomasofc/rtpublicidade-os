import { useState } from 'react';
import { Subtask } from '@/types/database';
import { useCreateSubtask, useUpdateSubtask, useDeleteSubtask } from '@/hooks/useSubtasks';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, X, Loader2 } from 'lucide-react';

interface SubtasksListProps {
  taskId: string;
  subtasks: Subtask[];
  isLoading?: boolean;
}

export function SubtasksList({ taskId, subtasks, isLoading }: SubtasksListProps) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const createSubtask = useCreateSubtask();
  const updateSubtask = useUpdateSubtask();
  const deleteSubtask = useDeleteSubtask();

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;
    
    await createSubtask.mutateAsync({ taskId, title: newSubtaskTitle.trim() });
    setNewSubtaskTitle('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSubtask();
    }
  };

  const handleToggleComplete = async (subtask: Subtask) => {
    await updateSubtask.mutateAsync({
      id: subtask.id,
      taskId,
      is_completed: !subtask.is_completed,
    });
  };

  const handleDelete = async (subtaskId: string) => {
    await deleteSubtask.mutateAsync({ id: subtaskId, taskId });
  };

  const completedCount = subtasks.filter(s => s.is_completed).length;
  const totalCount = subtasks.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Subtarefas</Label>
        {totalCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {completedCount}/{totalCount} concluídas
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2">
          {subtasks.map((subtask) => (
            <div 
              key={subtask.id} 
              className="flex items-center gap-2 group"
            >
              <Checkbox
                checked={subtask.is_completed}
                onCheckedChange={() => handleToggleComplete(subtask)}
                disabled={updateSubtask.isPending}
              />
              <span 
                className={`flex-1 text-sm ${
                  subtask.is_completed 
                    ? 'line-through text-muted-foreground' 
                    : ''
                }`}
              >
                {subtask.title}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleDelete(subtask.id)}
                disabled={deleteSubtask.isPending}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Adicionar subtarefa..."
          value={newSubtaskTitle}
          onChange={(e) => setNewSubtaskTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-8 text-sm"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={handleAddSubtask}
          disabled={createSubtask.isPending || !newSubtaskTitle.trim()}
          className="h-8"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
