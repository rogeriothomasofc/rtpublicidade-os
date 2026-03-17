import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, MessageSquarePlus, RefreshCw, Loader2, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WhatsAppContact, useSyncWhatsApp } from '@/hooks/useWhatsAppContacts';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';


interface WhatsAppContactListProps {
  contacts: WhatsAppContact[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (contact: WhatsAppContact) => void;
  onNewConversation: () => void;
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

type TabType = 'inbox' | 'contacts';

export function WhatsAppContactList({
  contacts,
  isLoading,
  selectedId,
  onSelect,
  onNewConversation,
}: WhatsAppContactListProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('inbox');
  const syncWhatsApp = useSyncWhatsApp();

  const inboxCount = contacts.filter((c) => c.last_message_time).length;
  const contactsCount = contacts.length;

  // Inbox = contacts with messages, sorted by last message
  // Contacts = all contacts
  const baseList = activeTab === 'inbox'
    ? contacts.filter((c) => c.last_message_time)
    : contacts;

  const filtered = baseList.filter((c) => {
    return (
      !search ||
      c.lead_name.toLowerCase().includes(search.toLowerCase()) ||
      c.company?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
    );
  });

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Ontem';
    return format(date, 'dd/MM/yyyy');
  };

  

  const unreadTotal = contacts.reduce((acc, c) => acc + (c.unread_count || 0), 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between shrink-0 border-b border-border">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-base">Inbox</h2>
          {unreadTotal > 0 && (
            <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
              {unreadTotal} não lidas
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => syncWhatsApp.mutate()}
                disabled={syncWhatsApp.isPending}
              >
                {syncWhatsApp.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sincronizar WhatsApp</TooltipContent>
          </Tooltip>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onNewConversation}
          >
            <MessageSquarePlus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border shrink-0 bg-background">
        <button
          onClick={() => setActiveTab('inbox')}
          className={cn(
            'flex-1 py-2.5 text-sm font-medium transition-colors relative',
            activeTab === 'inbox'
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Inbox
          <span className="ml-1.5 text-[10px] bg-muted rounded-full px-1.5 py-0.5 font-normal">
            {inboxCount}
          </span>
          {activeTab === 'inbox' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('contacts')}
          className={cn(
            'flex-1 py-2.5 text-sm font-medium transition-colors relative',
            activeTab === 'contacts'
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Contatos
          <span className="ml-1.5 text-[10px] bg-muted rounded-full px-1.5 py-0.5 font-normal">
            {contactsCount}
          </span>
          {activeTab === 'contacts' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
      </div>

      {/* Sync banner */}
      {syncWhatsApp.isPending && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center gap-2 shrink-0">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          <span className="text-xs text-primary font-medium">Sincronizando...</span>
        </div>
      )}

      {/* Search */}
      <div className="px-3 py-2 border-b shrink-0">
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversas..."
              className="pl-8 h-8 text-sm bg-muted/50 border-0"
            />
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>


      {/* Contact List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-3 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p className="text-sm">
              {activeTab === 'inbox'
                ? 'Nenhuma conversa encontrada'
                : 'Nenhum contato encontrado'}
            </p>
            {!search && activeTab === 'inbox' && (
              <Button
                variant="link"
                size="sm"
                className="mt-2 text-[#25D366]"
                onClick={() => syncWhatsApp.mutate()}
                disabled={syncWhatsApp.isPending}
              >
                Sincronizar do WhatsApp
              </Button>
            )}
          </div>
        ) : (
          filtered.map((contact) => (
            <button
              key={contact.id}
              onClick={() => onSelect(contact)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-3 hover:bg-muted/50 transition-colors text-left border-b border-border/30',
                selectedId === contact.id && 'bg-muted/70'
              )}
            >
              {/* Avatar */}
              {contact.avatar_url ? (
                <img
                  src={contact.avatar_url}
                  alt={contact.lead_name}
                  className="h-12 w-12 rounded-full object-cover shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={cn(
                'h-12 w-12 rounded-full bg-[#DFE5E7] dark:bg-[#6B7B8D] flex items-center justify-center text-white font-semibold text-lg shrink-0',
                contact.avatar_url && 'hidden'
              )}>
                {contact.lead_name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm truncate">{contact.lead_name}</span>
                  {contact.last_message_time && (
                    <span
                      className={cn(
                        'text-[11px] shrink-0 ml-2',
                        contact.unread_count > 0 ? 'text-[#25D366] font-medium' : 'text-muted-foreground'
                      )}
                    >
                      {formatMessageTime(contact.last_message_time)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {activeTab === 'inbox' ? (
                      contact.last_message ? (
                        <>
                          {contact.last_message_direction === 'sent' && (
                            <span className="text-muted-foreground/60">Você: </span>
                          )}
                          {contact.last_message}
                        </>
                      ) : (
                        <span className="italic">Sem mensagens</span>
                      )
                    ) : (
                      <span className="text-muted-foreground/70">{contact.phone}</span>
                    )}
                  </p>
                  {contact.unread_count > 0 && (
                    <span className="ml-2 bg-[#25D366] text-white text-[10px] font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5 shrink-0">
                      {contact.unread_count}
                    </span>
                  )}
                </div>

                {/* Labels */}
                {contact.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {contact.labels.slice(0, 3).map((label) => (
                      <span
                        key={label.id}
                        className="text-[9px] font-medium px-1.5 py-0.5 rounded-full text-white truncate max-w-[80px]"
                        style={{ backgroundColor: getLabelColor(label.color) }}
                      >
                        {label.name}
                      </span>
                    ))}
                    {contact.labels.length > 3 && (
                      <span className="text-[9px] text-muted-foreground">
                        +{contact.labels.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
