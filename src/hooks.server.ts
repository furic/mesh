// Per-request Supabase server client + session retrieval.
// Pattern follows the official @supabase/ssr SvelteKit guide.
//
// Behaviour when env is unconfigured: the hook still runs and attaches a stub
// `locals.supabase` so existing routes (advisor, narrator, quests) that import
// MOCK_SUBURBS but never actually call DB methods continue to work in dev. Once
// PUBLIC_SUPABASE_URL + PUBLIC_SUPABASE_ANON_KEY are set, the real SSR client
// takes over automatically.

import { createServerClient } from '@supabase/ssr';
import { env as publicEnv } from '$env/dynamic/public';
import type { Handle } from '@sveltejs/kit';
import type { SupabaseClient, Session, User } from '@supabase/supabase-js';
import type { Database } from '$lib/types/db';

const supabaseUrl     = publicEnv.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = publicEnv.PUBLIC_SUPABASE_ANON_KEY;
const supabaseReady   = Boolean(supabaseUrl && supabaseAnonKey);

export const handle: Handle = async ({ event, resolve }) => {
  if (supabaseReady) {
    event.locals.supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => event.cookies.getAll(),
        setAll: (cookies) => {
          for (const { name, value, options } of cookies) {
            event.cookies.set(name, value, { ...options, path: '/' });
          }
        },
      },
    });

    event.locals.safeGetUser = async () => {
      const {
        data: { session },
      } = await event.locals.supabase.auth.getSession();
      if (!session) return { session: null, user: null };
      // Per Supabase docs: never trust getSession() alone server-side — call
      // getUser() to revalidate the JWT against the auth server.
      const {
        data: { user },
        error,
      } = await event.locals.supabase.auth.getUser();
      if (error) return { session: null, user: null };
      return { session, user };
    };
  } else {
    event.locals.supabase    = stubClient();
    event.locals.safeGetUser = async () => ({ session: null, user: null });
  }

  return resolve(event, {
    filterSerializedResponseHeaders: (name) => name === 'content-range' || name === 'x-supabase-api-version',
  });
};

// Minimal stub that satisfies SupabaseClient<Database> at the type level when
// the env isn't configured yet. Any actual call throws clearly. This keeps
// existing routes that only import MOCK_SUBURBS working in dev.
function stubClient(): SupabaseClient<Database> {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === 'then') return undefined; // not a thenable
      return new Proxy(() => {}, handler);
    },
    apply() {
      throw new Error(
        'Supabase client is not configured. Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY in .env.local.',
      );
    },
  };
  return new Proxy({}, handler) as SupabaseClient<Database>;
}

// Re-export for ergonomic imports.
export type { Session, User };
