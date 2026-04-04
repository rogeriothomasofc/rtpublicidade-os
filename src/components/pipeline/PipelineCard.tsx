import { SalesPipeline } from '@/types/database';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, DollarSign, Camera, MapPin, MessageCircle, Phone, Users, ChevronRight, Percent } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useUpdateLead } from '@/hooks/useSalesPipeline';

interface PipelineCardProps {
  lead: SalesPipeline;
  onOpenProfile?: (lead: SalesPipeline) => void;
}

function SourceAvatar({ source }: { source: SalesPipeline['source'] }) {
  if (source === 'instagram') {
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0">
        <Camera className="w-4 h-4 text-white" />
      </div>
    );
  }
  if (source === 'gmb') {
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center flex-shrink-0">
        <MapPin className="w-4 h-4 text-white" />
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/70 to-primary flex items-center justify-center flex-shrink-0">
      <Users className="w-4 h-4 text-white" />
    </div>
  );
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
      className="border border-border/60 hover:border-primary/40 transition-colors cursor-grab active:cursor-grabbing"
    >
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-start justify-between gap-2">
          {/* Avatar + nome */}
          <div className="flex items-center gap-2 min-w-0">
            <SourceAvatar source={lead.source} />
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{lead.lead_name}</p>
              {lead.company && lead.company !== lead.lead_name && (
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  <Building2 className="w-3 h-3 flex-shrink-0" />{lead.company}
                </p>
              )}
            </div>
          </div>

          {/* Botão respondeu */}
          <button
            onClick={toggleResponded}
            title={lead.responded ? 'Lead respondeu' : 'Marcar como respondeu'}
            className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
              lead.responded
                ? 'bg-green-500 text-white'
                : 'bg-muted text-muted-foreground hover:bg-green-100 hover:text-green-600'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Badge de fonte */}
        <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
          {lead.source === 'instagram' && (
            <span className="flex items-center gap-1 bg-pink-500/10 text-pink-600 dark:text-pink-400 rounded-full px-2 py-0.5 font-medium">
              <Camera className="w-3 h-3" /> Instagram
            </span>
          )}
          {lead.source === 'gmb' && (
            <span className="flex items-center gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full px-2 py-0.5 font-medium">
              <MapPin className="w-3 h-3" /> Google Maps
            </span>
          )}
          {(lead.source === 'manual' || lead.source === 'whatsapp_sync') && (
            <span className="flex items-center gap-1 bg-primary/10 text-primary rounded-full px-2 py-0.5 font-medium">
              <Users className="w-3 h-3" /> Manual
            </span>
          )}
          {lead.responded && (
            <Badge className="bg-green-500/15 text-green-600 dark:text-green-400 border-0 text-xs px-1.5 py-0">
              Respondeu
            </Badge>
          )}
        </div>

        {/* Métricas */}
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1 text-primary font-medium">
            <DollarSign className="w-3 h-3" />{formatCurrency(Number(lead.deal_value))}
          </span>
          <span className="flex items-center gap-1">
            <Percent className="w-3 h-3" />{lead.probability}%
          </span>
          {lead.phone && (
            <span className="flex items-center gap-1 text-green-600">
              <Phone className="w-3 h-3" />WhatsApp
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-3">
        <div className="flex items-center justify-center w-full h-7 text-xs gap-1 text-muted-foreground border border-border/40 rounded-md">
          <ChevronRight className="w-3 h-3" /> Ver perfil
        </div>
      </CardContent>
    </Card>
  );
}
