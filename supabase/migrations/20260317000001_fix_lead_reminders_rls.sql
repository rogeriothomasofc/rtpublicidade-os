-- ============================================================
-- CORREÇÃO DE SEGURANÇA: RLS da tabela lead_reminders
-- ============================================================
-- A política anterior usava USING (true) deixando todos os
-- lembretes visíveis para qualquer usuário autenticado.
-- Esta migration adiciona created_by e restringe o acesso.
-- ============================================================

-- 1. Adicionar coluna created_by para rastrear o dono do lembrete
ALTER TABLE public.lead_reminders
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Preencher created_by nos registros existentes com o primeiro admin
--    (registros órfãos ficam como NULL — a nova policy os protege igualmente)
UPDATE public.lead_reminders
SET created_by = (
  SELECT u.id FROM auth.users u
  JOIN public.user_roles ur ON ur.user_id = u.id
  WHERE ur.role = 'admin'
  LIMIT 1
)
WHERE created_by IS NULL;

-- 3. Remover a política aberta antiga
DROP POLICY IF EXISTS "Users can manage reminders" ON public.lead_reminders;

-- 4. Política para admins: acesso total a todos os lembretes
CREATE POLICY "Admins can manage all lead_reminders"
ON public.lead_reminders
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Política para membros autenticados não-admin:
--    só veem e gerenciam os lembretes que eles mesmos criaram
CREATE POLICY "Members can manage own lead_reminders"
ON public.lead_reminders
FOR ALL
TO authenticated
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- 6. Índice para performance nas queries filtradas por created_by
CREATE INDEX IF NOT EXISTS idx_lead_reminders_created_by
  ON public.lead_reminders (created_by);
