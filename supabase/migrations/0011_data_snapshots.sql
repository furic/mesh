-- Data snapshots: append-only log of suburb data at each open-data sync.
-- Consumed by the Anomaly Watcher agent to diff against the previous snapshot.

create table if not exists data_snapshots (
  id          uuid primary key default gen_random_uuid(),
  suburb_id   uuid references suburbs(id) on delete cascade,
  snapshot    jsonb not null,
  synced_at   timestamptz default now()
);

create index if not exists data_snapshots_suburb_time_idx
  on data_snapshots (suburb_id, synced_at desc);

-- Snapshots are an internal audit log; not exposed via PostgREST.
alter table data_snapshots enable row level security;
-- No policies = no access via the anon/authenticated roles. Service role
-- (used by edge functions) bypasses RLS and can read/write freely.
