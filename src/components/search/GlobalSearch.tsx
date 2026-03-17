import { useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useNavigate } from 'react-router-dom';
import { Users, CheckSquare, TrendingUp, FileText, FileCheck } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useClients } from '@/hooks/useClients';
import { useTasks } from '@/hooks/useTasks';
import { useSalesPipeline } from '@/hooks/useSalesPipeline';
import { useContracts } from '@/hooks/useContracts';
import { useProposals } from '@/hooks/useProposals';
import { Badge } from '@/components/ui/badge';

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_COLORS: Record<string, string> = {
  Ativo: 'bg-success/10 text-success border-success/20',
  Lead: 'bg-muted text-muted-foreground border-border',
  Pausado: 'bg-warning/10 text-warning border-warning/20',
  Cancelado: 'bg-destructive/10 text-destructive border-destructive/20',
  'A Fazer': 'bg-muted text-muted-foreground border-border',
  Fazendo: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Atrasado: 'bg-destructive/10 text-destructive border-destructive/20',
  Concluído: 'bg-success/10 text-success border-success/20',
  Ganho: 'bg-success/10 text-success border-success/20',
  Perdido: 'bg-destructive/10 text-destructive border-destructive/20',
};

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  const { data: clients } = useClients();
  const { data: tasks } = useTasks();
  const { data: leads } = useSalesPipeline();
  const { data: contracts } = useContracts();
  const { data: proposals } = useProposals();

  // Use debounced value for filtering; raw `query` drives the input display and hint guards
  const q = debouncedQuery.toLowerCase().trim();

  const filteredClients = q.length >= 2
    ? (clients || []).filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
      ).slice(0, 4)
    : [];

  const filteredTasks = q.length >= 2
    ? (tasks || []).filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.client?.name.toLowerCase().includes(q)
      ).slice(0, 4)
    : [];

  const filteredLeads = q.length >= 2
    ? (leads || []).filter(l =>
        l.lead_name.toLowerCase().includes(q) ||
        l.company?.toLowerCase().includes(q)
      ).slice(0, 3)
    : [];

  const filteredContracts = q.length >= 2
    ? (contracts || []).filter((c: any) =>
        c.client?.name.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
      ).slice(0, 3)
    : [];

  const filteredProposals = q.length >= 2
    ? (proposals || []).filter((p: any) =>
        p.company?.toLowerCase().includes(q) ||
        p.segment?.toLowerCase().includes(q)
      ).slice(0, 3)
    : [];

  const hasResults =
    filteredClients.length > 0 ||
    filteredTasks.length > 0 ||
    filteredLeads.length > 0 ||
    filteredContracts.length > 0 ||
    filteredProposals.length > 0;

  const runAndClose = (fn: () => void) => {
    fn();
    onOpenChange(false);
    setQuery('');
  };

  return (
    <CommandDialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setQuery(''); }}>
      <CommandInput
        placeholder="Buscar clientes, tarefas, leads, contratos..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {query.length >= 2 && q.length >= 2 && !hasResults && (
          <CommandEmpty>Nenhum resultado para "{query}"</CommandEmpty>
        )}
        {query.length < 2 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Digite pelo menos 2 caracteres para buscar
          </div>
        )}

        {filteredClients.length > 0 && (
          <CommandGroup heading="Clientes">
            {filteredClients.map(client => (
              <CommandItem
                key={client.id}
                value={`client-${client.id}-${client.name}`}
                onSelect={() => runAndClose(() => navigate(`/clients/${client.id}`))}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{client.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{client.company}</p>
                  </div>
                </div>
                <Badge variant="outline" className={`text-xs flex-shrink-0 ${STATUS_COLORS[client.status] || ''}`}>
                  {client.status}
                </Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {filteredTasks.length > 0 && (
          <>
            {filteredClients.length > 0 && <CommandSeparator />}
            <CommandGroup heading="Tarefas">
              {filteredTasks.map(task => (
                <CommandItem
                  key={task.id}
                  value={`task-${task.id}-${task.title}`}
                  onSelect={() => runAndClose(() => navigate('/tasks'))}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      {task.client && (
                        <p className="text-xs text-muted-foreground truncate">{task.client.name}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-xs flex-shrink-0 ${STATUS_COLORS[task.status] || ''}`}>
                    {task.status}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {filteredLeads.length > 0 && (
          <>
            {(filteredClients.length > 0 || filteredTasks.length > 0) && <CommandSeparator />}
            <CommandGroup heading="Pipeline">
              {filteredLeads.map(lead => (
                <CommandItem
                  key={lead.id}
                  value={`lead-${lead.id}-${lead.lead_name}`}
                  onSelect={() => runAndClose(() => navigate('/pipeline'))}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-pink-500/10 flex items-center justify-center">
                      <TrendingUp className="w-3.5 h-3.5 text-pink-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{lead.lead_name}</p>
                      {lead.company && (
                        <p className="text-xs text-muted-foreground truncate">{lead.company}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-xs flex-shrink-0 ${STATUS_COLORS[lead.stage] || ''}`}>
                    {lead.stage}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {filteredContracts.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Contratos">
              {filteredContracts.map((contract: any) => (
                <CommandItem
                  key={contract.id}
                  value={`contract-${contract.id}`}
                  onSelect={() => runAndClose(() => navigate('/contracts'))}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{contract.client?.name || 'Contrato'}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {contract.description || `Desde ${contract.start_date?.slice(0, 10)}`}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-xs flex-shrink-0 ${STATUS_COLORS[contract.status] || ''}`}>
                    {contract.status}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {filteredProposals.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Propostas">
              {filteredProposals.map((proposal: any) => (
                <CommandItem
                  key={proposal.id}
                  value={`proposal-${proposal.id}`}
                  onSelect={() => runAndClose(() => navigate('/proposals'))}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <FileCheck className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{proposal.company || 'Proposta'}</p>
                      <p className="text-xs text-muted-foreground truncate">{proposal.segment || proposal.plan_type || ''}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    {proposal.status}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>

      <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground">
        <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↑↓</kbd> navegar</span>
        <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↵</kbd> abrir</span>
        <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Esc</kbd> fechar</span>
      </div>
    </CommandDialog>
  );
}
