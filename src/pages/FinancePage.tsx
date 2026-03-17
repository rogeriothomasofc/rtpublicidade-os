import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useFinance, useCreateFinance, useUpdateFinance, useDeleteFinance } from '@/hooks/useFinance';
import { useClients } from '@/hooks/useClients';
import { useBanks } from '@/hooks/useBanks';
import { Finance, FinanceStatus, FinanceRecurrence, FinanceType } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Search, CheckCircle, TrendingDown, TrendingUp, Pencil, Trash2, RefreshCw, MoreHorizontal, Wallet, CalendarDays, LayoutList, Building2, Tags, Receipt } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency, formatDate } from '@/lib/utils';
import { FinanceFormDialog } from '@/components/finance/FinanceFormDialog';
import { FinanceBanksTab } from '@/components/finance/FinanceBanksTab';
import { FinanceCategoriesTab } from '@/components/finance/FinanceCategoriesTab';
import { DateRangePickerDashboard } from '@/components/dashboard/DateRangePickerDashboard';
import { useDashboardFilters, PeriodPreset, DateRange } from '@/hooks/useDashboardFilters';
import { isWithinInterval, format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const statusColors: Record<FinanceStatus, string> = {
  Pago: 'bg-success/10 text-success',
  Pendente: 'bg-warning/10 text-warning',
  Atrasado: 'bg-destructive/10 text-destructive',
};

const typeColors: Record<string, string> = {
  Receita: 'bg-success/10 text-success',
  Despesa: 'bg-destructive/10 text-destructive',
};

const recurrenceLabels: Record<FinanceRecurrence, string> = {
  Nenhuma: '',
  Mensal: 'Mensal',
  Trimestral: 'Trimestral',
  Semestral: 'Semestral',
  Anual: 'Anual',
};

export default function FinancePage() {
  const { data: finance, isLoading } = useFinance();
  const { data: clients } = useClients();
  const { data: banks } = useBanks();
  const createFinance = useCreateFinance();
  const updateFinance = useUpdateFinance();
  const deleteFinance = useDeleteFinance();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showPaid, setShowPaid] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFinance, setEditingFinance] = useState<Finance | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [presetType, setPresetType] = useState<FinanceType | null>(null);

  const { preset, dateRange, setPreset, setDateRange } = useDashboardFilters();

  // Metrics
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const allFinance = finance || [];
  
  // Saldo total = all paid revenue - all paid expenses
  const totalBalance = allFinance.reduce((sum, f) => {
    if (f.status === 'Pago') {
      return sum + (f.type === 'Receita' ? Number(f.amount) : -Number(f.amount));
    }
    return sum;
  }, 0);

  // This month
  const thisMonthFinance = allFinance.filter(f => {
    const [y, m, d] = f.due_date.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return isWithinInterval(date, { start: monthStart, end: monthEnd });
  });

  const monthBalance = thisMonthFinance.reduce((sum, f) => {
    if (f.status === 'Pago') {
      return sum + (f.type === 'Receita' ? Number(f.amount) : -Number(f.amount));
    }
    return sum;
  }, 0);

  const monthEntradas = thisMonthFinance.filter(f => f.type === 'Receita' && f.status === 'Pago').reduce((sum, f) => sum + Number(f.amount), 0);
  const monthSaidas = thisMonthFinance.filter(f => f.type === 'Despesa' && f.status === 'Pago').reduce((sum, f) => sum + Number(f.amount), 0);

  const currentMonthLabel = format(now, "MMMM 'de' yyyy", { locale: ptBR });

  // Filtered finance for table
  const filteredFinance = allFinance.filter(f => {
    const matchesSearch = f.client?.name?.toLowerCase().includes(search.toLowerCase()) ||
      f.description?.toLowerCase().includes(search.toLowerCase()) ||
      f.category?.toLowerCase().includes(search.toLowerCase()) ||
      f.cost_center?.toLowerCase().includes(search.toLowerCase());

    let matchesStatus = true;
    if (statusFilter !== 'all') {
      matchesStatus = f.status === statusFilter;
    } else if (!showPaid) {
      matchesStatus = f.status !== 'Pago';
    }

    const matchesType = typeFilter === 'all' || f.type === typeFilter;

    const [year, month, day] = f.due_date.split('-').map(Number);
    const dueDate = new Date(year, month - 1, day);
    const matchesDateRange = isWithinInterval(dueDate, { start: dateRange.from, end: dateRange.to });

    return matchesSearch && matchesStatus && matchesType && matchesDateRange;
  });

  // Totals for footer
  const totalEntradas = filteredFinance.filter(f => f.type === 'Receita').reduce((sum, f) => sum + Number(f.amount), 0);
  const totalSaidas = filteredFinance.filter(f => f.type === 'Despesa').reduce((sum, f) => sum + Number(f.amount), 0);

  const handleSubmit = async (data: Omit<Finance, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingFinance) {
      await updateFinance.mutateAsync({ id: editingFinance.id, ...data });
    } else {
      await createFinance.mutateAsync(data);
    }
    setIsDialogOpen(false);
    setEditingFinance(null);
    setPresetType(null);
  };

  const handleEdit = (item: Finance) => {
    setEditingFinance(item);
    setPresetType(null);
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) { setEditingFinance(null); setPresetType(null); }
  };

  const openNewEntry = (type: FinanceType) => {
    setEditingFinance(null);
    setPresetType(type);
    setIsDialogOpen(true);
  };

  const markAsPaid = (id: string) => {
    updateFinance.mutate({ id, status: 'Pago', paid_date: new Date().toISOString().split('T')[0] });
  };

  const handleDelete = () => {
    if (deleteId) { deleteFinance.mutate(deleteId); setDeleteId(null); }
  };

  const getMonthPeriod = (dueDateStr: string) => {
    const [y, m] = dueDateStr.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return format(d, "MMMM 'de' yyyy", { locale: ptBR });
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Financeiro</h1>
            <p className="text-muted-foreground">Receitas, despesas e gestão financeira</p>
          </div>
          <DateRangePickerDashboard
            preset={preset}
            dateRange={dateRange}
            onPresetChange={setPreset}
            onCustomRangeChange={setDateRange}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button className="gap-2 bg-primary hover:bg-primary/90" onClick={() => openNewEntry('Receita')}>
            <TrendingUp className="w-4 h-4" />
            Entrada
          </Button>
          <Button variant="destructive" className="gap-2" onClick={() => openNewEntry('Despesa')}>
            <TrendingDown className="w-4 h-4" />
            Saída
          </Button>
        </div>

        <FinanceFormDialog
          open={isDialogOpen}
          onOpenChange={handleDialogClose}
          clients={clients || []}
          onSubmit={handleSubmit}
          isLoading={createFinance.isPending || updateFinance.isPending}
          editingFinance={editingFinance}
          presetType={presetType}
        />

        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-border/50">
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Saldo Total</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-2xl font-bold">{formatCurrency(totalBalance)}</span>
                <div className="p-2 rounded-lg bg-primary/10"><Wallet className="h-5 w-5 text-primary" /></div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Todas as contas</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Saldo do Mês</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-2xl font-bold">{monthBalance >= 0 ? '+' : ''}{formatCurrency(monthBalance)}</span>
                <div className="p-2 rounded-lg bg-primary/10"><CalendarDays className="h-5 w-5 text-primary" /></div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{currentMonthLabel}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Entradas</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-2xl font-bold text-success">+{formatCurrency(monthEntradas)}</span>
                <div className="p-2 rounded-lg bg-success/10"><TrendingUp className="h-5 w-5 text-success" /></div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Este mês</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Saídas</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-2xl font-bold text-destructive">-{formatCurrency(monthSaidas)}</span>
                <div className="p-2 rounded-lg bg-warning/10"><TrendingDown className="h-5 w-5 text-warning" /></div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Este mês</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="movimentacoes" className="space-y-4">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="movimentacoes" className="gap-2">
              <LayoutList className="h-4 w-4" />
              Movimentações
            </TabsTrigger>
            <TabsTrigger value="bancos" className="gap-2">
              <Building2 className="h-4 w-4" />
              Bancos
            </TabsTrigger>
            <TabsTrigger value="categorias" className="gap-2">
              <Tags className="h-4 w-4" />
              Categorias
            </TabsTrigger>
          </TabsList>

          {/* Movimentações Tab */}
          <TabsContent value="movimentacoes" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar por cliente ou categoria..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-background">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="showPaid" className="text-sm cursor-pointer whitespace-nowrap">Pagos</Label>
                <Switch id="showPaid" checked={showPaid} onCheckedChange={setShowPaid} />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Receita">Receita</SelectItem>
                  <SelectItem value="Despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Atrasado">Atrasado</SelectItem>
                  <SelectItem value="Pago">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <Card className="border-border/50">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Cliente / Banco</TableHead>
                      <TableHead>Recorrência</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFinance.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <Badge className={typeColors[item.type]} variant="secondary">
                                {item.type === 'Receita' ? (
                                  <TrendingUp className="w-3 h-3" />
                                ) : (
                                  <TrendingDown className="w-3 h-3" />
                                )}
                              </Badge>
                              <span className="font-medium text-sm">{item.description || item.category || '-'}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{item.category || '—'}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            {item.client?.name && <span className="text-sm">{item.client.name}</span>}
                            {item.bank?.name && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Building2 className="w-3 h-3" />{item.bank.name}
                              </span>
                            )}
                            {!item.client?.name && !item.bank?.name && '—'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.recurrence && item.recurrence !== 'Nenhuma' ? (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <RefreshCw className="w-3 h-3" />
                              {recurrenceLabels[item.recurrence]}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Única</span>
                          )}
                        </TableCell>
                        <TableCell className={`font-medium ${item.type === 'Despesa' ? 'text-destructive' : 'text-success'}`}>
                          {item.type === 'Despesa' ? '-' : '+'}{formatCurrency(Number(item.amount))}
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(item.due_date)}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[item.status]}>{item.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(item)}>
                                <Pencil className="h-4 w-4 mr-2" />Editar
                              </DropdownMenuItem>
                              {item.status !== 'Pago' && (
                                <DropdownMenuItem onClick={() => markAsPaid(item.id)}>
                                  <CheckCircle className="h-4 w-4 mr-2" />Marcar como Pago
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => setDeleteId(item.id)} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredFinance.length === 0 && !isLoading && (
                      <TableRow>
                        <TableCell colSpan={8} className="p-0">
                          <EmptyState
                            icon={Receipt}
                            title={search || statusFilter !== 'all' || typeFilter !== 'all' ? 'Nenhum lançamento encontrado' : 'Nenhum lançamento cadastrado'}
                            description={search || statusFilter !== 'all' || typeFilter !== 'all'
                              ? 'Tente ajustar os filtros ou a busca.'
                              : 'Registre receitas e despesas para controlar o financeiro da agência.'}
                            actionLabel="+ Novo Lançamento"
                            onAction={() => setIsDialogOpen(true)}
                            filtered={!!(search || statusFilter !== 'all' || typeFilter !== 'all')}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </div>
                {/* Footer summary */}
                {filteredFinance.length > 0 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 text-sm">
                    <span className="text-muted-foreground">{filteredFinance.length} movimentação(ões)</span>
                    <div className="flex gap-6">
                      <span>Entradas: <span className="text-success font-medium">+{formatCurrency(totalEntradas)}</span></span>
                      <span>Saídas: <span className="text-destructive font-medium">-{formatCurrency(totalSaidas)}</span></span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bancos Tab */}
          <TabsContent value="bancos">
            <FinanceBanksTab />
          </TabsContent>

          {/* Categorias Tab */}
          <TabsContent value="categorias">
            <FinanceCategoriesTab />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
