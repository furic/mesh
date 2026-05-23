// Demo personas for one-click sign-in. Stand in for real Supabase Auth users
// until the project is provisioned. Each persona maps 1:1 to the `profiles`
// row shape — when real auth comes online we keep these as seed data and
// only the login flow changes.

import type { Profile } from '$lib/types';

export interface DemoPersona {
  profile:   Profile;
  blurb:     string;        // one-line "about me" for the login card
  joined:    string;        // ISO date, displayed as "joined 3 months ago"
}

// Stable UUIDs so localStorage round-trips don't churn ids between reloads.
export const DEMO_PERSONAS: DemoPersona[] = [
  {
    profile: {
      id:           'b9d7c63a-aa1a-4f63-8d11-2c1cdd5a0a01',
      display_name: 'Maya Carrington',
      avatar_url:   null,
      suburb_id:    'carlton',
      xp_total:     10_120,
      level:        5,
      badges:       ['pioneer', 'generous', 'five_quests', 'pillar_food'],
      is_admin:     false,
      created_at:   '2025-08-12T03:24:00Z',
    },
    blurb:  'Runs a Friday-night community-kitchen swap at Carlton Library.',
    joined: '2025-08-12T03:24:00Z',
  },
  {
    profile: {
      id:           'b9d7c63a-aa1a-4f63-8d11-2c1cdd5a0a02',
      display_name: 'Tom Ng',
      avatar_url:   null,
      suburb_id:    'brunswick',
      xp_total:     1_280,
      level:        2,
      badges:       ['first_quest', 'swift'],
      is_admin:     false,
      created_at:   '2026-02-04T09:00:00Z',
    },
    blurb:  'Cargo-bike commuter, just joined his first food-rescue quest.',
    joined: '2026-02-04T09:00:00Z',
  },
  {
    profile: {
      id:           'b9d7c63a-aa1a-4f63-8d11-2c1cdd5a0a03',
      display_name: 'Sofia Reyes',
      avatar_url:   null,
      suburb_id:    'footscray',
      xp_total:     320,
      level:        1,
      badges:       ['first_quest'],
      is_admin:     false,
      created_at:   '2026-04-29T18:42:00Z',
    },
    blurb:  'Studied urban planning — wants to organise a heatwave check-in.',
    joined: '2026-04-29T18:42:00Z',
  },
  {
    profile: {
      id:           'b9d7c63a-aa1a-4f63-8d11-2c1cdd5a0a04',
      display_name: 'Admin · Demo',
      avatar_url:   null,
      suburb_id:    'carlton',
      xp_total:     0,
      level:        1,
      badges:       [],
      is_admin:     true,
      created_at:   '2025-01-01T00:00:00Z',
    },
    blurb:  'Operator account. Bulk-regenerate every quest with Claude for a live demo.',
    joined: '2025-01-01T00:00:00Z',
  },
];

// Fresh persona used by the "play yourself" flow on /login.
export function freshDemoPersona(name: string, suburbId: string): DemoPersona {
  const id = crypto.randomUUID();
  return {
    profile: {
      id,
      display_name: name.trim() || 'Anonymous Resident',
      avatar_url:   null,
      suburb_id:    suburbId,
      xp_total:     0,
      level:        1,
      badges:       [],
      is_admin:     false,
      created_at:   new Date().toISOString(),
    },
    blurb:  '',
    joined: new Date().toISOString(),
  };
}
