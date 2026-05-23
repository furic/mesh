-- Suburbs: one row per Melbourne suburb. Seeded from VIC open data + a
-- hand-curated SEIFA reference (see src/lib/data/seifa-reference.ts).
-- r_index is a generated column — never write to it directly.

create table if not exists suburbs (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,                    -- e.g. 'carlton', stable URL key
  name          text not null unique,                    -- e.g. 'Carlton'
  postcode      text,
  lga           text,                                    -- Local Government Area
  location      geography(point, 4326),                  -- centroid
  geojson       jsonb,                                   -- boundary polygon (optional)
  seifa_score   int check (seifa_score between 1 and 10),
  population    int,
  score_food        int default 0 check (score_food between 0 and 100),
  score_skills      int default 0 check (score_skills between 0 and 100),
  score_resources   int default 0 check (score_resources between 0 and 100),
  score_social      int default 0 check (score_social between 0 and 100),
  score_emergency   int default 0 check (score_emergency between 0 and 100),
  r_index           int generated always as (
    (score_food + score_skills + score_resources + score_social + score_emergency) / 5
  ) stored,
  xp_total      bigint default 0,
  level         int default 1,
  data_source   text default 'mock',                     -- 'real' | 'partial' | 'mock'
  updated_at    timestamptz default now()
);

create index if not exists suburbs_location_gix on suburbs using gist (location);
create index if not exists suburbs_r_index_idx on suburbs (r_index desc);

alter table suburbs enable row level security;
create policy "public read suburbs" on suburbs
  for select using (true);
