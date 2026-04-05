import { type PipelineStage } from '@/types/database';
import { type CrossedLead } from '@/hooks/useCrossedLeads';
import { LeadCard } from './LeadCard';
import { formatCurrency } from '@/lib/utils';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export type PipelineCrossedLead = CrossedLead & { pipeline_id: string };

interface PipelineColumnProps {
  title: string;
  stage: PipelineStage;
  probability: number;
  description?: string | null;
  leads: PipelineCrossedLead[];
  totalValue: number;
  onMoveLead: (leadId: string, newStage: PipelineStage) => void;
  onOpenProfile?: (lead: PipelineCrossedLead) => void;
}

const stageColors: Record<string, string> = {
  Novo: 'bg-blue-500',
  'Qualificação': 'bg-cyan-500',
  'Diagnóstico': 'bg-amber-500',
  'Reunião Agendada': 'bg-violet-500',
  'Proposta Enviada': 'bg-indigo-500',
  'Negociação': 'bg-orange-500',
  Ganho: 'bg-green-500',
  Perdido: 'bg-red-500',
};

export function PipelineColumn({ title, stage, probability, description, leads, totalValue, onMoveLead, onOpenProfile }: PipelineColumnProps) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    if (leadId) {
      onMoveLead(leadId, stage);
    }
  };

  return (
    <div
      className="flex-shrink-0 w-72 bg-secondary/50 rounded-lg p-3"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-3 h-3 rounded-full ${stageColors[stage] || 'bg-muted-foreground'}`} />
        <h3 className="font-semibold text-sm">{title}</h3>
        {description && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[240px] text-xs">
              {description}
            </TooltipContent>
          </Tooltip>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {probability}%
        </span>
      </div>
      <div className="text-xs text-muted-foreground mb-3">
        {leads.length} leads · {formatCurrency(totalValue)}
      </div>
      <div className="space-y-2">
        {leads.map((lead) => (
          <LeadCard
            key={lead.pipeline_id}
            lead={lead}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('leadId', lead.pipeline_id)}
            onClick={() => onOpenProfile?.(lead)}
          />
        ))}
      </div>
    </div>
  );
}
