import { useState } from 'react';
import { useBanks, useCreateBank, useUpdateBank, useDeleteBank } from '@/hooks/useBanks';
import { Bank } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Wallet, Building2, MoreHorizontal, Pencil, Trash2, Zap } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { BankFormDialog } from './BankFormDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAsaasBalance } from '@/hooks/useAsaas';
import { useIntegrations } from '@/hooks/useIntegrations';

export function FinanceBanksTab() {
  const { data: banks, isLoading } = useBanks();
  const createBank = useCreateBank();
  const updateBank = useUpdateBank();
  const deleteBank = useDeleteBank();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Bank | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: integrations } = useIntegrations();
  const asaasConnected = integrations?.find(i => i.provider === 'asaas')?.status === 'connected';
  const { data: asaasBalance, isLoading: loadingAsaas } = useAsaasBalance(asaasConnected);

  const activeBanks = banks?.filter(b => b.status === 'Ativo') || [];
  const totalBalance = activeBanks.reduce((sum, b) => sum + Number(b.balance), 0) + (asaasBalance ?? 0);

  const handleSubmit = async (data: Omit<Bank, 'id' | 'created_at' | 'updated_at'>) => {
    if (editing) {
      await updateBank.mutateAsync({ id: editing.id, ...data });
    } else {
      await createBank.mutateAsync(data);
    }
    setEditing(null);
  };

  const handleEdit = (bank: Bank) => {
    setEditing(bank);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <BankFormDialog
        open={isDialogOpen}
        onOpenChange={(o) => { setIsDialogOpen(o); if (!o) setEditing(null); }}
        onSubmit={handleSubmit}
        isLoading={createBank.isPending || updateBank.isPending}
        editing={editing}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir banco?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) { deleteBank.mutate(deleteId); setDeleteId(null); } }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Saldo Total</p>
            <div className="flex items-center gap-2 mt-1">
              <Wallet className="h-5 w-5 text-primary" />
              <span className="text-xl font-bold text-primary">{formatCurrency(totalBalance)}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Contas Ativas</p>
            <div className="flex items-center gap-2 mt-1">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <span className="text-xl font-bold">{activeBanks.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 flex items-center justify-center">
          <CardContent className="p-5">
            <Button className="gap-2" onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4" />
              Adicionar Banco
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Banco</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Observações</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {asaasConnected && (
                <TableRow className="bg-primary/5">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      <span className="font-medium">Asaas</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">Conta Digital</TableCell>
                  <TableCell className="font-medium text-primary">
                    {loadingAsaas ? '...' : formatCurrency(asaasBalance ?? 0)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-success border-success/30">Ativo</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">Sincronizado via API</TableCell>
                  <TableCell />
                </TableRow>
              )}
              {banks?.map(bank => (
                <TableRow key={bank.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-primary" />
                      <span className="font-medium">{bank.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{bank.type}</TableCell>
                  <TableCell className="font-medium text-primary">{formatCurrency(Number(bank.balance))}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={bank.status === 'Ativo' ? 'text-success border-success/30' : 'text-muted-foreground'}>
                      {bank.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{bank.notes || '—'}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(bank)}><Pencil className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteId(bank.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {(!banks || banks.length === 0) && !asaasConnected && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {isLoading ? 'Carregando...' : 'Nenhum banco cadastrado'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
