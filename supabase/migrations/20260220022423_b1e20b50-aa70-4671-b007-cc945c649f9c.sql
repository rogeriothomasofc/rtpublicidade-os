
-- =============================================
-- PHASE 2: RLS Hardening — Admin-only write on sensitive tables
-- Single-tenant: all authenticated users can READ everything.
-- Only admins can WRITE to contracts, agency_settings, monthly_goals.
-- =============================================

-- 1. CONTRACTS — Replace generic policy with role-based
DROP POLICY IF EXISTS "Authenticated access to contracts" ON public.contracts;

CREATE POLICY "Authenticated users can read contracts"
  ON public.contracts FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage contracts"
  ON public.contracts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. AGENCY_SETTINGS — Replace generic policy with role-based
DROP POLICY IF EXISTS "Authenticated access to agency_settings" ON public.agency_settings;

CREATE POLICY "Authenticated users can read agency_settings"
  ON public.agency_settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage agency_settings"
  ON public.agency_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. MONTHLY_GOALS — Replace generic policy with role-based
DROP POLICY IF EXISTS "Authenticated users can view monthly goals" ON public.monthly_goals;
DROP POLICY IF EXISTS "Authenticated users can insert monthly goals" ON public.monthly_goals;
DROP POLICY IF EXISTS "Authenticated users can update monthly goals" ON public.monthly_goals;
DROP POLICY IF EXISTS "Authenticated users can delete monthly goals" ON public.monthly_goals;

CREATE POLICY "Authenticated users can read monthly_goals"
  ON public.monthly_goals FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage monthly_goals"
  ON public.monthly_goals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. AUTOMATION_RULES — Replace generic with admin-only write
DROP POLICY IF EXISTS "Authenticated access to automation_rules" ON public.automation_rules;

CREATE POLICY "Authenticated users can read automation_rules"
  ON public.automation_rules FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage automation_rules"
  ON public.automation_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
