import { SalesPipeline } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, DollarSign, Instagram, MapPin } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface PipelineCardProps {
  lead: SalesPipeline;
  onOpenProfile?: (lead: SalesPipeline) => void;
}

export function PipelineCard({ lead, onOpenProfile }: PipelineCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('leadId', lead.id);
  };

  const handleClick = () => {
    onOpenProfile?.(lead);
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
          {lead.source === 'instagram' && (
            <span title="Instagram" className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center">
              <Instagram className="w-3 h-3 text-white" />
            </span>
          )}
          {lead.source === 'gmb' && (
            <span title="Google Maps" className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center">
              <MapPin className="w-3 h-3 text-white" />
            </span>
          )}
        </div>
        {lead.company && lead.company !== lead.lead_name && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            <Building2 className="w-3 h-3" />
            <span>{lead.company}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm font-medium text-primary">
            <DollarSign className="w-4 h-4" />
            <span>{formatCurrency(Number(lead.deal_value))}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {lead.probability}% prob.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
