// src/routes/api/agents/narrator/+server.ts
// Suburb Narrator agent endpoint. Returns a plain-text 2–3 paragraph weekly
// digest. Mirrors the design in docs/AGENTS.md.

import { error, json } from '@sveltejs/kit'
import { env } from '$env/dynamic/private'
import type { RequestHandler } from './$types'
import type { QuestPillar, Suburb } from '$lib/types'
import { MOCK_SUBURBS } from '$lib/data/mock-suburbs'

interface NarrateRequest {
  suburb_id: string
}

const PILLAR_BY_KEY: Record<keyof Suburb['scores'], QuestPillar> = {
  food:      'food_security',
  skills:    'skill_density',
  resources: 'resource_sharing',
  social:    'social_connectivity',
  emergency: 'emergency_preparedness',
}

// Mock score deltas for the week. Sprint 1 wires this up to real
// `data_snapshots` diffs from the open-data pipeline.
function mockWeekDeltas(seed: string): Record<QuestPillar, number> {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0
  function next(): number {
    h = (h * 9301 + 49297) % 233280
    return h / 233280
  }
  const deltas: Record<QuestPillar, number> = {
    food_security:          Math.round((next() - 0.45) * 10),
    skill_density:          Math.round((next() - 0.45) * 10),
    resource_sharing:       Math.round((next() - 0.45) * 10),
    social_connectivity:    Math.round((next() - 0.45) * 10),
    emergency_preparedness: Math.round((next() - 0.45) * 10),
  }
  return deltas
}

export const POST: RequestHandler = async ({ request }) => {
  if (!env.ANTHROPIC_API_KEY) {
    error(500, 'ANTHROPIC_API_KEY is not set in .env.local')
  }

  const { suburb_id }: NarrateRequest = await request.json()
  const suburb = MOCK_SUBURBS.find((s) => s.id === suburb_id)
  if (!suburb) error(404, 'Suburb not found')

  const deltas = mockWeekDeltas(suburb.id)
  const focusEntry = (Object.entries(suburb.scores) as [keyof Suburb['scores'], number][])
    .reduce((min, e) => (e[1] < min[1] ? e : min))
  const focusPillar = PILLAR_BY_KEY[focusEntry[0]]

  const systemPrompt = `
You are a friendly community correspondent writing a weekly update for a Melbourne suburb.

VOICE:
- Warm, grounded Australian English. Plain and specific.
- Encouraging but honest — acknowledge real gaps, don't paper over them.
- No corporate language, no buzzwords, no "leverage / unpack / journey".

STRUCTURE:
- 2–3 short paragraphs (40–80 words each).
- Reference actual numbers from the data when it lifts the piece.
- End with ONE clear suggested focus for the coming week, framed as an invitation
  ("This week, what if a few of you...").

OUTPUT:
- Plain text only. NO markdown, NO headers, NO bullet points, NO fences.
`.trim()

  const userContent = `
Suburb: ${suburb.name} (postcode ${suburb.postcode}, pop. ${suburb.population.toLocaleString()})
Resilience index: ${suburb.r_index}/100 (level ${suburb.level}, ${suburb.xp_total.toLocaleString()} XP this season)
SEIFA disadvantage: ${suburb.seifa_score}/10

Pillar scores this week (and change vs last week):
- Food security:          ${suburb.scores.food} (${formatDelta(deltas.food_security)})
- Skill density:          ${suburb.scores.skills} (${formatDelta(deltas.skill_density)})
- Resource sharing:       ${suburb.scores.resources} (${formatDelta(deltas.resource_sharing)})
- Social connectivity:    ${suburb.scores.social} (${formatDelta(deltas.social_connectivity)})
- Emergency preparedness: ${suburb.scores.emergency} (${formatDelta(deltas.emergency_preparedness)})

Weakest pillar to focus on: ${focusPillar.replace(/_/g, ' ')} (score ${focusEntry[1]})

Write this week's update for ${suburb.name}.
`.trim()

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 700,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userContent }],
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    error(502, `Claude API error ${res.status}: ${detail.slice(0, 240)}`)
  }

  const data = await res.json()
  const narrative: string = data.content
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('')
    .trim()

  return json({
    narrative,
    deltas,
    focus_pillar: focusPillar,
  })
}

function formatDelta(n: number): string {
  if (n === 0) return 'flat'
  return n > 0 ? `+${n}` : `${n}`
}
