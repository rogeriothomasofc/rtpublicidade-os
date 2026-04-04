import { useState, useEffect } from 'react';
import { SalesPipeline, PipelineStage } from '@/types/database';
import { PipelineColumn } from './PipelineColumn';

import { LeadProfileDialog } from './LeadProfileDialog';
import { LeadDetailModal } from './LeadDetailModal';
import { useUpdateLead } from '@/hooks/useSalesPipeline';
import { useCrossedLeads, type CrossedLead } from '@/hooks/useCrossedLeads';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateClient, createOnboardingParentTask, ONBOARDING_SUBTASKS } from '@/hooks/useClients';
import { useCreateTask } from '@/hooks/useTasks';
import { useCreateManySubtasks } from '@/hooks/useSubtasks';
import { useCreateContract } from '@/hooks/useContracts';
import { useCreateFinance } from '@/hooks/useFinance';
import { 
  usePipelineStages, 
  PipelineStage as PipelineStageType 
} from '@/hooks/usePipelineStages';
import { toast } from 'sonner';
import { addDays, format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

interface PipelineBoardProps {
  leads: SalesPipeline[];
}

export function PipelineBoard({ leads }: PipelineBoardProps) {
  const { data: stages, isLoading: stagesLoading } = usePipelineStages();
  const queryClient = useQueryClient();
  
  const updateLead = useUpdateLead();
  const createClient = useCreateClient();
  const createTask = useCreateTask();
  const createSubtasks = useCreateManySubtasks();
  const createContract = useCreateContract();
  const createFinance = useCreateFinance();
  const { data: crossedLeads } = useCrossedLeads();
  const [profileLead, setProfileLead] = useState<SalesPipeline | null>(null);
  const [crossedProfileLead, setCrossedProfileLead] = useState<CrossedLead | null>(null);
  const [lossReasonDialog, setLossReasonDialog] = useState<{ leadId: string; leadName: string } | null>(null);

  const handleOpenProfile = (lead: SalesPipeline) => {
    const crossed = (crossedLeads || []).find(cl =>
      cl.instagram_prospect?.pipeline_lead_id === lead.id ||
      cl.gmb_lead?.pipeline_lead_id === lead.id
    );
    if (crossed) {
      setCrossedProfileLead(crossed);
    } else {
      setProfileLead(lead);
    }
  };
  const [lossReason, setLossReason] = useState('');

  const handleMoveLead = async (leadId: string, newStage: PipelineStage) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    // If moving to Perdido, ask for loss reason
    if (newStage === 'Perdido') {
      setLossReasonDialog({ leadId, leadName: lead.lead_name });
      setLossReason('');
      return;
    }

    await executeMoveLead(leadId, newStage, lead);
  };

  const handleConfirmLoss = async () => {
    if (!lossReasonDialog) return;
    const lead = leads.find((l) => l.id === lossReasonDialog.leadId);
    if (!lead) return;

    await updateLead.mutateAsync({ id: lossReasonDialog.leadId, stage: 'Perdido', loss_reason: lossReason || null } as any);
    toast.info(`Lead "${lossReasonDialog.leadName}" marcado como perdido.`);
    setLossReasonDialog(null);
    setLossReason('');
  };

  const executeMoveLead = async (leadId: string, newStage: PipelineStage, lead: SalesPipeline) => {
    // Update lead stage
    await updateLead.mutateAsync({ id: leadId, stage: newStage });

    // If moved to Won, create client, contract and onboarding tasks
    if (newStage === 'Ganho') {
      try {
        const newClient = await createClient.mutateAsync({
          name: lead.lead_name,
          company: lead.company || lead.lead_name,
          email: lead.email,
          phone: lead.phone,
          status: 'Ativo',
          fee: lead.deal_value,
          start_date: new Date().toISOString().split('T')[0],
        });

        // Create contract linked to client
        await createContract.mutateAsync({
          client_id: newClient.id,
          value: lead.deal_value,
          start_date: new Date().toISOString().split('T')[0],
          status: 'Ativo',
          duration_months: lead.duration_months || 12,
          description: `Contrato - ${lead.company || lead.lead_name}`,
        });

        // Create finance record (monthly recurring income)
        const dueDate = addDays(new Date(), 30);
        await createFinance.mutateAsync({
          client_id: newClient.id,
          amount: lead.deal_value,
          due_date: format(dueDate, 'yyyy-MM-dd'),
          status: 'Pendente',
          type: 'Receita',
          description: `Mensalidade - ${lead.company || lead.lead_name}`,
          recurrence: 'Mensal',
          category: null,
          cost_center: null,
        });

        // Create onboarding parent task with subtasks
        const parentTask = createOnboardingParentTask(newClient.id, newClient.name);
        const createdTask = await createTask.mutateAsync(parentTask);
        await createSubtasks.mutateAsync({ 
          taskId: createdTask.id, 
          titles: ONBOARDING_SUBTASKS 
        });

        // Create notification for Won lead
        await supabase.from('notifications').insert({
          type: 'task_due_soon' as const,
          title: '🏆 Lead ganho!',
          message: `O lead "${lead.lead_name}" (${lead.company || 'sem empresa'}) foi convertido em cliente. Tarefas de onboarding criadas.`,
          reference_id: newClient.id,
          reference_type: 'client',
        });

        toast.success('Cliente, contrato, receita e tarefas de onboarding criados!');
      } catch (error) {
        console.error('Error creating client:', error);
      }
    }
  };

  const calculateStageValue = (stageName: string) => {
    return leads
      .filter((l) => l.stage === stageName)
      .reduce((sum, l) => sum + Number(l.deal_value), 0);
  };


  if (stagesLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="w-72 flex-shrink-0">
            <Skeleton className="h-10 w-full mb-2" />
            <Skeleton className="h-64 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pipeline Columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages?.map((stage) => (
          <div key={stage.id}>
            <PipelineColumn
              title={stage.display_name}
              stage={stage.name as PipelineStage}
              probability={stage.probability}
              description={stage.description}
              leads={leads.filter((lead) => lead.stage === stage.name)}
              totalValue={calculateStageValue(stage.name)}
              onMoveLead={handleMoveLead}
              onOpenProfile={handleOpenProfile}
            />
          </div>
        ))}
      </div>

      {/* Loss Reason Dialog */}
      <Dialog open={!!lossReasonDialog} onOpenChange={(open) => !open && setLossReasonDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Motivo da Perda</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Registre o motivo da perda de <span className="font-medium text-foreground">{lossReasonDialog?.leadName}</span> para análise futura.
          </p>
          <div className="space-y-2">
            <Label>Motivo</Label>
            <Textarea
              value={lossReason}
              onChange={(e) => setLossReason(e.target.value)}
              placeholder="Ex: Orçamento insuficiente, escolheu concorrente, timing ruim..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLossReasonDialog(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleConfirmLoss}>
              Marcar como Perdido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lead Profile Dialog — para leads manuais sem match no Instagram/GMB */}
      <LeadProfileDialog
        lead={profileLead}
        open={!!profileLead}
        onOpenChange={(open) => !open && setProfileLead(null)}
      />

      {/* Lead Detail Modal — igual à aba Leads, para leads vindos do Instagram/GMB */}
      {crossedProfileLead && (
        <LeadDetailModal
          lead={crossedProfileLead}
          onClose={() => setCrossedProfileLead(null)}
        />
      )}
    </div>
  );
}
