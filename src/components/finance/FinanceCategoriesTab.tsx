import { useState } from 'react';
import { useFinanceCategories, useCreateFinanceCategory, useUpdateFinanceCategory, useDeleteFinanceCategory } from '@/hooks/useFinanceCategories';
import { FinanceCategoryRecord } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, TrendingUp, TrendingDown, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { CategoryFormDialog } from './CategoryFormDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function FinanceCategoriesTab() {
  const { data: categories, isLoading } = useFinanceCategories();
  const createCategory = useCreateFinanceCategory();
  const updateCategory = useUpdateFinanceCategory();
  const deleteCategory = useDeleteFinanceCategory();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceCategoryRecord | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filtered = categories?.filter(c => typeFilter === 'all' || c.type === typeFilter) || [];
  const revenueCount = categories?.filter(c => c.type === 'Receita').length || 0;
  const expenseCount = categories?.filter(c => c.type === 'Despesa').length || 0;

  const handleSubmit = async (data: Omit<FinanceCategoryRecord, 'id' | 'created_at' | 'updated_at'>) => {
    if (editing) {
      await updateCategory.mutateAsync({ id: editing.id, ...data });
    } else {
      await createCategory.mutateAsync(data);
    }
    setEditing(null);
  };

  const handleEdit = (cat: FinanceCategoryRecord) => {
    setEditing(cat);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <CategoryFormDialog
        open={isDialogOpen}
        onOpenChange={(o) => { setIsDialogOpen(o); if (!o) setEditing(null); }}
        onSubmit={handleSubmit}
        isLoading={createCategory.isPending || updateCategory.isPending}
        editing={editing}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) { deleteCategory.mutate(deleteId); setDeleteId(null); } }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Filters + Action */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          <Badge
            variant={typeFilter === 'all' || typeFilter === 'Receita' ? 'default' : 'outline'}
            className={`cursor-pointer gap-1 ${typeFilter === 'Receita' ? 'bg-success/10 text-success' : ''}`}
            onClick={() => setTypeFilter(typeFilter === 'Receita' ? 'all' : 'Receita')}
          >
            <TrendingUp className="h-3 w-3" /> {revenueCount} Receitas
          </Badge>
          <Badge
            variant={typeFilter === 'Despesa' ? 'default' : 'outline'}
            className={`cursor-pointer gap-1 ${typeFilter === 'Despesa' ? 'bg-destructive/10 text-destructive' : ''}`}
            onClick={() => setTypeFilter(typeFilter === 'Despesa' ? 'all' : 'Despesa')}
          >
            <TrendingDown className="h-3 w-3" /> {expenseCount} Despesas
          </Badge>
        </div>
        <Button className="gap-2" onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          Nova Categoria
        </Button>
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Regras</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(cat => (
                <TableRow key={cat.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {cat.type === 'Receita' ? (
                        <TrendingUp className="h-4 w-4 text-success" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      )}
                      <span className="font-medium">{cat.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={cat.type === 'Receita' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}>
                      {cat.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="w-5 h-5 rounded-full" style={{ backgroundColor: cat.color }} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cat.is_active ? 'text-success border-success/30' : 'text-muted-foreground'}>
                      {cat.is_active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{cat.rules || '—'}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(cat)}><Pencil className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteId(cat.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {isLoading ? 'Carregando...' : 'Nenhuma categoria cadastrada'}
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
