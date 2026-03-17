import { TaskRecurrence } from '@/types/database';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Repeat } from 'lucide-react';

interface RecurrenceSelectProps {
  value: TaskRecurrence;
  onChange: (value: TaskRecurrence) => void;
}

export function RecurrenceSelect({ value, onChange }: RecurrenceSelectProps) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Repeat className="h-4 w-4" />
        Recorrência
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Sem recorrência" />
        </SelectTrigger>
        <SelectContent className="z-50 bg-popover">
          <SelectItem value="Nenhuma">Sem recorrência</SelectItem>
          <SelectItem value="Diária">Diária</SelectItem>
          <SelectItem value="Semanal">Semanal</SelectItem>
          <SelectItem value="Mensal">Mensal</SelectItem>
          <SelectItem value="Trimestral">Trimestral</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
