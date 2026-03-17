
-- Fix RLS: Replace permissive "USING (true)" policies with "TO authenticated" restrictions
-- This ensures only logged-in users can access data (single-tenant model)

-- agency_settings
DROP POLICY IF EXISTS "Allow all access to agency_settings" ON public.agency_settings;
CREATE POLICY "Authenticated access to agency_settings" ON public.agency_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- campaign_column_presets
DROP POLICY IF EXISTS "Allow all access to campaign_column_presets" ON public.campaign_column_presets;
CREATE POLICY "Authenticated access to campaign_column_presets" ON public.campaign_column_presets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- campaign_metrics_daily
DROP POLICY IF EXISTS "Allow all access to campaign_metrics_daily" ON public.campaign_metrics_daily;
CREATE POLICY "Authenticated access to campaign_metrics_daily" ON public.campaign_metrics_daily FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- campaigns
DROP POLICY IF EXISTS "Allow all access to campaigns" ON public.campaigns;
CREATE POLICY "Authenticated access to campaigns" ON public.campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- clients
DROP POLICY IF EXISTS "Allow all access to clients" ON public.clients;
CREATE POLICY "Authenticated access to clients" ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- contracts
DROP POLICY IF EXISTS "Allow all access to contracts" ON public.contracts;
CREATE POLICY "Authenticated access to contracts" ON public.contracts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- finance
DROP POLICY IF EXISTS "Allow all access to finance" ON public.finance;
CREATE POLICY "Authenticated access to finance" ON public.finance FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- integration_accounts
DROP POLICY IF EXISTS "Allow all access to integration_accounts" ON public.integration_accounts;
CREATE POLICY "Authenticated access to integration_accounts" ON public.integration_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- integration_logs
DROP POLICY IF EXISTS "Allow all access to integration_logs" ON public.integration_logs;
CREATE POLICY "Authenticated access to integration_logs" ON public.integration_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- integrations (exclude config from SELECT for non-admin, but since we can't do column-level RLS easily, restrict to authenticated)
DROP POLICY IF EXISTS "Allow all access to integrations" ON public.integrations;
CREATE POLICY "Authenticated access to integrations" ON public.integrations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- notifications
DROP POLICY IF EXISTS "Allow all access to notifications" ON public.notifications;
CREATE POLICY "Authenticated access to notifications" ON public.notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- pipeline_stages
DROP POLICY IF EXISTS "Allow all access to pipeline_stages" ON public.pipeline_stages;
CREATE POLICY "Authenticated access to pipeline_stages" ON public.pipeline_stages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- projects
DROP POLICY IF EXISTS "Allow all access to projects" ON public.projects;
CREATE POLICY "Authenticated access to projects" ON public.projects FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- proposals
DROP POLICY IF EXISTS "Allow all access to proposals" ON public.proposals;
CREATE POLICY "Authenticated access to proposals" ON public.proposals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- push_subscriptions
DROP POLICY IF EXISTS "Allow all operations on push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "Authenticated access to push_subscriptions" ON public.push_subscriptions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- sales_pipeline
DROP POLICY IF EXISTS "Allow all access to sales_pipeline" ON public.sales_pipeline;
CREATE POLICY "Authenticated access to sales_pipeline" ON public.sales_pipeline FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- subtasks
DROP POLICY IF EXISTS "Allow all access to subtasks" ON public.subtasks;
CREATE POLICY "Authenticated access to subtasks" ON public.subtasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- task_assignees
DROP POLICY IF EXISTS "Allow all access to task_assignees" ON public.task_assignees;
CREATE POLICY "Authenticated access to task_assignees" ON public.task_assignees FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- tasks
DROP POLICY IF EXISTS "Allow all access to tasks" ON public.tasks;
CREATE POLICY "Authenticated access to tasks" ON public.tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- team_members
DROP POLICY IF EXISTS "Allow all access to team_members" ON public.team_members;
CREATE POLICY "Authenticated access to team_members" ON public.team_members FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- whatsapp_contact_labels
DROP POLICY IF EXISTS "Allow all access to whatsapp_contact_labels" ON public.whatsapp_contact_labels;
CREATE POLICY "Authenticated access to whatsapp_contact_labels" ON public.whatsapp_contact_labels FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- whatsapp_labels
DROP POLICY IF EXISTS "Allow all access to whatsapp_labels" ON public.whatsapp_labels;
CREATE POLICY "Authenticated access to whatsapp_labels" ON public.whatsapp_labels FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- whatsapp_messages
DROP POLICY IF EXISTS "Allow all access to whatsapp_messages" ON public.whatsapp_messages;
CREATE POLICY "Authenticated access to whatsapp_messages" ON public.whatsapp_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Also fix user_roles SELECT policy to require authentication
DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.user_roles;
CREATE POLICY "Authenticated users can view roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
