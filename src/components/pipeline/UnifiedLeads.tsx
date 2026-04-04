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
  CheckCircle, Stethoscope, Kanban, MapPin, ChevronRight, TrendingUp,
  Instagram, Briefcase, FileText, Lightbulb, Flame, Bell, BellOff, CalendarClock,
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
          const igData = item.instagram_prospect ? {
            username: item.instagram_prospect.username,
            bio: item.instagram_prospect.bio,
            followers_count: item.instagram_prospect.followers_count,
            niche: item.instagram_prospect.niche,
          } : null;
          const result = await analyzeGmbLead(item.gmb_lead, igData);
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

// ─── Helpers de follow-up ─────────────────────────────────────────────────────
function getFollowupStatus(followupAt: string | null | undefined): 'overdue' | 'today' | 'upcoming' | null {
  if (!followupAt) return null;
  const due = new Date(followupAt);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);
  if (due < todayStart) return 'overdue';
  if (due < todayEnd) return 'today';
  return 'upcoming';
}

function formatFollowupDate(followupAt: string): string {
  const d = new Date(followupAt);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

// ─── Card compacto do lead ────────────────────────────────────────────────────
function LeadCard({ lead, onClick }: { lead: CrossedLead; onClick: () => void }) {
  const ig = lead.instagram_prospect;
  const gmb = lead.gmb_lead;
  const isUnified = !!(ig && gmb);
  const issues = ig?.website_issues || gmb?.website_issues;
  const followupAt = ig?.followup_at || gmb?.followup_at;
  const followupStatus = getFollowupStatus(followupAt);

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


        {/* Badge de follow-up */}
        {followupStatus && followupAt && (
          <div className={`flex items-center gap-1.5 mt-1 text-xs font-medium rounded-full px-2 py-0.5 w-fit ${
            followupStatus === 'overdue' ? 'bg-red-500/15 text-red-600 dark:text-red-400' :
            followupStatus === 'today'   ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400' :
                                          'bg-blue-500/10 text-blue-600 dark:text-blue-400'
          }`}>
            <Bell className="w-3 h-3" />
            {followupStatus === 'overdue' && `Follow-up vencido (${formatFollowupDate(followupAt)})`}
            {followupStatus === 'today'   && 'Follow-up hoje!'}
            {followupStatus === 'upcoming' && `Follow-up em ${formatFollowupDate(followupAt)}`}
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

  // Tabs planos — sem cadência
  type MainTab = 'info' | 'diagnostico' | 'mensagens' | 'proposta';
  const [mainTab, setMainTab] = useState<MainTab>('diagnostico');
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
      const igData = ig ? { username: ig.username, bio: ig.bio, followers_count: ig.followers_count, niche: ig.niche } : null;
      const result = await analyzeGmbLead(gmbLead, igData);
      const updated = { ...gmbLead, ai_diagnosis: result.diagnosis, ai_messages: result.messages, website_issues: result.website_issues };
      setGmbLead(updated);
      updateGmb.mutate({ id: gmbLead.id, ai_diagnosis: result.diagnosis, ai_messages: result.messages, website_issues: result.website_issues });
      toast.success(isUnified ? 'Diagnóstico unificado gerado!' : 'Diagnóstico gerado!');
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

  const handleSaveFollowup = (dateStr: string) => {
    const value = dateStr ? new Date(dateStr + 'T09:00:00').toISOString() : null;
    if (ig) updateProspect.mutate({ id: ig.id, followup_at: value } as any);
    if (gmbLead) updateGmb.mutate({ id: gmbLead.id, followup_at: value } as any);
    toast.success(value ? 'Lembrete salvo!' : 'Lembrete removido.');
  };

  // Diagnóstico primário: GMB preferred (mais estruturado: website + Google), else Instagram
  const primaryDiagnosis = (gmbLead?.ai_diagnosis?.trim() || '') !== ''
    ? gmbLead!.ai_diagnosis
    : ig?.diagnosis_report || null;
  const primaryIssues = gmbLead?.website_issues || ig?.website_issues || null;
  const canRegenerateDiagnosis = !!gmbLead; // regenerar via GMB Edge Function

  const mainTabs: { key: MainTab; label: string; icon?: JSX.Element }[] = [
    { key: 'info', label: 'Informações' },
    { key: 'diagnostico', label: 'Diagnóstico', icon: <Stethoscope className="w-3 h-3" /> },
    { key: 'mensagens', label: 'Mensagens', icon: <MessageCircle className="w-3 h-3" /> },
    ...(ig?.ai_proposal_brief ? [{ key: 'proposta' as MainTab, label: 'Proposta', icon: <FileText className="w-3 h-3" /> }] : []),
  ];

  // Follow-up state
  const currentFollowup = ig?.followup_at || gmbLead?.followup_at || null;
  const [followupDate, setFollowupDate] = useState<string>(
    currentFollowup ? new Date(currentFollowup).toISOString().split('T')[0] : ''
  );
  const followupStatus = getFollowupStatus(currentFollowup);

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

        {/* Badges de fonte */}
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
          {ig && <Badge className={`${STATUS_COLORS[ig.status]} text-white text-xs`}>IG: {ig.status}</Badge>}
          {gmbLead && <Badge className={`${GMB_STATUS_COLORS[gmbLead.status]} text-white text-xs`}>GMB: {gmbLead.status}</Badge>}
          {(ig?.pipeline_lead_id || gmbLead?.pipeline_lead_id) && (
            <span className="flex items-center gap-1 text-xs bg-violet-500/15 text-violet-600 dark:text-violet-400 rounded-full px-2.5 py-1 font-medium">
              <Kanban className="w-3 h-3" /> No Pipeline
            </span>
          )}
        </div>

        {/* Tabs planos */}
        <div className="flex gap-0 border-b border-border overflow-x-auto">
          {mainTabs.map(tab => (
            <button key={tab.key} onClick={() => setMainTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${mainTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* ── Informações ── */}
        {mainTab === 'info' && (
          <div className="space-y-4 text-sm">
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
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">✉</span>
                  <span>{lead.email}</span>
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
                <div className="flex items-center gap-2 text-xs">
                  <TrendingUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span>{ig.niche}</span>
                </div>
              )}
              {ig?.followers_count && (
                <div className="flex items-center gap-2 text-xs">
                  <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span>{ig.followers_count.toLocaleString('pt-BR')} seguidores</span>
                </div>
              )}
              {gmbLead?.rating && (
                <div className="flex items-center gap-2 text-xs">
                  <Star className="w-4 h-4 text-yellow-500 fill-current flex-shrink-0" />
                  <span>{gmbLead.rating}/5 ({gmbLead.reviews?.toLocaleString('pt-BR') ?? 0} avaliações)</span>
                </div>
              )}
              {gmbLead?.especialidades && (
                <div className="flex items-start gap-2 text-xs">
                  <Briefcase className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{gmbLead.especialidades}</span>
                </div>
              )}
              {ig?.bio && (
                <div className="text-xs text-muted-foreground bg-secondary/50 rounded-lg p-2.5">{ig.bio}</div>
              )}
            </div>

            {/* ── Lembrete de follow-up ── */}
            <div className="pt-1 border-t border-border space-y-2">
              <p className="text-xs font-medium flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-primary" /> Lembrete de follow-up
              </p>
              {followupStatus && currentFollowup && (
                <div className={`flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-2 ${
                  followupStatus === 'overdue' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                  followupStatus === 'today'   ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' :
                                                'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                }`}>
                  <CalendarClock className="w-3.5 h-3.5 flex-shrink-0" />
                  {followupStatus === 'overdue' && `Vencido em ${formatFollowupDate(currentFollowup)}`}
                  {followupStatus === 'today'   && 'Hoje é o dia do follow-up!'}
                  {followupStatus === 'upcoming' && `Agendado para ${formatFollowupDate(currentFollowup)}`}
                </div>
              )}
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={followupDate}
                  onChange={e => setFollowupDate(e.target.value)}
                  className="flex-1 h-8 text-xs rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <Button size="sm" className="h-8 text-xs gap-1" onClick={() => handleSaveFollowup(followupDate)} disabled={!followupDate}>
                  <Bell className="w-3 h-3" /> Salvar
                </Button>
                {currentFollowup && (
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground" title="Remover lembrete"
                    onClick={() => { setFollowupDate(''); handleSaveFollowup(''); }}>
                    <BellOff className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2 pt-1 border-t border-border">
              {ig && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status Instagram</p>
                  <Select value={ig.status} onValueChange={s => updateProspect.mutate({ id: ig.id, status: s as ProspectStatus })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROSPECT_STATUSES.map(s => (
                        <SelectItem key={s} value={s}>
                          <div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${STATUS_COLORS[s]}`} />{s}</div>
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
                          <div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${GMB_STATUS_COLORS[s]}`} />{s}</div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1 border-t border-border">
              {ig && (
                <Button size="sm" variant="ghost" className="gap-1 text-destructive hover:text-destructive text-xs"
                  onClick={() => { deleteProspect.mutate(ig.id); onClose(); }}>
                  <Trash2 className="w-3 h-3" /> Excluir Instagram
                </Button>
              )}
              {gmbLead && (
                <Button size="sm" variant="ghost" className="gap-1 text-destructive hover:text-destructive text-xs"
                  onClick={() => { deleteGmb.mutate(gmbLead.id); onClose(); }}>
                  <Trash2 className="w-3 h-3" /> Excluir GMB
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ── Diagnóstico (único, independente da fonte) ── */}
        {mainTab === 'diagnostico' && (
          <div className="space-y-3">
            {/* Label informando as fontes do diagnóstico */}
            {isUnified && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/60 rounded-lg px-3 py-2">
                <Flame className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                Diagnóstico unificado — dados do site, Google Maps e Instagram combinados.
                {canRegenerateDiagnosis && ' Clique em "Regenerar" para atualizar.'}
              </div>
            )}

            {/* Botão gerar — só se não tem diagnóstico E tem GMB */}
            {!primaryDiagnosis && canRegenerateDiagnosis && (
              <Button className="w-full gap-2" onClick={handleAnalyzeGmb} disabled={analyzing}>
                {analyzing
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Analisando site + dados Google...</>
                  : <><Sparkles className="w-4 h-4" />Gerar Diagnóstico com IA</>}
              </Button>
            )}

            {primaryDiagnosis ? (
              <>
                {/* Badges de issues */}
                {primaryIssues && (
                  <div className="flex gap-1.5 flex-wrap">
                    {(primaryIssues.critical?.length ?? 0) > 0 && (
                      <span className="flex items-center gap-1 text-xs bg-red-500/15 text-red-600 dark:text-red-400 rounded-full px-2 py-0.5">
                        <XCircle className="w-3 h-3" /> {primaryIssues.critical.length} crítico{primaryIssues.critical.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {(primaryIssues.warnings?.length ?? 0) > 0 && (
                      <span className="flex items-center gap-1 text-xs bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 rounded-full px-2 py-0.5">
                        <AlertTriangle className="w-3 h-3" /> {primaryIssues.warnings.length} alerta{primaryIssues.warnings.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {(primaryIssues.positives?.length ?? 0) > 0 && (
                      <span className="flex items-center gap-1 text-xs bg-green-500/15 text-green-600 dark:text-green-400 rounded-full px-2 py-0.5">
                        <CheckCircle className="w-3 h-3" /> {primaryIssues.positives.length} positivo{primaryIssues.positives.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {primaryIssues.score !== undefined && (
                      <span className={`flex items-center gap-1 text-xs rounded-full px-2 py-0.5 ${primaryIssues.score >= 70 ? 'bg-green-500/15 text-green-600' : primaryIssues.score >= 40 ? 'bg-yellow-500/15 text-yellow-600' : 'bg-red-500/15 text-red-600'}`}>
                        <Globe className="w-3 h-3" /> Site {primaryIssues.score}/100
                      </span>
                    )}
                  </div>
                )}

                <div className="relative">
                  <pre className="text-xs bg-secondary/50 rounded-lg p-3 pr-8 whitespace-pre-wrap font-sans leading-relaxed">
                    {primaryDiagnosis}
                  </pre>
                  <Button size="sm" variant="ghost" className="absolute top-1 right-1 h-6 w-6 p-0"
                    onClick={() => copyText(primaryDiagnosis, 'Diagnóstico')}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>

                {canRegenerateDiagnosis && (
                  <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={handleAnalyzeGmb} disabled={analyzing}>
                    {analyzing
                      ? <><Loader2 className="w-3 h-3 animate-spin" />Regenerando...</>
                      : <><Sparkles className="w-3 h-3" />{isUnified ? 'Regenerar diagnóstico unificado' : 'Regenerar diagnóstico'}</>}
                  </Button>
                )}
              </>
            ) : !canRegenerateDiagnosis ? (
              <div className="text-center py-8 text-muted-foreground">
                <Stethoscope className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Diagnóstico não disponível</p>
              </div>
            ) : null}
          </div>
        )}

        {/* ── Mensagens (DM Instagram e/ou WhatsApp) ── */}
        {mainTab === 'mensagens' && (
          <div className="space-y-4">
            {/* Instagram DM */}
            {ig?.ai_dm_message && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-pink-600 dark:text-pink-400 flex items-center gap-1">
                  <Instagram className="w-3 h-3" /> Instagram DM — envie as 2 mensagens em sequência
                </p>
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
              </div>
            )}

            {/* Divisor se tem os dois */}
            {ig?.ai_dm_message && gmbLead?.ai_messages?.length && (
              <div className="border-t border-border" />
            )}

            {/* WhatsApp */}
            {gmbLead?.ai_messages?.length ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-green-600 dark:text-green-400 flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" /> WhatsApp — {gmbLead.ai_messages.length} mensagens com intervalo de 3,5s
                </p>
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
              </div>
            ) : gmbLead && !gmbLead.ai_messages?.length ? (
              <div className="text-center py-6 text-muted-foreground">
                <MessageCircle className="w-6 h-6 mx-auto mb-2 opacity-30" />
                <p className="text-xs mb-2">Nenhuma mensagem WhatsApp gerada ainda</p>
                <Button size="sm" className="gap-2" onClick={handleAnalyzeGmb} disabled={analyzing}>
                  {analyzing ? <><Loader2 className="w-3 h-3 animate-spin" />Gerando...</> : <><Sparkles className="w-3 h-3" />Gerar mensagens</>}
                </Button>
              </div>
            ) : null}

            {!ig?.ai_dm_message && !gmbLead && (
              <p className="text-xs text-muted-foreground text-center py-6">Nenhuma mensagem disponível</p>
            )}
          </div>
        )}

        {/* ── Proposta ── */}
        {mainTab === 'proposta' && ig?.ai_proposal_brief && (
          <div className="space-y-2">
            <div className="relative">
              <pre className="text-xs bg-secondary/50 rounded-lg p-3 pr-8 whitespace-pre-wrap font-sans leading-relaxed">{ig.ai_proposal_brief}</pre>
              <Button size="sm" variant="ghost" className="absolute top-1 right-1 h-6 w-6 p-0"
                onClick={() => copyText(ig.ai_proposal_brief!, 'Proposta')}><Copy className="w-3 h-3" /></Button>
            </div>
            {ig.ai_creative_concept && (
              <>
                <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mt-3">
                  <Lightbulb className="w-3 h-3" /> Conceito criativo
                </p>
                <div className="relative">
                  <pre className="text-xs bg-secondary/50 rounded-lg p-3 pr-8 whitespace-pre-wrap font-sans leading-relaxed">{ig.ai_creative_concept}</pre>
                  <Button size="sm" variant="ghost" className="absolute top-1 right-1 h-6 w-6 p-0"
                    onClick={() => copyText(ig.ai_creative_concept!, 'Criativo')}><Copy className="w-3 h-3" /></Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Ações no rodapé */}
        <div className="flex gap-2 pt-2 border-t border-border flex-wrap">
          {ig?.ai_dm_message && (
            <Button className="gap-1.5 bg-gradient-to-r from-pink-500 to-orange-400 hover:from-pink-600 hover:to-orange-500 text-white border-0 flex-1"
              onClick={handleSendDM} disabled={sendingDM}>
              <Instagram className="w-4 h-4" /> Enviar DM
            </Button>
          )}
          {gmbLead?.ai_messages?.length && phone ? (
            <Button className="gap-1.5 bg-green-600 hover:bg-green-700 text-white border-0 flex-1"
              onClick={handleSendWA} disabled={sendingWA}>
              {sendingWA ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
              {sendingWA ? 'Enviando...' : 'Enviar WhatsApp'}
            </Button>
          ) : null}
          {ig && (
            <Button variant="outline" onClick={() => window.open(`https://instagram.com/${ig.username}`, '_blank')}>
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
          {siteUrl && (
            <Button variant="outline" onClick={() => window.open(siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`, '_blank')}>
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
    // Ocultar leads que já foram movidos para o Pipeline (já foram prospectados)
    if (l.instagram_prospect?.pipeline_lead_id || l.gmb_lead?.pipeline_lead_id) return false;
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
