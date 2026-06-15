import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Proposal, ProposalStatus } from '@/hooks/useProposals';
import { Zap, User, Building2, Phone, Mail, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

const PLATFORMS = ['Meta', 'Google', 'TikTok', 'LinkedIn', 'Other'];

const STATUS_OPTIONS: ProposalStatus[] = ['Rascunho', 'Enviada', 'Em negociação', 'Aprovada', 'Perdida', 'Expirada'];

const PLAN_OPTIONS = ['Básico', 'Essencial', 'Pro', 'Premium', 'Enterprise', 'Personalizado'];

const SLA_OPTIONS = ['24h para resposta', '48h para resposta', '72h para resposta', 'Reunião semanal', 'Reunião quinzenal', 'Reunião mensal'];

const COMMON_SERVICES = [
  'Gestão de tráfego pago',
  'Criação de anúncios',
  'Otimização de campanhas',
  'Relatório mensal',
  'Planejamento estratégico',
  'Gestão de redes sociais',
  'Produção de criativos',
  'Copywriting',
  'A/B testing',
  'Análise de métricas',
];

// Planos rápidos — preenchem múltiplos campos de uma vez
const QUICK_PLANS = [
  {
    name: 'Básico',
    monthly_fee: 800,
    setup_fee: 0,
    plan_type: 'Básico',
    platforms: ['Meta'],
    services: ['Gestão de tráfego pago', 'Relatório mensal'],
    sla: '48h para resposta',
    validity_months: 6,
    probability: 60,
  },
  {
    name: 'Pro',
    monthly_fee: 1500,
    setup_fee: 500,
    plan_type: 'Pro',
    platforms: ['Meta', 'Google'],
    services: ['Gestão de tráfego pago', 'Criação de anúncios', 'Otimização de campanhas', 'Relatório mensal'],
    sla: '24h para resposta',
    validity_months: 12,
    probability: 70,
  },
  {
    name: 'Premium',
    monthly_fee: 3000,
    setup_fee: 1000,
    plan_type: 'Premium',
    platforms: ['Meta', 'Google', 'TikTok'],
    services: ['Gestão de tráfego pago', 'Criação de anúncios', 'Otimização de campanhas', 'Relatório mensal', 'Planejamento estratégico', 'A/B testing'],
    sla: '24h para resposta',
    validity_months: 12,
    probability: 80,
  },
];

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
  open, onOpenChange, onSubmit, isLoading,
  clients, teamMembers, pipelineLeads, editingProposal,
}: ProposalFormDialogProps) {
  const [form, setForm] = useState(defaultForm);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [pulledFrom, setPulledFrom] = useState<{ type: 'client' | 'lead'; name: string; company?: string; phone?: string; email?: string; fee?: number } | null>(null);

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
      // Parse services from services_included
      if (editingProposal.services_included) {
        const parsed = editingProposal.services_included.split(',').map(s => s.trim()).filter(Boolean);
        setSelectedServices(parsed.filter(s => COMMON_SERVICES.includes(s)));
      }
      setPulledFrom(null);
    } else {
      setForm(defaultForm);
      setSelectedServices([]);
      setPulledFrom(null);
    }
  }, [editingProposal, open]);

  // Sync selected services into form
  useEffect(() => {
    if (selectedServices.length > 0) {
      setForm(prev => ({ ...prev, services_included: selectedServices.join(', ') }));
    }
  }, [selectedServices]);

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

  const handleClientChange = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setForm(prev => ({
        ...prev,
        client_id: clientId,
        company: client.company || prev.company,
        monthly_fee: client.fee || prev.monthly_fee,
      }));
      setPulledFrom({
        type: 'client',
        name: client.name,
        company: client.company,
        phone: client.phone,
        email: client.email,
        fee: client.fee,
      });
    } else {
      setForm(prev => ({ ...prev, client_id: clientId }));
      setPulledFrom(null);
    }
  };

  const handleLeadChange = (leadId: string) => {
    const lead = pipelineLeads.find(l => l.id === leadId);
    if (lead) {
      setForm(prev => ({
        ...prev,
        pipeline_lead_id: leadId,
        company: lead.company || prev.company,
        monthly_fee: lead.deal_value || prev.monthly_fee,
        probability: lead.probability || prev.probability,
        campaign_objective: lead.notes ? lead.notes.slice(0, 120) : prev.campaign_objective,
      }));
      setPulledFrom({
        type: 'lead',
        name: lead.lead_name,
        company: lead.company,
        phone: lead.phone,
        email: lead.email,
        fee: lead.deal_value,
      });
    } else {
      setForm(prev => ({ ...prev, pipeline_lead_id: leadId }));
      setPulledFrom(null);
    }
  };

  const applyQuickPlan = (plan: typeof QUICK_PLANS[0]) => {
    setForm(prev => ({
      ...prev,
      monthly_fee: plan.monthly_fee,
      setup_fee: plan.setup_fee,
      plan_type: plan.plan_type,
      platforms: plan.platforms,
      sla: plan.sla,
      validity_months: plan.validity_months,
      probability: plan.probability,
    }));
    setSelectedServices(plan.services);
  };

  const togglePlatform = (p: string) => {
    setForm(prev => ({
      ...prev,
      platforms: prev.platforms.includes(p)
        ? prev.platforms.filter(x => x !== p)
        : [...prev.platforms, p],
    }));
  };

  const toggleService = (s: string) => {
    setSelectedServices(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  const totalValue = form.monthly_fee + form.setup_fee;
  const totalWithTax = totalValue * (1 + (form.tax_rate || 0) / 100);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
          <DialogTitle>{editingProposal ? 'Editar Proposta' : 'Nova Proposta'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <ScrollArea className="flex-1 min-h-0 px-6 pt-4">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="basic" className="text-xs">Dados</TabsTrigger>
                <TabsTrigger value="scope" className="text-xs">Escopo</TabsTrigger>
                <TabsTrigger value="pricing" className="text-xs">Preço</TabsTrigger>
                <TabsTrigger value="conditions" className="text-xs">Condições</TabsTrigger>
                <TabsTrigger value="notes" className="text-xs">Obs</TabsTrigger>
              </TabsList>

              {/* ── DADOS ── */}
              <TabsContent value="basic" className="space-y-4 mt-4">

                {/* Client + Lead selectors */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Cliente</Label>
                    <Select value={form.client_id} onValueChange={handleClientChange}>
                      <SelectTrigger><SelectValue placeholder="Selecionar cliente..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {clients.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}{c.company ? ` — ${c.company}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Lead do Pipeline</Label>
                    <Select value={form.pipeline_lead_id} onValueChange={handleLeadChange}>
                      <SelectTrigger><SelectValue placeholder="Opcional..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {pipelineLeads.map(l => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.lead_name}{l.company ? ` — ${l.company}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Auto-fill summary card */}
                {pulledFrom && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                      <Zap className="w-3.5 h-3.5" />
                      Dados puxados automaticamente de {pulledFrom.type === 'client' ? 'cliente' : 'lead'}
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                      {pulledFrom.name && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <User className="w-3 h-3 shrink-0" />
                          <span className="truncate">{pulledFrom.name}</span>
                        </div>
                      )}
                      {pulledFrom.company && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Building2 className="w-3 h-3 shrink-0" />
                          <span className="truncate">{pulledFrom.company}</span>
                        </div>
                      )}
                      {pulledFrom.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3 shrink-0" />
                          <span>{pulledFrom.phone}</span>
                        </div>
                      )}
                      {pulledFrom.email && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="w-3 h-3 shrink-0" />
                          <span className="truncate">{pulledFrom.email}</span>
                        </div>
                      )}
                      {(pulledFrom.fee ?? 0) > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                          <DollarSign className="w-3 h-3 shrink-0" />
                          <span>Fee: {fmt(pulledFrom.fee!)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Empresa</Label>
                    <Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Responsável</Label>
                    <Select value={form.responsible_member_id} onValueChange={v => setForm({ ...form, responsible_member_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {teamMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Objetivo da campanha</Label>
                    <Input value={form.campaign_objective}
                      onChange={e => setForm({ ...form, campaign_objective: e.target.value })}
                      placeholder="Ex: Gerar leads para clínica..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Segmento</Label>
                    <Select value={form.segment} onValueChange={v => setForm({ ...form, segment: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                      <SelectContent>
                        {['Clínica', 'Academia', 'Restaurante', 'E-commerce', 'Imobiliária', 'Educação', 'Beleza', 'Tecnologia', 'Varejo', 'Serviços', 'Outro'].map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Probabilidade (%)</Label>
                    <Input type="number" min={0} max={100} value={form.probability}
                      onChange={e => setForm({ ...form, probability: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as ProposalStatus })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              {/* ── ESCOPO ── */}
              <TabsContent value="scope" className="space-y-4 mt-4">

                {/* Quick plans */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />Planos rápidos
                  </Label>
                  <div className="flex gap-2 flex-wrap">
                    {QUICK_PLANS.map(plan => (
                      <Button key={plan.name} type="button" variant="outline" size="sm"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => applyQuickPlan(plan)}>
                        <Zap className="w-3 h-3" />
                        {plan.name} — {fmt(plan.monthly_fee)}/mês
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Clique para preencher plataformas, serviços, fee e SLA automaticamente.</p>
                </div>

                {/* Platforms */}
                <div className="space-y-2">
                  <Label>Plataformas</Label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map(p => (
                      <button
                        key={p} type="button"
                        onClick={() => togglePlatform(p)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                          form.platforms.includes(p)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-transparent text-muted-foreground border-border hover:border-primary/50'
                        )}
                      >{p}</button>
                    ))}
                  </div>
                </div>

                {/* Services */}
                <div className="space-y-2">
                  <Label>Serviços incluídos</Label>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_SERVICES.map(s => (
                      <button
                        key={s} type="button"
                        onClick={() => toggleService(s)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                          selectedServices.includes(s)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-transparent text-muted-foreground border-border hover:border-primary/50'
                        )}
                      >{s}</button>
                    ))}
                  </div>
                  {selectedServices.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Selecionados: {selectedServices.join(', ')}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Tipo de plano</Label>
                    <Select value={form.plan_type} onValueChange={v => setForm({ ...form, plan_type: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                      <SelectContent>
                        {PLAN_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>SLA de atendimento</Label>
                    <Select value={form.sla} onValueChange={v => setForm({ ...form, sla: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                      <SelectContent>
                        {SLA_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Criativos</Label>
                    <Input value={form.creatives}
                      onChange={e => setForm({ ...form, creatives: e.target.value })}
                      placeholder="Ex: 8 peças/mês" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Landing Pages</Label>
                    <Input value={form.landing_pages}
                      onChange={e => setForm({ ...form, landing_pages: e.target.value })}
                      placeholder="Ex: 2 LPs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Automações</Label>
                    <Input value={form.automations}
                      onChange={e => setForm({ ...form, automations: e.target.value })}
                      placeholder="Ex: Fluxo e-mail" />
                  </div>
                </div>
              </TabsContent>

              {/* ── PREÇO ── */}
              <TabsContent value="pricing" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Fee mensal (R$)</Label>
                    <Input type="number" value={form.monthly_fee}
                      onChange={e => setForm({ ...form, monthly_fee: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Setup / Onboarding (R$)</Label>
                    <Input type="number" value={form.setup_fee}
                      onChange={e => setForm({ ...form, setup_fee: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Verba de mídia (R$)</Label>
                  <Input type="number" value={form.media_budget}
                    onChange={e => setForm({ ...form, media_budget: Number(e.target.value) })}
                    placeholder="Investimento em anúncios (separado do fee)" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Comissão (%)</Label>
                    <Input type="number" value={form.commission}
                      onChange={e => setForm({ ...form, commission: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Impostos (%)</Label>
                    <Input type="number" value={form.tax_rate}
                      onChange={e => setForm({ ...form, tax_rate: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Margem (%)</Label>
                    <Input type="number" value={form.margin}
                      onChange={e => setForm({ ...form, margin: Number(e.target.value) })} />
                  </div>
                </div>

                {/* Resumo financeiro */}
                <div className="p-4 rounded-lg bg-muted/50 border space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Resumo</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fee mensal</span>
                    <span>{fmt(form.monthly_fee)}</span>
                  </div>
                  {form.setup_fee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Setup</span>
                      <span>{fmt(form.setup_fee)}</span>
                    </div>
                  )}
                  {form.media_budget > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Verba de mídia</span>
                      <span className="text-muted-foreground">{fmt(form.media_budget)} <span className="text-xs">(não incluso no fee)</span></span>
                    </div>
                  )}
                  {form.tax_rate > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>+ Impostos ({form.tax_rate}%)</span>
                      <span>{fmt(totalValue * form.tax_rate / 100)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>Total (fee + setup + impostos)</span>
                    <span className="text-primary">{fmt(totalWithTax)}</span>
                  </div>
                </div>
              </TabsContent>

              {/* ── CONDIÇÕES ── */}
              <TabsContent value="conditions" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Vigência (meses)</Label>
                    <Input type="number" value={form.validity_months}
                      onChange={e => setForm({ ...form, validity_months: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Validade da proposta (dias)</Label>
                    <Input type="number" value={form.response_deadline}
                      onChange={e => setForm({ ...form, response_deadline: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Condições de cancelamento</Label>
                  <Textarea value={form.cancellation_terms}
                    onChange={e => setForm({ ...form, cancellation_terms: e.target.value })}
                    rows={2} placeholder="Ex: 30 dias de aviso prévio..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Multa rescisória</Label>
                  <Input value={form.penalty}
                    onChange={e => setForm({ ...form, penalty: e.target.value })}
                    placeholder="Ex: 1 mensalidade" />
                </div>
                <div className="space-y-1.5">
                  <Label>Renovação</Label>
                  <Textarea value={form.renewal_terms}
                    onChange={e => setForm({ ...form, renewal_terms: e.target.value })}
                    rows={2} placeholder="Ex: Renovação automática por igual período..." />
                </div>
              </TabsContent>

              {/* ── OBSERVAÇÕES ── */}
              <TabsContent value="notes" className="space-y-4 mt-4">
                <div className="space-y-1.5">
                  <Label>Observações</Label>
                  <Textarea value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    rows={8} placeholder="Informações adicionais, contexto, detalhes..." />
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>

          <div className="flex justify-end gap-2 px-6 py-3 border-t shrink-0">
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
