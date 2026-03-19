-- Member permissions: which pages each team member can access
CREATE TABLE IF NOT EXISTS public.member_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  page_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_member_id, page_slug)
);

ALTER TABLE public.member_permissions ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read (needed so members can check their own permissions)
CREATE POLICY "Authenticated can read member_permissions"
  ON public.member_permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can insert
CREATE POLICY "Admins can insert member_permissions"
  ON public.member_permissions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can delete
CREATE POLICY "Admins can delete member_permissions"
  ON public.member_permissions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
