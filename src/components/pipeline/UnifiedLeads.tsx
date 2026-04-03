import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search, Plus, Loader2, Users, Building2, Briefcase,
  Star, Phone, Globe, Trash2, ChevronDown, ChevronUp, Sparkles, Copy,
  MessageCircle, ExternalLink, AlertTriangle, XCircle, CheckCircle,
  TrendingUp, Stethoscope, Kanban, MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { useInstagramProspects, type InstagramProspect } from '@/hooks/useInstagramProspects';
import {
  useGmbLeads, useUpdateGmbLead, useDeleteGmbLead,
  analyzeGmbLead, sendWhatsAppMessages, GMB_STATUSES, GMB_STATUS_COLORS,
  type GmbLead, type GmbLeadStatus,
} from '@/hooks/useGmbLeads';
import { markFirstContactInCadence } from '@/hooks/useCrossedLeads';
import { LeadCadencePanel } from '@/components/pipeline/LeadCadencePanel';
import { ProspectCard, AddProspectForm } from '@/components/pipeline/InstagramProspecting';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

type SourceFilter = 'Todos' | 'Instagram' | 'Google Maps';

function formatWhatsAppNumber(phone: string): string {
  const digits = phone.replace('@s.whatsapp.net', '').replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
}

// ─── Auto-analisar leads GMB novos em background ──────────────────────────────
function useAutoAnalyzeGmbLeads(leads: GmbLead[] | undefined) {
  const updateLead = useUpdateGmbLead();
  const analyzingRef = useRef(false);

  useEffect(() => {
    if (!leads || analyzingRef.current) return;
    const pending = leads.filter(l => !l.ai_messages?.length);
    if (!pending.length) return;

    async function runNext(queue: GmbLead[]) {
      for (const lead of queue) {
        analyzingRef.current = true;
        try {
          const result = await analyzeGmbLead(lead);
          updateLead.mutate({
            id: lead.id,
            ai_diagnosis: result.diagnosis,
            ai_messages: result.messages,
            website_issues: result.website_issues,
          });
        } catch (e) {
          console.error(`Auto-análise falhou para ${lead.nome_empresa}:`, e);
        }
      }
      analyzingRef.current = false;
    }

    runNext(pending);
  }, [leads?.length]); // eslint-disable-line react-hooks/exhaustive-deps
}

// ─── Card expandível para leads do Google Maps ────────────────────────────────
function ExpandableGmbCard({ lead: initialLead }: { lead: GmbLead }) {
  const [lead, setLead] = useState(initialLead);
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'diagnostico' | 'mensagem' | 'cadencia'>('info');
  const [sending, setSending] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const updateLead = useUpdateGmbLead();
  const deleteLead = useDeleteGmbLead();
  const queryClient = useQueryClient();
  const phone = lead.whatsapp_jid || lead.telefone;

  useEffect(() => { setLead(initialLead); }, [initialLead]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const result = await analyzeGmbLead(lead);
      const updated = {
        ...lead,
        ai_diagnosis: result.diagnosis,
        ai_messages: result.messages,
        website_issues: result.website_issues,
      };
      setLead(updated);
      updateLead.mutate({
        id: lead.id,
        ai_diagnosis: result.diagnosis,
        ai_messages: result.messages,
        website_issues: result.website_issues,
      });
      setActiveTab('mensagem');
      toast.success('Diagnóstico gerado!');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar diagnóstico.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSend = async () => {
    if (!phone) { toast.error('Sem número de WhatsApp para este lead'); return; }
    if (!lead.ai_messages?.length) { toast.error('Gere o diagnóstico primeiro'); return; }
    setSending(true);
    try {
      const number = formatWhatsAppNumber(phone);
      await sendWhatsAppMessages(number, lead.ai_messages.map((m, i) => ({
        message: m.message,
        delay: i === 0 ? 0 : 3500,
      })));

      let pipelineLeadId = lead.pipeline_lead_id;
      if (!pipelineLeadId) {
        const { data: pipelineLead } = await supabase
          .from('sales_pipeline')
          .insert({
            lead_name: lead.nome_empresa,
            company: lead.nome_empresa,
            phone: phone,
            stage: 'ATENDIMENTO_INICIA',
            deal_value: 0,
            probability: 10,
            source: 'gmb',
            notes: lead.endereco || null,
          })
          .select('id')
          .single();
        pipelineLeadId = pipelineLead?.id ?? null;
        queryClient.invalidateQueries({ queryKey: ['sales-pipeline'] });
      }

      updateLead.mutate({ id: lead.id, status: 'Contatado', pipeline_lead_id: pipelineLeadId });
      await markFirstContactInCadence(lead.id, null, 'whatsapp');
      toast.success('3 mensagens enviadas! Lead adicionado ao Pipeline.');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao enviar. Verifique a instância Evolution.');
    } finally {
      setSending(false);
    }
  };

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
          <Select value={lead.status} onValueChange={s => updateLead.mutate({ id: lead.id, status: s as GmbLeadStatus })}>
            <SelectTrigger className="h-6 text-xs px-2 w-auto border-none shadow-none">
              <SelectValue>
                <Badge className={`${GMB_STATUS_COLORS[lead.status]} text-white text-xs px-1.5 py-0`}>
                  {lead.status}
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

        {/* Métricas + badge de fonte */}
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full px-2 py-0.5 font-medium">
            <MapPin className="w-3 h-3" /> Google Maps
          </span>
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
          {lead.pipeline_lead_id && <span className="flex items-center gap-1 text-violet-600"><Kanban className="w-3 h-3" />Pipeline</span>}
        </div>

        {/* Badges de diagnóstico */}
        {lead.website_issues && (
          <div className="flex gap-1 flex-wrap mt-1">
            {(lead.website_issues.critical?.length ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-xs bg-red-500/15 text-red-600 dark:text-red-400 rounded-full px-2 py-0.5">
                <XCircle className="w-3 h-3" /> {lead.website_issues.critical.length} crítico{lead.website_issues.critical.length > 1 ? 's' : ''}
              </span>
            )}
            {(lead.website_issues.warnings?.length ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-xs bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 rounded-full px-2 py-0.5">
                <AlertTriangle className="w-3 h-3" /> {lead.website_issues.warnings.length} alerta{lead.website_issues.warnings.length > 1 ? 's' : ''}
              </span>
            )}
            {lead.website_issues.score !== undefined && (
              <span className={`flex items-center gap-1 text-xs rounded-full px-2 py-0.5 ${lead.website_issues.score >= 70 ? 'bg-green-500/15 text-green-600' : lead.website_issues.score >= 40 ? 'bg-yellow-500/15 text-yellow-600' : 'bg-red-500/15 text-red-600'}`}>
                <Globe className="w-3 h-3" /> Site {lead.website_issues.score}/100
              </span>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="px-4 pb-3 space-y-2">
        {/* Ações rápidas */}
        <div className="flex gap-1.5">
          {phone && lead.ai_messages?.length ? (
            <Button size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1 text-green-600 border-green-200 hover:bg-green-50 dark:hover:bg-green-900/20"
              onClick={handleSend} disabled={sending}>
              {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageCircle className="w-3 h-3" />}
              {sending ? 'Enviando...' : 'Enviar WhatsApp'}
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1"
              onClick={() => { setExpanded(true); setActiveTab('diagnostico'); handleAnalyze(); }} disabled={analyzing}>
              {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              {analyzing ? 'Analisando...' : 'Gerar Diagnóstico'}
            </Button>
          )}
          {lead.website && (
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
              onClick={() => window.open(lead.website!.startsWith('http') ? lead.website! : `https://${lead.website}`, '_blank')}>
              <ExternalLink className="w-3 h-3" />
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={() => deleteLead.mutate(lead.id)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>

        {/* Toggle expandir */}
        <Button variant="ghost" size="sm" className="w-full h-6 text-xs text-muted-foreground"
          onClick={() => setExpanded(!expanded)}>
          {expanded
            ? <><ChevronUp className="w-3 h-3 mr-1" />Ocultar detalhes</>
            : <><ChevronDown className="w-3 h-3 mr-1" />Ver detalhes completos</>}
        </Button>

        {/* Conteúdo expandido */}
        {expanded && (
          <div className="space-y-2 pt-1">
            {/* Tabs */}
            <div className="flex gap-1 flex-wrap">
              {[
                { key: 'info', label: 'Informações', icon: <Building2 className="w-3 h-3" /> },
                { key: 'diagnostico', label: 'Diagnóstico', icon: <Stethoscope className="w-3 h-3" /> },
                { key: 'mensagem', label: 'Mensagem', icon: <MessageCircle className="w-3 h-3" /> },
                { key: 'cadencia', label: 'Cadência', icon: <TrendingUp className="w-3 h-3" /> },
              ].map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${activeTab === tab.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>

            {/* Aba: Informações */}
            {activeTab === 'info' && (
              <div className="space-y-2 text-xs">
                {lead.endereco && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span>{lead.endereco}</span>
                  </div>
                )}
                {phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-green-600 font-medium">{formatWhatsAppNumber(phone)}</span>
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
              </div>
            )}

            {/* Aba: Diagnóstico */}
            {activeTab === 'diagnostico' && (
              <div className="space-y-2">
                {lead.ai_diagnosis ? (
                  <>
                    {lead.website_issues && (
                      <div className="flex gap-1.5 flex-wrap">
                        {(lead.website_issues.critical?.length ?? 0) > 0 && (
                          <span className="flex items-center gap-1 text-xs bg-red-500/15 text-red-600 rounded-full px-2 py-0.5">
                            <XCircle className="w-3 h-3" /> {lead.website_issues.critical.length} crítico{lead.website_issues.critical.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {(lead.website_issues.warnings?.length ?? 0) > 0 && (
                          <span className="flex items-center gap-1 text-xs bg-yellow-500/15 text-yellow-600 rounded-full px-2 py-0.5">
                            <AlertTriangle className="w-3 h-3" /> {lead.website_issues.warnings.length} alerta{lead.website_issues.warnings.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {(lead.website_issues.positives?.length ?? 0) > 0 && (
                          <span className="flex items-center gap-1 text-xs bg-green-500/15 text-green-600 rounded-full px-2 py-0.5">
                            <CheckCircle className="w-3 h-3" /> {lead.website_issues.positives.length} positivo{lead.website_issues.positives.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="relative">
                      <pre className="text-xs bg-secondary/50 rounded-lg p-3 pr-8 whitespace-pre-wrap font-sans leading-relaxed">{lead.ai_diagnosis}</pre>
                      <Button size="sm" variant="ghost" className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={() => { navigator.clipboard.writeText(lead.ai_diagnosis!); toast.success('Diagnóstico copiado!'); }}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={handleAnalyze} disabled={analyzing}>
                      {analyzing ? <><Loader2 className="w-3 h-3 animate-spin" />Gerando...</> : <><Sparkles className="w-3 h-3" />Regenerar</>}
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Sparkles className="w-6 h-6 mx-auto mb-2 opacity-30" />
                    <p className="text-xs mb-2">Sem diagnóstico gerado ainda</p>
                    <Button size="sm" className="gap-2" onClick={handleAnalyze} disabled={analyzing}>
                      {analyzing
                        ? <><Loader2 className="w-3 h-3 animate-spin" />Analisando...</>
                        : <><Sparkles className="w-3 h-3" />Gerar Diagnóstico com IA</>}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Aba: Mensagem */}
            {activeTab === 'mensagem' && (
              <div className="space-y-2">
                {lead.ai_messages?.length ? (
                  <>
                    <p className="text-xs text-muted-foreground">Sequência de {lead.ai_messages.length} mensagens com intervalo de 3,5s:</p>
                    {lead.ai_messages.map((m) => (
                      <div key={m.part} className="relative">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs font-semibold text-primary bg-primary/10 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">{m.part}</span>
                          <span className="text-xs text-muted-foreground">Mensagem {m.part}</span>
                        </div>
                        <pre className="text-xs bg-secondary/50 rounded-lg p-3 pr-8 whitespace-pre-wrap font-sans leading-relaxed">{m.message}</pre>
                        <Button size="sm" variant="ghost" className="absolute top-6 right-2 h-6 w-6 p-0"
                          onClick={() => { navigator.clipboard.writeText(m.message); toast.success('Copiada!'); }}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={handleAnalyze} disabled={analyzing}>
                      {analyzing ? <><Loader2 className="w-3 h-3 animate-spin" />Gerando...</> : <><Sparkles className="w-3 h-3" />Regenerar mensagens</>}
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <MessageCircle className="w-6 h-6 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Gere o diagnóstico para criar as mensagens personalizadas</p>
                  </div>
                )}
              </div>
            )}

            {/* Aba: Cadência */}
            {activeTab === 'cadencia' && (
              <LeadCadencePanel gmbLead={lead} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Página unificada de Leads ─────────────────────────────────────────────────
export function UnifiedLeads() {
  const { data: prospects, isLoading: loadingIG } = useInstagramProspects();
  const { data: gmbLeads, isLoading: loadingGMB } = useGmbLeads();
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('Todos');
  const [search, setSearch] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);

  useAutoAnalyzeGmbLeads(gmbLeads);

  const isLoading = loadingIG || loadingGMB;

  const filteredIG = (prospects || []).filter(p => {
    if (sourceFilter === 'Google Maps') return false;
    return !search ||
      p.username.toLowerCase().includes(search.toLowerCase()) ||
      (p.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.niche || '').toLowerCase().includes(search.toLowerCase());
  });

  const filteredGMB = (gmbLeads || []).filter(l => {
    if (sourceFilter === 'Instagram') return false;
    return !search ||
      l.nome_empresa.toLowerCase().includes(search.toLowerCase()) ||
      (l.endereco || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.especialidades || '').toLowerCase().includes(search.toLowerCase());
  });

  const totalIG = prospects?.length ?? 0;
  const totalGMB = gmbLeads?.length ?? 0;
  const total = totalIG + totalGMB;

  type UnifiedItem =
    | { type: 'ig'; data: InstagramProspect }
    | { type: 'gmb'; data: GmbLead };

  const items: UnifiedItem[] = [
    ...filteredIG.map(p => ({ type: 'ig' as const, data: p })),
    ...filteredGMB.map(l => ({ type: 'gmb' as const, data: l })),
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Leads
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Instagram + Google Maps — {total} lead{total !== 1 ? 's' : ''} no total
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4" /> Novo Diagnóstico Instagram
        </Button>
      </div>

      {/* Filtro por fonte */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: 'Todos', label: 'Todos', count: total, icon: null },
          { key: 'Instagram', label: 'Instagram', count: totalIG, icon: <span className="w-2 h-2 rounded-full bg-pink-500 flex-shrink-0" /> },
          { key: 'Google Maps', label: 'Google Maps', count: totalGMB, icon: <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" /> },
        ] as const).map(s => (
          <button key={s.key} onClick={() => setSourceFilter(s.key as SourceFilter)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${sourceFilter === s.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground hover:text-foreground'}`}>
            {s.icon}
            {s.label}
            {s.count > 0 && <span className="bg-white/20 rounded-full px-1">{s.count}</span>}
          </button>
        ))}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9 h-8 text-sm"
          placeholder="Buscar por nome, @username, endereço ou nicho..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando leads...
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium text-sm">Nenhum lead encontrado</p>
          <p className="text-xs mt-1">
            {total === 0
              ? 'Adicione um diagnóstico Instagram ou importe leads do Google Maps via n8n'
              : 'Nenhum lead para este filtro ou busca'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(item =>
            item.type === 'ig'
              ? <ProspectCard key={`ig_${item.data.id}`} prospect={item.data} showSource />
              : <ExpandableGmbCard key={`gmb_${item.data.id}`} lead={item.data} />
          )}
        </div>
      )}

      {/* Dialog: Novo Diagnóstico Instagram */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center">
                <Stethoscope className="w-3.5 h-3.5 text-white" />
              </div>
              Novo Diagnóstico Digital
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">
            Informe o @ e o site. A IA vai analisar Instagram + site + Google e gerar um diagnóstico completo com mensagem personalizada.
          </p>
          <AddProspectForm onClose={() => setShowAddDialog(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
