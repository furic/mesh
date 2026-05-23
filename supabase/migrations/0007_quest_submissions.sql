-- Quest submissions: evidence + AI verifier output.

do $$ begin
  create type submission_verdict as enum ('pending', 'approved', 'needs_more', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists quest_submissions (
  id                  uuid primary key default gen_random_uuid(),
  quest_id            uuid references quests(id) on delete cascade,
  user_id             uuid references profiles(id) on delete cascade,
  description         text not null,
  photo_urls          text[] default '{}',
  participant_count   int default 1,
  -- AI Submission Verifier output
  verdict             submission_verdict default 'pending',
  ai_confidence       float check (ai_confidence is null or (ai_confidence between 0 and 1)),
  ai_reason           text,
  xp_multiplier       float default 1.0,
  xp_awarded          int,
  -- Moderation
  needs_human_review  boolean default false,
  reviewed_by         uuid references profiles(id),
  reviewed_at         timestamptz,
  created_at          timestamptz default now()
);

create index if not exists quest_submissions_quest_idx   on quest_submissions (quest_id);
create index if not exists quest_submissions_user_idx    on quest_submissions (user_id);
create index if not exists quest_submissions_verdict_idx on quest_submissions (verdict)
  where verdict in ('pending', 'needs_more');

alter table quest_submissions enable row level security;

create policy "read own submissions" on quest_submissions
  for select using (auth.uid() = user_id);

create policy "insert own submissions" on quest_submissions
  for insert with check (auth.uid() = user_id);
