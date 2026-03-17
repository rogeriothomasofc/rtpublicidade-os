# Segurança — RT Publicidade OS

## Modelo de Acesso

O sistema opera em **single-tenant**: todos os usuários autenticados pertencem à mesma agência e compartilham acesso total aos dados operacionais.

### Autenticação
- Supabase Auth com email/senha
- Sessions persistidas via `localStorage`
- Auto-refresh de tokens habilitado
- Rotas protegidas via `ProtectedRoute` component

### Row Level Security (RLS)

Todas as tabelas têm RLS **habilitado**. As policies seguem dois padrões:

#### 1. Tabelas Compartilhadas (single-tenant)
Tabelas como `clients`, `tasks`, `finance`, `campaigns` usam policies `USING (true)` — qualquer usuário autenticado pode ler/escrever. Isso é intencional para o modelo single-tenant.

```sql
CREATE POLICY "Allow all access" ON public.tasks
FOR ALL USING (true) WITH CHECK (true);
```

#### 2. Tabelas Pessoais
A tabela `profiles` restringe acesso ao próprio usuário:

```sql
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT USING (auth.uid() = user_id);
```

### Roles

Roles são gerenciados na tabela `user_roles` (separada de `profiles`):
- `admin` — acesso total
- `member` — acesso padrão

Verificação via `has_role()` (SECURITY DEFINER):
```sql
SELECT public.has_role(auth.uid(), 'admin');
```

## Funções SECURITY DEFINER

As seguintes funções executam com privilégios elevados:

| Função | Motivo |
|--------|--------|
| `get_dashboard_metrics` | Agrega dados de múltiplas tabelas |
| `create_task_with_relations` | Insere em 3 tabelas atomicamente |
| `handle_task_recurrence` | Cria nova tarefa em trigger |
| `handle_finance_recurrence` | Cria nova finança em trigger |
| `has_role` | Evita recursão em RLS |

## Proteções Implementadas

- ✅ RLS ativo em todas as tabelas
- ✅ Roles em tabela separada (anti privilege escalation)
- ✅ Triggers de validação (overdue tasks/finance)
- ✅ SECURITY DEFINER com `SET search_path = public`
- ✅ Sem SQL dinâmico em RPCs
- ✅ Sem chaves privadas no frontend

## Recomendações Futuras

- [ ] Migrar para multi-tenant com `organization_id` quando necessário
- [ ] Implementar audit log para ações críticas
- [ ] Adicionar rate limiting em edge functions
- [ ] Restringir policies de escrita para roles específicos
