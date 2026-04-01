/**
 * LeadCadencePanel
 *
 * Painel reutilizável de cadência multicanal.
 * Usado dentro dos modais do Instagram e do GMB.
 *
 * Responsabilidades:
 * - Detectar cross-match (o mesmo lead nas duas abas) por website normalizado
 * - Mostrar badge de lead cruzado com heat score
 * - Gerar/exibir o fluxo de cadência via IA
 * - Permitir marcar steps como feito/pulado
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Instagram, MapPin, Flame, Sparkles, Loader2,
  CheckCircle, Clock, SkipForward, Star, Users, TrendingUp, GitMerge,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useLeadCadences, useCreateCadence, useUpdateCadence,
  generateLeadCadence, CHANNEL_LABELS, CHANNEL_COLORS,
  type CrossedLead,
} from '@/hooks/useCrossedLeads';
import { useInstagramProspects, type InstagramProspect } from '@/hooks/useInstagramProspects';
import { useGmbLeads, type GmbLead } from '@/hooks/useGmbLeads';
import type { LeadCadence, CadenceStep } from '@/types/database';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeWebsite(url: string | null): string {
  if (!url) return '';
  return url
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
    .trim();
}

function calcHeatScore(ig: InstagramProspect | null, gmb: GmbLead | null) {
  let base = 50;
  let igScore = 0;
  let gmbScore = 0;

  if (ig) {
    const f = ig.followers_count ?? 0;
    if (f > 10000) igScore += 10;
    else if (f > 5000) igScore += 5;
    else if (f < 1000) igScore -= 5;
    const e = ig.engagement_rate ?? 0;
    if (e > 3) igScore += 10;
    else if (e > 1) igScore += 5;
    else if (e < 0.5) igScore -= 5;
    const ws = ig.website_issues?.score ?? null;
    if (ws !== null) igScore += ws < 50 ? 5 : ws > 80 ? -5 : 0;
  }

  if (gmb) {
    const r = gmb.rating ?? 0;
    if (r >= 4) gmbScore += 10;
    else if (r < 3 && r > 0) gmbScore -= 10;
    const rev = gmb.reviews ?? 0;
    if (rev > 50) gmbScore += 10;
    else if (rev > 20) gmbScore += 5;
    else if (rev < 10) gmbScore -= 5;
    const ws = gmb.website_issues?.score ?? null;
    if (ws !== null) gmbScore += ws < 50 ? 5 : ws > 80 ? -5 : 0;
  }

  if (ig && gmb) base += 10;
  return Math.min(100, Math.max(0, base + igScore + gmbScore));
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function HeatBadge({ score }: { score: number }) {
  const color =
    score >= 75 ? 'bg-red-500' :
    score >= 55 ? 'bg-orange-500' :
    score >= 35 ? 'bg-yellow-500' : 'bg-slate-500';
  const label =
    score >= 75 ? 'Quente' :
    score >= 55 ? 'Morno' :
    score >= 35 ? 'Frio' : 'Gelado';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-xs font-semibold ${color}`}>
      <Flame className="w-3 h-3" /> {score} · {label}
    </span>
  );
}

function StepRow({ step, onToggle }: { step: CadenceStep; onToggle: () => void }) {
  const channelColor = CHANNEL_COLORS[step.channel] ?? 'bg-slate-500';
  return (
    <div className="flex items-start gap-2.5">
      <button onClick={onToggle} className="mt-0.5 flex-shrink-0">
        {step.status === 'done'
          ? <CheckCircle className="w-4 h-4 text-green-500" />
          : step.status === 'skipped'
          ? <SkipForward className="w-4 h-4 text-slate-400" />
          : <Clock className="w-4 h-4 text-slate-400" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-xs text-muted-foreground">Dia {step.day}</span>
          <span className={`${channelColor} text-white text-xs px-1.5 py-0 rounded-full leading-5`}>
            {CHANNEL_LABELS[step.channel] ?? step.channel}
          </span>
          {step.status === 'done' && (
            <span className="text-xs text-green-400">✓ feito</span>
          )}
        </div>
        <p className="text-xs leading-relaxed text-foreground/90">{step.message}</p>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface LeadCadencePanelProps {
  /** Lead do Instagram, se vindo da aba Instagram */
  instagramProspect?: InstagramProspect;
  /** Lead do GMB, se vindo da aba Google Maps */
  gmbLead?: GmbLead;
}

export function LeadCadencePanel({ instagramProspect, gmbLead }: LeadCadencePanelProps) {
  const [generating, setGenerating] = useState(false);
  const [localCadence, setLocalCadence] = useState<LeadCadence | null>(null);

  const { data: allCadences = [] } = useLeadCadences();
  const { data: igLeads = [] } = useInstagramProspects();
  const { data: gmbLeads = [] } = useGmbLeads();
  const createCadence = useCreateCadence();
  const updateCadence = useUpdateCadence();

  // ── Encontrar o cross-match ────────────────────────────────────────────────
  const currentSite = normalizeWebsite(instagramProspect?.website ?? gmbLead?.website ?? null);

  const matchedGmb: GmbLead | null = instagramProspect
    ? (gmbLeads.find(g => g.id !== gmbLead?.id && normalizeWebsite(g.website) === currentSite && !!currentSite) ?? null)
    : null;

  const matchedIg: InstagramProspect | null = gmbLead
    ? (igLeads.find(ig => ig.id !== instagramProspect?.id && normalizeWebsite(ig.website) === currentSite && !!currentSite) ?? null)
    : null;

  const igData = instagramProspect ?? matchedIg;
  const gmbData = gmbLead ?? matchedGmb;
  const isCrossed = !!(igData && gmbData);
  const heatScore = calcHeatScore(igData ?? null, gmbData ?? null);

  // ── Cadência existente ─────────────────────────────────────────────────────
  const cadence: LeadCadence | null = localCadence ?? (
    allCadences.find(c =>
      (instagramProspect && c.instagram_prospect_id === instagramProspect.id) ||
      (gmbLead && c.gmb_lead_id === gmbLead.id) ||
      (matchedIg && c.instagram_prospect_id === matchedIg.id) ||
      (matchedGmb && c.gmb_lead_id === matchedGmb.id)
    ) ?? null
  );

  // ── Gerar cadência ─────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const crossedLead: CrossedLead = {
        id: `${igData?.id ?? ''}_${gmbData?.id ?? ''}`,
        instagram_prospect: igData ?? null,
        gmb_lead: gmbData ?? null,
        website: currentSite,
        lead_name: igData?.full_name ?? gmbData?.nome_empresa ?? 'Lead',
        phone: instagramProspect?.whatsapp ?? gmbLead?.telefone ?? gmbLead?.whatsapp_jid ?? null,
        email: instagramProspect?.email ?? null,
        heat_score: heatScore,
        instagram_score: 0,
        gmb_score: 0,
      };

      const result = await generateLeadCadence(crossedLead);

      if (cadence) {
        updateCadence.mutate({
          id: cadence.id,
          ai_unified_analysis: result.analysis,
          cadence_steps: result.cadence_steps,
          status: 'active',
        });
        setLocalCadence({
          ...cadence,
          ai_unified_analysis: result.analysis,
          cadence_steps: result.cadence_steps,
          status: 'active',
        });
      } else {
        const created = await createCadence.mutateAsync({
          instagram_prospect_id: igData?.id ?? null,
          gmb_lead_id: gmbData?.id ?? null,
          lead_name: crossedLead.lead_name,
          company: gmbData?.nome_empresa ?? igData?.full_name ?? null,
          website: currentSite || null,
          phone: crossedLead.phone,
          email: crossedLead.email,
          heat_score: heatScore,
          instagram_score: crossedLead.instagram_score,
          gmb_score: crossedLead.gmb_score,
          ai_unified_analysis: result.analysis,
          cadence_steps: result.cadence_steps,
          status: 'active',
          current_step: 0,
        });
        setLocalCadence(created);
      }
      toast.success('Cadência gerada!');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar cadência');
    } finally {
      setGenerating(false);
    }
  };

  // ── Marcar step ────────────────────────────────────────────────────────────
  const handleToggleStep = (idx: number) => {
    const target = localCadence ?? cadence;
    if (!target) return;
    const steps = [...target.cadence_steps];
    const cur = steps[idx].status;
    steps[idx] = {
      ...steps[idx],
      status: cur === 'pending' ? 'done' : cur === 'done' ? 'skipped' : 'pending',
    };
    const updated = { ...target, cadence_steps: steps };
    setLocalCadence(updated);
    updateCadence.mutate({ id: target.id, cadence_steps: steps });
  };

  const activeCadence = localCadence ?? cadence;
  const steps = activeCadence?.cadence_steps ?? [];
  const doneCount = steps.filter(s => s.status === 'done').length;

  return (
    <div className="space-y-3">
      {/* Cross-match + heat score */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <HeatBadge score={heatScore} />
          {isCrossed && (
            <span className="inline-flex items-center gap-1 text-xs bg-green-500/10 text-green-400 border border-green-500/20 rounded-full px-2 py-0.5">
              <GitMerge className="w-3 h-3" /> Cruzado
            </span>
          )}
        </div>
        {steps.length > 0 && (
          <span className="text-xs text-muted-foreground">{doneCount}/{steps.length} toques</span>
        )}
      </div>

      {/* Info do match oposto */}
      {isCrossed && (
        <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-2.5 space-y-1.5">
          {instagramProspect && matchedGmb && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 text-blue-400 flex-shrink-0" />
              <span>Também no Google Maps: <span className="text-foreground font-medium">{matchedGmb.nome_empresa}</span></span>
              {matchedGmb.rating && (
                <span className="flex items-center gap-0.5 text-yellow-400 ml-auto">
                  <Star className="w-3 h-3 fill-current" /> {matchedGmb.rating}
                </span>
              )}
            </div>
          )}
          {gmbLead && matchedIg && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Instagram className="w-3 h-3 text-pink-400 flex-shrink-0" />
              <span>Também no Instagram: <span className="text-foreground font-medium">@{matchedIg.username}</span></span>
              {matchedIg.followers_count && (
                <span className="flex items-center gap-0.5 ml-auto">
                  <Users className="w-3 h-3" />
                  <span>{matchedIg.followers_count.toLocaleString('pt-BR')}</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Análise unificada */}
      {activeCadence?.ai_unified_analysis && (
        <div className="bg-secondary/50 rounded-lg p-2.5">
          <p className="text-xs font-semibold text-muted-foreground mb-1">Análise unificada</p>
          <p className="text-xs leading-relaxed">{activeCadence.ai_unified_analysis}</p>
        </div>
      )}

      {/* Botão gerar */}
      <Button
        size="sm"
        variant={activeCadence ? 'outline' : 'default'}
        onClick={handleGenerate}
        disabled={generating}
        className="w-full gap-1.5 text-xs"
      >
        {generating
          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando cadência com IA...</>
          : <><Sparkles className="w-3.5 h-3.5" /> {activeCadence ? 'Regenerar cadência' : 'Gerar fluxo de cadência com IA'}</>}
      </Button>

      {/* Timeline */}
      {steps.length > 0 ? (
        <div className="space-y-3 pt-1">
          {/* Barra de progresso */}
          <div className="space-y-1">
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: steps.length ? `${(doneCount / steps.length) * 100}%` : '0%' }}
              />
            </div>
          </div>
          {steps.map((step, idx) => (
            <StepRow key={idx} step={step} onToggle={() => handleToggleStep(idx)} />
          ))}
        </div>
      ) : !generating && (
        <p className="text-xs text-muted-foreground text-center py-4">
          Clique em "Gerar fluxo de cadência com IA" para criar a sequência de contatos personalizada.
        </p>
      )}
    </div>
  );
}
