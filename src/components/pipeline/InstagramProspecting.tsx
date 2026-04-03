import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Instagram, Search, Sparkles, Copy, ExternalLink,
  Trash2, ChevronDown, ChevronUp, Users, Phone, Mail, Loader2,
  Plus, TrendingUp, FileText, Lightbulb, Globe, Star, AlertTriangle,
  CheckCircle, XCircle, Stethoscope, Kanban,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useInstagramProspects, useCreateProspect, useUpdateProspect, useDeleteProspect,
  analyzeInstagramProspect, PROSPECT_STATUSES, STATUS_COLORS,
  type InstagramProspect, type ProspectStatus,
} from '@/hooks/useInstagramProspects';
import { markFirstContactInCadence, generateLeadCadence } from '@/hooks/useCrossedLeads';
import { LeadCadencePanel } from '@/components/pipeline/LeadCadencePanel';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const STATUS_LABELS: Record<ProspectStatus, string> = {
  'Identificado': 'Identificado', 'Mensagem Enviada': 'Msg Enviada',
  'Respondeu': 'Respondeu', 'Reunião Marcada': 'Reunião',
  'Proposta Enviada': 'Proposta', 'Ganho': 'Ganho', 'Perdido': 'Perdido',
};

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text);
  toast.success(`${label} copiado!`);
}

function openInstagramDM(username: string) {
  window.open(`https://ig.me/m/${username}`, '_blank');
}

// ─── Formulário de novo prospect ──────────────────────────────────────────────

interface AddProspectFormProps { onClose: () => void; }

export function AddProspectForm({ onClose }: AddProspectFormProps) {
  const createProspect = useCreateProspect();
  const [step, setStep] = useState<'idle' | 'fetching' | 'analyzing' | 'needs_bio'>('idle');
  const [username, setUsername] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [manualBio, setManualBio] = useState('');
  const [cleanUsername, setCleanUsername] = useState('');

  const parseUsername = (raw: string) =>
    raw.replace('@', '').replace(/https?:\/\/(www\.)?instagram\.com\/?/, '').replace(/\/$/, '').trim();

  const doSave = async (result: Awaited<ReturnType<typeof analyzeInstagramProspect>>, uname: string) => {
    const prospect = await createProspect.mutateAsync({
      username: uname,
      full_name: result.profile?.full_name ?? null,
      bio: result.profile?.bio ?? null,
      followers_count: result.profile?.followers_count ?? null,
      following_count: result.profile?.following_count ?? null,
      posts_count: result.profile?.posts_count ?? null,
      niche: result.profile?.niche ?? null,
      website: result.profile?.website ?? websiteUrl ?? null,
      whatsapp: result.extracted_whatsapp ?? null,
      email: result.extracted_email ?? null,
      ai_analysis: null,
      ai_dm_message: result.dm_message ?? null,
      ai_proposal_brief: result.proposal_brief ?? null,
      ai_creative_concept: result.creative_concept ?? null,
      website_issues: result.website_audit ?? null,
      google_rating: result.google_data?.rating ?? null,
      google_reviews_count: result.google_data?.reviews_count ?? null,
      google_address: result.google_data?.address ?? null,
      diagnosis_report: result.diagnosis_report ?? null,
      status: 'Identificado',
      meeting_date: null, loss_reason: null, notes: null,
      pipeline_lead_id: null, engagement_rate: null,
    });

    // Gerar cadência em background sem bloquear o fechamento do modal
    generateLeadCadence({
      id: `ig_${prospect.id}`,
      instagram_prospect: prospect,
      gmb_lead: null,
      website: (result.profile?.website ?? websiteUrl ?? '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''),
      lead_name: result.profile?.full_name ?? uname,
      phone: result.extracted_whatsapp ?? null,
      email: result.extracted_email ?? null,
      heat_score: 50,
      instagram_score: 0,
      gmb_score: 0,
    }).then(async cadenceResult => {
      await supabase.from('lead_cadence' as any).insert({
        instagram_prospect_id: prospect.id,
        gmb_lead_id: null,
        lead_name: result.profile?.full_name ?? uname,
        company: result.profile?.full_name ?? uname,
        website: result.profile?.website ?? websiteUrl ?? null,
        phone: result.extracted_whatsapp ?? null,
        email: result.extracted_email ?? null,
        heat_score: 50,
        instagram_score: 0,
        gmb_score: 0,
        ai_unified_analysis: cadenceResult.analysis,
        cadence_steps: cadenceResult.cadence_steps,
        status: 'active',
        current_step: 0,
      });
    }).catch(e => console.error('Auto-cadência Instagram falhou:', e));

    onClose();
  };

  const handleStart = async () => {
    const clean = parseUsername(username);
    if (!clean) { toast.error('Informe o @username ou URL do perfil'); return; }
    setCleanUsername(clean);
    setStep('fetching');
    try {
      setStep('analyzing');
      const result = await analyzeInstagramProspect(clean, undefined, websiteUrl || undefined);
      if (result.needs_manual_bio) { setStep('needs_bio'); return; }
      await doSave(result, clean);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao analisar perfil. Tente novamente.');
      setStep('idle');
    }
  };

  const handleAnalyzeWithBio = async () => {
    if (!manualBio.trim()) { toast.error('Cole a bio do perfil para continuar'); return; }
    setStep('analyzing');
    try {
      const result = await analyzeInstagramProspect(cleanUsername, manualBio.trim(), websiteUrl || undefined);
      await doSave(result, cleanUsername);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao analisar. Tente novamente.');
      setStep('needs_bio');
    }
  };

  const isLoading = step === 'fetching' || step === 'analyzing';
  const stepLabel = step === 'fetching' ? 'Buscando perfil Instagram...' : 'Analisando com IA (site + Instagram + Google)...';

  if (step === 'needs_bio') {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2.5">
          <span className="text-yellow-500 mt-0.5">⚠️</span>
          <div className="text-xs text-yellow-700 dark:text-yellow-400">
            <p className="font-medium">Instagram bloqueou o acesso automático para <span className="font-bold">@{cleanUsername}</span></p>
            <p className="mt-0.5 opacity-80">Cole a bio abaixo para a IA gerar um diagnóstico real.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs"
          onClick={() => window.open(`https://instagram.com/${cleanUsername}`, '_blank')}>
          <ExternalLink className="w-3 h-3" /> Abrir @{cleanUsername} no Instagram para copiar a bio
        </Button>
        <div>
          <Label>Bio do perfil</Label>
          <Textarea className="mt-1.5 text-sm" placeholder="Cole aqui a bio do perfil (nome, descrição, contatos, link)..."
            rows={5} value={manualBio} onChange={e => setManualBio(e.target.value)}
            autoFocus disabled={step === 'analyzing'} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setStep('idle')} disabled={step === 'analyzing'}>Voltar</Button>
          <Button className="flex-1 gap-2" onClick={handleAnalyzeWithBio} disabled={step === 'analyzing'}>
            {step === 'analyzing'
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Analisando...</>
              : <><Sparkles className="w-4 h-4" /> Gerar Diagnóstico</>}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>@Username ou URL do Instagram *</Label>
        <div className="relative mt-1.5">
          <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9 h-10" placeholder="@perfil  ou  instagram.com/perfil"
            value={username} onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !isLoading && handleStart()}
            autoFocus disabled={isLoading} />
        </div>
      </div>
      <div>
        <Label>Site do negócio <span className="text-muted-foreground font-normal">(opcional — para auditoria completa)</span></Label>
        <div className="relative mt-1.5">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9 h-10" placeholder="site.com.br"
            value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)}
            disabled={isLoading} />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          Com o site, a IA encontra problemas reais: Lorem ipsum, SEO, CTAs, erros técnicos.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2.5">
          <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
          {stepLabel}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={isLoading}>Cancelar</Button>
        <Button className="flex-1 gap-2" onClick={handleStart} disabled={isLoading}>
          {isLoading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> {step === 'fetching' ? 'Buscando...' : 'Analisando...'}</>
            : <><Stethoscope className="w-4 h-4" /> Gerar Diagnóstico</>}
        </Button>
      </div>
    </div>
  );
}

// ─── Card do prospect ────────────────────────────────────────────────────────

function DiagnosisBadges({ prospect }: { prospect: InstagramProspect }) {
  const issues = prospect.website_issues;
  if (!issues) return null;
  const critical = issues.critical?.length ?? 0;
  const warnings = issues.warnings?.length ?? 0;
  return (
    <div className="flex gap-1 flex-wrap mt-1">
      {critical > 0 && (
        <span className="flex items-center gap-1 text-xs bg-red-500/15 text-red-600 dark:text-red-400 rounded-full px-2 py-0.5">
          <XCircle className="w-3 h-3" /> {critical} crítico{critical > 1 ? 's' : ''}
        </span>
      )}
      {warnings > 0 && (
        <span className="flex items-center gap-1 text-xs bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 rounded-full px-2 py-0.5">
          <AlertTriangle className="w-3 h-3" /> {warnings} alerta{warnings > 1 ? 's' : ''}
        </span>
      )}
      {issues.score !== undefined && (
        <span className={`flex items-center gap-1 text-xs rounded-full px-2 py-0.5 ${issues.score >= 70 ? 'bg-green-500/15 text-green-600 dark:text-green-400' : issues.score >= 40 ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400' : 'bg-red-500/15 text-red-600 dark:text-red-400'}`}>
          <Globe className="w-3 h-3" /> Site {issues.score}/100
        </span>
      )}
    </div>
  );
}

export function ProspectCard({ prospect, showSource }: { prospect: InstagramProspect; showSource?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'diagnostico' | 'mensagens' | 'proposal' | 'creative' | 'cadencia'>('diagnostico');
  const updateProspect = useUpdateProspect();
  const deleteProspect = useDeleteProspect();
  const queryClient = useQueryClient();

  const handleStatusChange = (status: ProspectStatus) => updateProspect.mutate({ id: prospect.id, status });

  const handleSendViaInstagram = async () => {
    if (prospect.ai_dm_message) {
      await navigator.clipboard.writeText(prospect.ai_dm_message);
    }
    openInstagramDM(prospect.username);

    // Cria lead no Pipeline se ainda não foi criado
    let pipelineLeadId = prospect.pipeline_lead_id;
    if (!pipelineLeadId) {
      const { data: pipelineLead } = await supabase
        .from('sales_pipeline')
        .insert({
          lead_name: prospect.full_name || `@${prospect.username}`,
          company: prospect.full_name || prospect.username,
          phone: prospect.whatsapp || null,
          email: prospect.email || null,
          stage: 'ATENDIMENTO_INICIA',
          deal_value: 0,
          probability: 10,
          source: 'instagram',
        })
        .select('id')
        .single();
      pipelineLeadId = pipelineLead?.id ?? null;
      queryClient.invalidateQueries({ queryKey: ['sales-pipeline'] });
    }
    updateProspect.mutate({ id: prospect.id, status: 'Mensagem Enviada', pipeline_lead_id: pipelineLeadId });

    // Registrar primeiro contato na cadência
    await markFirstContactInCadence(null, prospect.id, 'instagram_dm');

    toast.success('Instagram aberto! Mensagem 1 copiada — cole e envie. Depois copie a mensagem 2.');
  };

  return (
    <Card className="border border-border/60">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0">
              <Instagram className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">@{prospect.username}</p>
              {prospect.full_name && <p className="text-xs text-muted-foreground truncate">{prospect.full_name}</p>}
            </div>
          </div>
          <Select value={prospect.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-6 text-xs px-2 w-auto border-none shadow-none">
              <SelectValue>
                <Badge className={`${STATUS_COLORS[prospect.status]} text-white text-xs px-1.5 py-0`}>
                  {STATUS_LABELS[prospect.status]}
                </Badge>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PROSPECT_STATUSES.map(s => (
                <SelectItem key={s} value={s}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[s]}`} />
                    {s}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Métricas rápidas */}
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
          {showSource && (
            <span className="flex items-center gap-1 bg-pink-500/10 text-pink-600 dark:text-pink-400 rounded-full px-2 py-0.5 font-medium">
              <Instagram className="w-3 h-3" /> Instagram
            </span>
          )}
          {prospect.niche && <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{prospect.niche}</span>}
          {prospect.followers_count && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{prospect.followers_count.toLocaleString('pt-BR')}</span>}
          {prospect.google_rating && (
            <span className="flex items-center gap-1 text-yellow-500">
              <Star className="w-3 h-3 fill-current" />{prospect.google_rating}
              {prospect.google_reviews_count && <span className="text-muted-foreground">({prospect.google_reviews_count})</span>}
            </span>
          )}
          {prospect.whatsapp && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />WhatsApp</span>}
          {prospect.pipeline_lead_id && <span className="flex items-center gap-1 text-violet-600"><Kanban className="w-3 h-3" />Pipeline</span>}
        </div>

        {/* Badges de problemas encontrados */}
        <DiagnosisBadges prospect={prospect} />
      </CardHeader>

      <CardContent className="px-4 pb-3 space-y-2">
        {/* Ações rápidas */}
        <div className="flex gap-1.5">
          {prospect.ai_dm_message && (
            <Button size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1 text-pink-600 border-pink-200 hover:bg-pink-50 dark:hover:bg-pink-900/20"
              onClick={handleSendViaInstagram}>
              <Instagram className="w-3 h-3" /> Enviar DM
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
            onClick={() => window.open(`https://instagram.com/${prospect.username}`, '_blank')}>
            <ExternalLink className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={() => deleteProspect.mutate(prospect.id)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>

        {/* Toggle expandir */}
        {(prospect.diagnosis_report || prospect.ai_dm_message) && (
          <Button variant="ghost" size="sm" className="w-full h-6 text-xs text-muted-foreground"
            onClick={() => setExpanded(!expanded)}>
            {expanded
              ? <><ChevronUp className="w-3 h-3 mr-1" />Ocultar diagnóstico</>
              : <><ChevronDown className="w-3 h-3 mr-1" />Ver diagnóstico completo</>}
          </Button>
        )}

        {expanded && (
          <div className="space-y-2 pt-1">
            {/* Tabs */}
            <div className="flex gap-1 flex-wrap">
              {[
                { key: 'diagnostico', label: 'Diagnóstico', icon: <Stethoscope className="w-3 h-3" /> },
                { key: 'mensagens', label: 'Mensagens', icon: <Instagram className="w-3 h-3" /> },
                { key: 'proposal', label: 'Proposta', icon: <FileText className="w-3 h-3" /> },
                { key: 'creative', label: 'Criativo', icon: <Lightbulb className="w-3 h-3" /> },
                { key: 'cadencia', label: 'Cadência', icon: <TrendingUp className="w-3 h-3" /> },
              ].map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${activeTab === tab.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>

            {/* Conteúdo */}
            {activeTab === 'diagnostico' && (
              <div className="space-y-2">
                {prospect.diagnosis_report ? (
                  <>
                    {prospect.website_issues && (
                      <div className="flex gap-1.5 flex-wrap">
                        {(prospect.website_issues.critical?.length ?? 0) > 0 && (
                          <span className="flex items-center gap-1 text-xs bg-red-500/15 text-red-600 dark:text-red-400 rounded-full px-2 py-0.5">
                            <XCircle className="w-3 h-3" /> {prospect.website_issues.critical.length} crítico{prospect.website_issues.critical.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {(prospect.website_issues.warnings?.length ?? 0) > 0 && (
                          <span className="flex items-center gap-1 text-xs bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 rounded-full px-2 py-0.5">
                            <AlertTriangle className="w-3 h-3" /> {prospect.website_issues.warnings.length} alerta{prospect.website_issues.warnings.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {(prospect.website_issues.positives?.length ?? 0) > 0 && (
                          <span className="flex items-center gap-1 text-xs bg-green-500/15 text-green-600 dark:text-green-400 rounded-full px-2 py-0.5">
                            <CheckCircle className="w-3 h-3" /> {prospect.website_issues.positives.length} positivo{prospect.website_issues.positives.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="relative">
                      <pre className="text-xs bg-secondary/50 rounded-lg p-3 pr-8 whitespace-pre-wrap font-sans leading-relaxed">{prospect.diagnosis_report}</pre>
                      <Button size="sm" variant="ghost" className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={() => copyToClipboard(prospect.diagnosis_report!, 'Diagnóstico')}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">Diagnóstico não disponível</p>
                )}
              </div>
            )}
            {activeTab === 'mensagens' && (
              <div className="space-y-2">
                {prospect.ai_dm_message && prospect.diagnosis_report ? (
                  <>
                    <p className="text-xs text-muted-foreground">Envie as 2 mensagens em sequência pelo Instagram DM:</p>
                    {[
                      { part: 1, message: prospect.ai_dm_message },
                      { part: 2, message: prospect.diagnosis_report },
                    ].map((m) => (
                      <div key={m.part} className="relative">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs font-semibold text-primary bg-primary/10 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">{m.part}</span>
                          <span className="text-xs text-muted-foreground">Mensagem {m.part}</span>
                        </div>
                        <pre className="text-xs bg-secondary/50 rounded-lg p-3 pr-8 whitespace-pre-wrap font-sans leading-relaxed">{m.message}</pre>
                        <Button size="sm" variant="ghost" className="absolute top-6 right-2 h-6 w-6 p-0"
                          onClick={() => copyToClipboard(m.message, `Mensagem ${m.part}`)}><Copy className="w-3 h-3" /></Button>
                      </div>
                    ))}
                    <Button size="sm" className="w-full h-7 text-xs gap-1 bg-gradient-to-r from-pink-500 to-orange-400 hover:from-pink-600 hover:to-orange-500 text-white border-0"
                      onClick={handleSendViaInstagram}>
                      <Instagram className="w-3 h-3" /> Copiar msg 1 + Abrir Instagram DM
                    </Button>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">Gere o diagnóstico primeiro para ver as mensagens</p>
                )}
              </div>
            )}
            {activeTab === 'proposal' && prospect.ai_proposal_brief && (
              <div className="relative">
                <p className="text-xs bg-secondary/50 rounded p-2 pr-8 whitespace-pre-wrap">{prospect.ai_proposal_brief}</p>
                <Button size="sm" variant="ghost" className="absolute top-1 right-1 h-6 w-6 p-0"
                  onClick={() => copyToClipboard(prospect.ai_proposal_brief!, 'Brief de proposta')}><Copy className="w-3 h-3" /></Button>
              </div>
            )}
            {activeTab === 'creative' && prospect.ai_creative_concept && (
              <div className="relative">
                <p className="text-xs bg-secondary/50 rounded p-2 pr-8 whitespace-pre-wrap">{prospect.ai_creative_concept}</p>
                <Button size="sm" variant="ghost" className="absolute top-1 right-1 h-6 w-6 p-0"
                  onClick={() => copyToClipboard(prospect.ai_creative_concept!, 'Conceito criativo')}><Copy className="w-3 h-3" /></Button>
              </div>
            )}
            {activeTab === 'cadencia' && (
              <LeadCadencePanel instagramProspect={prospect} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export function InstagramProspecting() {
  const { data: prospects, isLoading } = useInstagramProspects();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ProspectStatus | 'Todos'>('Todos');
  const [search, setSearch] = useState('');

  const filtered = (prospects || []).filter(p => {
    const matchStatus = filterStatus === 'Todos' || p.status === filterStatus;
    const matchSearch = !search ||
      p.username.toLowerCase().includes(search.toLowerCase()) ||
      (p.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.niche || '').toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const counts = (prospects || []).reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center">
              <Instagram className="w-3.5 h-3.5 text-white" />
            </div>
            Prospecção Instagram
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Diagnóstico digital completo: Instagram + site + Google — mensagem personalizada gerada automaticamente
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4" /> Novo Diagnóstico
        </Button>
      </div>

      {/* Filtros de status */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['Todos', ...PROSPECT_STATUSES] as const).map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterStatus === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground hover:text-foreground'}`}>
            {s !== 'Todos' && <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[s as ProspectStatus]}`} />}
            {s}
            {s !== 'Todos' && counts[s] ? <span className="bg-white/20 rounded-full px-1">{counts[s]}</span> : null}
            {s === 'Todos' && prospects?.length ? <span className="bg-white/20 rounded-full px-1">{prospects.length}</span> : null}
          </button>
        ))}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9 h-8 text-sm" placeholder="Buscar por @username, nome ou nicho..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500/20 to-orange-400/20 flex items-center justify-center mx-auto mb-3">
            <Stethoscope className="w-6 h-6 text-pink-500" />
          </div>
          <p className="font-medium text-sm">Nenhum prospect encontrado</p>
          <p className="text-xs mt-1">Clique em "Novo Diagnóstico" para começar a prospectar</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(p => <ProspectCard key={p.id} prospect={p} />)}
        </div>
      )}

      {/* Dialog */}
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
