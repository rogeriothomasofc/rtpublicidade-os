# Arquitetura — RT Publicidade OS

## Visão Geral

Sistema de gestão operacional para agência de marketing digital, construído com:

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Lovable Cloud (Supabase) — PostgreSQL, Auth, Edge Functions, Storage
- **Estado**: TanStack Query (cache, invalidação, refetch)

## Fluxo de Dados

```
┌──────────────┐    ┌────────────────┐    ┌──────────────┐
│   React UI   │◄──►│ TanStack Query │◄──►│  Supabase    │
│  (Pages +    │    │  (Cache +      │    │  (PostgreSQL │
│  Components) │    │  Mutations)    │    │  + RLS)      │
└──────────────┘    └────────────────┘    └──────────────┘
```

### Camadas

1. **Pages** (`src/pages/`) — Composição de layout + dados
2. **Components** (`src/components/`) — UI pura, recebe props
3. **Hooks** (`src/hooks/`) — Acesso a dados via TanStack Query
4. **Utils** (`src/utils/`) — Funções puras, lógica de negócio testável
5. **Types** (`src/types/`) — Tipos compartilhados (derivados do schema)

## RPCs e Views

### `get_dashboard_metrics(period_start, period_end)`
- Agrega todos os KPIs do dashboard em uma única chamada
- Retorna JSON com: clientes ativos, tarefas atrasadas, receita, pipeline, etc.
- Elimina 4+ queries separadas + agregação no frontend

### `create_task_with_relations(p_title, ..., p_assignee_ids, p_subtask_titles)`
- Criação atômica de tarefa + subtarefas + responsáveis
- Transação única — rollback automático em caso de erro
- Substitui 3+ operações sequenciais no frontend

### `tasks_with_subtask_counts` (View)
- JOIN com contagem de subtarefas por tarefa
- Campos: `subtasks_total`, `subtasks_done`
- Elimina query N+1 para subtarefas

## Padrões de Hook

```typescript
// Query — leitura com cache
export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: async () => { /* fetch */ },
  });
}

// Mutation — escrita com invalidação
export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => { /* insert */ },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
```

## Módulos Principais

| Módulo | Tabelas | Hooks |
|--------|---------|-------|
| Clientes | `clients` | `useClients` |
| Tarefas | `tasks`, `subtasks`, `task_assignees` | `useTasks`, `useSubtasks`, `useTaskAssignees` |
| Finanças | `finance` | `useFinance` |
| Pipeline | `sales_pipeline`, `pipeline_stages` | `useSalesPipeline`, `usePipelineStages` |
| Propostas | `proposals` | `useProposals` |
| Campanhas | `campaigns`, `campaign_metrics_daily` | `useCampaigns` |
| WhatsApp | `whatsapp_messages`, `whatsapp_labels` | `useWhatsAppContacts` |
| Equipe | `team_members` | `useTeamMembers` |

## Edge Functions

| Função | Propósito |
|--------|-----------|
| `dashboard-summary` | Resumo IA do dashboard |
| `create-member-user` | Criar usuário para membro da equipe |
| `meta-ads-sync` | Sincronização com Meta Ads |
| `send-push` | Envio de push notifications |
| `update-overdue-finance` | Marcar finanças vencidas |
| `whatsapp-chat` | Envio de mensagens WhatsApp |
| `whatsapp-webhook` | Recebimento de mensagens WhatsApp |
