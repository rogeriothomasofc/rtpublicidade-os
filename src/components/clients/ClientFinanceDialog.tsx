import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateFinance } from '@/hooks/useFinance';
import { FinanceRecurrence } from '@/types/database';

const RECURRENCE_OPTIONS: { value: FinanceRecurrence; label: string }[] = [
  { value: 'Nenhuma', label: 'Nenhuma' },
  { value: 'Mensal', label: 'Mensal' },
  { value: 'Trimestral', label: 'Trimestral' },
  { value: 'Semestral', label: 'Semestral' },
  { value: 'Anual', label: 'Anual' },
];

interface ClientFinanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}

export function ClientFinanceDialog({ open, onOpenChange, clientId }: ClientFinanceDialogProps) {
  const createFinance = useCreateFinance();

  const [formData, setFormData] = useState({
    amount: 0,
    due_date: '',
    description: '',
    recurrence: 'Nenhuma' as FinanceRecurrence,
  });

  useEffect(() => {
    if (open) {
      setFormData({
        amount: 0,
        due_date: '',
        description: '',
        recurrence: 'Nenhuma',
      });
    }
  }, [open]);

  const handleSubmit = async () => {
    await createFinance.mutateAsync({
      client_id: clientId,
      amount: formData.amount,
      due_date: formData.due_date,
      description: formData.description || null,
      type: 'Receita',
      status: 'Pendente',
      recurrence: formData.recurrence,
      category: null,
      cost_center: null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Receita</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Valor *</Label>
              <Input
                type="number"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Vencimento *</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Recorrência</Label>
            <Select
              value={formData.recurrence}
              onValueChange={(value: FinanceRecurrence) => setFormData({ ...formData, recurrence: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECURRENCE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição opcional"
              rows={2}
            />
          </div>
          <Button 
            onClick={handleSubmit} 
            className="w-full" 
            disabled={createFinance.isPending || formData.amount <= 0 || !formData.due_date}
          >
            {createFinance.isPending ? 'Criando...' : 'Criar Receita'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
