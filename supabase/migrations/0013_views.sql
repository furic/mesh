-- Derived views. Read-only; security is inherited from the underlying tables.

create or replace view suburb_leaderboard as
select
  s.id,
  s.slug,
  s.name,
  s.r_index,
  s.level,
  s.xp_total,
  count(distinct qp.user_id) filter (where qp.user_id is not null) as active_residents,
  count(distinct q.id)       filter (where q.status = 'active')    as active_quests
from suburbs s
left join quests q              on q.suburb_id = s.id
left join quest_participants qp on qp.quest_id = q.id
group by s.id
order by s.r_index desc;
