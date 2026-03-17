import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { usePlanningChecklists, useCreateChecklist, useUpdateChecklist, useDeleteChecklist } from '@/hooks/usePlanning';

const DEFAULT_ITEMS = [
  { title: 'Pixel/tag instalado e testado', category: 'Tracking' },
  { title: 'Eventos de conversão configurados', category: 'Tracking' },
  { title: 'UTMs definidas', category: 'Tracking' },
  { title: 'Criativos aprovados', category: 'Criativos' },
  { title: 'Copys revisadas', category: 'Criativos' },
  { title: 'Landing page revisada', category: 'Landing Page' },
  { title: 'Formulário de lead testado', category: 'Landing Page' },
  { title: 'Públicos configurados', category: 'Campanha' },
  { title: 'Budget definido e aprovado', category: 'Campanha' },
  { title: 'Estrutura de campanha montada', category: 'Campanha' },
];

export function PlanningChecklistTab({ planningId }: { planningId: string }) {
  const { data: items = [] } = usePlanningChecklists(planningId);
  const createMutation = useCreateChecklist();
  const updateMutation = useUpdateChecklist();
  const deleteMutation = useDeleteChecklist();
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const completed = items.filter(i => i.is_completed).length;
  const total = items.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    await createMutation.mutateAsync({ title: newTitle.trim(), planning_id: planningId, position: items.length });
    setNewTitle('');
  };

  const handleAddDefaults = async () => {
    for (let i = 0; i < DEFAULT_ITEMS.length; i++) {
      await createMutation.mutateAsync({
        title: DEFAULT_ITEMS[i].title,
        category: DEFAULT_ITEMS[i].category,
        planning_id: planningId,
        position: items.length + i,
      });
    }
  };

  const toggleItem = (item: any) => {
    updateMutation.mutate({ id: item.id, planning_id: planningId, is_completed: !item.is_completed });
  };

  const startEdit = (item: any) => {
    setEditingId(item.id);
    setEditTitle(item.title);
  };

  const saveEdit = (item: any) => {
    if (editTitle.trim()) {
      updateMutation.mutate({ id: item.id, planning_id: planningId, title: editTitle.trim() });
    }
    setEditingId(null);
    setEditTitle('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  // Group by category
  const grouped = items.reduce((acc: Record<string, typeof items>, item) => {
    const cat = item.category || 'Geral';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Checklist Go Live</h3>
        {items.length === 0 && (
          <Button variant="outline" size="sm" onClick={handleAddDefaults} disabled={createMutation.isPending}>
            Adicionar checklist padrão
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{completed}/{total} concluídos</span>
            <span className="text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Novo item..." onKeyDown={e => e.key === 'Enter' && handleAdd()} />
        <Button size="sm" onClick={handleAdd} disabled={!newTitle.trim() || createMutation.isPending}><Plus className="w-4 h-4" /></Button>
      </div>

      {Object.entries(grouped).map(([category, categoryItems]) => (
        <div key={category} className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{category}</h4>
          {categoryItems.map(item => (
            <div key={item.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 group">
              <Checkbox checked={item.is_completed} onCheckedChange={() => toggleItem(item)} />
              {editingId === item.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <Input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(item); if (e.key === 'Escape') cancelEdit(); }}
                    className="h-7 text-sm"
                    autoFocus
                  />
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => saveEdit(item)}><Check className="w-3 h-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelEdit}><X className="w-3 h-3" /></Button>
                </div>
              ) : (
                <>
                  <span className={`flex-1 text-sm ${item.is_completed ? 'line-through text-muted-foreground' : ''}`}>{item.title}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => startEdit(item)}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                </>
              )}
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => deleteMutation.mutate({ id: item.id, planning_id: planningId })}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
