import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useClients, useUpdateClient } from '@/hooks/useClients';
import { useProjects } from '@/hooks/useProjects';
import { useContracts } from '@/hooks/useContracts';
import { useFinance } from '@/hooks/useFinance';
import { useTasks, TaskWithAssignees } from '@/hooks/useTasks';
import { usePlanningCampaigns, type PlanningStatus } from '@/hooks/usePlanning';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Building2, Mail, Phone, Calendar, DollarSign, Briefcase, FileText, TrendingUp, Plus, CheckSquare, Edit, MapPin, Pencil, UserPlus, Eye, Lightbulb, ExternalLink, FolderOpen, Megaphone } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ClientStatus, TaskStatus, TaskPriority, PersonType } from '@/types/database';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ContractFormDialog } from '@/components/clients/ContractFormDialog';
import { ProjectFormDialog } from '@/components/clients/ProjectFormDialog';
import { TaskFormDialog } from '@/components/clients/TaskFormDialog';
import { ClientFinanceDialog } from '@/components/clients/ClientFinanceDialog';
import { InviteClientDialog } from '@/components/clients/InviteClientDialog';
import { PortalAccessCard } from '@/components/clients/PortalAccessCard';

const statusColors: Record<ClientStatus, string> = {
  Lead: 'bg-muted text-muted-foreground',
  Ativo: 'bg-success/10 text-success',
  Pausado: 'bg-warning/10 text-warning',
  Cancelado: 'bg-destructive/10 text-destructive',
};

const statusLabels: Record<ClientStatus, string> = {
  Lead: 'Lead',
  Ativo: 'Ativo',
  Pausado: 'Pausado',
  Cancelado: 'Cancelado',
};

const financeStatusColors: Record<string, string> = {
  Pago: 'bg-success/10 text-success',
  Pendente: 'bg-warning/10 text-warning',
  Atrasado: 'bg-destructive/10 text-destructive',
};

const financeStatusLabels: Record<string, string> = {
  Pago: 'Pago',
  Pendente: 'Pendente',
  Atrasado: 'Atrasado',
};

const contractStatusColors: Record<string, string> = {
  Ativo: 'bg-success/10 text-success',
  Expirado: 'bg-muted text-muted-foreground',
  Cancelado: 'bg-destructive/10 text-destructive',
};

const contractStatusLabels: Record<string, string> = {
  Ativo: 'Ativo',
  Expirado: 'Expirado',
  Cancelado: 'Cancelado',
};

const taskStatusColors: Record<TaskStatus, string> = {
  'A Fazer': 'bg-muted text-muted-foreground',
  'Fazendo': 'bg-blue-500/10 text-blue-600',
  'Atrasado': 'bg-destructive/10 text-destructive',
  'Concluído': 'bg-success/10 text-success',
};

const taskPriorityColors: Record<TaskPriority, string> = {
  Baixa: 'bg-muted text-muted-foreground',
  Média: 'bg-blue-500/10 text-blue-600',
  Alta: 'bg-warning/10 text-warning',
  Urgente: 'bg-destructive/10 text-destructive',
};

const priorityLabels: Record<TaskPriority, string> = {
  Baixa: 'Baixa',
  Média: 'Média',
  Alta: 'Alta',
  Urgente: 'Urgente',
};

const planningStatusColors: Record<PlanningStatus, string> = {
  'Rascunho': 'bg-muted text-muted-foreground',
  'Em Aprovação': 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  'Pronto para Subir': 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  'Publicado': 'bg-green-500/15 text-green-700 dark:text-green-400',
  'Em Teste': 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  'Escalando': 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  'Pausado': 'bg-red-500/15 text-red-700 dark:text-red-400',
};

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { data: clients, isLoading: isLoadingClient } = useClients();
  const { data: projects, isLoading: isLoadingProjects } = useProjects();
  const { data: contracts, isLoading: isLoadingContracts } = useContracts();
  const { data: finance, isLoading: isLoadingFinance } = useFinance();
  const { data: tasks, isLoading: isLoadingTasks } = useTasks();
  const { data: plannings, isLoading: isLoadingPlannings } = usePlanningCampaigns();

  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [financeDialogOpen, setFinanceDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const updateClient = useUpdateClient();

  const [editForm, setEditForm] = useState({
    name: '', company: '', email: '', phone: '', status: 'Lead' as ClientStatus,
    fee: 0, person_type: 'pj' as PersonType, cnpj: '', cpf: '', rg: '', razao_social: '', inscricao_estadual: '',
    address: '', city: '', state: '', zip_code: '', drive_link: '', meta_ads_account: '', whatsapp_group_id: '',
  });

  const openEditDialog = () => {
    if (!client) return;
    setEditForm({
      name: client.name, company: client.company, email: client.email || '',
      phone: client.phone || '', status: client.status, fee: Number(client.fee),
      person_type: (client.person_type as PersonType) || 'pj',
      cnpj: client.cnpj || '', cpf: client.cpf || '', rg: client.rg || '',
      razao_social: client.razao_social || '', inscricao_estadual: client.inscricao_estadual || '',
      address: client.address || '', city: client.city || '',
      state: client.state || '', zip_code: client.zip_code || '',
      drive_link: (client as any).drive_link || '', meta_ads_account: (client as any).meta_ads_account || '',
      whatsapp_group_id: client.whatsapp_group_id || '',
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!client) return;
    await updateClient.mutateAsync({ id: client.id, ...editForm });
    setEditDialogOpen(false);
  };

  const client = clients?.find(c => c.id === id);
  const clientProjects = projects?.filter(p => p.client_id === id) || [];
  const clientContracts = contracts?.filter(c => c.client_id === id) || [];
  const clientFinance = finance?.filter(f => f.client_id === id) || [];
  const clientTasks = tasks?.filter(t => t.client_id === id) || [];
  const clientPlannings = plannings?.filter(p => p.client_id === id) || [];

  const isLoading = isLoadingClient || isLoadingProjects || isLoadingContracts || isLoadingFinance || isLoadingTasks || isLoadingPlannings;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </MainLayout>
    );
  }

  if (!client) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">Cliente não encontrado</p>
          <Button onClick={() => navigate('/clients')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Clientes
          </Button>
        </div>
      </MainLayout>
    );
  }

  const totalContractValue = clientContracts.reduce((sum, c) => sum + Number(c.value), 0);
  const totalRevenue = clientFinance
    .filter(f => f.type === 'Receita' && f.status === 'Pago')
    .reduce((sum, f) => sum + Number(f.amount), 0);
  const pendingRevenue = clientFinance
    .filter(f => f.type === 'Receita' && f.status === 'Pendente')
    .reduce((sum, f) => sum + Number(f.amount), 0);
  const pendingTasks = clientTasks.filter(t => t.status !== 'Concluído').length;

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/clients')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{client.name}</h1>
              <Badge className={statusColors[client.status]}>
                {statusLabels[client.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground truncate">{client.company}</p>
          </div>
          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button size="icon" variant="outline" onClick={() => navigate(`/portal?client_id=${client.id}`)} title="Ver Portal do Cliente">
              <Eye className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="outline" onClick={() => setInviteDialogOpen(true)} title="Convidar para o Portal">
              <UserPlus className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="outline" onClick={openEditDialog} title="Editar cliente">
              <Pencil className="w-4 h-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="outline" title="Adicionar">
                  <Plus className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setContractDialogOpen(true)}>
                  <FileText className="w-4 h-4 mr-2" />
                  Contrato
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setProjectDialogOpen(true)}>
                  <Briefcase className="w-4 h-4 mr-2" />
                  Projeto
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTaskDialogOpen(true)}>
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Tarefa
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFinanceDialogOpen(true)}>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Receita
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Client Info + Stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Empresa</p>
                  <p className="font-medium">{client.company}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <DollarSign className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fee Mensal</p>
                  <p className="font-medium">{formatCurrency(Number(client.fee))}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Receita Total</p>
                  <p className="font-medium">{formatCurrency(totalRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Calendar className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Início</p>
                  <p className="font-medium">{client.start_date ? formatDate(client.start_date) : 'Não definido'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contact Info */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Informações de Contato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{client.email || 'Não informado'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{client.phone || 'Não informado'}</span>
              </div>
              {client.person_type === 'pf' ? (
                <>
                  {client.cpf && (
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span>CPF: {client.cpf}</span>
                    </div>
                  )}
                  {client.rg && (
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span>RG: {client.rg}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {client.cnpj && (
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span>CNPJ: {client.cnpj}</span>
                    </div>
                  )}
                  {client.razao_social && (
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span>Razão Social: {client.razao_social}</span>
                    </div>
                  )}
                  {client.inscricao_estadual && (
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span>IE: {client.inscricao_estadual}</span>
                    </div>
                  )}
                </>
              )}
              {(client.address || client.city || client.state || client.zip_code) && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>
                    {[client.address, client.city, client.state, client.zip_code].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>
            {client.notes && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-1">Observações</p>
                <p>{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Access Links */}
        {((client as any).drive_link || (client as any).meta_ads_account) && (
          <div className="flex gap-3 flex-wrap">
            {(client as any).drive_link && (
              <Button variant="outline" asChild>
                <a href={(client as any).drive_link} target="_blank" rel="noopener noreferrer">
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Google Drive
                  <ExternalLink className="w-3 h-3 ml-2" />
                </a>
              </Button>
            )}
            {(client as any).meta_ads_account && (
              <Button variant="outline" asChild>
                <a href={`https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${(client as any).meta_ads_account.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                  <Megaphone className="w-4 h-4 mr-2" />
                  Meta Ads ({(client as any).meta_ads_account})
                  <ExternalLink className="w-3 h-3 ml-2" />
                </a>
              </Button>
            )}
          </div>
        )}

        {/* Portal Access Stats */}
        <PortalAccessCard clientId={id!} />

        {/* Plannings */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              Planejamentos ({clientPlannings.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {clientPlannings.length > 0 ? (
              <div className="overflow-x-auto"><Table className="min-w-[500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Plataforma</TableHead>
                    <TableHead>Objetivo</TableHead>
                    <TableHead>Orçamento</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientPlannings.map(p => (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/planning/${p.id}`)}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.platform}</TableCell>
                      <TableCell>{p.objective || '-'}</TableCell>
                      <TableCell>{formatCurrency(p.total_budget || 0)}</TableCell>
                      <TableCell>
                        <Badge className={planningStatusColors[p.status]} variant="secondary">
                          {p.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table></div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                Nenhum planejamento vinculado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contracts */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Contratos ({clientContracts.length})
              </CardTitle>
              {totalContractValue > 0 && (
                <span className="text-sm text-muted-foreground">
                  Total: {formatCurrency(totalContractValue)}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {clientContracts.length > 0 ? (
              <div className="overflow-x-auto"><Table className="min-w-[500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientContracts.map(contract => (
                    <TableRow key={contract.id}>
                      <TableCell>{contract.description || 'Contrato'}</TableCell>
                      <TableCell>{formatCurrency(Number(contract.value))}</TableCell>
                      <TableCell>{contract.duration_months} meses</TableCell>
                      <TableCell>{formatDate(contract.start_date)}</TableCell>
                      <TableCell>
                        <Badge className={contractStatusColors[contract.status]}>
                          {contractStatusLabels[contract.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table></div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                Nenhum contrato vinculado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Projects */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Projetos ({clientProjects.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {clientProjects.length > 0 ? (
              <div className="overflow-x-auto"><Table className="min-w-[500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Plataforma</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>KPI</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientProjects.map(project => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell>{project.platform}</TableCell>
                      <TableCell>{formatCurrency(Number(project.budget))}</TableCell>
                      <TableCell>{project.kpi || '-'}</TableCell>
                      <TableCell>
                        <Badge className={project.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}>
                          {project.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table></div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                Nenhum projeto vinculado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckSquare className="w-5 h-5" />
                Tarefas ({clientTasks.length})
              </CardTitle>
              {pendingTasks > 0 && (
                <span className="text-sm text-warning">
                  {pendingTasks} pendente{pendingTasks > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {clientTasks.length > 0 ? (
              <div className="overflow-x-auto"><Table className="min-w-[500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientTasks.map(task => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{task.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={taskPriorityColors[task.priority]}>
                          {priorityLabels[task.priority]}
                        </Badge>
                      </TableCell>
                      <TableCell>{task.due_date ? formatDate(task.due_date) : '-'}</TableCell>
                      <TableCell>
                        <Badge className={taskStatusColors[task.status]}>
                          {task.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table></div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                Nenhuma tarefa vinculada
              </div>
            )}
          </CardContent>
        </Card>

        {/* Finance */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Registros Financeiros ({clientFinance.length})
              </CardTitle>
              {pendingRevenue > 0 && (
                <span className="text-sm text-warning">
                  A receber: {formatCurrency(pendingRevenue)}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {clientFinance.length > 0 ? (
              <div className="overflow-x-auto"><Table className="min-w-[500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientFinance.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>{item.description || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {item.type === 'Receita' ? 'Receita' : 'Despesa'}
                        </Badge>
                      </TableCell>
                      <TableCell className={item.type === 'Receita' ? 'text-success' : 'text-destructive'}>
                        {item.type === 'Receita' ? '+' : '-'}{formatCurrency(Number(item.amount))}
                      </TableCell>
                      <TableCell>{formatDate(item.due_date)}</TableCell>
                      <TableCell>
                        <Badge className={financeStatusColors[item.status]}>
                          {financeStatusLabels[item.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table></div>
            ) : (
              <div className="p-6 text-center text-muted-foreground">
                Nenhum registro financeiro vinculado
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <ContractFormDialog
        open={contractDialogOpen}
        onOpenChange={setContractDialogOpen}
        clientId={id!}
      />
      <ProjectFormDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        clientId={id!}
      />
      <TaskFormDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        clientId={id!}
        projects={clientProjects}
      />
      <ClientFinanceDialog
        open={financeDialogOpen}
        onOpenChange={setFinanceDialogOpen}
        clientId={id!}
      />

      {/* Edit Client Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome</Label>
                <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <Label>Empresa</Label>
                <Input value={editForm.company} onChange={e => setEditForm({ ...editForm, company: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={(v: ClientStatus) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lead">Lead</SelectItem>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Pausado">Pausado</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fee Mensal</Label>
                <Input type="number" value={editForm.fee} onChange={e => setEditForm({ ...editForm, fee: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>Tipo de Pessoa</Label>
              <RadioGroup
                value={editForm.person_type}
                onValueChange={(v: PersonType) => setEditForm({ ...editForm, person_type: v })}
                className="flex gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pf" id="edit-pf" />
                  <Label htmlFor="edit-pf" className="cursor-pointer">Pessoa Física</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pj" id="edit-pj" />
                  <Label htmlFor="edit-pj" className="cursor-pointer">Pessoa Jurídica</Label>
                </div>
              </RadioGroup>
            </div>
            {editForm.person_type === 'pf' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>CPF</Label>
                  <Input value={editForm.cpf} onChange={e => setEditForm({ ...editForm, cpf: e.target.value })} placeholder="000.000.000-00" maxLength={14} />
                </div>
                <div>
                  <Label>RG</Label>
                  <Input value={editForm.rg} onChange={e => setEditForm({ ...editForm, rg: e.target.value })} placeholder="00.000.000-0" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>CNPJ</Label>
                  <Input value={editForm.cnpj} onChange={e => setEditForm({ ...editForm, cnpj: e.target.value })} placeholder="00.000.000/0000-00" maxLength={18} />
                </div>
                <div>
                  <Label>Razão Social</Label>
                  <Input value={editForm.razao_social} onChange={e => setEditForm({ ...editForm, razao_social: e.target.value })} placeholder="Razão social" />
                </div>
              </div>
            )}
            {editForm.person_type === 'pj' && (
              <div>
                <Label>Inscrição Estadual</Label>
                <Input value={editForm.inscricao_estadual} onChange={e => setEditForm({ ...editForm, inscricao_estadual: e.target.value })} placeholder="Inscrição estadual" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>CEP</Label>
                <Input value={editForm.zip_code} onChange={e => setEditForm({ ...editForm, zip_code: e.target.value })} placeholder="00000-000" maxLength={9} />
              </div>
            </div>
            <div>
              <Label>Endereço</Label>
              <Input value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} placeholder="Rua, número, complemento" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cidade</Label>
                <Input value={editForm.city} onChange={e => setEditForm({ ...editForm, city: e.target.value })} />
              </div>
              <div>
                <Label>Estado</Label>
                <Input value={editForm.state} onChange={e => setEditForm({ ...editForm, state: e.target.value })} placeholder="UF" maxLength={2} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Link do Drive</Label>
                <Input value={editForm.drive_link} onChange={e => setEditForm({ ...editForm, drive_link: e.target.value })} placeholder="https://drive.google.com/..." />
              </div>
              <div>
                <Label>Conta Meta Ads</Label>
                <Input value={editForm.meta_ads_account} onChange={e => setEditForm({ ...editForm, meta_ads_account: e.target.value })} placeholder="ID da conta de anúncio" />
              </div>
              <div>
                <Label>ID Grupo WhatsApp</Label>
                <Input value={editForm.whatsapp_group_id} onChange={e => setEditForm({ ...editForm, whatsapp_group_id: e.target.value })} placeholder="120363401557449318@g.us" />
              </div>
            </div>
            <Button onClick={handleEditSubmit} className="w-full" disabled={updateClient.isPending}>
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <InviteClientDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        clientId={client.id}
        clientName={client.name}
        clientEmail={client.email}
      />
    </MainLayout>
  );
}
