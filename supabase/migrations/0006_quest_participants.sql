-- Quest participants: residents who have joined a quest.

create table if not exists quest_participants (
  id         uuid primary key default gen_random_uuid(),
  quest_id   uuid references quests(id) on delete cascade,
  user_id    uuid references profiles(id) on delete cascade,
  joined_at  timestamptz default now(),
  unique (quest_id, user_id)
);

create index if not exists quest_participants_quest_idx on quest_participants (quest_id);
create index if not exists quest_participants_user_idx  on quest_participants (user_id);

alter table quest_participants enable row level security;

create policy "read participants" on quest_participants
  for select using (true);

create policy "join own" on quest_participants
  for insert with check (auth.uid() = user_id);

create policy "leave own" on quest_participants
  for delete using (auth.uid() = user_id);
