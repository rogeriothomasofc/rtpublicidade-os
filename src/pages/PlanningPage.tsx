import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreHorizontal, Eye, Copy, Trash2, CheckSquare, Pencil } from 'lucide-react';
import { usePlanningCampaigns, useDeletePlanningCampaign, useDuplicatePlanningCampaign, useUpdatePlanningCampaign, type PlanningCampaign, type PlanningStatus } from '@/hooks/usePlanning';
import { NewPlanningDialog } from '@/components/planning/NewPlanningDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const STATUS_OPTIONS: PlanningStatus[] = ['Rascunho', 'Em Aprovação', 'Pronto para Subir', 'Publicado', 'Em Teste', 'Escalando', 'Pausado'];

const statusColors: Record<PlanningStatus, string> = {
  'Rascunho': 'bg-muted text-muted-foreground',
  'Em Aprovação': 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  'Pronto para Subir': 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  'Publicado': 'bg-green-500/15 text-green-700 dark:text-green-400',
  'Em Teste': 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  'Escalando': 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  'Pausado': 'bg-red-500/15 text-red-700 dark:text-red-400',
};

export default function PlanningPage() {
  const navigate = useNavigate();
  const { data: campaigns = [], isLoading } = usePlanningCampaigns();
  const deleteMutation = useDeletePlanningCampaign();
  const duplicateMutation = useDuplicatePlanningCampaign();
  const updateMutation = useUpdatePlanningCampaign();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [editCampaign, setEditCampaign] = useState<PlanningCampaign | null>(null);

  const filtered = campaigns.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.client?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCreate = () => {
    setShowNewDialog(true);
  };

  const handleConvertToTask = async (campaign: typeof campaigns[0], e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dueDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
      const { error } = await supabase.from('tasks').insert({
        title: `Subir campanha: ${campaign.name}`,
        description: `Planejamento de campanha "${campaign.name}" na plataforma ${campaign.platform}.${campaign.objective ? ` Objetivo: ${campaign.objective}.` : ''}`,
        client_id: campaign.client_id,
        type: 'Campanha' as const,
        priority: 'Média' as const,
        status: 'A Fazer' as const,
        due_date: dueDate,
      });
      if (error) throw error;
      toast.success('Tarefa criada com sucesso!');
    } catch {
      toast.error('Erro ao criar tarefa');
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">
              Planejamentos
            </h1>
            <p className="text-muted-foreground text-sm">Planeje suas campanhas antes de subir</p>
          </div>
          <Button onClick={handleCreate} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Novo Planejamento
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Plataforma</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Atualizado</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum planejamento encontrado</TableCell></TableRow>
              ) : (
                filtered.map(c => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/planning/${c.id}`)}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.client?.name || '-'}</TableCell>
                    <TableCell>{c.platform}</TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Select value={c.status} onValueChange={(val) => updateMutation.mutate({ id: c.id, status: val as PlanningStatus })}>
                        <SelectTrigger className="h-7 w-auto border-none shadow-none px-0 hover:bg-muted/50">
                          <Badge className={statusColors[c.status]} variant="secondary">{c.status}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map(s => (
                            <SelectItem key={s} value={s}>
                              <Badge className={statusColors[s]} variant="secondary">{s}</Badge>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>R$ {(c.total_budget || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(c.updated_at), "dd/MM/yy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); navigate(`/planning/${c.id}`); }}>
                            <Eye className="w-4 h-4 mr-2" /> Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); setEditCampaign(c); setShowNewDialog(true); }}>
                            <Pencil className="w-4 h-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={e => { e.stopPropagation(); duplicateMutation.mutate(c.id); }}>
                            <Copy className="w-4 h-4 mr-2" /> Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={e => handleConvertToTask(c, e)}>
                            <CheckSquare className="w-4 h-4 mr-2" /> Criar tarefa
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={e => { e.stopPropagation(); deleteMutation.mutate(c.id); }}>
                            <Trash2 className="w-4 h-4 mr-2" /> Excluir
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

        <NewPlanningDialog open={showNewDialog} onOpenChange={(v) => { setShowNewDialog(v); if (!v) setEditCampaign(null); }} editCampaign={editCampaign} />
      </div>
    </MainLayout>
  );
}
