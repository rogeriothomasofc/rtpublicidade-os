-- Add user_id column to push_subscriptions
ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Index for fast per-user queries
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON public.push_subscriptions(user_id);

-- Replace open policy with user-scoped policy
DROP POLICY IF EXISTS "Allow all operations on push_subscriptions" ON public.push_subscriptions;

-- Service-role (edge functions) bypasses RLS, so we only need policies for direct client access
CREATE POLICY "Users can manage their own push subscriptions"
  ON public.push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
