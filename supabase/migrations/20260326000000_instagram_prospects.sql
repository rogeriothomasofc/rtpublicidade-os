create table if not exists instagram_prospects (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  full_name text,
  bio text,
  followers_count integer,
  following_count integer,
  posts_count integer,
  engagement_rate numeric(5,2),
  niche text,
  website text,
  whatsapp text,
  email text,
  profile_url text generated always as ('https://instagram.com/' || username) stored,
  -- IA gerada
  ai_analysis text,
  ai_dm_message text,
  ai_proposal_brief text,
  ai_creative_concept text,
  -- Status de prospecção
  status text not null default 'Identificado'
    check (status in ('Identificado','Mensagem Enviada','Respondeu','Reunião Marcada','Proposta Enviada','Ganho','Perdido')),
  meeting_date timestamptz,
  loss_reason text,
  notes text,
  -- Conversão para pipeline
  pipeline_lead_id uuid references sales_pipeline(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at_instagram_prospects
  before update on instagram_prospects
  for each row execute function update_updated_at_column();

alter table instagram_prospects enable row level security;

create policy "allow_all_instagram_prospects"
  on instagram_prospects for all
  using (true)
  with check (true);

grant all on table instagram_prospects to anon, authenticated, service_role;
