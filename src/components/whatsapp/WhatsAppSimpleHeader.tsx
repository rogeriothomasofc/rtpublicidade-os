import { SalesPipeline } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Phone, Video, Star, MoreVertical, ArrowLeft, UserRoundSearch } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface WhatsAppSimpleHeaderProps {
  lead: SalesPipeline;
  onBack?: () => void;
  showBackButton?: boolean;
  panelOpen?: boolean;
  onTogglePanel?: () => void;
}

export function WhatsAppSimpleHeader({ lead, onBack, showBackButton, panelOpen, onTogglePanel }: WhatsAppSimpleHeaderProps) {
  const initials = lead.lead_name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="bg-background border-b border-border px-4 py-3 flex items-center gap-3 shrink-0">
      {showBackButton && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 -ml-1 shrink-0"
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}

      {/* Avatar */}
      <div className="shrink-0">
        {lead.avatar_url ? (
          <img
            src={lead.avatar_url}
            alt={lead.lead_name}
            className="h-10 w-10 rounded-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground">
            {initials}
          </div>
        )}
      </div>

      {/* Name + phone */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm truncate">{lead.lead_name}</h3>
        {lead.phone && (
          <p className="text-xs text-muted-foreground">{lead.phone}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <Phone className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <Video className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <Star className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <MoreVertical className="h-4 w-4" />
        </Button>
        {onTogglePanel && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${panelOpen ? 'text-primary' : 'text-muted-foreground'} hover:text-foreground`}
                onClick={onTogglePanel}
              >
                <UserRoundSearch className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{panelOpen ? 'Ocultar perfil' : 'Ver perfil'}</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
