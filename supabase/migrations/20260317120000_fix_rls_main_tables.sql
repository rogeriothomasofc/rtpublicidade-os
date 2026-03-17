-- =============================================================================
-- Fix RLS policies on main business tables
--
-- Access model:
--   admin   → full access to everything (via user_roles)
--   member  → full access to everything (via user_roles)
--   client  → SELECT only on their own data (via client_portal_access)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper function: is_agency_staff()
-- Returns true if the current user is admin or member.
-- SECURITY DEFINER so it can safely query user_roles without recursion.
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
-- CLIENTS
-- =============================================================================
DROP POLICY IF EXISTS "Authenticated access to clients"     ON public.clients;
DROP POLICY IF EXISTS "Clients can view own client record"  ON public.clients;

-- admin + member: full CRUD
CREATE POLICY "Agency staff can manage clients"
  ON public.clients
  FOR ALL
  TO authenticated
  USING (public.is_agency_staff())
  WITH CHECK (public.is_agency_staff());

-- client users: read-only their own record
CREATE POLICY "Clients can view own record"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.client_portal_access cpa
      WHERE cpa.user_id   = auth.uid()
        AND cpa.client_id = clients.id
        AND cpa.is_active = true
    )
  );

-- =============================================================================
-- PROJECTS
-- =============================================================================
DROP POLICY IF EXISTS "Authenticated access to projects" ON public.projects;

-- admin + member: full CRUD
CREATE POLICY "Agency staff can manage projects"
  ON public.projects
  FOR ALL
  TO authenticated
  USING (public.is_agency_staff())
  WITH CHECK (public.is_agency_staff());

-- client users: read-only projects of their client
CREATE POLICY "Clients can view own projects"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.client_portal_access cpa
      WHERE cpa.user_id   = auth.uid()
        AND cpa.client_id = projects.client_id
        AND cpa.is_active = true
    )
  );

-- =============================================================================
-- TASKS
-- =============================================================================
DROP POLICY IF EXISTS "Authenticated access to tasks" ON public.tasks;
DROP POLICY IF EXISTS "Clients can view own tasks"    ON public.tasks;

-- admin + member: full CRUD
CREATE POLICY "Agency staff can manage tasks"
  ON public.tasks
  FOR ALL
  TO authenticated
  USING (public.is_agency_staff())
  WITH CHECK (public.is_agency_staff());

-- client users: read-only tasks linked to their client
CREATE POLICY "Clients can view own tasks"
  ON public.tasks
  FOR SELECT
  TO authenticated
  USING (
    tasks.client_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.client_portal_access cpa
      WHERE cpa.user_id   = auth.uid()
        AND cpa.client_id = tasks.client_id
        AND cpa.is_active = true
    )
  );

-- =============================================================================
-- FINANCE
-- =============================================================================
DROP POLICY IF EXISTS "Authenticated access to finance" ON public.finance;
DROP POLICY IF EXISTS "Clients can view own finance"    ON public.finance;

-- admin + member: full CRUD
CREATE POLICY "Agency staff can manage finance"
  ON public.finance
  FOR ALL
  TO authenticated
  USING (public.is_agency_staff())
  WITH CHECK (public.is_agency_staff());

-- client users: read-only finance records for their client
CREATE POLICY "Clients can view own finance"
  ON public.finance
  FOR SELECT
  TO authenticated
  USING (
    finance.client_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.client_portal_access cpa
      WHERE cpa.user_id   = auth.uid()
        AND cpa.client_id = finance.client_id
        AND cpa.is_active = true
    )
  );

-- =============================================================================
-- CONTRACTS
-- =============================================================================
DROP POLICY IF EXISTS "Authenticated users can read contracts" ON public.contracts;
DROP POLICY IF EXISTS "Admins can manage contracts"            ON public.contracts;

-- admin + member: full CRUD
CREATE POLICY "Agency staff can manage contracts"
  ON public.contracts
  FOR ALL
  TO authenticated
  USING (public.is_agency_staff())
  WITH CHECK (public.is_agency_staff());

-- client users: read-only contracts for their client
CREATE POLICY "Clients can view own contracts"
  ON public.contracts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.client_portal_access cpa
      WHERE cpa.user_id   = auth.uid()
        AND cpa.client_id = contracts.client_id
        AND cpa.is_active = true
    )
  );

-- =============================================================================
-- SALES_PIPELINE
-- Internal data only — clients have no access.
-- =============================================================================
DROP POLICY IF EXISTS "Authenticated access to sales_pipeline" ON public.sales_pipeline;

-- admin + member: full CRUD
CREATE POLICY "Agency staff can manage sales_pipeline"
  ON public.sales_pipeline
  FOR ALL
  TO authenticated
  USING (public.is_agency_staff())
  WITH CHECK (public.is_agency_staff());

-- =============================================================================
-- PROPOSALS
-- =============================================================================
DROP POLICY IF EXISTS "Authenticated access to proposals" ON public.proposals;

-- admin + member: full CRUD
CREATE POLICY "Agency staff can manage proposals"
  ON public.proposals
  FOR ALL
  TO authenticated
  USING (public.is_agency_staff())
  WITH CHECK (public.is_agency_staff());

-- client users: read-only proposals linked to their client
CREATE POLICY "Clients can view own proposals"
  ON public.proposals
  FOR SELECT
  TO authenticated
  USING (
    proposals.client_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.client_portal_access cpa
      WHERE cpa.user_id   = auth.uid()
        AND cpa.client_id = proposals.client_id
        AND cpa.is_active = true
    )
  );
