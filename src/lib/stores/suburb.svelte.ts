// Shared reactive state for the suburb the resident is currently focused on.
// The globe page writes here when a node is clicked; downstream components
// (AdvisorChat, quest board) read from here.
//
// `all` is intentionally seeded from MOCK_SUBURBS at module load — once
// Supabase is wired, `loadFromDb(client)` replaces it with a real query.

import { MOCK_SUBURBS } from '$lib/data/mock-suburbs';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/db';
import type { Suburb } from '$lib/types';

function createStore() {
  const s = $state<{ all: Suburb[]; current: Suburb | null }>({
    all:     MOCK_SUBURBS,
    current: null,
  });

  function setCurrent(suburb: Suburb | null) {
    s.current = suburb;
  }

  function setCurrentById(id: string) {
    s.current = s.all.find((sub) => sub.id === id) ?? null;
  }

  // Loads the full suburb list from Supabase, transforming the flat score_*
  // columns into the nested `scores` shape that the existing UI expects.
  async function loadFromDb(client: SupabaseClient<Database>): Promise<void> {
    const { data, error } = await client.from('suburbs').select('*').order('r_index', { ascending: false });
    if (error) throw error;
    s.all = (data ?? []).map((row): Suburb => ({
      id:          row.slug,
      name:        row.name,
      postcode:    row.postcode ?? '',
      lat:         0,                 // populated once we extract from PostGIS WKT
      lng:         0,
      seifa_score: row.seifa_score ?? 5,
      population:  row.population ?? 0,
      scores: {
        food:      row.score_food,
        skills:    row.score_skills,
        resources: row.score_resources,
        social:    row.score_social,
        emergency: row.score_emergency,
      },
      r_index:  row.r_index,
      xp_total: Number(row.xp_total),
      level:    row.level,
    }));
  }

  return {
    get all()     { return s.all; },
    get current() { return s.current; },
    setCurrent,
    setCurrentById,
    loadFromDb,
  };
}

export const suburbStore = createStore();
