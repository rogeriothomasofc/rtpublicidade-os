-- Replace all pipeline stages with the agency's preferred flow
-- System stages keep their internal name (Ganho / Perdido) so app logic still works;
-- only their display_name is updated.

DELETE FROM public.pipeline_stages;

INSERT INTO public.pipeline_stages (name, display_name, description, probability, position, is_system)
VALUES
  ('ATENDIMENTO_INICIA', 'Atendimento Inicial', 'Primeiro contato com o lead',          10,  0, false),
  ('QUALIFICACAO',       'Qualificação',        'Avaliação do potencial do lead',         25,  1, false),
  ('NEGOCIACAO',         'Negociação',          'Proposta em discussão',                  50,  2, false),
  ('FOLLOW_UP',          'Follow-up',           'Aguardando retorno do lead',             60,  3, false),
  ('VAI_PENSAR',         'Vai Pensar',          'Lead pediu um tempo para decidir',       40,  4, false),
  ('Ganho',              'Fechados',            'Negócio fechado — contrato assinado',   100,  5, true),
  ('CLIENTES',           'Clientes',            'Lead convertido em cliente ativo',      100,  6, false),
  ('Perdido',            'Perdidos',            'Negociação encerrada sem conversão',      0,  7, true);
