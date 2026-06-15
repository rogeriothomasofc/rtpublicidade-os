import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useContracts, useUpdateContract, useDeleteContract, ContractStatus } from '@/hooks/useContracts';
import { useClients } from '@/hooks/useClients';
import { useFinance } from '@/hooks/useFinance';
import { useAgencySettings } from '@/hooks/useAgencySettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { formatCurrency } from '@/lib/utils';
import { format, addMonths, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  FileText, Pencil, Trash2, Search, AlertTriangle, FileDown,
  DollarSign, BarChart3, FileCheck, Eye, Upload, ExternalLink, Loader2,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { generateContractPDF } from '@/components/contracts/ContractPDFGenerator';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const statusConfig: Record<ContractStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  Ativo: { label: 'Ativo', variant: 'default' },
  Expirado: { label: 'Expirado', variant: 'destructive' },
  Cancelado: { label: 'Cancelado', variant: 'secondary' },
};

const durationOptions = [
  { value: 3, label: '3 meses' },
  { value: 6, label: '6 meses' },
  { value: 12, label: '12 meses' },
];

export default function ContractsPage() {
  const { data: contracts, isLoading } = useContracts();
  const { data: clients } = useClients();
  const { data: financeData } = useFinance();
  const { data: agencySettings } = useAgencySettings();
  const updateContract = useUpdateContract();
  const deleteContract = useDeleteContract();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingContract, setEditingContract] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    value: 0,
    media_budget: 0,
    status: 'Ativo' as ContractStatus,
    duration_months: 12,
    description: '',
  });

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFilename, setPreviewFilename] = useState('');
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewContract, setPreviewContract] = useState<any>(null);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const [savingPdf, setSavingPdf] = useState(false);

  const getClient = (clientId: string) => clients?.find(c => c.id === clientId);
  const getClientName = (clientId: string) => {
    const c = getClient(clientId);
    return c?.company || c?.name || 'Cliente não encontrado';
  };

  const buildPDFData = (contract: any) => {
    const client = getClient(contract.client_id);
    if (!client) return null;
    const clientRevenue = financeData?.find(f => f.client_id === contract.client_id && f.type === 'Receita');
    const paymentDay = clientRevenue ? new Date(clientRevenue.due_date + 'T12:00:00').getDate() : null;
    return {
      contract: {
        id: contract.id,
        value: contract.value,
        media_budget: contract.media_budget,
        start_date: contract.start_date,
        duration_months: contract.duration_months,
        description: contract.description,
        status: contract.status,
        payment_day: paymentDay,
      },
      client: {
        name: client.name, company: client.company, email: client.email || null,
        phone: client.phone || null, cnpj: client.cnpj || null, cpf: client.cpf || null,
        rg: client.rg || null, razao_social: client.razao_social || null,
        person_type: client.person_type || 'pj', address: client.address || null,
        city: client.city || null, state: client.state || null, zip_code: client.zip_code || null,
      },
      agency: {
        name: agencySettings?.name || 'Agência', cnpj: agencySettings?.cnpj || null,
        logo_url: agencySettings?.contract_logo_url || agencySettings?.logo_url || null,
        address: agencySettings?.address || null,
        city: agencySettings?.city || null, state: agencySettings?.state || null,
        zip_code: agencySettings?.zip_code || null,
      },
      clauses: agencySettings?.contract_clauses || null,
    };
  };

  const closePreview = () => {
    setPreviewOpen(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handlePreview = async (contract: any) => {
    const pdfData = buildPDFData(contract);
    if (!pdfData) return;
    setGeneratingPdf(contract.id);
    try {
      const result = await generateContractPDF(pdfData);
      const blobUrl = URL.createObjectURL(result.blob);
      setPreviewUrl(blobUrl);
      setPreviewBlob(result.blob);
      setPreviewFilename(result.filename);
      setPreviewContract(contract);
      setPreviewOpen(true);
    } catch (e) {
      toast.error('Erro ao gerar PDF');
    } finally {
      setGeneratingPdf(null);
    }
  };

  const handleDownload = async (contract: any) => {
    const pdfData = buildPDFData(contract);
    if (!pdfData) return;
    setGeneratingPdf(contract.id);
    try {
      const result = await generateContractPDF(pdfData);
      const a = document.createElement('a');
      a.href = result.dataUrl;
      a.download = result.filename;
      a.click();
    } catch {
      toast.error('Erro ao baixar PDF');
    } finally {
      setGeneratingPdf(null);
    }
  };

  const handleSavePdf = async () => {
    if (!previewBlob || !previewContract) return;
    setSavingPdf(true);
    try {
      const path = `${previewContract.id}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(path, previewBlob, { contentType: 'application/pdf', upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('contracts').getPublicUrl(path);
      await updateContract.mutateAsync({ id: previewContract.id, pdf_url: publicUrl });
      toast.success('PDF salvo no sistema!');
    } catch (e: any) {
      toast.error('Erro ao salvar PDF: ' + e.message);
    } finally {
      setSavingPdf(false);
    }
  };

  const getEndDate = (startDate: string, durationMonths: number) =>
    addMonths(new Date(startDate + 'T12:00:00'), durationMonths);

  const getDaysRemaining = (startDate: string, durationMonths: number) =>
    differenceInDays(getEndDate(startDate, durationMonths), new Date());

  const filteredContracts = contracts?.filter((c: any) => {
    const name = getClientName(c.client_id).toLowerCase();
    const matchSearch = name.includes(searchTerm.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleEditClick = (contract: any) => {
    setEditingContract(contract);
    setEditFormData({
      value: contract.value,
      media_budget: contract.media_budget || 0,
      status: contract.status,
      duration_months: contract.duration_months || 12,
      description: contract.description || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingContract) return;
    await updateContract.mutateAsync({ id: editingContract.id, ...editFormData });
    setEditingContract(null);
  };

  const totalActiveValue = contracts?.filter((c: any) => c.status === 'Ativo')
    .reduce((sum: number, c: any) => sum + Number(c.value), 0) || 0;
  const totalContractsValue = contracts?.reduce((sum: number, c: any) => sum + Number(c.value), 0) || 0;
  const activeContractsCount = contracts?.filter((c: any) => c.status === 'Ativo').length || 0;
  const expiringContracts = contracts?.filter((c: any) => {
    if (c.status !== 'Ativo') return false;
    const days = getDaysRemaining(c.start_date, c.duration_months || 12);
    return days <= 30 && days > 0;
  }).length || 0;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard title="MRR (Mensal)" value={formatCurrency(totalActiveValue)} icon={BarChart3} variant="primary" />
          <MetricCard title="Total em Contratos" value={formatCurrency(totalContractsValue)} icon={DollarSign} variant="default" />
          <MetricCard
            title="Contratos Ativos" value={activeContractsCount} icon={FileCheck} variant="success"
            description={expiringContracts > 0 ? `${expiringContracts} vencendo em 30 dias` : undefined}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por cliente ou descrição..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="Ativo">Ativos</SelectItem>
              <SelectItem value="Expirado">Expirados</SelectItem>
              <SelectItem value="Cancelado">Cancelados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Mídia</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="p-0">
                      <EmptyState
                        icon={FileText}
                        title={searchTerm || statusFilter !== 'all' ? 'Nenhum contrato encontrado' : 'Nenhum contrato cadastrado'}
                        description={searchTerm || statusFilter !== 'all'
                          ? 'Tente ajustar os filtros ou a busca.'
                          : 'Crie o primeiro contrato vinculando a um cliente ativo.'}
                        filtered={!!(searchTerm || statusFilter !== 'all')}
                      />
                    </TableCell>
                  </TableRow>
                ) : filteredContracts?.map((contract: any) => {
                  const daysRemaining = getDaysRemaining(contract.start_date, contract.duration_months || 12);
                  const isExpiringSoon = contract.status === 'Ativo' && daysRemaining <= 30 && daysRemaining > 0;
                  const endDate = getEndDate(contract.start_date, contract.duration_months || 12);
                  const isGenerating = generatingPdf === contract.id;

                  return (
                    <TableRow key={contract.id}>
                      <TableCell>
                        <div className="font-medium">{getClientName(contract.client_id)}</div>
                        {contract.description && (
                          <div className="text-xs text-muted-foreground">{contract.description}</div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(contract.value)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {contract.media_budget > 0 ? formatCurrency(contract.media_budget) : '—'}
                      </TableCell>
                      <TableCell>{contract.duration_months || 12} meses</TableCell>
                      <TableCell>{format(new Date(contract.start_date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {format(endDate, 'dd/MM/yyyy', { locale: ptBR })}
                          {isExpiringSoon && <AlertTriangle className="w-3.5 h-3.5 text-warning" />}
                        </div>
                        {isExpiringSoon && (
                          <span className="text-xs text-warning">{daysRemaining} dias</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant={statusConfig[contract.status as ContractStatus]?.variant || 'default'}>
                            {statusConfig[contract.status as ContractStatus]?.label || contract.status}
                          </Badge>
                          {contract.pdf_url && (
                            <a href={contract.pdf_url} target="_blank" rel="noopener noreferrer">
                              <Badge variant="outline" className="gap-1 text-[10px] cursor-pointer hover:bg-primary/10">
                                <ExternalLink className="w-2.5 h-2.5" />PDF
                              </Badge>
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" title="Visualizar PDF"
                            onClick={() => handlePreview(contract)} disabled={isGenerating}>
                            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" title="Baixar PDF"
                            onClick={() => handleDownload(contract)} disabled={isGenerating}>
                            <FileDown className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEditClick(contract)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir contrato?</AlertDialogTitle>
                                <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteContract.mutate(contract.id)}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* PDF Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={(open) => { if (!open) closePreview(); }}>
          <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
              <DialogTitle className="flex items-center gap-2 text-base">
                <FileText className="w-4 h-4" />
                {previewFilename}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0">
              {previewUrl && (
                <object
                  data={previewUrl}
                  type="application/pdf"
                  className="w-full h-full border-0"
                >
                  <p className="p-6 text-muted-foreground text-sm">
                    Seu navegador não exibe PDFs inline.{' '}
                    <a href={previewUrl} download={previewFilename} className="underline text-primary">
                      Clique aqui para baixar.
                    </a>
                  </p>
                </object>
              )}
            </div>
            <DialogFooter className="px-6 py-3 border-t shrink-0 flex gap-2">
              <Button variant="outline" onClick={closePreview}>Fechar</Button>
              <Button variant="outline" className="gap-2" onClick={() => {
                if (!previewBlob) return;
                const a = document.createElement('a');
                a.href = URL.createObjectURL(previewBlob);
                a.download = previewFilename;
                a.click();
              }}>
                <FileDown className="w-4 h-4" />
                Baixar
              </Button>
              <Button className="gap-2" onClick={handleSavePdf} disabled={savingPdf}>
                {savingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {savingPdf ? 'Salvando...' : 'Salvar no sistema'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editingContract} onOpenChange={() => setEditingContract(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar Contrato</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fee Mensal</Label>
                  <Input type="number" value={editFormData.value}
                    onChange={(e) => setEditFormData({ ...editFormData, value: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Verba de Mídia</Label>
                  <Input type="number" value={editFormData.media_budget}
                    onChange={(e) => setEditFormData({ ...editFormData, media_budget: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label>Duração</Label>
                <Select value={String(editFormData.duration_months)}
                  onValueChange={(v) => setEditFormData({ ...editFormData, duration_months: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {durationOptions.map(opt => (
                      <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={editFormData.status}
                  onValueChange={(v) => setEditFormData({ ...editFormData, status: v as ContractStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Expirado">Expirado</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Descrição</Label>
                <Input value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })} />
              </div>
              <Button onClick={handleSaveEdit} className="w-full" disabled={updateContract.isPending}>
                {updateContract.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
