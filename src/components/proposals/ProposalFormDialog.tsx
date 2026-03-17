import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Proposal, ProposalStatus } from '@/hooks/useProposals';

const platformOptions = ['Meta', 'Google', 'TikTok', 'LinkedIn', 'Other'];
const statusOptions: ProposalStatus[] = ['Rascunho', 'Enviada', 'Em negociação', 'Aprovada', 'Perdida', 'Expirada'];

interface ProposalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  clients: any[];
  teamMembers: any[];
  pipelineLeads: any[];
  editingProposal?: Proposal | null;
}

const defaultForm = {
  client_id: '',
  pipeline_lead_id: '',
  responsible_member_id: '',
  company: '',
  campaign_objective: '',
  media_budget: 0,
  segment: '',
  platforms: [] as string[],
  services_included: '',
  creatives: '',
  landing_pages: '',
  automations: '',
  sla: '',
  monthly_fee: 0,
  setup_fee: 0,
  commission: 0,
  tax_rate: 0,
  margin: 0,
  plan_type: '',
  validity_months: 12,
  cancellation_terms: '',
  penalty: '',
  renewal_terms: '',
  response_deadline: 30,
  notes: '',
  status: 'Rascunho' as ProposalStatus,
  probability: 0,
};

export function ProposalFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  clients,
  teamMembers,
  pipelineLeads,
  editingProposal,
}: ProposalFormDialogProps) {
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (editingProposal) {
      setForm({
        client_id: editingProposal.client_id || '',
        pipeline_lead_id: editingProposal.pipeline_lead_id || '',
        responsible_member_id: editingProposal.responsible_member_id || '',
        company: editingProposal.company || '',
        campaign_objective: editingProposal.campaign_objective || '',
        media_budget: editingProposal.media_budget || 0,
        segment: editingProposal.segment || '',
        platforms: editingProposal.platforms || [],
        services_included: editingProposal.services_included || '',
        creatives: editingProposal.creatives || '',
        landing_pages: editingProposal.landing_pages || '',
        automations: editingProposal.automations || '',
        sla: editingProposal.sla || '',
        monthly_fee: editingProposal.monthly_fee || 0,
        setup_fee: editingProposal.setup_fee || 0,
        commission: editingProposal.commission || 0,
        tax_rate: editingProposal.tax_rate || 0,
        margin: editingProposal.margin || 0,
        plan_type: editingProposal.plan_type || '',
        validity_months: editingProposal.validity_months || 12,
        cancellation_terms: editingProposal.cancellation_terms || '',
        penalty: editingProposal.penalty || '',
        renewal_terms: editingProposal.renewal_terms || '',
        response_deadline: editingProposal.response_deadline || 30,
        notes: editingProposal.notes || '',
        status: editingProposal.status || 'Rascunho',
        probability: editingProposal.probability || 0,
      });
    } else {
      setForm(defaultForm);
    }
  }, [editingProposal, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...form,
      client_id: form.client_id && form.client_id !== 'none' ? form.client_id : null,
      pipeline_lead_id: form.pipeline_lead_id && form.pipeline_lead_id !== 'none' ? form.pipeline_lead_id : null,
      responsible_member_id: form.responsible_member_id && form.responsible_member_id !== 'none' ? form.responsible_member_id : null,
    };
    onSubmit(data);
  };

  const togglePlatform = (platform: string) => {
    setForm(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  // Auto-fill company from client
  const handleClientChange = (clientId: string) => {
    setForm(prev => {
      const client = clients.find(c => c.id === clientId);
      return { ...prev, client_id: clientId, company: client?.company || prev.company };
    });
  };

  // Auto-fill from pipeline lead
  const handleLeadChange = (leadId: string) => {
    const lead = pipelineLeads.find(l => l.id === leadId);
    if (lead) {
      setForm(prev => ({
        ...prev,
        pipeline_lead_id: leadId,
        company: lead.company || prev.company,
        monthly_fee: lead.deal_value || prev.monthly_fee,
        probability: lead.probability || prev.probability,
      }));
    } else {
      setForm(prev => ({ ...prev, pipeline_lead_id: leadId }));
    }
  };

  const totalValue = form.monthly_fee + form.setup_fee;
  const totalWithTax = totalValue * (1 + (form.tax_rate || 0) / 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{editingProposal ? 'Editar Proposta' : 'Nova Proposta'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[65vh] pr-4">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="basic" className="text-xs">Dados</TabsTrigger>
                <TabsTrigger value="scope" className="text-xs">Escopo</TabsTrigger>
                <TabsTrigger value="pricing" className="text-xs">Preço</TabsTrigger>
                <TabsTrigger value="conditions" className="text-xs">Condições</TabsTrigger>
                <TabsTrigger value="notes" className="text-xs">Obs</TabsTrigger>
              </TabsList>

              {/* DADOS BÁSICOS */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Select value={form.client_id} onValueChange={handleClientChange}>
                      <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {clients.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name} - {c.company}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Empresa</Label>
                    <Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Origem (Pipeline)</Label>
                    <Select value={form.pipeline_lead_id} onValueChange={handleLeadChange}>
                      <SelectTrigger><SelectValue placeholder="Opcional..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {pipelineLeads.map(l => (
                          <SelectItem key={l.id} value={l.id}>{l.lead_name} - {l.company}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Responsável</Label>
                    <Select value={form.responsible_member_id} onValueChange={v => setForm({ ...form, responsible_member_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {teamMembers.map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Objetivo da campanha</Label>
                    <Input value={form.campaign_objective} onChange={e => setForm({ ...form, campaign_objective: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Segmento</Label>
                    <Input value={form.segment} onChange={e => setForm({ ...form, segment: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Orçamento de mídia</Label>
                    <Input type="number" value={form.media_budget} onChange={e => setForm({ ...form, media_budget: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as ProposalStatus })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Probabilidade (%)</Label>
                  <Input type="number" min={0} max={100} value={form.probability} onChange={e => setForm({ ...form, probability: Number(e.target.value) })} />
                </div>
              </TabsContent>

              {/* ESCOPO */}
              <TabsContent value="scope" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Plataformas</Label>
                  <div className="flex flex-wrap gap-3">
                    {platformOptions.map(p => (
                      <label key={p} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={form.platforms.includes(p)}
                          onCheckedChange={() => togglePlatform(p)}
                        />
                        <span className="text-sm">{p}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Serviços inclusos</Label>
                  <Textarea value={form.services_included} onChange={e => setForm({ ...form, services_included: e.target.value })} placeholder="Gestão de tráfego, relatórios, otimização..." rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Criativos</Label>
                    <Input value={form.creatives} onChange={e => setForm({ ...form, creatives: e.target.value })} placeholder="Ex: 8 peças/mês" />
                  </div>
                  <div className="space-y-2">
                    <Label>Landing Pages</Label>
                    <Input value={form.landing_pages} onChange={e => setForm({ ...form, landing_pages: e.target.value })} placeholder="Ex: 2 LPs" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Automações</Label>
                    <Input value={form.automations} onChange={e => setForm({ ...form, automations: e.target.value })} placeholder="Ex: Fluxo de email" />
                  </div>
                  <div className="space-y-2">
                    <Label>SLA</Label>
                    <Input value={form.sla} onChange={e => setForm({ ...form, sla: e.target.value })} placeholder="Ex: 24h resposta" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de plano</Label>
                  <Input value={form.plan_type} onChange={e => setForm({ ...form, plan_type: e.target.value })} placeholder="Ex: Básico, Pro, Enterprise" />
                </div>
              </TabsContent>

              {/* PRECIFICAÇÃO */}
              <TabsContent value="pricing" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fee mensal (R$)</Label>
                    <Input type="number" value={form.monthly_fee} onChange={e => setForm({ ...form, monthly_fee: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Setup (R$)</Label>
                    <Input type="number" value={form.setup_fee} onChange={e => setForm({ ...form, setup_fee: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Comissão (%)</Label>
                    <Input type="number" value={form.commission} onChange={e => setForm({ ...form, commission: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Impostos (%)</Label>
                    <Input type="number" value={form.tax_rate} onChange={e => setForm({ ...form, tax_rate: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Margem (%)</Label>
                    <Input type="number" value={form.margin} onChange={e => setForm({ ...form, margin: Number(e.target.value) })} />
                  </div>
                </div>
                {/* Calculator preview */}
                <div className="p-4 rounded-lg bg-muted/50 border space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Resumo</p>
                  <div className="flex justify-between text-sm">
                    <span>Fee mensal</span>
                    <span>R$ {form.monthly_fee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Setup</span>
                    <span>R$ {form.setup_fee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {form.tax_rate > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>+ Impostos ({form.tax_rate}%)</span>
                      <span>R$ {(totalValue * form.tax_rate / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>Total</span>
                    <span>R$ {totalWithTax.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </TabsContent>

              {/* CONDIÇÕES */}
              <TabsContent value="conditions" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Vigência (meses)</Label>
                    <Input type="number" value={form.validity_months} onChange={e => setForm({ ...form, validity_months: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Prazo para resposta (dias)</Label>
                    <Input type="number" value={form.response_deadline} onChange={e => setForm({ ...form, response_deadline: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Condições de cancelamento</Label>
                  <Textarea value={form.cancellation_terms} onChange={e => setForm({ ...form, cancellation_terms: e.target.value })} rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>Multa</Label>
                  <Input value={form.penalty} onChange={e => setForm({ ...form, penalty: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Renovação</Label>
                  <Textarea value={form.renewal_terms} onChange={e => setForm({ ...form, renewal_terms: e.target.value })} rows={2} />
                </div>
              </TabsContent>

              {/* OBSERVAÇÕES */}
              <TabsContent value="notes" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Observações livres</Label>
                  <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={8} placeholder="Informações adicionais..." />
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : editingProposal ? 'Salvar' : 'Criar Proposta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
