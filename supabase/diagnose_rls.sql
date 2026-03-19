-- ============================================================
-- DIAGNÓSTICO RLS — rodar no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. Políticas atuais nas tabelas problemáticas
SELECT tablename, policyname, cmd, roles, qual
FROM pg_policies
WHERE tablename IN ('clients','client_portal_access','team_members','finance')
ORDER BY tablename, policyname;

-- 2. A função is_agency_staff() existe?
SELECT proname, prosecdef, prosrc
FROM pg_proc
WHERE proname = 'is_agency_staff';

-- 3. Triggers na tabela clients (podem tocar client_portal_access)
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'clients';
