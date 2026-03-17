import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, X } from 'lucide-react';

interface NewTaskSubtasksProps {
  subtasks: string[];
  onChange: (subtasks: string[]) => void;
}

export function NewTaskSubtasks({ subtasks, onChange }: NewTaskSubtasksProps) {
  const [newSubtask, setNewSubtask] = useState('');

  const handleAdd = () => {
    if (!newSubtask.trim()) return;
    onChange([...subtasks, newSubtask.trim()]);
    setNewSubtask('');
  };

  const handleRemove = (index: number) => {
    onChange(subtasks.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-3">
      <Label>Subtarefas</Label>
      
      {subtasks.length > 0 && (
        <div className="space-y-2">
          {subtasks.map((subtask, index) => (
            <div 
              key={index} 
              className="flex items-center gap-2 text-sm bg-muted/50 rounded-md px-3 py-2"
            >
              <span className="flex-1">{subtask}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleRemove(index)}
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
          value={newSubtask}
          onChange={(e) => setNewSubtask(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-8 text-sm"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={handleAdd}
          disabled={!newSubtask.trim()}
          className="h-8"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
