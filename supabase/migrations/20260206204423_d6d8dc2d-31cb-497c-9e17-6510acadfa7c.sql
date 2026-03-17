-- Create storage bucket for WhatsApp media
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-media', 'whatsapp-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read (public bucket)
CREATE POLICY "WhatsApp media is publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'whatsapp-media');

-- Allow authenticated and anon to upload
CREATE POLICY "Anyone can upload whatsapp media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'whatsapp-media');

-- Add media columns to whatsapp_messages
ALTER TABLE public.whatsapp_messages 
ADD COLUMN IF NOT EXISTS media_type text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS media_url text DEFAULT NULL;
