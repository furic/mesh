// Shared reactive state for the current authenticated resident.
// Populated by `+layout.svelte` from server-side data; the auth flow
// (login routes + onAuthStateChange listener) lands in Sprint 4.
//
// While the auth flow is not yet wired, the store remains empty and every
// reader sees `user = null, profile = null`. This is safe by construction —
// any UI that depends on a logged-in user should branch on `userStore.user`.

import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '$lib/types';

interface State {
  session: Session | null;
  user:    User | null;
  profile: Profile | null;
}

function createStore() {
  const s = $state<State>({ session: null, user: null, profile: null });

  function setFromServer(payload: { session: Session | null; user: User | null }) {
    s.session = payload.session;
    s.user    = payload.user;
    if (!payload.user) s.profile = null;
  }

  function setProfile(profile: Profile | null) {
    s.profile = profile;
  }

  function clear() {
    s.session = null;
    s.user    = null;
    s.profile = null;
  }

  return {
    get session() { return s.session; },
    get user()    { return s.user; },
    get profile() { return s.profile; },
    get isAuthenticated() { return s.user !== null; },
    setFromServer,
    setProfile,
    clear,
  };
}

export const userStore = createStore();
