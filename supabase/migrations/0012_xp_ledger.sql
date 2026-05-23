-- XP ledger: append-only audit log of every XP award.
-- profiles.xp_total and suburbs.xp_total are aggregates maintained by app
-- logic; this is the source of truth for any given award.

create table if not exists xp_ledger (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references profiles(id) on delete cascade,
  suburb_id     uuid references suburbs(id) on delete cascade,
  amount        int not null,
  reason        text not null,                           -- 'quest_complete', 'resource_posted', etc.
  reference_id  uuid,                                    -- quest_id / resource_id / submission_id
  created_at    timestamptz default now()
);

create index if not exists xp_ledger_user_idx   on xp_ledger (user_id, created_at desc);
create index if not exists xp_ledger_suburb_idx on xp_ledger (suburb_id, created_at desc);

alter table xp_ledger enable row level security;

create policy "read own ledger" on xp_ledger
  for select using (auth.uid() = user_id);
