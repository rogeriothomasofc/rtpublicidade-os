import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FinanceCategoryRecord } from '@/types/database';

const COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7', '#f97316', '#06b6d4', '#ec4899'];

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<FinanceCategoryRecord, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  isLoading?: boolean;
  editing?: FinanceCategoryRecord | null;
}

export function CategoryFormDialog({ open, onOpenChange, onSubmit, isLoading, editing }: CategoryFormDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('Despesa');
  const [color, setColor] = useState('#ef4444');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setType(editing.type);
      setColor(editing.color);
      setIsActive(editing.is_active);
    } else {
      setName(''); setType('Despesa'); setColor('#ef4444'); setIsActive(true);
    }
  }, [editing, open]);

  const handleSubmit = async () => {
    if (!name) return;
    await onSubmit({ name, type, color, is_active: isActive, rules: null });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Ferramentas SaaS" />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Receita">Receita</SelectItem>
                <SelectItem value="Despesa">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cor</Label>
            <div className="flex gap-2 flex-wrap mt-1">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-primary scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <Button onClick={handleSubmit} className="w-full" disabled={isLoading || !name}>
            {isLoading ? 'Salvando...' : (editing ? 'Atualizar' : 'Criar Categoria')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
