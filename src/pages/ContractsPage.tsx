import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useContracts, useUpdateContract, useDeleteContract, ContractStatus } from '@/hooks/useContracts';
import { useClients } from '@/hooks/useClients';
import { useFinance } from '@/hooks/useFinance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { formatCurrency } from '@/lib/utils';
import { format, addMonths, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Pencil, Trash2, Search, Calendar, AlertTriangle, FileDown, Plus, DollarSign, BarChart3, FileCheck } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { generateContractPDF } from '@/components/contracts/ContractPDFGenerator';
import { useAgencySettings } from '@/hooks/useAgencySettings';
import { MetricCard } from '@/components/dashboard/MetricCard';

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
    status: 'Ativo' as ContractStatus,
    duration_months: 12,
    description: '',
  });

  const getClient = (clientId: string) => clients?.find(c => c.id === clientId);
  const getClientName = (clientId: string) => {
    const client = getClient(clientId);
    return client?.company || client?.name || 'Cliente não encontrado';
  };

  const handleGeneratePDF = (contract: any) => {
    const client = getClient(contract.client_id);
    if (!client) return;

    // Find the client's revenue due_date to extract payment day
    const clientRevenue = financeData?.find(
      (f) => f.client_id === contract.client_id && f.type === 'Receita'
    );
    const paymentDay = clientRevenue
      ? new Date(clientRevenue.due_date + 'T12:00:00').getDate()
      : null;

    generateContractPDF({
      contract: {
        id: contract.id,
        value: contract.value,
        start_date: contract.start_date,
        duration_months: contract.duration_months,
        description: contract.description,
        status: contract.status,
        payment_day: paymentDay,
      },
      client: {
        name: client.name,
        company: client.company,
        email: client.email || null,
        phone: client.phone || null,
        cnpj: client.cnpj || null,
        cpf: client.cpf || null,
        rg: client.rg || null,
        razao_social: client.razao_social || null,
        person_type: client.person_type || 'pj',
        address: client.address || null,
        city: client.city || null,
        state: client.state || null,
        zip_code: client.zip_code || null,
      },
      agency: {
        name: agencySettings?.name || 'Agência',
        cnpj: agencySettings?.cnpj || null,
        logo_url: agencySettings?.logo_url || null,
        address: agencySettings?.address || null,
        city: agencySettings?.city || null,
        state: agencySettings?.state || null,
        zip_code: agencySettings?.zip_code || null,
      },
    });
  };

  const getEndDate = (startDate: string, durationMonths: number) => {
    return addMonths(new Date(startDate + 'T12:00:00'), durationMonths);
  };

  const getDaysRemaining = (startDate: string, durationMonths: number) => {
    const endDate = getEndDate(startDate, durationMonths);
    return differenceInDays(endDate, new Date());
  };

  const filteredContracts = contracts?.filter((contract: any) => {
    const clientName = getClientName(contract.client_id).toLowerCase();
    const matchesSearch = clientName.includes(searchTerm.toLowerCase()) ||
      contract.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleEditClick = (contract: any) => {
    setEditingContract(contract);
    setEditFormData({
      value: contract.value,
      status: contract.status,
      duration_months: contract.duration_months || 12,
      description: contract.description || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingContract) return;
    await updateContract.mutateAsync({
      id: editingContract.id,
      ...editFormData,
    });
    setEditingContract(null);
  };

  const handleDelete = async (id: string) => {
    await deleteContract.mutateAsync(id);
  };

  const totalActiveValue = contracts
    ?.filter((c: any) => c.status === 'Ativo')
    .reduce((sum: number, c: any) => sum + Number(c.value), 0) || 0;

  const totalContractsValue = contracts
    ?.reduce((sum: number, c: any) => sum + Number(c.value), 0) || 0;

  const activeContractsCount = contracts
    ?.filter((c: any) => c.status === 'Ativo').length || 0;

  const expiringContracts = contracts?.filter((c: any) => {
    if (c.status !== 'Ativo') return false;
    const daysRemaining = getDaysRemaining(c.start_date, c.duration_months || 12);
    return daysRemaining <= 30 && daysRemaining > 0;
  }).length || 0;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            title="MRR (Mensal)"
            value={formatCurrency(totalActiveValue)}
            icon={BarChart3}
            variant="primary"
          />
          <MetricCard
            title="Total em Contratos"
            value={formatCurrency(totalContractsValue)}
            icon={DollarSign}
            variant="default"
          />
          <MetricCard
            title="Contratos Ativos"
            value={activeContractsCount}
            icon={FileCheck}
            variant="success"
            description={expiringContracts > 0 ? `${expiringContracts} vencendo em 30 dias` : undefined}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
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
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Valor</TableHead>
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
                  <TableCell colSpan={7} className="p-0">
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
              ) : (
                filteredContracts?.map((contract: any) => {
                  const daysRemaining = getDaysRemaining(contract.start_date, contract.duration_months || 12);
                  const isExpiringSoon = contract.status === 'Ativo' && daysRemaining <= 30 && daysRemaining > 0;
                  const endDate = getEndDate(contract.start_date, contract.duration_months || 12);

                  return (
                    <TableRow key={contract.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{getClientName(contract.client_id)}</div>
                          {contract.description && (
                            <div className="text-sm text-muted-foreground">{contract.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(contract.value)}
                      </TableCell>
                      <TableCell>
                        {contract.duration_months || 12} meses
                      </TableCell>
                      <TableCell>
                        {format(new Date(contract.start_date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {format(endDate, 'dd/MM/yyyy', { locale: ptBR })}
                          {isExpiringSoon && (
                            <AlertTriangle className="w-4 h-4 text-warning" />
                          )}
                        </div>
                        {isExpiringSoon && (
                          <span className="text-xs text-warning">
                            {daysRemaining} dias restantes
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[contract.status as ContractStatus]?.variant || 'default'}>
                          {statusConfig[contract.status as ContractStatus]?.label || contract.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Gerar contrato PDF"
                            onClick={() => handleGeneratePDF(contract)}
                          >
                            <FileDown className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(contract)}
                          >
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
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. O contrato será permanentemente removido.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(contract.id)}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingContract} onOpenChange={() => setEditingContract(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Contrato</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Valor</Label>
                <Input
                  type="number"
                  value={editFormData.value}
                  onChange={(e) => setEditFormData({ ...editFormData, value: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Duração</Label>
                <Select
                  value={String(editFormData.duration_months)}
                  onValueChange={(value) => setEditFormData({ ...editFormData, duration_months: Number(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {durationOptions.map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={editFormData.status}
                  onValueChange={(value) => setEditFormData({ ...editFormData, status: value as ContractStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Expirado">Expirado</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Descrição</Label>
                <Input
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                />
              </div>
              <Button onClick={handleSaveEdit} className="w-full" disabled={updateContract.isPending}>
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
