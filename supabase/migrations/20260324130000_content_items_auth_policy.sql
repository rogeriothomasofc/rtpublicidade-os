-- Permitir qualquer usuário autenticado gerenciar content_items
-- (squad sync roda com login da agência, não precisa ser só admin)
DROP POLICY IF EXISTS "Agency staff can manage content_items" ON public.content_items;

CREATE POLICY "Authenticated users can manage content_items"
  ON public.content_items
  FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
