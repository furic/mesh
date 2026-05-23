-- Community-relevant facilities sourced from
-- data.melbourne.vic.gov.au / landmarks-and-places-of-interest...
--
-- Schema pivot: SPRINT_PLAN.md originally specified separate community_orgs
-- and community_gardens tables, but the upstream `community-garden-locations`
-- dataset has been retired by data.melbourne.vic.gov.au. We instead source a
-- broader set of facility types (schools, health services, sports, places of
-- worship, galleries) from the landmarks dataset, keyed on theme/sub_theme.

create table if not exists community_facilities (
  id          uuid primary key default gen_random_uuid(),
  suburb_id   uuid references suburbs(id) on delete cascade,
  source      text not null,                       -- e.g. 'data.melbourne.vic.gov.au:landmarks'
  source_id   text,                                -- external id when available
  theme       text not null,                       -- e.g. 'Education Centre'
  sub_theme   text,                                -- e.g. 'Primary Schools'
  name        text not null,
  location    geography(point, 4326) not null,
  created_at  timestamptz default now(),
  unique (source, source_id) deferrable initially deferred
);

create index if not exists community_facilities_location_gix
  on community_facilities using gist (location);
create index if not exists community_facilities_suburb_idx
  on community_facilities (suburb_id);
create index if not exists community_facilities_theme_idx
  on community_facilities (theme);

alter table community_facilities enable row level security;
create policy "public read facilities" on community_facilities
  for select using (true);
