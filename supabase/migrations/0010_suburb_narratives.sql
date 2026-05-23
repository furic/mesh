-- Suburb narratives: weekly AI-generated digests (Suburb Narrator agent).
-- One row per (suburb, week_start). Cached for 7 days per cost guardrail.

create table if not exists suburb_narratives (
  id            uuid primary key default gen_random_uuid(),
  suburb_id     uuid references suburbs(id) on delete cascade not null,
  week_start    date not null,
  narrative     text not null,
  score_delta   jsonb,                                   -- { food: +4, skills: -1, ... }
  focus_pillar  quest_pillar,
  created_at    timestamptz default now(),
  unique (suburb_id, week_start)
);

create index if not exists suburb_narratives_suburb_week_idx
  on suburb_narratives (suburb_id, week_start desc);

alter table suburb_narratives enable row level security;

create policy "public read narratives" on suburb_narratives
  for select using (true);
