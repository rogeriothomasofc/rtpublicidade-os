-- =============================================================================
-- CORREÇÃO COMPLETA DE RLS — executar no SQL Editor do Supabase Dashboard
-- Projeto: nbzxofrllagqwwrwfskv
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Helper function is_agency_staff()
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_agency_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'member')
$$;

-- =============================================================================
-- 2. CLIENTS
-- =============================================================================
DROP POLICY IF EXISTS "Allow all access to clients"              ON public.clients;
DROP POLICY IF EXISTS "Authenticated access to clients"          ON public.clients;
DROP POLICY IF EXISTS "Clients can view own client record"       ON public.clients;
DROP POLICY IF EXISTS "Clients can view own record"             ON public.clients;
DROP POLICY IF EXISTS "Agency staff can manage clients"         ON public.clients;

CREATE POLICY "Agency staff can manage clients"
  ON public.clients FOR ALL TO authenticated
  USING (public.is_agency_staff())
  WITH CHECK (public.is_agency_staff());

CREATE POLICY "Clients can view own record"
  ON public.clients FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_portal_access cpa
      WHERE cpa.user_id = auth.uid() AND cpa.client_id = clients.id AND cpa.is_active = true
    )
  );

-- =============================================================================
-- 3. FINANCE
-- =============================================================================
DROP POLICY IF EXISTS "Allow all access to finance"             ON public.finance;
DROP POLICY IF EXISTS "Authenticated access to finance"         ON public.finance;
DROP POLICY IF EXISTS "Clients can view own finance"            ON public.finance;
DROP POLICY IF EXISTS "Agency staff can manage finance"         ON public.finance;

CREATE POLICY "Agency staff can manage finance"
  ON public.finance FOR ALL TO authenticated
  USING (public.is_agency_staff())
  WITH CHECK (public.is_agency_staff());

CREATE POLICY "Clients can view own finance"
  ON public.finance FOR SELECT TO authenticated
  USING (
    finance.client_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.client_portal_access cpa
      WHERE cpa.user_id = auth.uid() AND cpa.client_id = finance.client_id AND cpa.is_active = true
    )
  );

-- =============================================================================
-- 4. TEAM_MEMBERS
-- =============================================================================
DROP POLICY IF EXISTS "Allow all access to team_members"        ON public.team_members;
DROP POLICY IF EXISTS "Authenticated access to team_members"    ON public.team_members;
DROP POLICY IF EXISTS "Agency staff can manage team_members"    ON public.team_members;

CREATE POLICY "Agency staff can manage team_members"
  ON public.team_members FOR ALL TO authenticated
  USING (public.is_agency_staff())
  WITH CHECK (public.is_agency_staff());

-- =============================================================================
-- 5. CLIENT_PORTAL_ACCESS
-- =============================================================================
DROP POLICY IF EXISTS "Admins can manage client_portal_access"           ON public.client_portal_access;
DROP POLICY IF EXISTS "Clients can view own portal access"               ON public.client_portal_access;
DROP POLICY IF EXISTS "Authenticated access to client_portal_access"     ON public.client_portal_access;
DROP POLICY IF EXISTS "Agency staff can manage client_portal_access"     ON public.client_portal_access;

CREATE POLICY "Agency staff can manage client_portal_access"
  ON public.client_portal_access FOR ALL TO authenticated
  USING (public.is_agency_staff())
  WITH CHECK (public.is_agency_staff());

CREATE POLICY "Clients can view own portal access"
  ON public.client_portal_access FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- =============================================================================
-- 6. PROFILES
-- =============================================================================
DROP POLICY IF EXISTS "Agency staff can read all profiles"      ON public.profiles;

CREATE POLICY "Agency staff can read all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_agency_staff());

-- =============================================================================
-- 7. TASKS
-- =============================================================================
DROP POLICY IF EXISTS "Allow all access to tasks"               ON public.tasks;
DROP POLICY IF EXISTS "Authenticated access to tasks"           ON public.tasks;
DROP POLICY IF EXISTS "Clients can view own tasks"              ON public.tasks;
DROP POLICY IF EXISTS "Agency staff can manage tasks"           ON public.tasks;

CREATE POLICY "Agency staff can manage tasks"
  ON public.tasks FOR ALL TO authenticated
  USING (public.is_agency_staff())
  WITH CHECK (public.is_agency_staff());

CREATE POLICY "Clients can view own tasks"
  ON public.tasks FOR SELECT TO authenticated
  USING (
    tasks.client_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.client_portal_access cpa
      WHERE cpa.user_id = auth.uid() AND cpa.client_id = tasks.client_id AND cpa.is_active = true
    )
  );

-- =============================================================================
-- 8. TASK_ASSIGNEES
-- =============================================================================
DROP POLICY IF EXISTS "Allow all access to task_assignees"      ON public.task_assignees;
DROP POLICY IF EXISTS "Authenticated access to task_assignees"  ON public.task_assignees;
DROP POLICY IF EXISTS "Agency staff can manage task_assignees"  ON public.task_assignees;

CREATE POLICY "Agency staff can manage task_assignees"
  ON public.task_assignees FOR ALL TO authenticated
  USING (public.is_agency_staff())
  WITH CHECK (public.is_agency_staff());

-- =============================================================================
-- 9. SUBTASKS
-- =============================================================================
DROP POLICY IF EXISTS "Allow all access to subtasks"            ON public.subtasks;
DROP POLICY IF EXISTS "Authenticated access to subtasks"        ON public.subtasks;
DROP POLICY IF EXISTS "Agency staff can manage subtasks"        ON public.subtasks;

CREATE POLICY "Agency staff can manage subtasks"
  ON public.subtasks FOR ALL TO authenticated
  USING (public.is_agency_staff())
  WITH CHECK (public.is_agency_staff());

-- =============================================================================
-- 10. PROJECTS
-- =============================================================================
DROP POLICY IF EXISTS "Allow all access to projects"            ON public.projects;
DROP POLICY IF EXISTS "Authenticated access to projects"        ON public.projects;
DROP POLICY IF EXISTS "Clients can view own projects"           ON public.projects;
DROP POLICY IF EXISTS "Agency staff can manage projects"        ON public.projects;

CREATE POLICY "Agency staff can manage projects"
  ON public.projects FOR ALL TO authenticated
  USING (public.is_agency_staff())
  WITH CHECK (public.is_agency_staff());

CREATE POLICY "Clients can view own projects"
  ON public.projects FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_portal_access cpa
      WHERE cpa.user_id = auth.uid() AND cpa.client_id = projects.client_id AND cpa.is_active = true
    )
  );

-- =============================================================================
-- 11. CONTRACTS
-- =============================================================================
DROP POLICY IF EXISTS "Allow all access to contracts"           ON public.contracts;
DROP POLICY IF EXISTS "Authenticated access to contracts"       ON public.contracts;
DROP POLICY IF EXISTS "Authenticated users can read contracts"  ON public.contracts;
DROP POLICY IF EXISTS "Admins can manage contracts"             ON public.contracts;
DROP POLICY IF EXISTS "Clients can view own contracts"          ON public.contracts;
DROP POLICY IF EXISTS "Agency staff can manage contracts"       ON public.contracts;

CREATE POLICY "Agency staff can manage contracts"
  ON public.contracts FOR ALL TO authenticated
  USING (public.is_agency_staff())
  WITH CHECK (public.is_agency_staff());

CREATE POLICY "Clients can view own contracts"
  ON public.contracts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_portal_access cpa
      WHERE cpa.user_id = auth.uid() AND cpa.client_id = contracts.client_id AND cpa.is_active = true
    )
  );

-- =============================================================================
-- 12. SALES_PIPELINE
-- =============================================================================
DROP POLICY IF EXISTS "Allow all access to sales_pipeline"      ON public.sales_pipeline;
DROP POLICY IF EXISTS "Authenticated access to sales_pipeline"  ON public.sales_pipeline;
DROP POLICY IF EXISTS "Agency staff can manage sales_pipeline"  ON public.sales_pipeline;

CREATE POLICY "Agency staff can manage sales_pipeline"
  ON public.sales_pipeline FOR ALL TO authenticated
  USING (public.is_agency_staff())
  WITH CHECK (public.is_agency_staff());

-- =============================================================================
-- 13. PROPOSALS
-- =============================================================================
DROP POLICY IF EXISTS "Allow all access to proposals"           ON public.proposals;
DROP POLICY IF EXISTS "Authenticated access to proposals"       ON public.proposals;
DROP POLICY IF EXISTS "Clients can view own proposals"          ON public.proposals;
DROP POLICY IF EXISTS "Agency staff can manage proposals"       ON public.proposals;

CREATE POLICY "Agency staff can manage proposals"
  ON public.proposals FOR ALL TO authenticated
  USING (public.is_agency_staff())
  WITH CHECK (public.is_agency_staff());

CREATE POLICY "Clients can view own proposals"
  ON public.proposals FOR SELECT TO authenticated
  USING (
    proposals.client_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.client_portal_access cpa
      WHERE cpa.user_id = auth.uid() AND cpa.client_id = proposals.client_id AND cpa.is_active = true
    )
  );

-- =============================================================================
-- 14. Tabelas de suporte (sem acesso para clientes)
-- Usa BEGIN/EXCEPTION por tabela — seguro mesmo se a tabela não existir.
-- =============================================================================
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'agency_settings','campaign_column_presets','campaign_metrics_daily',
    'campaigns','integration_accounts','integration_logs','integrations',
    'notifications','pipeline_stages','planning','planning_posts',
    'whatsapp_contact_labels','whatsapp_labels','whatsapp_messages',
    'push_subscriptions'
  ] LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS "Allow all access to %1$s" ON public.%1$s', t);
      EXECUTE format('DROP POLICY IF EXISTS "Authenticated access to %1$s" ON public.%1$s', t);
      EXECUTE format('DROP POLICY IF EXISTS "Agency staff can manage %1$s" ON public.%1$s', t);
      EXECUTE format(
        'CREATE POLICY "Agency staff can manage %1$s"
         ON public.%1$s FOR ALL TO authenticated
         USING (public.is_agency_staff())
         WITH CHECK (public.is_agency_staff())',
        t
      );
    EXCEPTION WHEN undefined_table THEN
      NULL; -- tabela não existe neste banco, ignorar
    END;
  END LOOP;
END $$;
