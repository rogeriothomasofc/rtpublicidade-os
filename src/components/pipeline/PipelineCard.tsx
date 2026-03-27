import { SalesPipeline } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, DollarSign, Camera, MapPin, MessageCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useUpdateLead } from '@/hooks/useSalesPipeline';

interface PipelineCardProps {
  lead: SalesPipeline;
  onOpenProfile?: (lead: SalesPipeline) => void;
}

export function PipelineCard({ lead, onOpenProfile }: PipelineCardProps) {
  const updateLead = useUpdateLead();

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('leadId', lead.id);
  };

  const handleClick = () => {
    onOpenProfile?.(lead);
  };

  const toggleResponded = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateLead.mutate({ id: lead.id, responded: !lead.responded });
  };

  return (
    <Card
      draggable
      onDragStart={handleDragStart}
      onClick={handleClick}
      className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow border-border/50"
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-1">
          <h4 className="font-medium text-sm mb-1 flex-1">{lead.lead_name}</h4>
          <div className="flex items-center gap-1 shrink-0">
            {lead.source === 'instagram' && (
              <span title="Instagram" className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center">
                <Camera className="w-3 h-3 text-white" />
              </span>
            )}
            {lead.source === 'gmb' && (
              <span title="Google Maps" className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center">
                <MapPin className="w-3 h-3 text-white" />
              </span>
            )}
          </div>
        </div>
        {lead.company && lead.company !== lead.lead_name && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            <Building2 className="w-3 h-3" />
            <span>{lead.company}</span>
          </div>
        )}
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1 text-sm font-medium text-primary">
            <DollarSign className="w-4 h-4" />
            <span>{formatCurrency(Number(lead.deal_value))}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{lead.probability}% prob.</span>
            <button
              onClick={toggleResponded}
              title={lead.responded ? 'Lead respondeu' : 'Marcar como respondeu'}
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                lead.responded
                  ? 'bg-green-500 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-green-100 hover:text-green-600'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
