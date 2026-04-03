import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search, Plus, Loader2, Users, Building2, Star, Phone, Globe, Trash2,
  Sparkles, Copy, MessageCircle, ExternalLink, AlertTriangle, XCircle,
  CheckCircle, TrendingUp, Stethoscope, Kanban, MapPin, ChevronRight,
  Instagram, Briefcase, FileText, Lightbulb, Flame,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useCrossedLeads, markFirstContactInCadence,
  type CrossedLead,
} from '@/hooks/useCrossedLeads';
import {
  useUpdateProspect, useDeleteProspect,
  PROSPECT_STATUSES, STATUS_COLORS,
  type ProspectStatus,
} from '@/hooks/useInstagramProspects';
import {
  useUpdateGmbLead, useDeleteGmbLead,
  analyzeGmbLead, sendWhatsAppMessages,
  GMB_STATUSES, GMB_STATUS_COLORS,
  type GmbLeadStatus, type GmbLead,
} from '@/hooks/useGmbLeads';
import { LeadCadencePanel } from '@/components/pipeline/LeadCadencePanel';
import { AddProspectForm } from '@/components/pipeline/InstagramProspecting';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

type SourceFilter = 'Todos' | 'Instagram' | 'Google Maps' | 'Unificado';

function formatWhatsAppNumber(phone: string): string {
  const digits = phone.replace('@s.whatsapp.net', '').replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
}

function copyText(text: string, label: string) {
  navigator.clipboard.writeText(text);
  toast.success(`${label} copiado!`);
}

// ─── Auto-analisar leads GMB novos em background ──────────────────────────────
function useAutoAnalyzeGmbLeads(leads: CrossedLead[] | undefined) {
  const updateGmb = useUpdateGmbLead();
  const analyzingRef = useRef(false);

  useEffect(() => {
    if (!leads || analyzingRef.current) return;
    const pending = leads.filter(l => l.gmb_lead && !l.gmb_lead.ai_messages?.length);
    if (!pending.length) return;

    async function runNext(queue: CrossedLead[]) {
      for (const item of queue) {
        if (!item.gmb_lead) continue;
        analyzingRef.current = true;
        try {
          const result = await analyzeGmbLead(item.gmb_lead);
          updateGmb.mutate({
            id: item.gmb_lead.id,
            ai_diagnosis: result.diagnosis,
            ai_messages: result.messages,
            website_issues: result.website_issues,
          });
        } catch (e) {
          console.error(`Auto-análise falhou para ${item.gmb_lead.nome_empresa}:`, e);
        }
      }
      analyzingRef.current = false;
    }

    runNext(pending);
  }, [leads?.length]); // eslint-disable-line react-hooks/exhaustive-deps
}

// ─── Card compacto do lead ────────────────────────────────────────────────────
function LeadCard({ lead, onClick }: { lead: CrossedLead; onClick: () => void }) {
  const ig = lead.instagram_prospect;
  const gmb = lead.gmb_lead;
  const isUnified = !!(ig && gmb);
  const issues = ig?.website_issues || gmb?.website_issues;

  return (
    <Card
      className="border border-border/60 hover:border-primary/40 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-start justify-between gap-2">
          {/* Avatar + nome */}
          <div className="flex items-center gap-2 min-w-0">
            {isUnified ? (
              <div className="w-8 h-8 rounded-full flex-shrink-0 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-orange-400 to-blue-500" />
                <Users className="absolute inset-0 w-4 h-4 m-auto text-white" />
              </div>
            ) : ig ? (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0">
                <Instagram className="w-4 h-4 text-white" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-white" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{lead.lead_name}</p>
              {ig && <p className="text-xs text-muted-foreground truncate">@{ig.username}</p>}
              {!ig && gmb?.endereco && (
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  <MapPin className="w-3 h-3 flex-shrink-0" />{gmb.endereco}
                </p>
              )}
            </div>
          </div>

          {/* Badges de status */}
          <div className="flex flex-col gap-1 items-end flex-shrink-0">
            {ig && (
              <Badge className={`${STATUS_COLORS[ig.status]} text-white text-xs px-1.5 py-0`}>
                {ig.status}
              </Badge>
            )}
            {gmb && (
              <Badge className={`${GMB_STATUS_COLORS[gmb.status]} text-white text-xs px-1.5 py-0`}>
                {gmb.status}
              </Badge>
            )}
          </div>
        </div>

        {/* Badges de fonte + heat score */}
        <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
          {ig && (
            <span className="flex items-center gap-1 bg-pink-500/10 text-pink-600 dark:text-pink-400 rounded-full px-2 py-0.5 font-medium">
              <Instagram className="w-3 h-3" /> Instagram
            </span>
          )}
          {gmb && (
            <span className="flex items-center gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full px-2 py-0.5 font-medium">
              <MapPin className="w-3 h-3" /> Google Maps
            </span>
          )}
          {isUnified && (
            <span className="flex items-center gap-1 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-full px-2 py-0.5 font-medium">
              <Flame className="w-3 h-3" /> {lead.heat_score}
            </span>
          )}
        </div>

        {/* Métricas */}
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
          {ig?.followers_count && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />{ig.followers_count.toLocaleString('pt-BR')}
            </span>
          )}
          {gmb?.rating && (
            <span className="flex items-center gap-1 text-yellow-500">
              <Star className="w-3 h-3 fill-current" />{gmb.rating}
              {gmb.reviews && <span className="text-muted-foreground">({gmb.reviews.toLocaleString('pt-BR')})</span>}
            </span>
          )}
          {lead.phone && <span className="flex items-center gap-1 text-green-600"><Phone className="w-3 h-3" />WhatsApp</span>}
          {(ig?.pipeline_lead_id || gmb?.pipeline_lead_id) && (
            <span className="flex items-center gap-1 text-violet-600"><Kanban className="w-3 h-3" />Pipeline</span>
          )}
        </div>

        {/* Badges de diagnóstico */}
        {issues && (
          <div className="flex gap-1 flex-wrap mt-1">
            {(issues.critical?.length ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-xs bg-red-500/15 text-red-600 dark:text-red-400 rounded-full px-2 py-0.5">
                <XCircle className="w-3 h-3" /> {issues.critical.length} crítico{issues.critical.length > 1 ? 's' : ''}
              </span>
            )}
            {(issues.warnings?.length ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-xs bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 rounded-full px-2 py-0.5">
                <AlertTriangle className="w-3 h-3" /> {issues.warnings.length} alerta{issues.warnings.length > 1 ? 's' : ''}
              </span>
            )}
            {issues.score !== undefined && (
              <span className={`flex items-center gap-1 text-xs rounded-full px-2 py-0.5 ${issues.score >= 70 ? 'bg-green-500/15 text-green-600' : issues.score >= 40 ? 'bg-yellow-500/15 text-yellow-600' : 'bg-red-500/15 text-red-600'}`}>
                <Globe className="w-3 h-3" /> Site {issues.score}/100
              </span>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="px-4 pb-3">
        <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1 text-muted-foreground pointer-events-none">
          <ChevronRight className="w-3 h-3" /> Ver detalhes
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Modal de detalhes do lead ────────────────────────────────────────────────
function LeadDetailModal({ lead, onClose }: { lead: CrossedLead; onClose: () => void }) {
  const ig = lead.instagram_prospect;
  const [gmbLead, setGmbLead] = useState<GmbLead | null>(lead.gmb_lead);
  const isUnified = !!(ig && gmbLead);

  const [mainTab, setMainTab] = useState<string>(
    ig ? 'instagram' : 'gmb'
  );
  const [igSubTab, setIgSubTab] = useState<'diagnostico' | 'mensagens' | 'proposta' | 'criativo'>('diagnostico');
  const [gmbSubTab, setGmbSubTab] = useState<'diagnostico' | 'mensagem'>('diagnostico');
  const [analyzing, setAnalyzing] = useState(false);
  const [sendingDM, setSendingDM] = useState(false);
  const [sendingWA, setSendingWA] = useState(false);

  const updateProspect = useUpdateProspect();
  const deleteProspect = useDeleteProspect();
  const updateGmb = useUpdateGmbLead();
  const deleteGmb = useDeleteGmbLead();
  const queryClient = useQueryClient();

  const phone = gmbLead?.whatsapp_jid || gmbLead?.telefone || lead.phone;

  const handleAnalyzeGmb = async () => {
    if (!gmbLead) return;
    setAnalyzing(true);
    try {
      const result = await analyzeGmbLead(gmbLead);
      const updated = { ...gmbLead, ai_diagnosis: result.diagnosis, ai_messages: result.messages, website_issues: result.website_issues };
      setGmbLead(updated);
      updateGmb.mutate({ id: gmbLead.id, ai_diagnosis: result.diagnosis, ai_messages: result.messages, website_issues: result.website_issues });
      setGmbSubTab('mensagem');
      toast.success('Diagnóstico GMB gerado!');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar diagnóstico.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSendDM = async () => {
    if (!ig?.ai_dm_message) return;
    await navigator.clipboard.writeText(ig.ai_dm_message);
    window.open(`https://ig.me/m/${ig.username}`, '_blank');

    let pipelineLeadId = ig.pipeline_lead_id;
    if (!pipelineLeadId) {
      const { data: pl } = await supabase
        .from('sales_pipeline')
        .insert({
          lead_name: ig.full_name || `@${ig.username}`,
          company: ig.full_name || ig.username,
          phone: ig.whatsapp || null,
          email: ig.email || null,
          stage: 'ATENDIMENTO_INICIA',
          deal_value: 0,
          probability: 10,
          source: 'instagram',
        })
        .select('id').single();
      pipelineLeadId = pl?.id ?? null;
      queryClient.invalidateQueries({ queryKey: ['sales-pipeline'] });
    }
    updateProspect.mutate({ id: ig.id, status: 'Mensagem Enviada', pipeline_lead_id: pipelineLeadId });
    await markFirstContactInCadence(null, ig.id, 'instagram_dm');
    toast.success('Instagram aberto! Mensagem 1 copiada — cole e envie.');
  };

  const handleSendWA = async () => {
    if (!gmbLead || !phone || !gmbLead.ai_messages?.length) return;
    setSendingWA(true);
    try {
      const number = formatWhatsAppNumber(phone);
      await sendWhatsAppMessages(number, gmbLead.ai_messages.map((m, i) => ({
        message: m.message,
        delay: i === 0 ? 0 : 3500,
      })));

      let pipelineLeadId = gmbLead.pipeline_lead_id;
      if (!pipelineLeadId) {
        const { data: pl } = await supabase
          .from('sales_pipeline')
          .insert({
            lead_name: gmbLead.nome_empresa,
            company: gmbLead.nome_empresa,
            phone: phone,
            stage: 'ATENDIMENTO_INICIA',
            deal_value: 0,
            probability: 10,
            source: 'gmb',
            notes: gmbLead.endereco || null,
          })
          .select('id').single();
        pipelineLeadId = pl?.id ?? null;
        queryClient.invalidateQueries({ queryKey: ['sales-pipeline'] });
      }
      updateGmb.mutate({ id: gmbLead.id, status: 'Contatado', pipeline_lead_id: pipelineLeadId });
      await markFirstContactInCadence(gmbLead.id, null, 'whatsapp');
      toast.success('3 mensagens WhatsApp enviadas! Lead no Pipeline.');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao enviar. Verifique a instância Evolution.');
    } finally {
      setSendingWA(false);
    }
  };

  const mainTabs = [
    { key: 'info', label: 'Informações' },
    ...(ig ? [{ key: 'instagram', label: 'Instagram', icon: <Instagram className="w-3 h-3" /> }] : []),
    ...(gmbLead ? [{ key: 'gmb', label: 'Google Maps', icon: <MapPin className="w-3 h-3" /> }] : []),
    { key: 'cadencia', label: 'Cadência', icon: <TrendingUp className="w-3 h-3" /> },
  ];

  const igSubTabs = [
    { key: 'diagnostico', label: 'Diagnóstico', icon: <Stethoscope className="w-3 h-3" /> },
    { key: 'mensagens', label: 'Mensagens', icon: <Instagram className="w-3 h-3" /> },
    ...(ig?.ai_proposal_brief ? [{ key: 'proposta', label: 'Proposta', icon: <FileText className="w-3 h-3" /> }] : []),
    ...(ig?.ai_creative_concept ? [{ key: 'criativo', label: 'Criativo', icon: <Lightbulb className="w-3 h-3" /> }] : []),
  ];

  const gmbSubTabs = [
    { key: 'diagnostico', label: 'Diagnóstico', icon: <Stethoscope className="w-3 h-3" /> },
    { key: 'mensagem', label: 'WhatsApp', icon: <MessageCircle className="w-3 h-3" /> },
  ];

  const siteUrl = ig?.website || gmbLead?.website;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isUnified ? (
              <div className="w-7 h-7 rounded-full flex-shrink-0 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-orange-400 to-blue-500" />
                <Users className="absolute inset-0 w-4 h-4 m-auto text-white" />
              </div>
            ) : ig ? (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0">
                <Instagram className="w-4 h-4 text-white" />
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-white" />
              </div>
            )}
            {lead.lead_name}
          </DialogTitle>
        </DialogHeader>

        {/* Badges de fonte + métricas */}
        <div className="flex flex-wrap gap-2 -mt-1">
          {ig && (
            <span className="flex items-center gap-1 text-xs bg-pink-500/10 text-pink-600 dark:text-pink-400 rounded-full px-2.5 py-1 font-medium">
              <Instagram className="w-3 h-3" /> Instagram
            </span>
          )}
          {gmbLead && (
            <span className="flex items-center gap-1 text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full px-2.5 py-1 font-medium">
              <MapPin className="w-3 h-3" /> Google Maps
            </span>
          )}
          {isUnified && (
            <span className="flex items-center gap-1 text-xs bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-full px-2.5 py-1 font-medium">
              <Flame className="w-3 h-3" /> Heat {lead.heat_score}
            </span>
          )}
          {ig && (
            <Badge className={`${STATUS_COLORS[ig.status]} text-white text-xs`}>
              IG: {ig.status}
            </Badge>
          )}
          {gmbLead && (
            <Badge className={`${GMB_STATUS_COLORS[gmbLead.status]} text-white text-xs`}>
              GMB: {gmbLead.status}
            </Badge>
          )}
          {(ig?.pipeline_lead_id || gmbLead?.pipeline_lead_id) && (
            <span className="flex items-center gap-1 text-xs bg-violet-500/15 text-violet-600 dark:text-violet-400 rounded-full px-2.5 py-1 font-medium">
              <Kanban className="w-3 h-3" /> No Pipeline
            </span>
          )}
        </div>

        {/* Botão gerar diagnóstico GMB */}
        {gmbLead && !gmbLead.ai_messages?.length && (
          <Button className="w-full gap-2" onClick={handleAnalyzeGmb} disabled={analyzing}>
            {analyzing
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Analisando site + dados Google...</>
              : <><Sparkles className="w-4 h-4" /> Gerar Diagnóstico Google Maps com IA</>}
          </Button>
        )}

        {/* Tabs principais */}
        <div className="flex gap-1 border-b border-border overflow-x-auto">
          {mainTabs.map(tab => (
            <button key={tab.key} onClick={() => setMainTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${mainTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* Aba: Informações */}
        {mainTab === 'info' && (
          <div className="space-y-4 text-sm">
            {/* Dados gerais */}
            <div className="space-y-2.5">
              {gmbLead?.endereco && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span>{gmbLead.endereco}</span>
                </div>
              )}
              {phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-green-600 font-medium">{formatWhatsAppNumber(phone)}</span>
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">✉</span>
                  <span className="text-xs">{lead.email}</span>
                </div>
              )}
              {siteUrl && (
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <a href={siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-primary hover:underline truncate flex items-center gap-1 text-xs">
                    {siteUrl} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </div>
              )}
              {ig?.niche && (
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs">{ig.niche}</span>
                </div>
              )}
              {gmbLead?.especialidades && (
                <div className="flex items-start gap-2">
                  <Briefcase className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">{gmbLead.especialidades}</span>
                </div>
              )}
              {ig?.bio && (
                <div className="text-xs text-muted-foreground bg-secondary/50 rounded-lg p-2.5">
                  {ig.bio}
                </div>
              )}
            </div>

            {/* Alterar status */}
            <div className="space-y-2 pt-1 border-t border-border">
              {ig && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status Instagram</p>
                  <Select value={ig.status} onValueChange={s => updateProspect.mutate({ id: ig.id, status: s as ProspectStatus })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROSPECT_STATUSES.map(s => (
                        <SelectItem key={s} value={s}>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[s]}`} /> {s}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {gmbLead && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status Google Maps</p>
                  <Select value={gmbLead.status} onValueChange={s => updateGmb.mutate({ id: gmbLead.id, status: s as GmbLeadStatus })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GMB_STATUSES.map(s => (
                        <SelectItem key={s} value={s}>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${GMB_STATUS_COLORS[s]}`} /> {s}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Excluir */}
            <div className="flex gap-2 pt-1 border-t border-border">
              {ig && (
                <Button size="sm" variant="ghost" className="gap-1 text-destructive hover:text-destructive text-xs"
                  onClick={() => { deleteProspect.mutate(ig.id); onClose(); }}>
                  <Trash2 className="w-3 h-3" /> Excluir lead Instagram
                </Button>
              )}
              {gmbLead && (
                <Button size="sm" variant="ghost" className="gap-1 text-destructive hover:text-destructive text-xs"
                  onClick={() => { deleteGmb.mutate(gmbLead.id); onClose(); }}>
                  <Trash2 className="w-3 h-3" /> Excluir lead GMB
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Aba: Instagram */}
        {mainTab === 'instagram' && ig && (
          <div className="space-y-2">
            {/* Sub-tabs */}
            <div className="flex gap-1 flex-wrap">
              {igSubTabs.map(tab => (
                <button key={tab.key} onClick={() => setIgSubTab(tab.key as typeof igSubTab)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${igSubTab === tab.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>

            {igSubTab === 'diagnostico' && (
              <div className="space-y-2">
                {ig.diagnosis_report ? (
                  <>
                    {ig.website_issues && (
                      <div className="flex gap-1.5 flex-wrap">
                        {(ig.website_issues.critical?.length ?? 0) > 0 && (
                          <span className="flex items-center gap-1 text-xs bg-red-500/15 text-red-600 rounded-full px-2 py-0.5">
                            <XCircle className="w-3 h-3" /> {ig.website_issues.critical.length} crítico{ig.website_issues.critical.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {(ig.website_issues.warnings?.length ?? 0) > 0 && (
                          <span className="flex items-center gap-1 text-xs bg-yellow-500/15 text-yellow-600 rounded-full px-2 py-0.5">
                            <AlertTriangle className="w-3 h-3" /> {ig.website_issues.warnings.length} alerta{ig.website_issues.warnings.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {(ig.website_issues.positives?.length ?? 0) > 0 && (
                          <span className="flex items-center gap-1 text-xs bg-green-500/15 text-green-600 rounded-full px-2 py-0.5">
                            <CheckCircle className="w-3 h-3" /> {ig.website_issues.positives.length} positivo{ig.website_issues.positives.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="relative">
                      <pre className="text-xs bg-secondary/50 rounded-lg p-3 pr-8 whitespace-pre-wrap font-sans leading-relaxed">{ig.diagnosis_report}</pre>
                      <Button size="sm" variant="ghost" className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={() => copyText(ig.diagnosis_report!, 'Diagnóstico')}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-6">Diagnóstico não disponível</p>
                )}
              </div>
            )}

            {igSubTab === 'mensagens' && (
              <div className="space-y-2">
                {ig.ai_dm_message ? (
                  <>
                    <p className="text-xs text-muted-foreground">Envie as 2 mensagens em sequência pelo Instagram DM:</p>
                    {[
                      { part: 1, message: ig.ai_dm_message },
                      { part: 2, message: ig.diagnosis_report || '' },
                    ].filter(m => m.message).map(m => (
                      <div key={m.part} className="relative">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs font-semibold text-primary bg-primary/10 rounded-full w-5 h-5 flex items-center justify-center">{m.part}</span>
                          <span className="text-xs text-muted-foreground">Mensagem {m.part}</span>
                        </div>
                        <pre className="text-xs bg-secondary/50 rounded-lg p-3 pr-8 whitespace-pre-wrap font-sans leading-relaxed">{m.message}</pre>
                        <Button size="sm" variant="ghost" className="absolute top-6 right-2 h-6 w-6 p-0"
                          onClick={() => copyText(m.message, `Mensagem ${m.part}`)}><Copy className="w-3 h-3" /></Button>
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-6">Gere o diagnóstico primeiro</p>
                )}
              </div>
            )}

            {igSubTab === 'proposta' && ig.ai_proposal_brief && (
              <div className="relative">
                <pre className="text-xs bg-secondary/50 rounded-lg p-3 pr-8 whitespace-pre-wrap font-sans leading-relaxed">{ig.ai_proposal_brief}</pre>
                <Button size="sm" variant="ghost" className="absolute top-1 right-1 h-6 w-6 p-0"
                  onClick={() => copyText(ig.ai_proposal_brief!, 'Proposta')}><Copy className="w-3 h-3" /></Button>
              </div>
            )}

            {igSubTab === 'criativo' && ig.ai_creative_concept && (
              <div className="relative">
                <pre className="text-xs bg-secondary/50 rounded-lg p-3 pr-8 whitespace-pre-wrap font-sans leading-relaxed">{ig.ai_creative_concept}</pre>
                <Button size="sm" variant="ghost" className="absolute top-1 right-1 h-6 w-6 p-0"
                  onClick={() => copyText(ig.ai_creative_concept!, 'Criativo')}><Copy className="w-3 h-3" /></Button>
              </div>
            )}
          </div>
        )}

        {/* Aba: Google Maps */}
        {mainTab === 'gmb' && gmbLead && (
          <div className="space-y-2">
            {/* Sub-tabs */}
            <div className="flex gap-1 flex-wrap">
              {gmbSubTabs.map(tab => (
                <button key={tab.key} onClick={() => setGmbSubTab(tab.key as typeof gmbSubTab)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${gmbSubTab === tab.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>

            {gmbSubTab === 'diagnostico' && (
              <div className="space-y-2">
                {gmbLead.ai_diagnosis ? (
                  <>
                    {gmbLead.website_issues && (
                      <div className="flex gap-1.5 flex-wrap">
                        {(gmbLead.website_issues.critical?.length ?? 0) > 0 && (
                          <span className="flex items-center gap-1 text-xs bg-red-500/15 text-red-600 rounded-full px-2 py-0.5">
                            <XCircle className="w-3 h-3" /> {gmbLead.website_issues.critical.length} crítico{gmbLead.website_issues.critical.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {(gmbLead.website_issues.warnings?.length ?? 0) > 0 && (
                          <span className="flex items-center gap-1 text-xs bg-yellow-500/15 text-yellow-600 rounded-full px-2 py-0.5">
                            <AlertTriangle className="w-3 h-3" /> {gmbLead.website_issues.warnings.length} alerta{gmbLead.website_issues.warnings.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {(gmbLead.website_issues.positives?.length ?? 0) > 0 && (
                          <span className="flex items-center gap-1 text-xs bg-green-500/15 text-green-600 rounded-full px-2 py-0.5">
                            <CheckCircle className="w-3 h-3" /> {gmbLead.website_issues.positives.length} positivo{gmbLead.website_issues.positives.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="relative">
                      <pre className="text-xs bg-secondary/50 rounded-lg p-3 pr-8 whitespace-pre-wrap font-sans leading-relaxed">{gmbLead.ai_diagnosis}</pre>
                      <Button size="sm" variant="ghost" className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={() => copyText(gmbLead.ai_diagnosis!, 'Diagnóstico')}><Copy className="w-3 h-3" /></Button>
                    </div>
                    <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={handleAnalyzeGmb} disabled={analyzing}>
                      {analyzing ? <><Loader2 className="w-3 h-3 animate-spin" />Gerando...</> : <><Sparkles className="w-3 h-3" />Regenerar</>}
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Sparkles className="w-6 h-6 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Clique em "Gerar Diagnóstico" acima</p>
                  </div>
                )}
              </div>
            )}

            {gmbSubTab === 'mensagem' && (
              <div className="space-y-2">
                {gmbLead.ai_messages?.length ? (
                  <>
                    <p className="text-xs text-muted-foreground">Sequência de {gmbLead.ai_messages.length} mensagens com intervalo de 3,5s:</p>
                    {gmbLead.ai_messages.map(m => (
                      <div key={m.part} className="relative">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs font-semibold text-primary bg-primary/10 rounded-full w-5 h-5 flex items-center justify-center">{m.part}</span>
                          <span className="text-xs text-muted-foreground">Mensagem {m.part}</span>
                        </div>
                        <pre className="text-xs bg-secondary/50 rounded-lg p-3 pr-8 whitespace-pre-wrap font-sans leading-relaxed">{m.message}</pre>
                        <Button size="sm" variant="ghost" className="absolute top-6 right-2 h-6 w-6 p-0"
                          onClick={() => copyText(m.message, `Mensagem ${m.part}`)}><Copy className="w-3 h-3" /></Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={handleAnalyzeGmb} disabled={analyzing}>
                      {analyzing ? <><Loader2 className="w-3 h-3 animate-spin" />Gerando...</> : <><Sparkles className="w-3 h-3" />Regenerar mensagens</>}
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <MessageCircle className="w-6 h-6 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Gere o diagnóstico para criar as mensagens</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Aba: Cadência */}
        {mainTab === 'cadencia' && (
          <LeadCadencePanel
            instagramProspect={ig || undefined}
            gmbLead={gmbLead || undefined}
          />
        )}

        {/* Ações no rodapé */}
        <div className="flex gap-2 pt-2 border-t border-border flex-wrap">
          {ig?.ai_dm_message && (
            <Button
              className="gap-1.5 bg-gradient-to-r from-pink-500 to-orange-400 hover:from-pink-600 hover:to-orange-500 text-white border-0 flex-1"
              onClick={handleSendDM} disabled={sendingDM}>
              <Instagram className="w-4 h-4" /> Enviar DM
            </Button>
          )}
          {gmbLead?.ai_messages?.length && phone ? (
            <Button
              className="gap-1.5 bg-green-600 hover:bg-green-700 text-white border-0 flex-1"
              onClick={handleSendWA} disabled={sendingWA}>
              {sendingWA ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
              {sendingWA ? 'Enviando...' : 'Enviar WhatsApp'}
            </Button>
          ) : null}
          {ig && (
            <Button variant="outline" className="gap-1"
              onClick={() => window.open(`https://instagram.com/${ig.username}`, '_blank')}>
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
          {siteUrl && (
            <Button variant="outline" className="gap-1"
              onClick={() => window.open(siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`, '_blank')}>
              <Globe className="w-4 h-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Página unificada de Leads ─────────────────────────────────────────────────
export function UnifiedLeads() {
  const { data: leads, isLoading, matchedCount, igOnlyCount, gmbOnlyCount } = useCrossedLeads();
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('Todos');
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<CrossedLead | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  useAutoAnalyzeGmbLeads(leads);

  const filtered = (leads || []).filter(l => {
    if (sourceFilter === 'Instagram' && !l.instagram_prospect) return false;
    if (sourceFilter === 'Google Maps' && !l.gmb_lead) return false;
    if (sourceFilter === 'Unificado' && !(l.instagram_prospect && l.gmb_lead)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.lead_name.toLowerCase().includes(q) ||
      (l.instagram_prospect?.username || '').toLowerCase().includes(q) ||
      (l.gmb_lead?.endereco || '').toLowerCase().includes(q) ||
      (l.instagram_prospect?.niche || '').toLowerCase().includes(q) ||
      (l.gmb_lead?.especialidades || '').toLowerCase().includes(q)
    );
  });

  const total = leads?.length ?? 0;

  const sourceOptions = [
    { key: 'Todos', label: 'Todos', count: total },
    { key: 'Instagram', label: 'Instagram', count: igOnlyCount + matchedCount, color: 'bg-pink-500' },
    { key: 'Google Maps', label: 'Google Maps', count: gmbOnlyCount + matchedCount, color: 'bg-blue-500' },
    { key: 'Unificado', label: 'Unificados', count: matchedCount, color: 'bg-orange-500' },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" /> Leads
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {total} lead{total !== 1 ? 's' : ''} — {matchedCount} unificado{matchedCount !== 1 ? 's' : ''} (mesmo negócio em ambas as fontes)
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4" /> Novo Diagnóstico Instagram
        </Button>
      </div>

      {/* Filtro por fonte */}
      <div className="flex gap-2 flex-wrap">
        {sourceOptions.map(s => (
          <button key={s.key} onClick={() => setSourceFilter(s.key as SourceFilter)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${sourceFilter === s.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground hover:text-foreground'}`}>
            {'color' in s && <span className={`w-2 h-2 rounded-full ${s.color}`} />}
            {s.label}
            {s.count > 0 && <span className="bg-black/10 dark:bg-white/20 rounded-full px-1">{s.count}</span>}
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
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium text-sm">Nenhum lead encontrado</p>
          <p className="text-xs mt-1">
            {total === 0
              ? 'Adicione um diagnóstico Instagram ou importe leads do Google Maps via n8n'
              : 'Nenhum lead para este filtro'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(lead => (
            <LeadCard key={lead.id} lead={lead} onClick={() => setSelectedLead(lead)} />
          ))}
        </div>
      )}

      {/* Modal detalhes */}
      {selectedLead && (
        <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
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
