import { useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useClients, useCreateClient, useUpdateClient, useDeleteClient, createOnboardingParentTask, ONBOARDING_SUBTASKS } from '@/hooks/useClients';
import { useCreateTask } from '@/hooks/useTasks';
import { useCreateManySubtasks } from '@/hooks/useSubtasks';
import { Client, ClientStatus, PersonType } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, MoreHorizontal, Trash2, Edit, Eye, Users2, Loader2 } from 'lucide-react';
import { useCepLookup } from '@/hooks/useCepLookup';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const statusColors: Record<ClientStatus, string> = {
  Lead: 'bg-muted text-muted-foreground',
  Ativo: 'bg-success/10 text-success',
  Pausado: 'bg-warning/10 text-warning',
  Cancelado: 'bg-destructive/10 text-destructive',
};

function genPassword() {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#';
  let pwd = '';
  for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

export default function ClientsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: clients, isLoading } = useClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const createTask = useCreateTask();
  const createSubtasks = useCreateManySubtasks();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  const { handleCepChange, loadingCep } = useCepLookup();

  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    status: 'Lead' as ClientStatus,
    fee: 0,
    person_type: 'pj' as PersonType,
    cnpj: '',
    cpf: '',
    rg: '',
    razao_social: '',
    inscricao_estadual: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    whatsapp_group_id: '',
  });

  const filteredClients = clients?.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      client.company.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const handleSubmit = async () => {
    if (editingClient) {
      await updateClient.mutateAsync({ id: editingClient.id, ...formData });
    } else {
      const newClient = await createClient.mutateAsync({
        ...formData,
        start_date: formData.status === 'Ativo' ? new Date().toISOString().split('T')[0] : undefined,
      });
      
      // Create onboarding parent task with subtasks for new clients
      if (newClient) {
        const parentTask = createOnboardingParentTask(newClient.id, newClient.name);
        const createdTask = await createTask.mutateAsync(parentTask);
        await createSubtasks.mutateAsync({
          taskId: createdTask.id,
          titles: ONBOARDING_SUBTASKS
        });

        // Auto-send portal access if client has email
        if (newClient.email) {
          const pwd = genPassword();
          const { data, error } = await supabase.functions.invoke('invite-client', {
            body: { client_id: newClient.id, email: newClient.email, password: pwd },
          });
          if (error || data?.error) {
            toast({ title: 'Cliente criado', description: 'Não foi possível enviar o acesso automaticamente. Envie manualmente na página do cliente.', variant: 'destructive' });
          } else {
            const emailNote = data?.email_sent ? 'Email de acesso enviado!' : `Senha temporária: ${pwd}`;
            toast({ title: 'Cliente criado com acesso ao portal!', description: emailNote });
          }
        }
      }
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: '', company: '', email: '', phone: '', status: 'Lead', fee: 0, person_type: 'pj', cnpj: '', cpf: '', rg: '', razao_social: '', inscricao_estadual: '', address: '', city: '', state: '', zip_code: '', whatsapp_group_id: '' });
    setEditingClient(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      company: client.company,
      email: client.email || '',
      phone: client.phone || '',
      status: client.status,
      fee: Number(client.fee),
      person_type: (client.person_type as PersonType) || 'pj',
      cnpj: client.cnpj || '',
      cpf: client.cpf || '',
      rg: client.rg || '',
      razao_social: client.razao_social || '',
      inscricao_estadual: client.inscricao_estadual || '',
      address: client.address || '',
      city: client.city || '',
      state: client.state || '',
      zip_code: client.zip_code || '',
      whatsapp_group_id: client.whatsapp_group_id || '',
    });
    setIsDialogOpen(true);
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-end">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => resetForm()}>
                <Plus className="w-4 h-4" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nome</Label>
                    <Input
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome do contato"
                    />
                  </div>
                  <div>
                    <Label>Empresa</Label>
                    <Input
                      value={formData.company}
                      onChange={e => setFormData({ ...formData, company: e.target.value })}
                      placeholder="Nome da empresa"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: ClientStatus) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
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
                    <Input
                      type="number"
                      value={formData.fee}
                      onChange={e => setFormData({ ...formData, fee: Number(e.target.value) })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <Label>Tipo de Pessoa</Label>
                  <RadioGroup
                    value={formData.person_type}
                    onValueChange={(v: PersonType) => setFormData({ ...formData, person_type: v })}
                    className="flex gap-4 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pf" id="pf" />
                      <Label htmlFor="pf" className="cursor-pointer">Pessoa Física</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pj" id="pj" />
                      <Label htmlFor="pj" className="cursor-pointer">Pessoa Jurídica</Label>
                    </div>
                  </RadioGroup>
                </div>
                {formData.person_type === 'pf' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>CPF</Label>
                      <Input
                        value={formData.cpf}
                        onChange={e => setFormData({ ...formData, cpf: e.target.value })}
                        placeholder="000.000.000-00"
                        maxLength={14}
                      />
                    </div>
                    <div>
                      <Label>RG</Label>
                      <Input
                        value={formData.rg}
                        onChange={e => setFormData({ ...formData, rg: e.target.value })}
                        placeholder="00.000.000-0"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>CNPJ</Label>
                      <Input
                        value={formData.cnpj}
                        onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
                        placeholder="00.000.000/0000-00"
                        maxLength={18}
                      />
                    </div>
                    <div>
                      <Label>Razão Social</Label>
                      <Input
                        value={formData.razao_social}
                        onChange={e => setFormData({ ...formData, razao_social: e.target.value })}
                        placeholder="Razão social da empresa"
                      />
                    </div>
                  </div>
                )}
                {formData.person_type === 'pj' && (
                  <div>
                    <Label>Inscrição Estadual</Label>
                    <Input
                      value={formData.inscricao_estadual}
                      onChange={e => setFormData({ ...formData, inscricao_estadual: e.target.value })}
                      placeholder="Inscrição estadual"
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>CEP</Label>
                    <div className="relative">
                      <Input
                        value={formData.zip_code}
                        onChange={e => handleCepChange(e.target.value, setFormData)}
                        placeholder="00000-000"
                        maxLength={9}
                      />
                      {loadingCep && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
                    </div>
                  </div>
                </div>
                <div>
                  <Label>Endereço</Label>
                  <Input
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Rua, número, complemento"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Cidade</Label>
                    <Input
                      value={formData.city}
                      onChange={e => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Cidade"
                    />
                  </div>
                  <div>
                    <Label>Estado</Label>
                    <Input
                      value={formData.state}
                      onChange={e => setFormData({ ...formData, state: e.target.value })}
                      placeholder="UF"
                      maxLength={2}
                    />
                  </div>
                </div>
                <Button onClick={handleSubmit} className="w-full" disabled={createClient.isPending || updateClient.isPending}>
                  {editingClient ? 'Salvar Alterações' : 'Criar Cliente'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar clientes..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Lead">Lead</SelectItem>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Pausado">Pausado</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-border/50">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            <Table className="min-w-[540px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map(client => (
                  <TableRow 
                    key={client.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-sm text-muted-foreground">{client.company}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[client.status]}>{client.status}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(Number(client.fee))}</TableCell>
                    <TableCell>{client.start_date ? formatDate(client.start_date) : '-'}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/clients/${client.id}`)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(client)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteClient.mutate(client.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredClients.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="p-0">
                      <EmptyState
                        icon={Users2}
                        title={debouncedSearch || statusFilter !== 'all' ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
                        description={debouncedSearch || statusFilter !== 'all'
                          ? 'Tente ajustar os filtros ou a busca.'
                          : 'Adicione seu primeiro cliente para começar a gerenciar a carteira.'}
                        actionLabel="+ Adicionar Cliente"
                        onAction={() => setIsDialogOpen(true)}
                        filtered={!!(debouncedSearch || statusFilter !== 'all')}
                      />
                    </TableCell>
                  </TableRow>
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
