-- Adiciona número de WhatsApp aos membros da equipe
-- Usado para identificar quem enviou mensagem no grupo e associar à tarefa

ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

COMMENT ON COLUMN team_members.whatsapp_number IS 'Número WhatsApp no formato 5511999999999 (sem + ou espaços)';
