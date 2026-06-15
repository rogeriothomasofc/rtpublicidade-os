import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '@/hooks/useProjects';
import { useClients } from '@/hooks/useClients';
import { Project, PlatformType } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Search, MoreHorizontal, Trash2, Edit, FolderKanban, DollarSign, Activity, CalendarCheck } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const PLATFORMS: PlatformType[] = ['Meta', 'Google', 'TikTok', 'LinkedIn', 'Other'];

const platformColors: Record<PlatformType, string> = {
  Meta:     'bg-blue-500/10 text-blue-500',
  Google:   'bg-red-500/10 text-red-500',
  TikTok:   'bg-pink-500/10 text-pink-500',
  LinkedIn: 'bg-sky-500/10 text-sky-500',
  Other:    'bg-muted text-muted-foreground',
};

const defaultForm = {
  name: '',
  client_id: '',
  platform: 'Meta' as PlatformType,
  budget: 0,
  kpi: '',
  review_date: '',
  is_active: true,
};

export default function ProjectsPage() {
  const { data: projects, isLoading } = useProjects();
  const { data: clients } = useClients();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState(defaultForm);

  const allProjects = projects || [];

  const filtered = allProjects.filter(p => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.client?.name?.toLowerCase().includes(search.toLowerCase());
    const matchPlatform = platformFilter === 'all' || p.platform === platformFilter;
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'ativo' && p.is_active) ||
      (statusFilter === 'inativo' && !p.is_active);
    return matchSearch && matchPlatform && matchStatus;
  });

  // Metrics
  const activeCount = allProjects.filter(p => p.is_active).length;
  const totalBudget = allProjects.filter(p => p.is_active).reduce((s, p) => s + Number(p.budget), 0);
  const reviewingSoon = allProjects.filter(p => {
    if (!p.review_date || !p.is_active) return false;
    const days = Math.ceil((new Date(p.review_date + 'T12:00:00').getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 14;
  }).length;

  const openNew = () => {
    setEditingProject(null);
    setFormData(defaultForm);
    setIsDialogOpen(true);
  };

  const openEdit = (p: Project) => {
    setEditingProject(p);
    setFormData({
      name: p.name,
      client_id: p.client_id,
      platform: p.platform,
      budget: Number(p.budget),
      kpi: p.kpi || '',
      review_date: p.review_date || '',
      is_active: p.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    const payload = {
      ...formData,
      review_date: formData.review_date || null,
    };
    if (editingProject) {
      await updateProject.mutateAsync({ id: editingProject.id, ...payload });
    } else {
      await createProject.mutateAsync(payload);
    }
    setIsDialogOpen(false);
    setEditingProject(null);
    setFormData(defaultForm);
  };

  const toggleActive = (p: Project) => {
    updateProject.mutate({ id: p.id, is_active: !p.is_active });
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">

        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCard title="Total de Projetos" value={allProjects.length} icon={FolderKanban} variant="default" />
          <MetricCard title="Projetos Ativos" value={activeCount} icon={Activity} variant="primary" />
          <MetricCard title="Budget Total (ativos)" value={formatCurrency(totalBudget)} icon={DollarSign} variant="success" />
          <MetricCard title="Revisão em 14 dias" value={reviewingSoon} icon={CalendarCheck} variant="default"
            description={reviewingSoon > 0 ? 'Revisar em breve' : 'Nenhum agendado'} />
        </div>

        {/* Filters + Button */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar projeto ou cliente..." value={search}
              onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Plataforma" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="inativo">Inativos</SelectItem>
            </SelectContent>
          </Select>
          <Button className="gap-2 shrink-0" onClick={openNew}>
            <Plus className="w-4 h-4" />Novo Projeto
          </Button>
        </div>

        {/* Table */}
        <Card className="border-border/50">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Plataforma</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>KPI</TableHead>
                    <TableHead>Revisão</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(p => (
                    <TableRow key={p.id} className={!p.is_active ? 'opacity-50' : ''}>
                      <TableCell>
                        <p className="font-medium text-sm">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.client?.name}</p>
                      </TableCell>
                      <TableCell>
                        <Badge className={platformColors[p.platform]}>{p.platform}</Badge>
                      </TableCell>
                      <TableCell className="font-medium text-sm">{formatCurrency(Number(p.budget))}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.kpi || '—'}</TableCell>
                      <TableCell className="text-sm">
                        {p.review_date ? (
                          <span className={(() => {
                            const days = Math.ceil((new Date(p.review_date + 'T12:00:00').getTime() - Date.now()) / 86400000);
                            if (days < 0) return 'text-destructive';
                            if (days <= 14) return 'text-warning';
                            return 'text-muted-foreground';
                          })()}>
                            {formatDate(p.review_date)}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={p.is_active}
                          onCheckedChange={() => toggleActive(p)}
                          className="scale-90"
                        />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(p)}>
                              <Edit className="w-4 h-4 mr-2" />Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(p.id)}>
                              <Trash2 className="w-4 h-4 mr-2" />Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={7} className="p-0">
                        <EmptyState
                          icon={FolderKanban}
                          title={search || platformFilter !== 'all' || statusFilter !== 'all'
                            ? 'Nenhum projeto encontrado' : 'Nenhum projeto cadastrado'}
                          description={search || platformFilter !== 'all' || statusFilter !== 'all'
                            ? 'Tente ajustar os filtros.' : 'Crie projetos vinculados a clientes para organizar campanhas.'}
                          actionLabel="+ Novo Projeto"
                          onAction={openNew}
                          filtered={!!(search || platformFilter !== 'all' || statusFilter !== 'all')}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Form Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingProject(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProject ? 'Editar Projeto' : 'Novo Projeto'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nome do Projeto *</Label>
                <Input value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Campanha Black Friday" />
              </div>
              <div className="space-y-1.5">
                <Label>Cliente *</Label>
                <Select value={formData.client_id} onValueChange={v => setFormData({ ...formData, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                  <SelectContent>
                    {clients?.filter(c => c.status === 'Ativo').map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Plataforma</Label>
                  <Select value={formData.platform} onValueChange={(v: PlatformType) => setFormData({ ...formData, platform: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Budget (R$)</Label>
                  <Input type="number" value={formData.budget || ''}
                    onChange={e => setFormData({ ...formData, budget: Number(e.target.value) })}
                    placeholder="0,00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>KPI Principal</Label>
                  <Input value={formData.kpi}
                    onChange={e => setFormData({ ...formData, kpi: e.target.value })}
                    placeholder="Ex: CPA < R$ 50" />
                </div>
                <div className="space-y-1.5">
                  <Label>Data de Revisão</Label>
                  <Input type="date" value={formData.review_date}
                    onChange={e => setFormData({ ...formData, review_date: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <Switch checked={formData.is_active}
                  onCheckedChange={v => setFormData({ ...formData, is_active: v })} />
                <Label className="cursor-pointer">{formData.is_active ? 'Projeto ativo' : 'Projeto inativo'}</Label>
              </div>
              <Button onClick={handleSubmit} className="w-full"
                disabled={!formData.name || !formData.client_id || createProject.isPending || updateProject.isPending}>
                {createProject.isPending || updateProject.isPending ? 'Salvando...' : editingProject ? 'Salvar Alterações' : 'Criar Projeto'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => { if (deleteId) { deleteProject.mutate(deleteId); setDeleteId(null); } }}>
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </MainLayout>
  );
}
