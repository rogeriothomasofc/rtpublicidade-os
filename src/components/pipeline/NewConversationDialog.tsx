import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateLead } from '@/hooks/useSalesPipeline';
import { MessageSquarePlus } from 'lucide-react';

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadCreated: (lead: { id: string; lead_name: string; phone: string | null }) => void;
}

export function NewConversationDialog({ open, onOpenChange, onLeadCreated }: NewConversationDialogProps) {
  const createLead = useCreateLead();
  const [formData, setFormData] = useState({
    lead_name: '',
    phone: '',
    company: '',
  });

  const handleSubmit = async () => {
    if (!formData.lead_name || !formData.phone) return;

    const result = await createLead.mutateAsync({
      lead_name: formData.lead_name,
      phone: formData.phone,
      company: formData.company || null,
      email: null,
      deal_value: 0,
      probability: 10,
      notes: null,
      stage: 'Novo',
      duration_months: 12,
      source: 'manual',
    });

    setFormData({ lead_name: '', phone: '', company: '' });
    onOpenChange(false);
    onLeadCreated(result);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5" />
            Nova Conversa
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome do Contato *</Label>
            <Input
              value={formData.lead_name}
              onChange={e => setFormData({ ...formData, lead_name: e.target.value })}
              placeholder="Nome do contato"
            />
          </div>
          <div>
            <Label>WhatsApp *</Label>
            <Input
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              placeholder="5511999999999"
            />
          </div>
          <div>
            <Label>Empresa</Label>
            <Input
              value={formData.company}
              onChange={e => setFormData({ ...formData, company: e.target.value })}
              placeholder="Nome da empresa (opcional)"
            />
          </div>
          <Button
            onClick={handleSubmit}
            className="w-full"
            disabled={createLead.isPending || !formData.lead_name || !formData.phone}
          >
            Criar e Iniciar Conversa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
