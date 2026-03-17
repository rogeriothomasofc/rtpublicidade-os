import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ContractStatus, useCreateContract } from '@/hooks/useContracts';

const durationOptions = [
  { value: 3, label: '3 meses' },
  { value: 6, label: '6 meses' },
  { value: 12, label: '12 meses' },
];

interface ContractFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}

export function ContractFormDialog({ open, onOpenChange, clientId }: ContractFormDialogProps) {
  const createContract = useCreateContract();

  const [formData, setFormData] = useState({
    value: 0,
    start_date: new Date().toISOString().split('T')[0],
    duration_months: 12,
    description: '',
    status: 'Ativo' as ContractStatus,
  });

  useEffect(() => {
    if (open) {
      setFormData({
        value: 0,
        start_date: new Date().toISOString().split('T')[0],
        duration_months: 12,
        description: '',
        status: 'Ativo',
      });
    }
  }, [open]);

  const handleSubmit = async () => {
    await createContract.mutateAsync({
      client_id: clientId,
      ...formData,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Contrato</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Valor *</Label>
            <Input
              type="number"
              value={formData.value || ''}
              onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
              placeholder="0.00"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data de Início *</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Duração</Label>
              <Select
                value={String(formData.duration_months)}
                onValueChange={(value) => setFormData({ ...formData, duration_months: Number(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Descrição</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição opcional"
            />
          </div>
          <Button 
            onClick={handleSubmit} 
            className="w-full" 
            disabled={createContract.isPending || formData.value <= 0}
          >
            {createContract.isPending ? 'Criando...' : 'Criar Contrato'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
