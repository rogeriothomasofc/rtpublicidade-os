-- =============================================================================
-- Fix RLS on support tables missed by the previous migration.
--
-- Root causes being fixed:
--   1. client_portal_access — policy used `has_role(uid, 'client')` which
--      can fail if 'client' is not in the app_role enum; replaced with
--      is_agency_staff() to be consistent with the rest of the system.
--   2. team_members / task_assignees / subtasks — had permissive USING (true)
--      policies that allowed client-role users to read/write staff data.
--   3. profiles — only had self-access policies; admin/member need to read
--      all profiles (e.g. to list team members and their system roles).
-- =============================================================================

-- =============================================================================
-- CLIENT_PORTAL_ACCESS
-- Agency staff: full CRUD (manage who gets portal access)
-- Clients: SELECT own row only
-- =============================================================================
DROP POLICY IF EXISTS "Admins can manage client_portal_access"  ON public.client_portal_access;
DROP POLICY IF EXISTS "Clients can view own portal access"       ON public.client_portal_access;
-- catch any other legacy names
DROP POLICY IF EXISTS "Authenticated access to client_portal_access" ON public.client_portal_access;

CREATE POLICY "Agency staff can manage client_portal_access"
  ON public.client_portal_access
  FOR ALL
  TO authenticated
  USING (public.is_agency_staff())
  WITH CHECK (public.is_agency_staff());

CREATE POLICY "Clients can view own portal access"
  ON public.client_portal_access
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- =============================================================================
-- TEAM_MEMBERS
-- Agency staff: full CRUD
-- Clients: no access (team roster is internal)
-- =============================================================================
DROP POLICY IF EXISTS "Allow all access to team_members"       ON public.team_members;
DROP POLICY IF EXISTS "Authenticated access to team_members"   ON public.team_members;

CREATE POLICY "Agency staff can manage team_members"
  ON public.team_members
  FOR ALL
  TO authenticated
  USING (public.is_agency_staff())
  WITH CHECK (public.is_agency_staff());

-- =============================================================================
-- TASK_ASSIGNEES
-- Agency staff: full CRUD
-- Clients: SELECT only for tasks belonging to their client
-- =============================================================================
DROP POLICY IF EXISTS "Allow all access to task_assignees"     ON public.task_assignees;
DROP POLICY IF EXISTS "Authenticated access to task_assignees" ON public.task_assignees;

CREATE POLICY "Agency staff can manage task_assignees"
  ON public.task_assignees
  FOR ALL
  TO authenticated
  USING (public.is_agency_staff())
  WITH CHECK (public.is_agency_staff());

CREATE POLICY "Clients can view task_assignees for own tasks"
  ON public.task_assignees
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.client_portal_access cpa
        ON cpa.client_id = t.client_id
       AND cpa.user_id   = auth.uid()
       AND cpa.is_active = true
      WHERE t.id             = task_assignees.task_id
        AND t.client_id IS NOT NULL
    )
  );

-- =============================================================================
-- SUBTASKS
-- Agency staff: full CRUD
-- Clients: SELECT only for subtasks of tasks belonging to their client
-- =============================================================================
DROP POLICY IF EXISTS "Allow all access to subtasks"     ON public.subtasks;
DROP POLICY IF EXISTS "Authenticated access to subtasks" ON public.subtasks;

CREATE POLICY "Agency staff can manage subtasks"
  ON public.subtasks
  FOR ALL
  TO authenticated
  USING (public.is_agency_staff())
  WITH CHECK (public.is_agency_staff());

CREATE POLICY "Clients can view subtasks for own tasks"
  ON public.subtasks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.client_portal_access cpa
        ON cpa.client_id = t.client_id
       AND cpa.user_id   = auth.uid()
       AND cpa.is_active = true
      WHERE t.id             = subtasks.task_id
        AND t.client_id IS NOT NULL
    )
  );

-- =============================================================================
-- PROFILES
-- Agency staff: read all profiles (needed to display team member names/avatars)
-- Users: read and update their own profile (existing policies kept)
-- =============================================================================
DROP POLICY IF EXISTS "Agency staff can read all profiles" ON public.profiles;

CREATE POLICY "Agency staff can read all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_agency_staff());

-- Keep the existing self-access policies untouched:
--   "Users can view their own profile"   (SELECT WHERE uid = user_id)
--   "Users can update their own profile" (UPDATE WHERE uid = user_id)
--   "Users can insert their own profile" (INSERT WITH CHECK uid = user_id)
-- They remain as-is — the new staff SELECT policy is additive (OR'd with them).
