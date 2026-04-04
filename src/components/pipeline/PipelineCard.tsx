import { SalesPipeline } from '@/types/database';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, DollarSign, Camera, MapPin, MessageCircle, Phone, Users, ChevronRight, Percent } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useUpdateLead } from '@/hooks/useSalesPipeline';

const STAGE_COLORS: Record<string, string> = {
  'Novo':              'bg-blue-500',
  'Qualificação':      'bg-purple-500',
  'Diagnóstico':       'bg-orange-500',
  'Reunião Agendada':  'bg-yellow-500',
  'Proposta':          'bg-indigo-500',
  'Proposta Enviada':  'bg-indigo-500',
  'Negociação':        'bg-amber-500',
  'Contatado':         'bg-cyan-500',
  'Ganho':             'bg-green-500',
  'Perdido':           'bg-red-500',
};

interface PipelineCardProps {
  lead: SalesPipeline;
  onOpenProfile?: (lead: SalesPipeline) => void;
}

export function PipelineCard({ lead, onOpenProfile }: PipelineCardProps) {
  const updateLead = useUpdateLead();

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('leadId', lead.id);
  };

  const toggleResponded = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateLead.mutate({ id: lead.id, responded: !lead.responded });
  };

  return (
    <Card
      draggable
      onDragStart={handleDragStart}
      onClick={() => onOpenProfile?.(lead)}
      className="border border-border/60 hover:border-primary/40 transition-colors cursor-grab active:cursor-grabbing"
    >
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-start justify-between gap-2">
          {/* Avatar + nome */}
          <div className="flex items-center gap-2 min-w-0">
            {lead.source === 'instagram' ? (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0">
                <Camera className="w-4 h-4 text-white" />
              </div>
            ) : lead.source === 'gmb' ? (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-white" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/70 to-primary flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-white" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{lead.lead_name}</p>
              {lead.company && lead.company !== lead.lead_name && (
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  <Building2 className="w-3 h-3 flex-shrink-0" />{lead.company}
                </p>
              )}
            </div>
          </div>

          {/* Stage badge + respondeu */}
          <div className="flex flex-col gap-1 items-end flex-shrink-0">
            <Badge className={`${STAGE_COLORS[lead.stage] ?? 'bg-gray-500'} text-white text-xs px-1.5 py-0`}>
              {lead.stage}
            </Badge>
            <button
              onClick={toggleResponded}
              title={lead.responded ? 'Lead respondeu' : 'Marcar como respondeu'}
              className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                lead.responded
                  ? 'bg-green-500 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-green-100 hover:text-green-600'
              }`}
            >
              <MessageCircle className="w-3 h-3" />
            </button>
          </div>
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
        <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1 text-muted-foreground pointer-events-none">
          <ChevronRight className="w-3 h-3" /> Ver detalhes
        </Button>
      </CardContent>
    </Card>
  );
}
