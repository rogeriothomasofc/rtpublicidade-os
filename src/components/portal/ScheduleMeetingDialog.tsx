import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CalendarPlus, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ScheduleMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}

export function ScheduleMeetingDialog({ open, onOpenChange, clientId, clientName }: ScheduleMeetingDialogProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkConflicts = async (selectedDate: string, selectedTime: string) => {
    if (!selectedDate || !selectedTime) return;
    setIsChecking(true);
    setConflict(null);

    try {
      const dateTime = `${selectedDate}T${selectedTime}:00`;
      const startCheck = new Date(dateTime);
      const endCheck = new Date(startCheck.getTime() + 60 * 60 * 1000); // 1h window

      const { data: existingTasks } = await supabase
        .from('tasks')
        .select('title, due_date')
        .neq('status', 'Concluído')
        .eq('due_date', startCheck.toISOString().slice(0, 10));

      if (existingTasks && existingTasks.length > 0) {
        // Check time overlap - tasks on the same day with similar time
        const conflicting = existingTasks.filter(t => {
          if (!t.due_date) return false;
          const taskDate = new Date(t.due_date);
          const diff = Math.abs(taskDate.getTime() - startCheck.getTime());
          return diff < 60 * 60 * 1000; // within 1 hour
        });

        if (conflicting.length > 0) {
          setConflict(`Já existe uma reunião nesse horário: "${conflicting[0].title}". Considere outro horário.`);
        }
      }
    } catch (err) {
      console.error('Error checking conflicts:', err);
    } finally {
      setIsChecking(false);
    }
  };

  const handleDateTimeChange = (newDate: string, newTime: string) => {
    setDate(newDate);
    setTime(newTime);
    if (newDate && newTime) {
      checkConflicts(newDate, newTime);
    }
  };

  const handleSubmit = async () => {
    if (!date || !time) {
      toast.error('Selecione data e horário');
      return;
    }

    setIsSubmitting(true);
    try {
      const dueDate = `${date}T${time}:00`;
      const title = `Reunião com ${clientName}`;

      const { error } = await supabase.from('tasks').insert({
        title,
        description: description || `Reunião agendada pelo portal do cliente`,
        type: 'Outro' as const,
        status: 'A Fazer' as const,
        priority: 'Alta' as const,
        client_id: clientId,
        due_date: dueDate,
      });

      if (error) throw error;

      toast.success('Reunião agendada com sucesso! Entraremos em contato para confirmar.');
      onOpenChange(false);
      setDate('');
      setTime('');
      setDescription('');
      setConflict(null);
    } catch (err) {
      console.error('Error scheduling meeting:', err);
      toast.error('Erro ao agendar reunião. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Min date is today
  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="w-5 h-5 text-primary" />
            Agendar Reunião
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="meeting-date">Data</Label>
              <Input
                id="meeting-date"
                type="date"
                min={today}
                value={date}
                onChange={e => handleDateTimeChange(e.target.value, time)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meeting-time">Horário</Label>
              <Input
                id="meeting-time"
                type="time"
                value={time}
                onChange={e => handleDateTimeChange(date, e.target.value)}
              />
            </div>
          </div>

          {isChecking && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Verificando agenda...
            </p>
          )}

          {conflict && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
              <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <p className="text-sm text-warning">{conflict}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="meeting-desc">Observação (opcional)</Label>
            <Textarea
              id="meeting-desc"
              placeholder="Sobre o que gostaria de conversar?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !date || !time}>
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CalendarPlus className="w-4 h-4 mr-2" />}
            Agendar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
