import { useState } from 'react';
import { Tag, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useWhatsAppLabels, WhatsAppLabel } from '@/hooks/useWhatsAppContacts';
import { useAssignLabel, useRemoveLabel } from '@/hooks/useContactLabels';
import { cn } from '@/lib/utils';

const LABEL_COLORS: Record<string, string> = {
  '0': '#00A884',
  '1': '#53BDEB',
  '2': '#FF9500',
  '3': '#FF2D55',
  '4': '#A78BFA',
  default: '#6B7B8D',
};

function getLabelColor(color: string | null): string {
  if (!color) return LABEL_COLORS.default;
  if (color.startsWith('#')) return color;
  return LABEL_COLORS[color] || LABEL_COLORS.default;
}

interface WhatsAppLabelManagerProps {
  leadId: string;
  currentLabels: WhatsAppLabel[];
}

export function WhatsAppLabelManager({ leadId, currentLabels }: WhatsAppLabelManagerProps) {
  const [open, setOpen] = useState(false);
  const { data: allLabels, isLoading } = useWhatsAppLabels();
  const assignLabel = useAssignLabel();
  const removeLabel = useRemoveLabel();

  const currentLabelIds = new Set(currentLabels.map((l) => l.id));

  const handleToggle = (label: WhatsAppLabel) => {
    if (currentLabelIds.has(label.id)) {
      removeLabel.mutate({ leadId, labelId: label.id });
    } else {
      assignLabel.mutate({ leadId, labelId: label.id });
    }
  };

  const isPending = assignLabel.isPending || removeLabel.isPending;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Tag className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Gerenciar etiquetas</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-56 p-2">
        <p className="text-xs font-medium text-muted-foreground px-2 pb-2">Etiquetas</p>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : !allLabels || allLabels.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Nenhuma etiqueta encontrada. Sincronize as etiquetas primeiro.
          </p>
        ) : (
          <div className="space-y-0.5 max-h-60 overflow-y-auto">
            {allLabels.map((label) => {
              const isAssigned = currentLabelIds.has(label.id);
              return (
                <button
                  key={label.id}
                  onClick={() => handleToggle(label)}
                  disabled={isPending}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left transition-colors',
                    'hover:bg-muted/80 disabled:opacity-50'
                  )}
                >
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: getLabelColor(label.color) }}
                  />
                  <span className="text-sm flex-1 truncate">{label.name}</span>
                  {isAssigned && (
                    <Check className="h-4 w-4 text-[#25D366] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
