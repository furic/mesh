// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

// Minimal Supabase shape — narrowed to what the advisor endpoint reads today.
// Sprint 2 replaces this with the typed client returned by `supabase gen types`.
interface SupabaseStub {
  from(table: string): {
    select(columns: string): {
      eq(col: string, val: unknown): {
        eq(col: string, val: unknown): {
          single(): Promise<{ data: unknown }>
        }
      }
    }
  }
}

declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      supabase: SupabaseStub
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
