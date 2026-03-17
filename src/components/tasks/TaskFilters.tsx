import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Search, X, Filter, CheckCircle2 } from 'lucide-react';
import { Client, Project, TaskStatus, TaskType, TaskPriority } from '@/types/database';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';

export interface TaskFiltersState {
  search: string;
  client_id: string;
  project_id: string;
  status: string;
  type: string;
  priority: string;
  overdueOnly: boolean;
  showCompleted: boolean;
  dateFrom: string;
  dateTo: string;
}

interface TaskFiltersProps {
  filters: TaskFiltersState;
  onFiltersChange: (filters: TaskFiltersState) => void;
  clients: Client[];
  projects: Project[];
}

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: 'A Fazer', label: 'A Fazer' },
  { value: 'Fazendo', label: 'Fazendo' },
  { value: 'Atrasado', label: 'Atrasado' },
  { value: 'Concluído', label: 'Concluído' },
];

const typeOptions: { value: TaskType; label: string }[] = [
  { value: 'Campanha', label: 'Campanha' },
  { value: 'Criativo', label: 'Criativo' },
  { value: 'Relatório', label: 'Relatório' },
  { value: 'Onboarding', label: 'Onboarding' },
  { value: 'Otimização', label: 'Otimização' },
  { value: 'Outro', label: 'Outro' },
];

const priorityOptions: { value: TaskPriority; label: string }[] = [
  { value: 'Baixa', label: 'Baixa' },
  { value: 'Média', label: 'Média' },
  { value: 'Alta', label: 'Alta' },
  { value: 'Urgente', label: 'Urgente' },
];

export function TaskFilters({ filters, onFiltersChange, clients, projects }: TaskFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = <K extends keyof TaskFiltersState>(key: K, value: TaskFiltersState[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      client_id: '',
      project_id: '',
      status: '',
      type: '',
      priority: '',
      overdueOnly: false,
      showCompleted: false,
      dateFrom: '',
      dateTo: '',
    });
  };

  const hasActiveFilters = 
    filters.client_id || 
    filters.project_id || 
    filters.status || 
    filters.type || 
    filters.priority || 
    filters.overdueOnly ||
    filters.dateFrom ||
    filters.dateTo;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por título..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border bg-background h-8">
          <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
          <Label htmlFor="showCompleted" className="text-xs cursor-pointer whitespace-nowrap">
            Concluídas
          </Label>
          <Switch
            id="showCompleted"
            checked={filters.showCompleted}
            onCheckedChange={(checked) => updateFilter('showCompleted', checked)}
            className="scale-75"
          />
        </div>

        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
            <Filter className="h-3.5 w-3.5" />
            Filtros
            {hasActiveFilters && (
              <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
            )}
          </Button>
        </CollapsibleTrigger>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 h-8 text-xs">
            <X className="h-3.5 w-3.5" />
            Limpar
          </Button>
        )}
      </div>

      <CollapsibleContent>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 p-3 bg-muted/30 rounded-lg border">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Cliente</Label>
            <Select value={filters.client_id} onValueChange={(v) => updateFilter('client_id', v)}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover">
                <SelectItem value="all">Todos</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Projeto</Label>
            <Select value={filters.project_id} onValueChange={(v) => updateFilter('project_id', v)}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover">
                <SelectItem value="all">Todos</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Status</Label>
            <Select value={filters.status} onValueChange={(v) => updateFilter('status', v)}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover">
                <SelectItem value="all">Todos</SelectItem>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Tipo</Label>
            <Select value={filters.type} onValueChange={(v) => updateFilter('type', v)}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover">
                <SelectItem value="all">Todos</SelectItem>
                {typeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Prioridade</Label>
            <Select value={filters.priority} onValueChange={(v) => updateFilter('priority', v)}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover">
                <SelectItem value="all">Todas</SelectItem>
                {priorityOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">De</Label>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => updateFilter('dateFrom', e.target.value)}
              className="h-7 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Até</Label>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => updateFilter('dateTo', e.target.value)}
              className="h-7 text-xs"
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
