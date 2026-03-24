-- Garantir que os roles têm acesso à tabela content_items
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_items TO anon;
