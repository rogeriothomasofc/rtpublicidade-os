import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateProject } from '@/hooks/useProjects';
import { PlatformType } from '@/types/database';

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}

export function ProjectFormDialog({ open, onOpenChange, clientId }: ProjectFormDialogProps) {
  const createProject = useCreateProject();

  const [formData, setFormData] = useState({
    name: '',
    platform: 'Meta' as PlatformType,
    budget: 0,
    kpi: '',
    is_active: true,
  });

  useEffect(() => {
    if (open) {
      setFormData({
        name: '',
        platform: 'Meta',
        budget: 0,
        kpi: '',
        is_active: true,
      });
    }
  }, [open]);

  const handleSubmit = async () => {
    await createProject.mutateAsync({
      client_id: clientId,
      ...formData,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Projeto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome do Projeto *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Campanha Black Friday"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Plataforma</Label>
              <Select
                value={formData.platform}
                onValueChange={(value: PlatformType) => setFormData({ ...formData, platform: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Meta">Meta</SelectItem>
                  <SelectItem value="Google">Google</SelectItem>
                  <SelectItem value="TikTok">TikTok</SelectItem>
                  <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                  <SelectItem value="Other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Budget</Label>
              <Input
                type="number"
                value={formData.budget || ''}
                onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <Label>KPI Principal</Label>
            <Input
              value={formData.kpi}
              onChange={(e) => setFormData({ ...formData, kpi: e.target.value })}
              placeholder="Ex: CPA < R$ 50"
            />
          </div>
          <Button 
            onClick={handleSubmit} 
            className="w-full" 
            disabled={createProject.isPending || !formData.name}
          >
            {createProject.isPending ? 'Criando...' : 'Criar Projeto'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
