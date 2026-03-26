alter table instagram_prospects
  add column if not exists website_issues jsonb,
  add column if not exists google_rating numeric(2,1),
  add column if not exists google_reviews_count integer,
  add column if not exists google_address text,
  add column if not exists diagnosis_report text;

grant all on table instagram_prospects to anon, authenticated, service_role;
