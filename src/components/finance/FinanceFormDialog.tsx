import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Finance, FinanceStatus, FinanceType, FinanceCategory, FinanceRecurrence, Client } from '@/types/database';
import { useBanks } from '@/hooks/useBanks';
import { useFinanceCategories } from '@/hooks/useFinanceCategories';

const EXPENSE_CATEGORIES: FinanceCategory[] = ['Tráfego', 'Ferramentas', 'Salários', 'Freelancer', 'Impostos', 'Outros'];
const RECURRENCE_OPTIONS: { value: FinanceRecurrence; label: string }[] = [
  { value: 'Nenhuma', label: 'Nenhuma' },
  { value: 'Mensal', label: 'Mensal' },
  { value: 'Trimestral', label: 'Trimestral' },
  { value: 'Semestral', label: 'Semestral' },
  { value: 'Anual', label: 'Anual' },
];

interface FinanceFormData {
  type: FinanceType;
  client_id: string;
  category: FinanceCategory | '';
  cost_center: string;
  amount: number;
  due_date: string;
  status: FinanceStatus;
  description: string;
  recurrence: FinanceRecurrence;
  bank_id: string;
  finance_category_id: string;
}

interface FinanceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  onSubmit: (data: Omit<Finance, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  isLoading?: boolean;
  editingFinance?: Finance | null;
  presetType?: FinanceType | null;
}

const initialFormData: FinanceFormData = {
  type: 'Receita',
  client_id: '',
  category: '',
  cost_center: '',
  amount: 0,
  due_date: '',
  status: 'Pendente',
  description: '',
  recurrence: 'Nenhuma',
  bank_id: '',
  finance_category_id: '',
};

export function FinanceFormDialog({
  open,
  onOpenChange,
  clients,
  onSubmit,
  isLoading = false,
  editingFinance,
  presetType,
}: FinanceFormDialogProps) {
  const [formData, setFormData] = useState<FinanceFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { data: banks = [] } = useBanks();
  const { data: financeCategories = [] } = useFinanceCategories();

  useEffect(() => {
    if (editingFinance) {
      setFormData({
        type: editingFinance.type,
        client_id: editingFinance.client_id || '',
        category: (editingFinance.category as FinanceCategory) || '',
        cost_center: editingFinance.cost_center || '',
        amount: editingFinance.amount,
        due_date: editingFinance.due_date,
        status: editingFinance.status,
        description: editingFinance.description || '',
        recurrence: editingFinance.recurrence || 'Nenhuma',
        bank_id: editingFinance.bank_id || '',
        finance_category_id: '',
      });
    } else if (presetType) {
      setFormData({ ...initialFormData, type: presetType });
    } else {
      setFormData(initialFormData);
    }
    setErrors({});
  }, [editingFinance, presetType, open]);

  const isRevenue = formData.type === 'Receita';
  const isExpense = formData.type === 'Despesa';

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Valor é obrigatório';
    }

    if (!formData.due_date) {
      newErrors.due_date = 'Data de vencimento é obrigatória';
    }

    if (isRevenue && !formData.client_id) {
      newErrors.client_id = 'Cliente é obrigatório para receitas';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const submitData: Omit<Finance, 'id' | 'created_at' | 'updated_at'> = {
      type: formData.type,
      client_id: formData.client_id || null,
      amount: formData.amount,
      due_date: formData.due_date,
      status: formData.status,
      description: formData.description || null,
      category: formData.finance_category_id
        ? (financeCategories.find(c => c.id === formData.finance_category_id)?.name as FinanceCategory) || formData.category || null
        : (isExpense ? formData.category || null : null),
      cost_center: isExpense ? formData.cost_center || null : null,
      recurrence: formData.recurrence,
      bank_id: formData.bank_id || null,
    };

    await onSubmit(submitData);
    setFormData(initialFormData);
    setErrors({});
  };

  const handleTypeChange = (type: FinanceType) => {
    setFormData({ ...formData, type, client_id: '', category: '', cost_center: '', finance_category_id: '' });
    setErrors({});
  };

  const activeBanks = banks.filter(b => b.status === 'Ativo');
  const activeCategories = financeCategories.filter(c => c.is_active && (c.type === formData.type || c.type === 'Ambos'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingFinance ? 'Editar Registro' : 'Novo Registro Financeiro'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Type Selector */}
          <div>
            <Label>Tipo *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => handleTypeChange(value as FinanceType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Receita">Receita</SelectItem>
                <SelectItem value="Despesa">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Revenue Fields */}
          {isRevenue && (
            <div>
              <Label>Cliente *</Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData({ ...formData, client_id: value })}
              >
                <SelectTrigger className={errors.client_id ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients?.filter(c => c.status === 'Ativo').map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} - {client.company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.client_id && (
                <p className="text-sm text-destructive mt-1">{errors.client_id}</p>
              )}
            </div>
          )}

          {/* Expense Fields */}
          {isExpense && (
            <div>
              <Label>Centro de Custo</Label>
              <Input
                value={formData.cost_center}
                onChange={e => setFormData({ ...formData, cost_center: e.target.value })}
                placeholder="Ex: Marketing, Operacional"
              />
            </div>
          )}

          {/* Common Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Valor *</Label>
              <Input
                type="number"
                value={formData.amount || ''}
                onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                placeholder="0.00"
                className={errors.amount ? 'border-destructive' : ''}
              />
              {errors.amount && (
                <p className="text-sm text-destructive mt-1">{errors.amount}</p>
              )}
            </div>
            <div>
              <Label>Vencimento *</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                className={errors.due_date ? 'border-destructive' : ''}
              />
              {errors.due_date && (
                <p className="text-sm text-destructive mt-1">{errors.due_date}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as FinanceStatus })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Pago">Pago</SelectItem>
                  <SelectItem value="Atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Recorrência</Label>
              <Select
                value={formData.recurrence}
                onValueChange={(value) => setFormData({ ...formData, recurrence: value as FinanceRecurrence })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Recorrência" />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bank & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Banco</Label>
              <Select
                value={formData.bank_id}
                onValueChange={(value) => setFormData({ ...formData, bank_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um banco" />
                </SelectTrigger>
                <SelectContent>
                  {activeBanks.map(bank => (
                    <SelectItem key={bank.id} value={bank.id}>{bank.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select
                value={formData.finance_category_id}
                onValueChange={(value) => setFormData({ ...formData, finance_category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {activeCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição opcional..."
              rows={2}
            />
          </div>

          <Button 
            onClick={handleSubmit} 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? 'Salvando...' : (editingFinance ? 'Atualizar' : 'Criar Registro')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
