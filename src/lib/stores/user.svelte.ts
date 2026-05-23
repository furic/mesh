// Shared reactive state for the current authenticated resident.
//
// The store supports two modes, side-by-side:
//   - Demo mode (today): a persona stored in localStorage. No server round-
//     trip, no real auth — used for showcasing the profile UI before
//     Supabase is provisioned. `session` and `user` are null; `profile`
//     carries the resident's data.
//   - Real mode (Sprint 4 → live): once Supabase is wired, `+layout.svelte`
//     will call `setFromServer({ session, user })` from the page data
//     produced by `hooks.server.ts.safeGetUser`, and `setProfile(row)` with
//     the row fetched from `profiles`. Demo mode's localStorage entry is
//     ignored when a real session is present.
//
// `isAuthenticated` returns true if either mode has populated `profile`, so
// downstream UI can branch on a single flag.

import { browser } from '$app/environment';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '$lib/types';

const LS_KEY = 'mesh.demo_profile.v1';

interface State {
  session: Session | null;
  user:    User | null;
  profile: Profile | null;
}

function readPersisted(): Profile | null {
  if (!browser) return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Profile;
    if (parsed && typeof parsed === 'object' && parsed.id && parsed.display_name) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function writePersisted(profile: Profile | null): void {
  if (!browser) return;
  try {
    if (profile) localStorage.setItem(LS_KEY, JSON.stringify(profile));
    else         localStorage.removeItem(LS_KEY);
  } catch {
    // Quota / private-browsing failure is non-fatal — the store still works
    // in-memory, just doesn't survive a reload.
  }
}

function createStore() {
  const s = $state<State>({ session: null, user: null, profile: null });

  // Hydrate from localStorage on first browser tick. Safe to call again;
  // each call is idempotent.
  function init(): void {
    if (!browser) return;
    if (s.profile) return;          // already populated (e.g. via server data)
    const persisted = readPersisted();
    if (persisted) s.profile = persisted;
  }

  function setFromServer(payload: { session: Session | null; user: User | null }): void {
    s.session = payload.session;
    s.user    = payload.user;
    if (!payload.user) s.profile = null;
  }

  function setProfile(profile: Profile | null): void {
    s.profile = profile;
    writePersisted(profile);
  }

  // Patch in-place (e.g. resident edits display_name or changes suburb).
  function updateProfile(patch: Partial<Profile>): void {
    if (!s.profile) return;
    s.profile = { ...s.profile, ...patch };
    writePersisted(s.profile);
  }

  function signInDemo(profile: Profile): void {
    s.profile = profile;
    writePersisted(profile);
  }

  function signOut(): void {
    s.session = null;
    s.user    = null;
    s.profile = null;
    writePersisted(null);
  }

  return {
    get session()         { return s.session; },
    get user()            { return s.user; },
    get profile()         { return s.profile; },
    get isAuthenticated() { return s.profile !== null; },
    init,
    setFromServer,
    setProfile,
    updateProfile,
    signInDemo,
    signOut,
  };
}

export const userStore = createStore();
