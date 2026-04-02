import { useState, useEffect, useRef } from 'react';
import { CheckCircle, Clock, SkipForward, Loader2 } from 'lucide-react';
import { useLeadCadences, useCreateCadence, useUpdateCadence, CHANNEL_LABELS, CHANNEL_COLORS } from '@/hooks/useCrossedLeads';
import type { InstagramProspect } from '@/hooks/useInstagramProspects';
import type { GmbLead } from '@/hooks/useGmbLeads';
import type { LeadCadence, CadenceStep } from '@/types/database';

interface LeadCadencePanelProps {
  instagramProspect?: InstagramProspect;
  gmbLead?: GmbLead;
}

// Cria passos fixos baseados nos canais disponíveis — sem IA
function buildDefaultSteps(
  hasWhatsApp: boolean,
  hasInstagram: boolean,
  hasEmail: boolean,
  leadName: string
): CadenceStep[] {
  const steps: CadenceStep[] = [];

  // Dia 1 — canal principal
  if (hasWhatsApp) {
    steps.push({ day: 1, channel: 'whatsapp', message: `Olá! Vi o perfil de ${leadName} e gostaria de apresentar como podemos ajudar a crescer a presença digital de vocês. Posso te mostrar em 15 minutos o que encontrei?`, status: 'pending' });
  } else if (hasInstagram) {
    steps.push({ day: 1, channel: 'instagram_dm', message: `Oi! Vi o perfil de ${leadName} e tenho algumas ideias para melhorar os resultados de vocês online. Posso compartilhar?`, status: 'pending' });
  }

  // Dia 2 — segundo canal
  if (hasInstagram && hasWhatsApp) {
    steps.push({ day: 2, channel: 'instagram_dm', message: `Passei pelo perfil de ${leadName} — o conteúdo de vocês tem potencial. Já mandei uma mensagem no WhatsApp, mas queria reforçar por aqui também. Tem interesse em conversar?`, status: 'pending' });
  } else if (hasEmail) {
    steps.push({ day: 2, channel: 'email', message: `Olá, equipe ${leadName}! Analisei a presença digital de vocês e identifiquei oportunidades de melhoria. Posso te enviar um diagnóstico gratuito?`, status: 'pending' });
  }

  // Dia 5 — follow-up
  if (hasWhatsApp) {
    steps.push({ day: 5, channel: 'whatsapp', message: `Olá! Só queria saber se tiveram a chance de ver minha mensagem anterior sobre ${leadName}. Sem pressa — fico à disposição quando for conveniente.`, status: 'pending' });
  } else if (hasInstagram) {
    steps.push({ day: 5, channel: 'instagram_dm', message: `Oi! Não sei se viu minha mensagem anterior. Tenho algumas sugestões rápidas para ${leadName} — leva só 10 minutinhos. Topa?`, status: 'pending' });
  }

  // Dia 8 — nova perspectiva
  if (hasWhatsApp) {
    steps.push({ day: 8, channel: 'whatsapp', message: `Vi que ${leadName} tem uma boa reputação na região. Empresas como a de vocês costumam multiplicar o número de clientes com tráfego pago bem direcionado. Vale uma conversa rápida?`, status: 'pending' });
  }

  // Dia 12 — último toque
  const lastChannel = hasWhatsApp ? 'whatsapp' : hasInstagram ? 'instagram_dm' : hasEmail ? 'email' : 'ligacao';
  steps.push({ day: 12, channel: lastChannel, message: `Último contato por aqui. Se algum dia quiserem entender melhor como atrair mais clientes para ${leadName} com marketing digital, estou à disposição. Boa sorte nos negócios!`, status: 'pending' });

  return steps;
}

function StepRow({ step, onToggle }: { step: CadenceStep; onToggle: () => void }) {
  const channelColor = CHANNEL_COLORS[step.channel] ?? 'bg-slate-500';
  return (
    <div className="flex items-start gap-3">
      <button onClick={onToggle} className="mt-0.5 flex-shrink-0">
        {step.status === 'done'
          ? <CheckCircle className="w-4 h-4 text-green-500" />
          : step.status === 'skipped'
          ? <SkipForward className="w-4 h-4 text-slate-400" />
          : <Clock className="w-4 h-4 text-slate-400" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-muted-foreground">Dia {step.day}</span>
          <span className={`${channelColor} text-white text-xs px-2 py-0 rounded-full leading-5`}>
            {CHANNEL_LABELS[step.channel] ?? step.channel}
          </span>
          {step.status === 'done' && <span className="text-xs text-green-400">✓ enviado</span>}
          {step.status === 'skipped' && <span className="text-xs text-slate-400">pulado</span>}
        </div>
        <p className="text-xs leading-relaxed text-foreground/90">{step.message}</p>
      </div>
    </div>
  );
}

export function LeadCadencePanel({ instagramProspect, gmbLead }: LeadCadencePanelProps) {
  const [localCadence, setLocalCadence] = useState<LeadCadence | null>(null);
  const [saving, setSaving] = useState(false);
  const creatingRef = useRef(false);

  const { data: allCadences = [], isLoading } = useLeadCadences();
  const createCadence = useCreateCadence();
  const updateCadence = useUpdateCadence();

  const cadence: LeadCadence | null = localCadence ?? (
    allCadences.find(c =>
      (instagramProspect && c.instagram_prospect_id === instagramProspect.id) ||
      (gmbLead && c.gmb_lead_id === gmbLead.id)
    ) ?? null
  );

  // Cria cadência padrão imediatamente se não existir — sem IA
  useEffect(() => {
    if (isLoading || cadence || creatingRef.current) return;
    if (!instagramProspect && !gmbLead) return;
    creatingRef.current = true;
    setSaving(true);

    const leadName = instagramProspect?.full_name ?? instagramProspect?.username ?? gmbLead?.nome_empresa ?? 'o lead';
    const hasWhatsApp = !!(instagramProspect?.whatsapp ?? gmbLead?.telefone ?? gmbLead?.whatsapp_jid);
    const hasInstagram = !!instagramProspect;
    const hasEmail = !!instagramProspect?.email;

    const steps = buildDefaultSteps(hasWhatsApp, hasInstagram, hasEmail, leadName);

    createCadence.mutateAsync({
      instagram_prospect_id: instagramProspect?.id ?? null,
      gmb_lead_id: gmbLead?.id ?? null,
      lead_name: leadName,
      company: gmbLead?.nome_empresa ?? instagramProspect?.full_name ?? null,
      website: instagramProspect?.website ?? gmbLead?.website ?? null,
      phone: instagramProspect?.whatsapp ?? gmbLead?.telefone ?? gmbLead?.whatsapp_jid ?? null,
      email: instagramProspect?.email ?? null,
      heat_score: 50,
      instagram_score: 0,
      gmb_score: 0,
      ai_unified_analysis: null,
      cadence_steps: steps,
      status: 'active',
      current_step: 0,
    })
      .then(created => setLocalCadence(created))
      .catch(() => { creatingRef.current = false; })
      .finally(() => setSaving(false));
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleStep = (idx: number) => {
    const target = localCadence ?? cadence;
    if (!target) return;
    const steps = [...target.cadence_steps];
    const cur = steps[idx].status;
    steps[idx] = { ...steps[idx], status: cur === 'pending' ? 'done' : cur === 'done' ? 'skipped' : 'pending' };
    setLocalCadence({ ...target, cadence_steps: steps });
    updateCadence.mutate({ id: target.id, cadence_steps: steps });
  };

  const activeCadence = localCadence ?? cadence;
  const steps = activeCadence?.cadence_steps ?? [];
  const doneCount = steps.filter(s => s.status === 'done').length;

  if (isLoading || saving) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-6 justify-center">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{doneCount} de {steps.length} toques realizados</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: steps.length ? `${(doneCount / steps.length) * 100}%` : '0%' }}
        />
      </div>
      <div className="space-y-4 pt-1">
        {steps.map((step, idx) => (
          <StepRow key={idx} step={step} onToggle={() => handleToggleStep(idx)} />
        ))}
      </div>
    </div>
  );
}
