// Shared reactive state for AI-generated quests.
// Both /quests and the AdvisorChat write/read through this store so that a
// quest generated from a chat conversation immediately appears on the board.
//
// Persistence model:
//   - On init(), each suburb that doesn't already have a quest is seeded
//     from SEEDED_QUESTS (hand-curated starters).
//   - Anything you generate yourself is written to localStorage under the
//     LS_KEY below, so it survives a refresh. Seeded starters are NOT
//     written — they're treated as defaults and only displayed if the
//     localStorage entry is absent. This way, generating a new Carlton
//     quest replaces the seeded one and survives, while a sign-out + LS
//     wipe brings the seeded starter back.

import { browser } from '$app/environment'
import type { GeneratedQuest } from '$lib/types'
import { SEEDED_QUESTS } from '$lib/data/seeded-quests'

export type QuestSource = 'seed' | 'ai' | null

interface Slot {
  quest:   GeneratedQuest | null
  loading: boolean
  error:   string | null
  source:  QuestSource          // 'seed' = hand-curated, 'ai' = Claude
}

export interface GenerateOpts {
  messages?: { role: 'user' | 'assistant'; content: string }[]
}

const EMPTY_SLOT: Slot = Object.freeze({ quest: null, loading: false, error: null, source: null }) as Slot
const LS_KEY = 'mesh.user_quests.v1'

function readPersisted(): Record<string, GeneratedQuest> {
  if (!browser) return {}
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, GeneratedQuest>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writePersisted(map: Record<string, GeneratedQuest>): void {
  if (!browser) return
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(map))
  } catch {
    // Quota / private-browsing — fail silent.
  }
}

function createStore() {
  const slots = $state<Record<string, Slot>>({})
  // Tracks which suburbs hold user-generated quests (vs. seeded defaults).
  // Only user-generated quests persist to localStorage.
  let userGenerated: Record<string, GeneratedQuest> = {}
  let hydrated = false

  function slot(suburbId: string): Slot {
    return slots[suburbId] ?? EMPTY_SLOT
  }

  function ensure(suburbId: string): Slot {
    if (!slots[suburbId]) {
      slots[suburbId] = { quest: null, loading: false, error: null, source: null }
    }
    return slots[suburbId]
  }

  // Hydrate: prefer a persisted user-generated quest, otherwise fall back to
  // a hand-curated seeded starter. Idempotent.
  function init(): void {
    if (hydrated) return
    hydrated = true
    userGenerated = readPersisted()
    for (const id of new Set([...Object.keys(SEEDED_QUESTS), ...Object.keys(userGenerated)])) {
      const cell = ensure(id)
      if (userGenerated[id]) {
        cell.quest  = userGenerated[id]
        cell.source = 'ai'
      } else if (SEEDED_QUESTS[id]) {
        cell.quest  = SEEDED_QUESTS[id]
        cell.source = 'seed'
      }
    }
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
      s.quest  = data.quest
      s.source = 'ai'
      userGenerated[suburbId] = data.quest
      writePersisted(userGenerated)
      return data.quest
    } catch (e) {
      s.error = e instanceof Error ? e.message : String(e)
      return null
    } finally {
      s.loading = false
    }
  }

  // Drop a user-generated quest and fall back to the seeded starter (or empty).
  function reset(suburbId: string): void {
    const cell = ensure(suburbId)
    delete userGenerated[suburbId]
    writePersisted(userGenerated)
    cell.quest  = SEEDED_QUESTS[suburbId] ?? null
    cell.source = SEEDED_QUESTS[suburbId] ? 'seed' : null
    cell.error  = null
  }

  return {
    slot,
    ensure,
    generate,
    init,
    reset,
    get all() { return slots },
  }
}

export const questStore = createStore()
