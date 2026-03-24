-- Adicionar coluna de URLs de imagens para conteúdo gerado pelo squad
ALTER TABLE public.content_items
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS run_id TEXT;

-- Bucket público para imagens de conteúdo gerado pelo squad
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'content-images',
  'content-images',
  true,
  10485760, -- 10MB por arquivo
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Qualquer autenticado pode fazer upload
CREATE POLICY "Agency staff can upload content images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'content-images'
    AND public.is_agency_staff()
  );

-- Imagens são públicas (necessário para Instagram API)
CREATE POLICY "Content images are public"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'content-images');

-- Agency staff pode deletar
CREATE POLICY "Agency staff can delete content images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'content-images'
    AND public.is_agency_staff()
  );
