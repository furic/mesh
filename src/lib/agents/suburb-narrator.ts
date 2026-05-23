// src/lib/agents/suburb-narrator.ts

import { callClaude } from './_base'
import type { QuestPillar } from './quest-generator'

export interface NarratorInput {
  suburb_name: string
  r_index: number
  score_deltas: Record<QuestPillar, number>   // e.g. { food_security: +4, skill_density: -1 }
  completed_quests: string[]                  // quest titles completed this week
  new_resources_posted: number
  active_resident_count: number
  weakest_pillar: QuestPillar
  weakest_score: number
  neighbour_comparison?: string               // e.g. "above average for inner-north"
}

const NARRATOR_SYSTEM = `
You are a friendly community correspondent writing a weekly resilience update
for a Melbourne suburb on a civic platform called MESH.

TONE: Warm, plain Australian English. Encouraging but grounded. Not corporate.
Not preachy. Reference real numbers and quest names — don't be vague.
Acknowledge both progress AND gaps honestly.

STRUCTURE:
1. What changed this week (score deltas, completed quests)
2. Where the suburb still needs work (weakest pillar, specific gap)
3. One clear suggested focus for the coming week

LENGTH: 2–3 short paragraphs. Plain text only. No markdown, no headers.
`.trim()

export async function narrateSuburb(input: NarratorInput): Promise<string> {
  const deltaLines = Object.entries(input.score_deltas)
    .filter(([, delta]) => delta !== 0)
    .map(([pillar, delta]) => `  ${pillar}: ${delta > 0 ? '+' : ''}${delta}`)
    .join('\n') || '  No change this week'

  const userContent = `
Suburb: ${input.suburb_name}
Current R-Index: ${input.r_index}/100
Neighbour context: ${input.neighbour_comparison ?? 'no comparison available'}

Score changes this week:
${deltaLines}

Completed quests this week:
${input.completed_quests.length > 0
  ? input.completed_quests.map(q => `  - "${q}"`).join('\n')
  : '  - none'}

New resources posted: ${input.new_resources_posted}
Active residents this week: ${input.active_resident_count}

Weakest pillar: ${input.weakest_pillar} (score: ${input.weakest_score}/100)

Write the weekly suburb update.
`.trim()

  return callClaude(NARRATOR_SYSTEM, userContent, 600)
}

// ─────────────────────────────────────────────────────────────────────────────
// Anomaly Watcher
// src/lib/agents/anomaly-watcher.ts
// ─────────────────────────────────────────────────────────────────────────────

import { callClaude as _callClaude, parseAgentJSON } from './_base'

export interface DataDiff {
  suburb_id: string
  suburb_name: string
  changes: {
    field: string
    previous: unknown
    current: unknown
  }[]
}

export interface DataAnomaly {
  suburb_id: string
  type: 'opportunity' | 'risk' | 'info'
  summary: string               // 1–2 sentences, plain English
  should_spawn_quest: boolean
  quest_pillar?: QuestPillar
  affected_quest_ids?: string[] // quest IDs to expire or update
}

const ANOMALY_SYSTEM = `
You monitor open data changes for Melbourne suburbs on a community resilience platform.
Classify each change as: opportunity, risk, or info.

OPPORTUNITY: New public asset, grant opening, council resource made available,
  new community org registered, venue opening → may warrant a new quest
RISK: Organisation closed, service reduced, key venue lost, grant ended
  → may require expiring active quests that depended on it
INFO: Minor change, demographic shift, seasonal variation → no quest action needed

For each anomaly, decide if it warrants spawning a new community quest.

OUTPUT: Return ONLY a JSON array of anomaly objects ([] if no significant changes).
Schema: { suburb_id, type, summary, should_spawn_quest, quest_pillar?, affected_quest_ids? }
No preamble. No markdown fences.
`.trim()

export async function watchAnomalies(diffs: DataDiff[]): Promise<DataAnomaly[]> {
  const significant = diffs.filter(d => d.changes.length > 0)
  if (significant.length === 0) return []

  const userContent = `
Data sync changes detected across ${significant.length} suburb(s):

${significant.map(diff => `
Suburb: ${diff.suburb_name} (${diff.suburb_id})
Changes:
${diff.changes.map(c => `  - ${c.field}: ${JSON.stringify(c.previous)} → ${JSON.stringify(c.current)}`).join('\n')}
`).join('\n')}

Classify these changes and identify any that warrant community action.
`.trim()

  const raw = await _callClaude(ANOMALY_SYSTEM, userContent, 800)
  return parseAgentJSON<DataAnomaly[]>(raw)
}
