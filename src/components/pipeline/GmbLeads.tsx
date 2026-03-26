import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  MapPin, Phone, Globe, Star, Trash2, MessageCircle,
  Search, Loader2, Users, Copy, Building2, Briefcase,
  ExternalLink, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useGmbLeads, useUpdateGmbLead, useDeleteGmbLead,
  GMB_STATUSES, GMB_STATUS_COLORS,
  type GmbLead, type GmbLeadStatus,
} from '@/hooks/useGmbLeads';

const STATUS_LABELS: Record<GmbLeadStatus, string> = {
  'Novo': 'Novo', 'Contatado': 'Contatado', 'Respondeu': 'Respondeu',
  'Reunião Marcada': 'Reunião', 'Proposta Enviada': 'Proposta',
  'Ganho': 'Ganho', 'Perdido': 'Perdido',
};

// ─── Evolution API ─────────────────────────────────────────────────────────────

function formatWhatsAppNumber(phone: string): string {
  const digits = phone.replace('@s.whatsapp.net', '').replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
}

async function sendViaEvolution(number: string, text: string): Promise<void> {
  const url = import.meta.env.VITE_EVOLUTION_API_URL;
  const apiKey = import.meta.env.VITE_EVOLUTION_API_KEY;
  const instance = import.meta.env.VITE_EVOLUTION_INSTANCE;
  const res = await fetch(`${url}/message/sendText/${instance}`, {
    method: 'POST',
    headers: { apikey: apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ number, text, delay: 1200 }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
}

// ─── Gerar mensagem de prospecção ─────────────────────────────────────────────

function buildProspectingMessage(lead: GmbLead): string {
  const rating = lead.rating ? `⭐ ${lead.rating}/5 (${lead.reviews?.toLocaleString('pt-BR') ?? 0} avaliações no Google)` : '';
  const site = lead.website ? `🌐 ${lead.website}` : '';

  return `Olá! Tudo bem? 😊

Vi o *${lead.nome_empresa}* no Google${lead.endereco ? ` — ${lead.endereco}` : ''} e queria te fazer uma proposta rápida.
${rating ? `\n${rating}` : ''}${site ? `\n${site}` : ''}

Sou da *RT Publicidade* e identificamos algumas oportunidades para aumentar sua captação de clientes online:

✅ Anúncios segmentados no Google e Instagram
✅ Gestão profissional das redes sociais
✅ Site otimizado para converter visitantes em clientes

Podemos te mostrar resultados reais em 30 dias. Que tal uma conversa rápida sem compromisso?

— *RT Publicidade* 🚀`;
}

// ─── Modal do lead ────────────────────────────────────────────────────────────

function LeadModal({ lead, onClose }: { lead: GmbLead; onClose: () => void }) {
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'mensagem'>('info');
  const updateLead = useUpdateGmbLead();
  const message = buildProspectingMessage(lead);
  const phone = lead.whatsapp_jid || lead.telefone;

  const handleSend = async () => {
    if (!phone) { toast.error('Sem número de WhatsApp para este lead'); return; }
    setSending(true);
    try {
      const number = formatWhatsAppNumber(phone);
      await sendViaEvolution(number, message);
      updateLead.mutate({ id: lead.id, status: 'Contatado' });
      toast.success('Mensagem enviada no WhatsApp!');
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('Erro ao enviar. Verifique a instância Evolution.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            {lead.nome_empresa}
          </DialogTitle>
        </DialogHeader>

        {/* Métricas rápidas */}
        <div className="flex flex-wrap gap-2 -mt-1">
          {lead.rating && (
            <span className="flex items-center gap-1 text-xs bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 rounded-full px-2.5 py-1 font-medium">
              <Star className="w-3 h-3 fill-current" /> {lead.rating}/5
              {lead.reviews && <span className="opacity-70">({lead.reviews.toLocaleString('pt-BR')})</span>}
            </span>
          )}
          <Badge className={`${GMB_STATUS_COLORS[lead.status]} text-white text-xs`}>
            {lead.status}
          </Badge>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {([
            { key: 'info', label: 'Informações' },
            { key: 'mensagem', label: 'Mensagem de Prospecção' },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px ${activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'info' && (
          <div className="space-y-3 text-sm">
            {lead.endereco && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span>{lead.endereco}</span>
              </div>
            )}
            {(lead.whatsapp_jid || lead.telefone) && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-green-600 font-medium">
                  {formatWhatsAppNumber(lead.whatsapp_jid || lead.telefone || '')}
                </span>
              </div>
            )}
            {lead.website && (
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-primary hover:underline truncate flex items-center gap-1">
                  {lead.website} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>
            )}
            {lead.especialidades && (
              <div className="flex items-start gap-2">
                <Briefcase className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">{lead.especialidades}</span>
              </div>
            )}

            {/* Status */}
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1.5">Alterar status</p>
              <Select value={lead.status} onValueChange={s => updateLead.mutate({ id: lead.id, status: s as GmbLeadStatus })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GMB_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${GMB_STATUS_COLORS[s]}`} />
                        {s}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {activeTab === 'mensagem' && (
          <div className="space-y-3">
            <div className="relative">
              <pre className="text-xs bg-secondary/50 rounded-lg p-3 pr-8 whitespace-pre-wrap font-sans leading-relaxed">
                {message}
              </pre>
              <Button size="sm" variant="ghost" className="absolute top-2 right-2 h-6 w-6 p-0"
                onClick={() => { navigator.clipboard.writeText(message); toast.success('Mensagem copiada!'); }}>
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-2 pt-1 border-t border-border">
          {phone && (
            <Button className="flex-1 gap-2 bg-green-600 hover:bg-green-700" onClick={handleSend} disabled={sending}>
              {sending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                : <><MessageCircle className="w-4 h-4" /> Enviar WhatsApp</>}
            </Button>
          )}
          {lead.website && (
            <Button variant="outline" className="gap-1.5"
              onClick={() => window.open(lead.website!.startsWith('http') ? lead.website! : `https://${lead.website}`, '_blank')}>
              <Globe className="w-4 h-4" /> Site
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Card do lead ─────────────────────────────────────────────────────────────

function GmbLeadCard({ lead, onClick }: { lead: GmbLead; onClick: () => void }) {
  const updateLead = useUpdateGmbLead();
  const deleteLead = useDeleteGmbLead();
  const phone = lead.whatsapp_jid || lead.telefone;

  return (
    <Card className="border border-border/60 hover:border-primary/40 transition-colors cursor-pointer"
      onClick={onClick}>
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{lead.nome_empresa}</p>
              {lead.endereco && (
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  <MapPin className="w-3 h-3 flex-shrink-0" />{lead.endereco}
                </p>
              )}
            </div>
          </div>
          <Select value={lead.status}
            onValueChange={s => { updateLead.mutate({ id: lead.id, status: s as GmbLeadStatus }); }}
            onOpenChange={e => e && event?.stopPropagation?.()}>
            <SelectTrigger className="h-6 text-xs px-2 w-auto border-none shadow-none"
              onClick={e => e.stopPropagation()}>
              <SelectValue>
                <Badge className={`${GMB_STATUS_COLORS[lead.status]} text-white text-xs px-1.5 py-0`}>
                  {STATUS_LABELS[lead.status]}
                </Badge>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {GMB_STATUSES.map(s => (
                <SelectItem key={s} value={s}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${GMB_STATUS_COLORS[s]}`} />
                    {s}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
          {lead.rating && (
            <span className="flex items-center gap-1 text-yellow-500">
              <Star className="w-3 h-3 fill-current" />{lead.rating}
              {lead.reviews && <span className="text-muted-foreground">({lead.reviews.toLocaleString('pt-BR')})</span>}
            </span>
          )}
          {lead.especialidades && (
            <span className="flex items-center gap-1 truncate max-w-[140px]">
              <Briefcase className="w-3 h-3 flex-shrink-0" />{lead.especialidades.split(',')[0]}
            </span>
          )}
          {phone && <span className="flex items-center gap-1 text-green-600"><Phone className="w-3 h-3" />WhatsApp</span>}
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-3">
        <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
          <Button size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1 text-muted-foreground"
            onClick={onClick}>
            <ChevronRight className="w-3 h-3" /> Ver detalhes
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={e => { e.stopPropagation(); deleteLead.mutate(lead.id); }}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export function GmbLeads() {
  const { data: leads, isLoading } = useGmbLeads();
  const [selectedLead, setSelectedLead] = useState<GmbLead | null>(null);
  const [filterStatus, setFilterStatus] = useState<GmbLeadStatus | 'Todos'>('Todos');
  const [search, setSearch] = useState('');

  const filtered = (leads || []).filter(l => {
    const matchStatus = filterStatus === 'Todos' || l.status === filterStatus;
    const matchSearch = !search ||
      l.nome_empresa.toLowerCase().includes(search.toLowerCase()) ||
      (l.endereco || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.especialidades || '').toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const counts = (leads || []).reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center">
              <MapPin className="w-3.5 h-3.5 text-white" />
            </div>
            Leads Google Meu Negócio
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Leads extraídos do Google Maps via n8n — WhatsApp validado automaticamente
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/60 rounded px-2 py-1">
          <Users className="w-3.5 h-3.5" />
          {leads?.length ?? 0} leads
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['Todos', ...GMB_STATUSES] as const).map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterStatus === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground hover:text-foreground'}`}>
            {s !== 'Todos' && <span className={`w-2 h-2 rounded-full ${GMB_STATUS_COLORS[s as GmbLeadStatus]}`} />}
            {s}
            {s !== 'Todos' && counts[s] ? <span className="bg-white/20 rounded-full px-1">{counts[s]}</span> : null}
            {s === 'Todos' && leads?.length ? <span className="bg-white/20 rounded-full px-1">{leads.length}</span> : null}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9 h-8 text-sm" placeholder="Buscar por empresa, endereço ou especialidade..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
        </div>
      ) : filtered.length === 0 && (leads?.length ?? 0) > 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">Nenhum lead encontrado para este filtro</p>
      ) : filtered.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(l => (
            <GmbLeadCard key={l.id} lead={l} onClick={() => setSelectedLead(l)} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-green-500/20 flex items-center justify-center mx-auto mb-3">
            <MapPin className="w-6 h-6 text-blue-500" />
          </div>
          <p className="font-medium text-sm">Nenhum lead ainda</p>
          <p className="text-xs mt-1">Importe o fluxo n8n para começar a receber leads do Google Maps</p>
        </div>
      )}

      {selectedLead && (
        <LeadModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}
    </div>
  );
}
