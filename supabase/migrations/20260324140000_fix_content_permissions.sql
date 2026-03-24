-- Fix: storage UPDATE policy + content_items open to authenticated

-- Storage: permitir UPDATE (upsert) para autenticados
CREATE POLICY "Authenticated can update content images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'content-images')
  WITH CHECK (bucket_id = 'content-images');

-- content_items: garantir que todas as operações funcionam para autenticados
-- (drop todas as policies existentes e recriar de forma limpa)
DO $$
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.content_items;', E'\n')
    FROM pg_policies
    WHERE tablename = 'content_items' AND schemaname = 'public'
  );
END $$;

CREATE POLICY "Authenticated full access to content_items"
  ON public.content_items
  FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
