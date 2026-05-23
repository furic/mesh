-- Resources: the circular-economy exchange board.

do $$ begin
  create type resource_type as enum ('offer', 'need');
exception when duplicate_object then null; end $$;

do $$ begin
  create type resource_category as enum (
    'food', 'tools', 'skills', 'space', 'materials', 'transport', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type resource_status as enum ('open', 'matched', 'closed');
exception when duplicate_object then null; end $$;

create table if not exists resources (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references profiles(id) on delete cascade,
  suburb_id     uuid references suburbs(id),
  type          resource_type not null,
  category      resource_category not null,
  title         text not null,
  description   text not null,
  quantity      text,
  is_perishable boolean default false,
  expires_at    timestamptz,
  status        resource_status default 'open',
  match_ids     uuid[] default '{}',
  location      geography(point, 4326),                  -- denormalised from suburb for <-> queries
  created_at    timestamptz default now()
);

create index if not exists resources_location_gix on resources using gist (location);
create index if not exists resources_status_idx   on resources (status);
create index if not exists resources_user_idx     on resources (user_id);

alter table resources enable row level security;

create policy "public read open resources" on resources
  for select using (status = 'open');

create policy "read own resources" on resources
  for select using (auth.uid() = user_id);

create policy "insert own resources" on resources
  for insert with check (auth.uid() = user_id);

create policy "update own resources" on resources
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
