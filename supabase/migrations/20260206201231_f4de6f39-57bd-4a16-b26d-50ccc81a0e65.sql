
-- Table to store WhatsApp messages exchanged with leads
CREATE TABLE public.whatsapp_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.sales_pipeline(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('sent', 'received')),
  message TEXT NOT NULL,
  status TEXT DEFAULT 'sent',
  external_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups by lead
CREATE INDEX idx_whatsapp_messages_lead ON public.whatsapp_messages(lead_id, created_at);
CREATE INDEX idx_whatsapp_messages_phone ON public.whatsapp_messages(phone, created_at);

-- Enable RLS
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Allow all operations (no auth in this project)
CREATE POLICY "Allow all access to whatsapp_messages"
  ON public.whatsapp_messages
  FOR ALL
  USING (true)
  WITH CHECK (true);
