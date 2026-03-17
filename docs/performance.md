# Performance — RT Publicidade OS

## Otimizações Implementadas

### 1. Dashboard: Agregação Server-Side

**Antes**: 4 queries paralelas (`clients`, `tasks`, `finance`, `sales_pipeline`) + agregação JavaScript no frontend.

**Depois**: 1 chamada RPC `get_dashboard_metrics(period_start, period_end)` que retorna todos os KPIs pré-calculados.

**Impacto**:
- Redução de 4 roundtrips → 1
- Eliminação de payload desnecessário (antes trazia todos os registros)
- Filtros de período aplicados no SQL (não no JS)

### 2. Tarefas: View com Contagem de Subtarefas

**Antes**: Query de tarefas + query separada de subtarefas + merge manual no frontend.

**Depois**: View `tasks_with_subtask_counts` com LEFT JOIN e agregação.

**Impacto**:
- Elimina query N+1
- Campos `subtasks_total` e `subtasks_done` já disponíveis

### 3. Criação Atômica de Tarefas

**Antes**: 3+ operações sequenciais (insert task → insert assignees → insert subtasks).

**Depois**: 1 chamada RPC `create_task_with_relations()` transacional.

**Impacto**:
- Redução de 3+ roundtrips → 1
- Rollback automático em caso de erro
- Sem estado inconsistente (tarefa sem assignees)

### 4. Filtros Extraídos

Lógica de filtragem movida de `useMemo` inline para `src/utils/filterTasks.ts`:
- Função pura testável
- Reutilizável em diferentes views (lista, calendário)
- Sem re-renders desnecessários

## Cache Strategy (TanStack Query)

| Query | staleTime | Invalidação |
|-------|-----------|-------------|
| `dashboard-stats` | 30s | Manual após mutations |
| `tasks` | 0 (always fresh) | Após create/update/delete |
| `clients` | 0 | Após mutations |
| `finance` | 0 | Após mutations |

## Recomendações Futuras

- [ ] Paginação server-side para listas grandes (tasks, finance, clients)
- [ ] Índices SQL para queries frequentes (`tasks.status`, `finance.due_date`)
- [ ] Debounce no filtro de busca por texto
- [ ] Virtual scrolling para tabelas com 100+ registros
- [ ] Prefetch de dados no hover de links de navegação
