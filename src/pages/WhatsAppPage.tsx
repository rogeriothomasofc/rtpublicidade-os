import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { WhatsAppContactList } from '@/components/whatsapp/WhatsAppContactList';
import { WhatsAppChatPanel } from '@/components/whatsapp/WhatsAppChatPanel';
import { WhatsAppLeadPanel } from '@/components/whatsapp/WhatsAppLeadPanel';
import { useWhatsAppContacts, WhatsAppContact } from '@/hooks/useWhatsAppContacts';
import { NewConversationDialog } from '@/components/pipeline/NewConversationDialog';
import { SalesPipeline } from '@/types/database';
import { MessageSquare } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';

export default function WhatsAppPage() {
  const { data: contacts, isLoading } = useWhatsAppContacts();
  const [selected, setSelected] = useState<WhatsAppContact | null>(null);
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleSelect = (contact: WhatsAppContact) => {
    setSelected(contact);
  };

  const handleLeadCreated = (lead: { id: string; lead_name: string; phone: string | null }) => {
    const fullLead: WhatsAppContact = {
      ...lead,
      company: null,
      email: null,
      deal_value: 0,
      probability: 10,
      notes: null,
      stage: 'Novo' as const,
      duration_months: 12,
      source: 'manual' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      unread_count: 0,
      labels: [],
    };
    setSelected(fullLead);
  };

  // Mobile: show either list or chat
  if (isMobile) {
    return (
      <MainLayout>
        <div className="h-[calc(100vh-4rem)] -m-6 flex flex-col">
          {selected ? (
            <WhatsAppChatPanel
              lead={selected as SalesPipeline}
              onBack={() => setSelected(null)}
              showBackButton
              labels={selected.labels}
            />
          ) : (
            <WhatsAppContactList
              contacts={contacts || []}
              isLoading={isLoading}
              selectedId={null}
              onSelect={handleSelect}
              onNewConversation={() => setNewConvOpen(true)}
            />
          )}
        </div>
        <NewConversationDialog
          open={newConvOpen}
          onOpenChange={setNewConvOpen}
          onLeadCreated={handleLeadCreated}
        />
      </MainLayout>
    );
  }

  // Desktop: 3-panel layout
  return (
    <MainLayout>
      <div className="h-[calc(100vh-4rem)] -m-6 flex overflow-hidden">
        {/* Contacts sidebar */}
        <div className="w-[360px] border-r border-border flex-shrink-0 bg-background">
          <WhatsAppContactList
            contacts={contacts || []}
            isLoading={isLoading}
            selectedId={selected?.id || null}
            onSelect={handleSelect}
            onNewConversation={() => setNewConvOpen(true)}
          />
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {selected ? (
            <WhatsAppChatPanel
              lead={selected as SalesPipeline}
              labels={selected.labels}
              panelOpen={panelOpen}
              onTogglePanel={() => setPanelOpen(!panelOpen)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-muted/10">
              <div className="h-20 w-20 rounded-full bg-muted/40 flex items-center justify-center mb-4">
                <MessageSquare className="h-9 w-9 text-muted-foreground/40" />
              </div>
              <h3 className="text-lg font-semibold text-muted-foreground mb-1">WhatsApp</h3>
              <p className="text-sm text-muted-foreground/70">
                Selecione uma conversa para começar
              </p>
            </div>
          )}
        </div>

        {/* Lead info panel — only when a contact is selected and panel is open */}
        {selected && panelOpen && (
          <WhatsAppLeadPanel
            lead={selected as SalesPipeline}
            labels={selected.labels}
          />
        )}
      </div>

      <NewConversationDialog
        open={newConvOpen}
        onOpenChange={setNewConvOpen}
        onLeadCreated={handleLeadCreated}
      />
    </MainLayout>
  );
}
