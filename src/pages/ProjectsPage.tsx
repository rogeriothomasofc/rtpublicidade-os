import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '@/hooks/useProjects';
import { useClients } from '@/hooks/useClients';
import { Project, PlatformType } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, MoreHorizontal, Trash2, Edit, FolderKanban } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const platformColors: Record<PlatformType, string> = {
  Meta: 'bg-blue-500/10 text-blue-600',
  Google: 'bg-red-500/10 text-red-600',
  TikTok: 'bg-pink-500/10 text-pink-600',
  LinkedIn: 'bg-sky-500/10 text-sky-600',
  Other: 'bg-muted text-muted-foreground',
};

export default function ProjectsPage() {
  const { data: projects, isLoading } = useProjects();
  const { data: clients } = useClients();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    client_id: '',
    platform: 'Meta' as PlatformType,
    budget: 0,
    kpi: '',
    is_active: true,
  });

  const filteredProjects = projects?.filter(project => 
    project.name.toLowerCase().includes(search.toLowerCase()) ||
    project.client?.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleSubmit = async () => {
    if (editingProject) {
      await updateProject.mutateAsync({ id: editingProject.id, ...formData });
    } else {
      await createProject.mutateAsync(formData);
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: '', client_id: '', platform: 'Meta', budget: 0, kpi: '', is_active: true });
    setEditingProject(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      client_id: project.client_id,
      platform: project.platform,
      budget: Number(project.budget),
      kpi: project.kpi || '',
      is_active: project.is_active,
    });
    setIsDialogOpen(true);
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Projetos</h1>
            <p className="text-muted-foreground">Gestão de contas e campanhas</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => resetForm()}>
                <Plus className="w-4 h-4" />
                Novo Projeto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingProject ? 'Editar Projeto' : 'Novo Projeto'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome do Projeto</Label>
                  <Input
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Campanha Black Friday"
                  />
                </div>
                <div>
                  <Label>Cliente</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.filter(c => c.status === 'Ativo').map(client => (
                        <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Plataforma</Label>
                    <Select
                      value={formData.platform}
                      onValueChange={(value: PlatformType) => setFormData({ ...formData, platform: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Meta">Meta</SelectItem>
                        <SelectItem value="Google">Google</SelectItem>
                        <SelectItem value="TikTok">TikTok</SelectItem>
                        <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                        <SelectItem value="Other">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Budget</Label>
                    <Input
                      type="number"
                      value={formData.budget}
                      onChange={e => setFormData({ ...formData, budget: Number(e.target.value) })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <Label>KPI Principal</Label>
                  <Input
                    value={formData.kpi}
                    onChange={e => setFormData({ ...formData, kpi: e.target.value })}
                    placeholder="Ex: CPA < R$ 50"
                  />
                </div>
                <Button onClick={handleSubmit} className="w-full" disabled={createProject.isPending || updateProject.isPending}>
                  {editingProject ? 'Salvar Alterações' : 'Criar Projeto'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar projetos..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-border/50">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            <Table className="min-w-[560px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>KPI</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map(project => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <p className="text-sm text-muted-foreground">{project.client?.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={platformColors[project.platform]}>{project.platform}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(Number(project.budget))}</TableCell>
                    <TableCell className="text-sm">{project.kpi || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={project.is_active ? 'default' : 'secondary'}>
                        {project.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(project)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteProject.mutate(project.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredProjects.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="p-0">
                      <EmptyState
                        icon={FolderKanban}
                        title={search ? 'Nenhum projeto encontrado' : 'Nenhum projeto cadastrado'}
                        description={search
                          ? 'Tente ajustar a busca.'
                          : 'Crie projetos vinculados a clientes para organizar campanhas e entregas.'}
                        actionLabel="+ Novo Projeto"
                        onAction={() => setIsDialogOpen(true)}
                        filtered={!!search}
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
