# Domínio do Sistema — TrafficFlow OS

> Fonte única de verdade para enums, estados e regras de negócio.
> Atualizado: 2026-02-18

---

## 1. Enums Oficiais (Supabase = Fonte da Verdade)

Todos os enums são definidos como `CREATE TYPE` no banco de dados.
O frontend **nunca** deve criar valores fora desta lista.

### `client_status`
| Valor      | Descrição               |
|------------|------------------------|
| `Lead`     | Prospect/novo contato  |
| `Ativo`    | Cliente ativo pagante  |
| `Pausado`  | Contrato suspenso      |
| `Cancelado`| Contrato encerrado     |

### `task_status`
| Valor       | Descrição                      |
|-------------|-------------------------------|
| `A Fazer`   | Aguardando execução           |
| `Fazendo`   | Em andamento                  |
| `Atrasado`  | Prazo expirado (automático)   |
| `Concluído` | Finalizado                    |

**Transições válidas:**
- `A Fazer` → `Fazendo` | `Concluído` | `Atrasado` (automático)
- `Fazendo` → `Concluído` | `Atrasado` (automático)
- `Atrasado` → `Fazendo` | `Concluído`
- `Concluído` → (terminal, gera recorrência se configurado)

**Automações:**
- Trigger `check_task_overdue`: marca como `Atrasado` se `due_date < CURRENT_DATE` e status é `A Fazer` ou `Fazendo`
- Trigger `handle_task_recurrence`: ao marcar `Concluído`, cria nova tarefa com próxima data se recorrência ≠ `Nenhuma`

### `task_priority`
| Valor    | Descrição           |
|----------|---------------------|
| `Baixa`  | Prioridade baixa    |
| `Média`  | Prioridade padrão   |
| `Alta`   | Prioridade alta     |
| `Urgente`| Prioridade máxima   |

### `task_type`
| Valor        | Descrição                    |
|--------------|------------------------------|
| `Campanha`   | Relacionado a campanhas      |
| `Criativo`   | Peças criativas              |
| `Relatório`  | Relatórios e análises        |
| `Onboarding` | Setup inicial de cliente     |
| `Otimização` | Melhorias em campanhas       |
| `Outro`      | Tipo genérico                |

### `task_recurrence`
| Valor        | Próxima data                 |
|--------------|------------------------------|
| `Nenhuma`    | Sem recorrência              |
| `Diária`     | +1 dia                       |
| `Semanal`    | +1 semana                    |
| `Mensal`     | +1 mês                       |
| `Trimestral` | +3 meses                     |

### `pipeline_stage`
| Valor              | Descrição                    |
|--------------------|------------------------------|
| `Novo`             | Lead recém-criado            |
| `Contatado`        | Primeiro contato feito       |
| `Qualificação`     | Em qualificação              |
| `Diagnóstico`      | Análise de necessidades      |
| `Reunião Agendada` | Reunião marcada              |
| `Proposta Enviada` | Proposta formal enviada      |
| `Proposta`         | Em fase de proposta          |
| `Negociação`       | Negociando termos            |
| `Ganho`            | Negócio fechado (terminal)   |
| `Perdido`          | Negócio perdido (terminal)   |

> **Nota:** O sistema também suporta `pipeline_stages` customizáveis via tabela `pipeline_stages`. Os stages acima são os valores do enum do banco, mas colunas `display_name` e `position` na tabela permitem personalização.

### `finance_status`
| Valor      | Descrição                     |
|------------|-------------------------------|
| `Pendente` | Aguardando pagamento          |
| `Pago`     | Pago/recebido                 |
| `Atrasado` | Prazo vencido (automático)    |

**Automações:**
- Trigger `check_finance_overdue`: marca como `Atrasado` se `due_date < CURRENT_DATE` e status é `Pendente`
- Trigger `handle_finance_recurrence`: ao marcar `Pago`, cria próximo lançamento se recorrência ≠ `Nenhuma`

### `finance_type`
| Valor     | Descrição    |
|-----------|-------------|
| `Receita` | Entrada      |
| `Despesa` | Saída        |

### `finance_recurrence`
| Valor        | Próxima data   |
|--------------|---------------|
| `Nenhuma`    | —             |
| `Mensal`     | +1 mês        |
| `Trimestral` | +3 meses      |
| `Semestral`  | +6 meses      |
| `Anual`      | +1 ano        |

### `platform_type`
| Valor      |
|------------|
| `Meta`     |
| `Google`   |
| `TikTok`   |
| `LinkedIn` |
| `Other`    |

### `contract_status`
| Valor       |
|-------------|
| `Ativo`     |
| `Encerrado` |
| `Cancelado` |

### `proposal_status`
| Valor       |
|-------------|
| `Rascunho`  |
| `Enviada`   |
| `Aprovada`  |
| `Rejeitada` |
| `Expirada`  |

### `planning_status`
| Valor           |
|-----------------|
| `Rascunho`      |
| `Em Aprovação`  |
| `Aprovado`      |
| `Ativo`         |
| `Pausado`       |
| `Finalizado`    |

### `notification_type`
| Valor                |
|----------------------|
| `task_due_soon`      |
| `task_overdue`       |
| `payment_due_soon`   |
| `payment_overdue`    |
| `contract_expiring`  |
| `general`            |

### `app_role`
| Valor    | Descrição                        |
|----------|----------------------------------|
| `admin`  | Acesso total ao sistema          |
| `client` | Acesso restrito ao portal        |

---

## 2. Tipos no Frontend

### Fonte da Verdade
- `src/integrations/supabase/types.ts` — **auto-gerado, NUNCA editar**
- `src/types/database.ts` — tipos auxiliares que replicam os enums do DB para uso em componentes

### Regra
Os valores em `src/types/database.ts` **DEVEM** espelhar exatamente os enums do banco.
Qualquer divergência (ex: `Medium` vs `Média`) causa bugs silenciosos na persistência.

---

## 3. Regras de Negócio Implícitas

### Tarefas
- Tarefas sem `due_date` nunca ficam `Atrasado` automaticamente
- `Concluído` é estado terminal (trigger de recorrência ativo)
- Subtasks e assignees são criados atomicamente via RPC `create_task_with_relations`

### Finanças
- `Pago` é estado terminal (trigger de recorrência ativo)
- Categorias são dinâmicas (tabela `finance_categories`)
- O tipo `FinanceCategory` hardcoded em `database.ts` é legado e NÃO é usado pelo DB

### Pipeline
- `Ganho` e `Perdido` são estados terminais
- Leads com `source = 'whatsapp_sync'` são criados automaticamente via webhook
- Probabilidade vem do `pipeline_stages.probability`, não do lead

### Portal do Cliente
- Acesso controlado via `client_portal_access` + role `client` em `user_roles`
- RLS filtra dados por `client_id` via join com `client_portal_access`
- Sessões rastreadas em `portal_access_logs`

### Notificações
- Geradas via função `check_and_create_notifications()` (batch)
- Deduplicadas por `reference_id + reference_type + type + data`

---

## 4. Segurança

- Todas as tabelas possuem RLS habilitado
- Policies padrão: `TO authenticated` com `USING (true)` para tabelas internas
- Tabelas do portal: policies restritivas com `has_role(auth.uid(), 'client')` e joins com `client_portal_access`
- Edge Functions validam JWT via `Authorization` header (exceto webhook público)
- Profiles admin protegidos contra exclusão via trigger `prevent_admin_profile_delete`
