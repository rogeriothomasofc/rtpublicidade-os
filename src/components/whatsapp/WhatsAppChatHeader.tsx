import { useState } from 'react';
import { SalesPipeline } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Phone, ArrowLeft, RefreshCw, Loader2, Contact, KanbanSquare, Check } from 'lucide-react';
import { toast } from 'sonner';
import { WhatsAppLabelManager } from './WhatsAppLabelManager';
import { WhatsAppLabel } from '@/hooks/useWhatsAppContacts';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { LeadProfileDialog } from '@/components/pipeline/LeadProfileDialog';
import { usePipelineStages } from '@/hooks/usePipelineStages';
import { useUpdateLead } from '@/hooks/useSalesPipeline';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface WhatsAppChatHeaderProps {
  lead: SalesPipeline;
  isOnline: boolean;
  isTyping: boolean;
  onBack?: () => void;
  showBackButton?: boolean;
  labels?: WhatsAppLabel[];
  onMessagesRefresh?: () => void;
}

export function WhatsAppChatHeader({
  lead,
  isOnline,
  isTyping,
  onBack,
  showBackButton,
  labels = [],
  onMessagesRefresh,
}: WhatsAppChatHeaderProps) {
  const queryClient = useQueryClient();
  const { data: stages } = usePipelineStages();
  const updateLead = useUpdateLead();
  const [syncing, setSyncing] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const isInPipeline = lead.source === 'manual';

  const handleSyncContact = async () => {
    if (!lead.phone || syncing) return;
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-chat', {
        body: { action: 'sync_contact', lead_id: lead.id, phone: lead.phone },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Sincronizado! ${data.synced} mensagens importadas.`);
      onMessagesRefresh?.();
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contacts'] });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao sincronizar contato');
    } finally {
      setSyncing(false);
    }
  };

  const statusText = isTyping ? 'digitando...' : isOnline ? 'online' : null;

  return (
    <>
      <div className="bg-[#075E54] dark:bg-[#1F2C34] px-4 flex items-center gap-3 shrink-0 py-[10px]">
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            className="text-white/80 hover:text-white hover:bg-white/10 h-8 w-8 -ml-1"
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="relative shrink-0">
          {lead.avatar_url ? (
            <img src={lead.avatar_url} alt={lead.lead_name} className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-base">
              {lead.lead_name.charAt(0).toUpperCase()}
            </div>
          )}
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#075E54] dark:border-[#1F2C34] ${
              isOnline ? 'bg-green-400' : 'bg-gray-400'
            }`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-white text-sm font-semibold truncate">{lead.lead_name}</h3>
            {labels.length > 0 && (
              <div className="flex items-center gap-1 shrink-0">
                {labels.slice(0, 3).map((label) => (
                  <span
                    key={label.id}
                    className="text-[9px] font-medium px-1.5 py-0.5 rounded-full text-white/90 truncate max-w-[70px]"
                    style={{ backgroundColor: getLabelColor(label.color) }}
                  >
                    {label.name}
                  </span>
                ))}
                {labels.length > 3 && <span className="text-[9px] text-white/50">+{labels.length - 3}</span>}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            {statusText ? (
              <span className={`${isTyping ? 'text-green-300 italic' : 'text-green-200'}`}>{statusText}</span>
            ) : (
              <span className="text-green-100/70 flex items-center gap-1">
                <Phone className="h-2.5 w-2.5" />
                {lead.phone || 'Sem telefone'}
              </span>
            )}
          </div>
        </div>

        {/* Sync contact */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/80 hover:text-white hover:bg-white/10 h-8 w-8"
              onClick={handleSyncContact}
              disabled={syncing || !lead.phone}
            >
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Sincronizar este contato</TooltipContent>
        </Tooltip>

        {/* Label manager */}
        <WhatsAppLabelManager leadId={lead.id} currentLabels={labels} />

        {/* CRM Profile icon */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/80 hover:text-white hover:bg-white/10 h-8 w-8"
              onClick={() => setProfileOpen(true)}
            >
              <Contact className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Perfil do Lead</TooltipContent>
        </Tooltip>

        {/* Pipeline stage selector */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/80 hover:text-white hover:bg-white/10 h-8 w-8"
                >
                  <KanbanSquare className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>{isInPipeline ? 'Mover no Pipeline' : 'Adicionar ao Pipeline'}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
            {!isInPipeline && (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">Selecione para adicionar ao pipeline</p>
            )}
            {stages?.map((stage) => (
              <DropdownMenuItem
                key={stage.id}
                onClick={async () => {
                  if (isInPipeline && lead.stage === stage.name) return;
                  await updateLead.mutateAsync({ id: lead.id, stage: stage.name as any, source: 'manual' });
                  queryClient.invalidateQueries({ queryKey: ['whatsapp-contacts'] });
                  toast.success(isInPipeline
                    ? `Lead movido para "${stage.display_name}"`
                    : `Lead adicionado ao pipeline como "${stage.display_name}"`
                  );
                }}
                className="flex items-center justify-between gap-2"
              >
                {stage.display_name}
                {isInPipeline && lead.stage === stage.name && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Lead Profile Dialog */}
      <LeadProfileDialog lead={lead} open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}

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
