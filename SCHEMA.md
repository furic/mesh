# MESH — Database Schema

Supabase (PostgreSQL + PostGIS). All tables use UUID primary keys.
RLS enabled on every table.

---

## Core tables

### `suburbs`
Seeded from VIC open data. One row per Melbourne suburb.

```sql
create table suburbs (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  postcode     text,
  lga          text,                          -- Local Government Area
  location     geography(point, 4326),        -- PostGIS lat/lng centroid
  geojson      jsonb,                         -- Full boundary polygon
  seifa_score  int,                           -- 1–10 disadvantage index
  population   int,
  -- Resilience pillars (0–100 each, updated weekly)
  score_food           int default 0,
  score_skills         int default 0,
  score_resources      int default 0,
  score_social         int default 0,
  score_emergency      int default 0,
  r_index              int generated always as (
    (score_food + score_skills + score_resources + score_social + score_emergency) / 5
  ) stored,
  xp_total     bigint default 0,
  level        int default 1,
  updated_at   timestamptz default now()
);

create index on suburbs using gist (location);
```

---

### `profiles`
Extends Supabase Auth `auth.users`. One row per resident.

```sql
create table profiles (
  id           uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar_url   text,
  suburb_id    uuid references suburbs(id),
  xp_total     bigint default 0,
  level        int default 1,
  badges       text[] default '{}',
  created_at   timestamptz default now()
);

-- RLS: residents can only read/update their own row
alter table profiles enable row level security;
create policy "own profile" on profiles
  using (auth.uid() = id)
  with check (auth.uid() = id);
```

---

### `quests`

```sql
create type quest_status as enum ('draft', 'active', 'completed', 'expired');
create type quest_pillar as enum (
  'food_security', 'skill_density', 'resource_sharing',
  'social_connectivity', 'emergency_preparedness'
);
create type quest_difficulty as enum ('easy', 'medium', 'hard');
create type quest_source as enum ('ai_generated', 'resident_proposed', 'council');

create table quests (
  id              uuid primary key default gen_random_uuid(),
  suburb_id       uuid references suburbs(id) not null,
  title           text not null,
  description     text not null,
  pillar          quest_pillar not null,
  difficulty      quest_difficulty not null,
  source          quest_source default 'ai_generated',
  xp_reward       int not null,
  steps           jsonb not null default '[]', -- [{order, description, completed}]
  participant_target int default 3,
  status          quest_status default 'draft',
  expires_at      timestamptz,
  -- AI generation metadata
  ai_rationale    text,
  data_snapshot   jsonb,  -- suburb data used at generation time
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Public read, only service role can insert (AI agent inserts via service key)
alter table quests enable row level security;
create policy "public read active quests" on quests
  for select using (status = 'active');
```

---

### `quest_participants`

```sql
create table quest_participants (
  id         uuid primary key default gen_random_uuid(),
  quest_id   uuid references quests(id) on delete cascade,
  user_id    uuid references profiles(id) on delete cascade,
  joined_at  timestamptz default now(),
  unique (quest_id, user_id)
);

alter table quest_participants enable row level security;
create policy "own participation" on quest_participants
  using (auth.uid() = user_id);
create policy "read all for quest" on quest_participants
  for select using (true);
```

---

### `quest_submissions`
Evidence submitted when a resident claims completion.

```sql
create type submission_verdict as enum ('pending', 'approved', 'needs_more', 'rejected');

create table quest_submissions (
  id              uuid primary key default gen_random_uuid(),
  quest_id        uuid references quests(id) on delete cascade,
  user_id         uuid references profiles(id) on delete cascade,
  description     text not null,
  photo_urls      text[] default '{}',
  participant_count int default 1,
  -- AI verifier output
  verdict         submission_verdict default 'pending',
  ai_confidence   float,            -- 0.0–1.0
  ai_reason       text,
  xp_multiplier   float default 1.0,
  xp_awarded      int,
  -- Moderation
  needs_human_review boolean default false,
  reviewed_by     uuid references profiles(id),
  reviewed_at     timestamptz,
  created_at      timestamptz default now()
);

alter table quest_submissions enable row level security;
create policy "own submissions" on quest_submissions
  using (auth.uid() = user_id);
```

---

### `resources`
The circular economy exchange board.

```sql
create type resource_type as enum ('offer', 'need');
create type resource_category as enum (
  'food', 'tools', 'skills', 'space', 'materials', 'transport', 'other'
);
create type resource_status as enum ('open', 'matched', 'closed');

create table resources (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references profiles(id) on delete cascade,
  suburb_id    uuid references suburbs(id),
  type         resource_type not null,
  category     resource_category not null,
  title        text not null,
  description  text not null,
  quantity     text,               -- "10kg", "1 drill", "2 hrs/week"
  is_perishable boolean default false,
  expires_at   timestamptz,
  status       resource_status default 'open',
  -- AI matchmaker output
  match_ids    uuid[] default '{}', -- matched resource UUIDs
  created_at   timestamptz default now()
);

alter table resources enable row level security;
create policy "public read open resources" on resources
  for select using (status = 'open');
create policy "own resources" on resources
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

---

### `resource_matches`
When the AI matchmaker pairs a supply with a demand.

```sql
create table resource_matches (
  id           uuid primary key default gen_random_uuid(),
  resource_a   uuid references resources(id),
  resource_b   uuid references resources(id),
  ai_reason    text,
  intro_message text,  -- draft intro generated by Claude
  suburb_a     uuid references suburbs(id),
  suburb_b     uuid references suburbs(id),
  created_at   timestamptz default now()
);
```

---

### `suburb_narratives`
Weekly AI-generated suburb health digests.

```sql
create table suburb_narratives (
  id           uuid primary key default gen_random_uuid(),
  suburb_id    uuid references suburbs(id) not null,
  week_start   date not null,
  narrative    text not null,
  score_delta  jsonb,   -- { food: +4, skills: -1, ... }
  focus_pillar quest_pillar,
  created_at   timestamptz default now(),
  unique (suburb_id, week_start)
);
```

---

### `data_snapshots`
For the Anomaly Watcher — diffs between data syncs.

```sql
create table data_snapshots (
  id           uuid primary key default gen_random_uuid(),
  suburb_id    uuid references suburbs(id),
  snapshot     jsonb not null,
  synced_at    timestamptz default now()
);

create index on data_snapshots (suburb_id, synced_at desc);
```

---

### `xp_ledger`
Immutable audit log of every XP award.

```sql
create table xp_ledger (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references profiles(id),
  suburb_id    uuid references suburbs(id),
  amount       int not null,
  reason       text not null,   -- 'quest_complete', 'resource_posted', etc.
  reference_id uuid,            -- quest_id or resource_id or submission_id
  created_at   timestamptz default now()
);
```

---

## Useful views

```sql
-- Suburb leaderboard
create view suburb_leaderboard as
select
  s.id, s.name, s.r_index, s.level, s.xp_total,
  count(distinct qp.user_id) as active_residents,
  count(distinct q.id) filter (where q.status = 'active') as active_quests
from suburbs s
left join quests q on q.suburb_id = s.id
left join quest_participants qp on qp.quest_id = q.id
group by s.id
order by s.r_index desc;
```
