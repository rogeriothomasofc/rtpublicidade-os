import { useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  useProposals,
  useCreateProposal,
  useUpdateProposal,
  useDeleteProposal,
  useDuplicateProposal,
  Proposal,
  ProposalStatus,
} from '@/hooks/useProposals';
import { useClients } from '@/hooks/useClients';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useSalesPipeline } from '@/hooks/useSalesPipeline';
import { useCreateContract } from '@/hooks/useContracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ProposalFormDialog } from '@/components/proposals/ProposalFormDialog';
import { generateProposalPDF } from '@/components/proposals/ProposalPDFGenerator';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Plus, Search, MoreHorizontal, FileDown, Copy, ArrowRightLeft,
  XCircle, Archive, Pencil, Trash2, FileText, FileCheck2,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';

const statusConfig: Record<ProposalStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  Rascunho: { label: 'Rascunho', variant: 'secondary' },
  Enviada: { label: 'Enviada', variant: 'default' },
  'Em negociação': { label: 'Em negociação', variant: 'outline' },
  Aprovada: { label: 'Aprovada', variant: 'default' },
  Perdida: { label: 'Perdida', variant: 'destructive' },
  Expirada: { label: 'Expirada', variant: 'secondary' },
};

type PDFLayout = 'minimal' | 'premium' | 'corporativo';

export default function ProposalsPage() {
  const { data: proposals, isLoading } = useProposals();
  const { data: clients } = useClients();
  const { data: teamMembers } = useTeamMembers();
  const { data: pipelineLeads } = useSalesPipeline();
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
  const [pdfDialogProposal, setPdfDialogProposal] = useState<Proposal | null>(null);

  const filtered = proposals?.filter(p => {
    const matchSearch =
      p.client?.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.company?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.responsible?.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.plan_type?.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  }) || [];

  const handleSubmit = async (data: any) => {
    if (editingProposal) {
      await updateProposal.mutateAsync({ id: editingProposal.id, ...data });
    } else {
      await createProposal.mutateAsync(data);
    }
    setIsFormOpen(false);
    setEditingProposal(null);
  };

  const handleEdit = (p: Proposal) => {
    setEditingProposal(p);
    setIsFormOpen(true);
  };

  const handleDuplicate = (p: Proposal) => {
    duplicateProposal.mutate(p);
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
        start_date: new Date().toISOString().split('T')[0],
        duration_months: p.validity_months || 12,
        status: 'Ativo',
        description: `Contrato gerado da proposta v${p.version} - ${p.company || p.client?.name || ''}`,
      });
      await updateProposal.mutateAsync({ id: p.id, status: 'Aprovada' });
      toast.success('Contrato criado e proposta marcada como aprovada!');
    } catch (err) {
      // error handled by mutation
    }
  };

  const handleMarkLost = (p: Proposal) => {
    updateProposal.mutate({ id: p.id, status: 'Perdida' });
  };

  const handleArchive = (p: Proposal) => {
    updateProposal.mutate({ id: p.id, status: 'Expirada' });
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteProposal.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const handleGeneratePDF = (p: Proposal, layout: PDFLayout) => {
    generateProposalPDF(p, layout);
    setPdfDialogProposal(null);
  };

  const totalValue = filtered.reduce((sum, p) => sum + (p.monthly_fee || 0), 0);
  const approvedCount = proposals?.filter(p => p.status === 'Aprovada').length || 0;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Propostas</h1>
            <p className="text-muted-foreground">Gerencie suas propostas comerciais</p>
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Propostas
            </h1>
            <p className="text-muted-foreground">
              {proposals?.length || 0} propostas · {approvedCount} aprovadas · Total mensal: {formatCurrency(totalValue)}
            </p>
          </div>
          <Button className="gap-2" onClick={() => { setEditingProposal(null); setIsFormOpen(true); }}>
            <Plus className="w-4 h-4" />
            Nova Proposta
          </Button>
        </div>

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
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* PDF Layout Dialog */}
        <Dialog open={!!pdfDialogProposal} onOpenChange={(open) => !open && setPdfDialogProposal(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Escolha o layout do PDF</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              {([
                { value: 'minimal', label: 'Minimal', desc: 'Limpo e direto' },
                { value: 'premium', label: 'Premium', desc: 'Cores e destaque' },
                { value: 'corporativo', label: 'Corporativo', desc: 'Formal e escuro' },
              ] as { value: PDFLayout; label: string; desc: string }[]).map(l => (
                <Button
                  key={l.value}
                  variant="outline"
                  className="justify-start h-auto py-3"
                  onClick={() => pdfDialogProposal && handleGeneratePDF(pdfDialogProposal, l.value)}
                >
                  <div className="text-left">
                    <p className="font-medium">{l.label}</p>
                    <p className="text-xs text-muted-foreground">{l.desc}</p>
                  </div>
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Filters */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar cliente, empresa, plano..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {Object.entries(statusConfig).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-border/50">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            <Table className="min-w-[860px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente / Empresa</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Fee Mensal</TableHead>
                  <TableHead>Setup</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prob.</TableHead>
                  <TableHead>Versão</TableHead>
                  <TableHead>Criação</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="p-0">
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
                ) : (
                  filtered.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{p.client?.name || p.company || '-'}</p>
                          <p className="text-xs text-muted-foreground">{p.client?.company || p.company}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{p.responsible?.name || '-'}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(p.monthly_fee || 0)}</TableCell>
                      <TableCell>{formatCurrency(p.setup_fee || 0)}</TableCell>
                      <TableCell className="text-sm">{p.plan_type || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[p.status]?.variant || 'secondary'}>
                          {statusConfig[p.status]?.label || p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{p.probability}%</TableCell>
                      <TableCell className="text-sm">v{p.version}</TableCell>
                      <TableCell className="text-sm">{formatDate(p.created_at.split('T')[0] || p.created_at.split(' ')[0])}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(p)}>
                              <Pencil className="w-4 h-4 mr-2" />Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setPdfDialogProposal(p)}>
                              <FileDown className="w-4 h-4 mr-2" />Gerar PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(p)}>
                              <Copy className="w-4 h-4 mr-2" />Duplicar / Nova versão
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleConvertToContract(p)}>
                              <ArrowRightLeft className="w-4 h-4 mr-2" />Converter em contrato
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleMarkLost(p)}>
                              <XCircle className="w-4 h-4 mr-2" />Marcar como perdida
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleArchive(p)}>
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
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
