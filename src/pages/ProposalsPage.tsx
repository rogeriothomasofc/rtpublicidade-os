import { useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  useProposals, useCreateProposal, useUpdateProposal,
  useDeleteProposal, useDuplicateProposal, Proposal, ProposalStatus,
} from '@/hooks/useProposals';
import { useClients } from '@/hooks/useClients';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useSalesPipeline } from '@/hooks/useSalesPipeline';
import { useCreateContract } from '@/hooks/useContracts';
import { useAgencySettings } from '@/hooks/useAgencySettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ProposalFormDialog } from '@/components/proposals/ProposalFormDialog';
import { generateProposalPDF, PDFLayout } from '@/components/proposals/ProposalPDFGenerator';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Plus, Search, MoreHorizontal, FileDown, Copy, ArrowRightLeft,
  XCircle, Archive, Pencil, Trash2, FileCheck2, TrendingUp,
  FileText, Percent, Eye, Loader2,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { toast } from 'sonner';

const statusConfig: Record<ProposalStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
  Rascunho:       { label: 'Rascunho',       variant: 'secondary',    color: '' },
  Enviada:        { label: 'Enviada',         variant: 'default',      color: 'bg-blue-500/10 text-blue-500' },
  'Em negociação':{ label: 'Em negociação',   variant: 'outline',      color: 'bg-amber-500/10 text-amber-500' },
  Aprovada:       { label: 'Aprovada',        variant: 'default',      color: 'bg-success/10 text-success' },
  Perdida:        { label: 'Perdida',         variant: 'destructive',  color: '' },
  Expirada:       { label: 'Expirada',        variant: 'secondary',    color: '' },
};

export default function ProposalsPage() {
  const { data: proposals, isLoading } = useProposals();
  const { data: clients } = useClients();
  const { data: teamMembers } = useTeamMembers();
  const { data: pipelineLeads } = useSalesPipeline();
  const { data: agencySettings } = useAgencySettings();
  const createProposal = useCreateProposal();
  const updateProposal = useUpdateProposal();
  const deleteProposal = useDeleteProposal();
  const duplicateProposal = useDuplicateProposal();
  const createContract = useCreateContract();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewFilename, setPreviewFilename] = useState('');
  const [previewLayout, setPreviewLayout] = useState<PDFLayout>('corporativo');
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [previewProposal, setPreviewProposal] = useState<Proposal | null>(null);

  const filtered = proposals?.filter(p => {
    const matchSearch =
      p.client?.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.company?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.responsible?.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.plan_type?.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  }) || [];

  // ── Metrics ──
  const allProposals = proposals || [];
  const active = allProposals.filter(p => p.status === 'Enviada' || p.status === 'Em negociação');
  const approved = allProposals.filter(p => p.status === 'Aprovada');
  const responded = allProposals.filter(p => p.status !== 'Rascunho');
  const conversionRate = responded.length > 0 ? Math.round((approved.length / responded.length) * 100) : 0;
  const mrrApproved = approved.reduce((s, p) => s + (p.monthly_fee || 0), 0);
  const totalMedia = filtered.reduce((s, p) => s + (p.media_budget || 0), 0);

  // ── Handlers ──
  const handleSubmit = async (data: any) => {
    if (editingProposal) {
      await updateProposal.mutateAsync({ id: editingProposal.id, ...data });
    } else {
      await createProposal.mutateAsync(data);
    }
    setIsFormOpen(false);
    setEditingProposal(null);
  };

  const closePreview = () => {
    setPreviewOpen(false);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
    setPreviewBlob(null);
    setPreviewProposal(null);
  };

  const openPreview = async (p: Proposal, layout: PDFLayout = previewLayout) => {
    setGeneratingId(p.id);
    try {
      const result = await generateProposalPDF(p, layout, agencySettings);
      const blobUrl = URL.createObjectURL(result.blob);
      setPreviewUrl(blobUrl);
      setPreviewBlob(result.blob);
      setPreviewFilename(result.filename);
      setPreviewProposal(p);
      setPreviewLayout(layout);
      setPreviewOpen(true);
    } catch {
      toast.error('Erro ao gerar PDF');
    } finally {
      setGeneratingId(null);
    }
  };

  const handleLayoutChange = async (layout: PDFLayout) => {
    if (!previewProposal) return;
    setPreviewLayout(layout);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
    try {
      const result = await generateProposalPDF(previewProposal, layout, agencySettings);
      setPreviewUrl(URL.createObjectURL(result.blob));
      setPreviewBlob(result.blob);
      setPreviewFilename(result.filename);
    } catch { /* skip */ }
  };

  const handleDownloadDirect = async (p: Proposal) => {
    setGeneratingId(p.id);
    try {
      const result = await generateProposalPDF(p, previewLayout, agencySettings);
      const a = document.createElement('a');
      a.href = result.dataUrl;
      a.download = result.filename;
      a.click();
    } catch {
      toast.error('Erro ao baixar PDF');
    } finally {
      setGeneratingId(null);
    }
  };

  const handleConvertToContract = async (p: Proposal) => {
    if (!p.client_id) {
      toast.error('Proposta precisa ter um cliente vinculado para converter em contrato.');
      return;
    }
    try {
      await createContract.mutateAsync({
        client_id: p.client_id,
        value: p.monthly_fee,
        media_budget: p.media_budget || 0,
        start_date: new Date().toISOString().split('T')[0],
        duration_months: p.validity_months || 12,
        status: 'Ativo',
        description: `Contrato gerado da proposta v${p.version} - ${p.company || p.client?.name || ''}`,
      });
      await updateProposal.mutateAsync({ id: p.id, status: 'Aprovada' });
      toast.success('Contrato criado e proposta marcada como aprovada!');
    } catch { /* handled by mutation */ }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">

        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCard title="Em Aberto" value={active.length} icon={FileText} variant="default"
            description="Enviadas + Em negociação" />
          <MetricCard title="MRR Aprovado" value={formatCurrency(mrrApproved)} icon={TrendingUp} variant="primary" />
          <MetricCard title="Taxa de Conversão" value={`${conversionRate}%`} icon={Percent} variant="success"
            description={`${approved.length} aprovadas`} />
          <MetricCard title="Verba de Mídia" value={formatCurrency(totalMedia)} icon={FileCheck2} variant="default"
            description="Propostas filtradas" />
        </div>

        {/* Header + Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar cliente, empresa, plano..." value={search}
              onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(statusConfig).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="gap-2 shrink-0" onClick={() => { setEditingProposal(null); setIsFormOpen(true); }}>
            <Plus className="w-4 h-4" />Nova Proposta
          </Button>
        </div>

        {/* Table */}
        <Card className="border-border/50">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente / Empresa</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Fee Mensal</TableHead>
                    <TableHead>Mídia</TableHead>
                    <TableHead>Setup</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prob.</TableHead>
                    <TableHead>v</TableHead>
                    <TableHead>Criação</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="p-0">
                        <EmptyState
                          icon={FileCheck2}
                          title={debouncedSearch || statusFilter !== 'all' ? 'Nenhuma proposta encontrada' : 'Nenhuma proposta cadastrada'}
                          description={debouncedSearch || statusFilter !== 'all'
                            ? 'Tente ajustar os filtros ou a busca.'
                            : 'Crie sua primeira proposta comercial e envie para prospects.'}
                          actionLabel="+ Nova Proposta"
                          onAction={() => setIsFormOpen(true)}
                          filtered={!!(debouncedSearch || statusFilter !== 'all')}
                        />
                      </TableCell>
                    </TableRow>
                  ) : filtered.map(p => {
                    const cfg = statusConfig[p.status];
                    const isGen = generatingId === p.id;
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <p className="font-medium text-sm">{p.client?.name || p.company || '-'}</p>
                          {p.client?.company && p.client.company !== (p.client?.name || p.company) && (
                            <p className="text-xs text-muted-foreground">{p.client.company}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{p.responsible?.name || '-'}</TableCell>
                        <TableCell className="font-medium text-sm">{formatCurrency(p.monthly_fee || 0)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.media_budget > 0 ? formatCurrency(p.media_budget) : '—'}
                        </TableCell>
                        <TableCell className="text-sm">{p.setup_fee > 0 ? formatCurrency(p.setup_fee) : '—'}</TableCell>
                        <TableCell className="text-sm">{p.plan_type || '-'}</TableCell>
                        <TableCell>
                          <Select
                            value={p.status}
                            onValueChange={(v) => updateProposal.mutate({ id: p.id, status: v as ProposalStatus })}
                          >
                            <SelectTrigger className={`h-6 w-auto px-2 py-0 text-xs font-medium rounded-full border-0 focus:ring-0 focus:ring-offset-0 ${cfg?.color || 'bg-muted text-muted-foreground'}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(statusConfig).map(([k, v]) => (
                                <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-sm">{p.probability}%</TableCell>
                        <TableCell className="text-xs text-muted-foreground">v{p.version}</TableCell>
                        <TableCell className="text-sm">{formatDate(p.created_at.split('T')[0])}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" disabled={isGen}>
                                {isGen ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreHorizontal className="w-4 h-4" />}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditingProposal(p); setIsFormOpen(true); }}>
                                <Pencil className="w-4 h-4 mr-2" />Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openPreview(p)}>
                                <Eye className="w-4 h-4 mr-2" />Visualizar PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownloadDirect(p)}>
                                <FileDown className="w-4 h-4 mr-2" />Baixar PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => duplicateProposal.mutate(p)}>
                                <Copy className="w-4 h-4 mr-2" />Duplicar / Nova versão
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleConvertToContract(p)}>
                                <ArrowRightLeft className="w-4 h-4 mr-2" />Converter em contrato
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => updateProposal.mutate({ id: p.id, status: 'Perdida' })}>
                                <XCircle className="w-4 h-4 mr-2" />Marcar como perdida
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateProposal.mutate({ id: p.id, status: 'Expirada' })}>
                                <Archive className="w-4 h-4 mr-2" />Arquivar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeleteId(p.id)} className="text-destructive">
                                <Trash2 className="w-4 h-4 mr-2" />Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Form Dialog */}
        <ProposalFormDialog
          open={isFormOpen}
          onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingProposal(null); }}
          onSubmit={handleSubmit}
          isLoading={createProposal.isPending || updateProposal.isPending}
          clients={clients || []}
          teamMembers={teamMembers || []}
          pipelineLeads={pipelineLeads || []}
          editingProposal={editingProposal}
        />

        {/* Delete Dialog */}
        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir proposta?</AlertDialogTitle>
              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => { if (deleteId) { deleteProposal.mutate(deleteId); setDeleteId(null); } }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* PDF Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={(open) => { if (!open) closePreview(); }}>
          <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
              <div className="flex items-center justify-between gap-4">
                <DialogTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4" />
                  {previewFilename}
                </DialogTitle>
                <Select value={previewLayout} onValueChange={(v) => handleLayoutChange(v as PDFLayout)}>
                  <SelectTrigger className="w-36 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimal">Minimal</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="corporativo">Corporativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </DialogHeader>
            <div className="flex-1 min-h-0">
              {previewUrl ? (
                <object data={previewUrl} type="application/pdf" className="w-full h-full border-0">
                  <p className="p-6 text-sm text-muted-foreground">
                    Seu navegador não exibe PDFs inline.{' '}
                    <a href={previewUrl} download={previewFilename} className="underline text-primary">Clique para baixar.</a>
                  </p>
                </object>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            <DialogFooter className="px-6 py-3 border-t shrink-0">
              <Button variant="outline" onClick={closePreview}>Fechar</Button>
              <Button variant="outline" className="gap-2" onClick={() => {
                if (!previewBlob) return;
                const a = document.createElement('a');
                a.href = URL.createObjectURL(previewBlob);
                a.download = previewFilename;
                a.click();
              }}>
                <FileDown className="w-4 h-4" />Baixar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </MainLayout>
  );
}
