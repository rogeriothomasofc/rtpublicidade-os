import { useState } from 'react';
import { CheckCircle, Clock, SkipForward, Loader2 } from 'lucide-react';
import { useLeadCadences, useUpdateCadence, CHANNEL_LABELS, CHANNEL_COLORS } from '@/hooks/useCrossedLeads';
import type { InstagramProspect } from '@/hooks/useInstagramProspects';
import type { GmbLead } from '@/hooks/useGmbLeads';
import type { LeadCadence, CadenceStep } from '@/types/database';

interface LeadCadencePanelProps {
  instagramProspect?: InstagramProspect;
  gmbLead?: GmbLead;
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
  const { data: allCadences = [], isLoading } = useLeadCadences();
  const updateCadence = useUpdateCadence();

  const cadence: LeadCadence | null = localCadence ?? (
    allCadences.find(c =>
      (instagramProspect && c.instagram_prospect_id === instagramProspect.id) ||
      (gmbLead && c.gmb_lead_id === gmbLead.id)
    ) ?? null
  );

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

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-6 justify-center">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando...
      </div>
    );
  }

  if (!activeCadence || steps.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-6">
        Cadência ainda sendo preparada. Aguarde e reabra o modal.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Progresso */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{doneCount} de {steps.length} toques realizados</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${(doneCount / steps.length) * 100}%` }}
        />
      </div>

      {/* Timeline de passos */}
      <div className="space-y-4 pt-1">
        {steps.map((step, idx) => (
          <StepRow key={idx} step={step} onToggle={() => handleToggleStep(idx)} />
        ))}
      </div>
    </div>
  );
}
