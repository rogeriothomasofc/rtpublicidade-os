import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  MapPin, Phone, Globe, Star, Trash2, MessageCircle,
  Search, Loader2, Users, ChevronDown, ChevronUp, Copy,
  Building2, Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useGmbLeads, useUpdateGmbLead, useDeleteGmbLead,
  GMB_STATUSES, GMB_STATUS_COLORS,
  type GmbLead, type GmbLeadStatus,
} from '@/hooks/useGmbLeads';

const STATUS_LABELS: Record<GmbLeadStatus, string> = {
  'Novo': 'Novo',
  'Contatado': 'Contatado',
  'Respondeu': 'Respondeu',
  'Reunião Marcada': 'Reunião',
  'Proposta Enviada': 'Proposta',
  'Ganho': 'Ganho',
  'Perdido': 'Perdido',
};

function formatWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55')) return digits;
  return `55${digits}`;
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
  if (!res.ok) throw new Error(`Evolution API error: ${res.status}`);
}

// ─── Card do lead ─────────────────────────────────────────────────────────────

function GmbLeadCard({ lead }: { lead: GmbLead }) {
  const [expanded, setExpanded] = useState(false);
  const [sending, setSending] = useState(false);
  const updateLead = useUpdateGmbLead();
  const deleteLead = useDeleteGmbLead();

  const handleStatusChange = (status: GmbLeadStatus) =>
    updateLead.mutate({ id: lead.id, status });

  const handleSendWhatsApp = async () => {
    const phone = lead.whatsapp_jid || lead.telefone;
    if (!phone) { toast.error('Sem número de WhatsApp para este lead'); return; }
    setSending(true);
    try {
      const number = formatWhatsAppNumber(phone.replace('@s.whatsapp.net', ''));
      const greeting = `Olá! Tudo bem? 😊\n\nVi o seu negócio *${lead.nome_empresa}* no Google e fiquei impressionado!\n\nSou da *RT Publicidade* e gostaria de apresentar algumas estratégias que podem aumentar seus resultados online. Podemos conversar rapidinho?`;
      await sendViaEvolution(number, greeting);
      await new Promise(r => setTimeout(r, 2500));
      const details = `📍 *${lead.nome_empresa}*\n${lead.endereco ? `📌 ${lead.endereco}\n` : ''}${lead.rating ? `⭐ Google: ${lead.rating}/5 (${lead.reviews?.toLocaleString('pt-BR') ?? 0} avaliações)\n` : ''}\nIdentificamos oportunidades de crescimento para o seu negócio. Que tal uma análise gratuita da sua presença digital?\n\n✅ Site otimizado\n✅ Anúncios segmentados\n✅ Gestão de redes sociais\n\nResponda aqui e marcamos uma conversa! 🚀\n\n— *RT Publicidade*`;
      await sendViaEvolution(number, details);
      updateLead.mutate({ id: lead.id, status: 'Contatado' });
      toast.success('Mensagem enviada!');
    } catch {
      toast.error('Erro ao enviar. Verifique a instância Evolution.');
    } finally {
      setSending(false);
    }
  };

  const phone = lead.whatsapp_jid
    ? lead.whatsapp_jid.replace('@s.whatsapp.net', '')
    : lead.telefone;

  return (
    <Card className="border border-border/60">
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
          <Select value={lead.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-6 text-xs px-2 w-auto border-none shadow-none">
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

        {/* Métricas */}
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
          {lead.rating && (
            <span className="flex items-center gap-1 text-yellow-500">
              <Star className="w-3 h-3 fill-current" />{lead.rating}
              {lead.reviews && <span className="text-muted-foreground">({lead.reviews.toLocaleString('pt-BR')})</span>}
            </span>
          )}
          {lead.especialidades && (
            <span className="flex items-center gap-1">
              <Briefcase className="w-3 h-3" />{lead.especialidades.split(',')[0]}
            </span>
          )}
          {phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />WhatsApp</span>}
          {lead.website && <span className="flex items-center gap-1"><Globe className="w-3 h-3" />Site</span>}
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-3 space-y-2">
        {/* Ações */}
        <div className="flex gap-1.5">
          {phone && (
            <Button size="sm" variant="outline"
              className="flex-1 h-7 text-xs gap-1 text-green-600 border-green-200 hover:bg-green-50 dark:hover:bg-green-900/20"
              onClick={handleSendWhatsApp} disabled={sending}>
              {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageCircle className="w-3 h-3" />}
              {sending ? 'Enviando...' : 'Enviar WhatsApp'}
            </Button>
          )}
          {lead.website && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
              onClick={() => window.open(lead.website!.startsWith('http') ? lead.website! : `https://${lead.website}`, '_blank')}>
              <Globe className="w-3 h-3" /> Site
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={() => deleteLead.mutate(lead.id)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>

        {/* Toggle detalhes */}
        {lead.especialidades && (
          <Button variant="ghost" size="sm" className="w-full h-6 text-xs text-muted-foreground"
            onClick={() => setExpanded(!expanded)}>
            {expanded
              ? <><ChevronUp className="w-3 h-3 mr-1" />Ocultar detalhes</>
              : <><ChevronDown className="w-3 h-3 mr-1" />Ver especialidades</>}
          </Button>
        )}

        {expanded && lead.especialidades && (
          <div className="relative">
            <p className="text-xs bg-secondary/50 rounded p-2 pr-8 whitespace-pre-wrap">{lead.especialidades}</p>
            <Button size="sm" variant="ghost" className="absolute top-1 right-1 h-6 w-6 p-0"
              onClick={() => { navigator.clipboard.writeText(lead.especialidades!); toast.success('Copiado!'); }}>
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export function GmbLeads() {
  const { data: leads, isLoading } = useGmbLeads();
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
      {/* Header */}
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

      {/* Filtros de status */}
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

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9 h-8 text-sm" placeholder="Buscar por empresa, endereço ou especialidade..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Instrução n8n */}
      {(!leads || leads.length === 0) && !isLoading && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-xs space-y-2">
          <p className="font-semibold text-blue-700 dark:text-blue-400">Como importar leads do Google Maps:</p>
          <p className="text-muted-foreground">No n8n, troque o nó <strong>"Append row in sheet"</strong> por um <strong>HTTP Request</strong> com:</p>
          <div className="bg-background rounded p-2 font-mono text-xs space-y-0.5">
            <p><span className="text-green-600">POST</span> https://nbzxofrllagqwwrwfskv.supabase.co/rest/v1/gmb_leads</p>
            <p><span className="text-yellow-600">apikey:</span> eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</p>
            <p><span className="text-yellow-600">Authorization:</span> Bearer eyJhbGci...</p>
            <p><span className="text-yellow-600">Content-Type:</span> application/json</p>
            <p><span className="text-yellow-600">Prefer:</span> return=minimal</p>
          </div>
        </div>
      )}

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
        </div>
      ) : filtered.length === 0 && (leads?.length ?? 0) > 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">Nenhum lead encontrado para este filtro</p>
      ) : filtered.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(l => <GmbLeadCard key={l.id} lead={l} />)}
        </div>
      ) : null}
    </div>
  );
}
