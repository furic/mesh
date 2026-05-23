-- Profiles: one row per authenticated resident.
-- Extends auth.users 1:1. Created on signup via a trigger (see below).

create table if not exists profiles (
  id            uuid primary key references auth.users on delete cascade,
  display_name  text,
  avatar_url    text,
  suburb_id     uuid references suburbs(id),
  xp_total      bigint default 0,
  level         int default 1,
  badges        text[] default '{}',
  created_at    timestamptz default now()
);

create index if not exists profiles_suburb_idx on profiles (suburb_id);

alter table profiles enable row level security;

create policy "read own profile" on profiles
  for select using (auth.uid() = id);

create policy "update own profile" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "insert own profile" on profiles
  for insert with check (auth.uid() = id);

-- Auto-create a profile row when a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
