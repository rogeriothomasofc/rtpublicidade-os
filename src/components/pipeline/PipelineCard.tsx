import { SalesPipeline } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, DollarSign, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface PipelineCardProps {
  lead: SalesPipeline;
  onOpenChat?: (lead: SalesPipeline) => void;
  onOpenProfile?: (lead: SalesPipeline) => void;
  unreadCount?: number;
}

export function PipelineCard({ lead, onOpenChat, onOpenProfile, unreadCount = 0 }: PipelineCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('leadId', lead.id);
  };

  const handleClick = () => {
    onOpenProfile?.(lead);
  };

  const hasPhone = !!lead.phone && lead.phone.replace(/\D/g, '').length >= 10;

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
          {hasPhone && onOpenChat && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-green-500 hover:text-green-600 hover:bg-green-500/10 relative"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenChat(lead);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center rounded-full"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Chat WhatsApp</TooltipContent>
            </Tooltip>
          )}
        </div>
        {lead.company && (
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
