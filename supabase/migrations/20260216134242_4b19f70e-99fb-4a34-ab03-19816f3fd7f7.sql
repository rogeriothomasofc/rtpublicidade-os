
-- Table: maps a client record to an auth user for portal access
CREATE TABLE public.client_portal_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by uuid NULL,
  invited_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, user_id)
);

ALTER TABLE public.client_portal_access ENABLE ROW LEVEL SECURITY;

-- Admin team can manage all portal access records
CREATE POLICY "Admins can manage client_portal_access"
  ON public.client_portal_access
  FOR ALL
  TO authenticated
  USING (
    NOT public.has_role(auth.uid(), 'client')
  )
  WITH CHECK (
    NOT public.has_role(auth.uid(), 'client')
  );

-- Clients can view their own portal access
CREATE POLICY "Clients can view own portal access"
  ON public.client_portal_access
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Table: comments on activities by clients
CREATE TABLE public.client_activity_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_activity_comments ENABLE ROW LEVEL SECURITY;

-- Admin team can see all comments
CREATE POLICY "Admins can manage all comments"
  ON public.client_activity_comments
  FOR ALL
  TO authenticated
  USING (
    NOT public.has_role(auth.uid(), 'client')
  )
  WITH CHECK (
    NOT public.has_role(auth.uid(), 'client')
  );

-- Clients can view comments for their own client_id
CREATE POLICY "Clients can view own comments"
  ON public.client_activity_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_portal_access cpa
      WHERE cpa.user_id = auth.uid()
        AND cpa.client_id = client_activity_comments.client_id
        AND cpa.is_active = true
    )
  );

-- Clients can insert their own comments
CREATE POLICY "Clients can insert own comments"
  ON public.client_activity_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.client_portal_access cpa
      WHERE cpa.user_id = auth.uid()
        AND cpa.client_id = client_activity_comments.client_id
        AND cpa.is_active = true
    )
  );

-- RLS policies for clients to READ their own data in existing tables
CREATE POLICY "Clients can view own tasks"
  ON public.tasks
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'client')
    AND EXISTS (
      SELECT 1 FROM public.client_portal_access cpa
      WHERE cpa.user_id = auth.uid()
        AND cpa.client_id = tasks.client_id
        AND cpa.is_active = true
    )
  );

CREATE POLICY "Clients can view own subtasks"
  ON public.subtasks
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'client')
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.client_portal_access cpa ON cpa.client_id = t.client_id
      WHERE t.id = subtasks.task_id
        AND cpa.user_id = auth.uid()
        AND cpa.is_active = true
    )
  );

CREATE POLICY "Clients can view own finance"
  ON public.finance
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'client')
    AND EXISTS (
      SELECT 1 FROM public.client_portal_access cpa
      WHERE cpa.user_id = auth.uid()
        AND cpa.client_id = finance.client_id
        AND cpa.is_active = true
    )
  );

CREATE POLICY "Clients can view own planning"
  ON public.planning_campaigns
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'client')
    AND EXISTS (
      SELECT 1 FROM public.client_portal_access cpa
      WHERE cpa.user_id = auth.uid()
        AND cpa.client_id = planning_campaigns.client_id
        AND cpa.is_active = true
    )
  );

CREATE POLICY "Clients can view own client record"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'client')
    AND EXISTS (
      SELECT 1 FROM public.client_portal_access cpa
      WHERE cpa.user_id = auth.uid()
        AND cpa.client_id = clients.id
        AND cpa.is_active = true
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_client_portal_access_updated_at
  BEFORE UPDATE ON public.client_portal_access
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_activity_comments_updated_at
  BEFORE UPDATE ON public.client_activity_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
