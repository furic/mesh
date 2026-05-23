// Shared reactive state for AI-generated quests.
// Both /quests and the AdvisorChat write/read through this store so that a
// quest generated from a chat conversation immediately appears on the board.
//
// Pure in-memory for now — persistence lands when Supabase is wired.

import type { GeneratedQuest } from '$lib/types'

interface Slot {
  quest:   GeneratedQuest | null
  loading: boolean
  error:   string | null
}

export interface GenerateOpts {
  messages?: { role: 'user' | 'assistant'; content: string }[]
}

const EMPTY_SLOT: Slot = Object.freeze({ quest: null, loading: false, error: null }) as Slot

function createStore() {
  const slots = $state<Record<string, Slot>>({})

  // Read-only lookup: never mutates state, so it's safe inside `$derived`.
  function slot(suburbId: string): Slot {
    return slots[suburbId] ?? EMPTY_SLOT
  }

  function ensure(suburbId: string): Slot {
    if (!slots[suburbId]) {
      slots[suburbId] = { quest: null, loading: false, error: null }
    }
    return slots[suburbId]
  }

  async function generate(suburbId: string, opts: GenerateOpts = {}): Promise<GeneratedQuest | null> {
    const s = ensure(suburbId)
    s.loading = true
    s.error = null

    try {
      const res = await fetch('/api/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suburb_id: suburbId, messages: opts.messages }),
      })
      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        throw new Error(detail || `HTTP ${res.status}`)
      }
      const data = (await res.json()) as { quest: GeneratedQuest }
      s.quest = data.quest
      return data.quest
    } catch (e) {
      s.error = e instanceof Error ? e.message : String(e)
      return null
    } finally {
      s.loading = false
    }
  }

  return {
    slot,
    ensure,
    generate,
    get all() { return slots },
  }
}

export const questStore = createStore()
