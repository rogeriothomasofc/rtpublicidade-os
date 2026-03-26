create table if not exists gmb_leads (
  id uuid primary key default gen_random_uuid(),
  nome_empresa text not null,
  telefone text,
  whatsapp_jid text,
  endereco text,
  website text,
  rating numeric(2,1),
  reviews integer,
  especialidades text,
  status text not null default 'Novo'
    check (status in ('Novo','Contatado','Respondeu','Reunião Marcada','Proposta Enviada','Ganho','Perdido')),
  notes text,
  mensagem_enviada text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at_gmb_leads
  before update on gmb_leads
  for each row execute function update_updated_at_column();

alter table gmb_leads enable row level security;

create policy "allow_all_gmb_leads"
  on gmb_leads for all
  using (true)
  with check (true);

grant all on table gmb_leads to anon, authenticated, service_role;
