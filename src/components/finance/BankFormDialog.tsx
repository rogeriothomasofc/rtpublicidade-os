import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Bank } from '@/types/database';

interface BankFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Bank, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  isLoading?: boolean;
  editing?: Bank | null;
}

export function BankFormDialog({ open, onOpenChange, onSubmit, isLoading, editing }: BankFormDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('Conta Corrente');
  const [balance, setBalance] = useState(0);
  const [status, setStatus] = useState('Ativo');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setType(editing.type);
      setBalance(editing.balance);
      setStatus(editing.status);
      setNotes(editing.notes || '');
    } else {
      setName(''); setType('Conta Corrente'); setBalance(0); setStatus('Ativo'); setNotes('');
    }
  }, [editing, open]);

  const handleSubmit = async () => {
    if (!name) return;
    await onSubmit({ name, type, balance, status, notes: notes || null });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar Banco' : 'Adicionar Banco'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Itaú, Nubank" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Conta Corrente">Conta Corrente</SelectItem>
                  <SelectItem value="Conta Poupança">Conta Poupança</SelectItem>
                  <SelectItem value="Conta Digital">Conta Digital</SelectItem>
                  <SelectItem value="Investimento">Investimento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Saldo Inicial</Label>
              <Input type="number" value={balance || ''} onChange={e => setBalance(Number(e.target.value))} placeholder="0.00" />
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações..." rows={2} />
          </div>
          <Button onClick={handleSubmit} className="w-full" disabled={isLoading || !name}>
            {isLoading ? 'Salvando...' : (editing ? 'Atualizar' : 'Criar Banco')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
