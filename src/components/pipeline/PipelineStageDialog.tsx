import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PipelineStage } from '@/hooks/usePipelineStages';

interface PipelineStageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage?: PipelineStage | null;
  onSubmit: (data: { display_name: string; probability: number; description?: string }) => void;
  isPending: boolean;
}

export function PipelineStageDialog({
  open,
  onOpenChange,
  stage,
  onSubmit,
  isPending,
}: PipelineStageDialogProps) {
  const [displayName, setDisplayName] = useState('');
  const [probability, setProbability] = useState(0);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (stage) {
      setDisplayName(stage.display_name);
      setProbability(stage.probability);
      setDescription(stage.description || '');
    } else {
      setDisplayName('');
      setProbability(25);
      setDescription('');
    }
  }, [stage, open]);

  const handleSubmit = () => {
    if (!displayName.trim()) return;
    onSubmit({ display_name: displayName.trim(), probability, description: description.trim() || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{stage ? 'Editar Coluna' : 'Nova Coluna'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome da Coluna</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ex: Qualificação"
            />
          </div>
          <div>
            <Label>Descrição da Etapa</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o objetivo e ações desta etapa..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Aparece como tooltip no cabeçalho da coluna
            </p>
          </div>
          <div>
            <Label>Probabilidade (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={probability}
              onChange={(e) => setProbability(Number(e.target.value))}
            />
          </div>
          <Button
            onClick={handleSubmit}
            className="w-full"
            disabled={isPending || !displayName.trim()}
          >
            {stage ? 'Salvar' : 'Criar Coluna'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
