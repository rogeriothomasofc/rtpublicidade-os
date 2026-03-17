
-- Table for portal announcements/notices
CREATE TABLE public.portal_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  is_global boolean NOT NULL DEFAULT false,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_announcements ENABLE ROW LEVEL SECURITY;

-- Admins can manage all announcements
CREATE POLICY "Admins can manage portal_announcements"
ON public.portal_announcements
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Clients can view their own announcements (global or targeted)
CREATE POLICY "Clients can view own announcements"
ON public.portal_announcements
FOR SELECT
USING (
  has_role(auth.uid(), 'client'::app_role) AND (
    is_global = true OR
    EXISTS (
      SELECT 1 FROM client_portal_access cpa
      WHERE cpa.user_id = auth.uid()
        AND cpa.client_id = portal_announcements.client_id
        AND cpa.is_active = true
    )
  )
);

-- Clients can update (mark as read) their own announcements
CREATE POLICY "Clients can mark announcements as read"
ON public.portal_announcements
FOR UPDATE
USING (
  has_role(auth.uid(), 'client'::app_role) AND (
    is_global = true OR
    EXISTS (
      SELECT 1 FROM client_portal_access cpa
      WHERE cpa.user_id = auth.uid()
        AND cpa.client_id = portal_announcements.client_id
        AND cpa.is_active = true
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'client'::app_role) AND (
    is_global = true OR
    EXISTS (
      SELECT 1 FROM client_portal_access cpa
      WHERE cpa.user_id = auth.uid()
        AND cpa.client_id = portal_announcements.client_id
        AND cpa.is_active = true
    )
  )
);
