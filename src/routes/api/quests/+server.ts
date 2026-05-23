// src/routes/api/quests/+server.ts
// Quest Generator agent endpoint. Mirrors the design in docs/AGENTS.md.
// Returns ONE quest as JSON for the requested suburb (non-streaming).

import { error, json } from '@sveltejs/kit'
import { env } from '$env/dynamic/private'
import type { RequestHandler } from './$types'
import type { GeneratedQuest, QuestDataSnapshot, QuestPillar, Suburb } from '$lib/types'
import { MOCK_SUBURBS } from '$lib/data/mock-suburbs'

const MODEL = 'claude-sonnet-4-20250514'

interface GenerateRequest {
  suburb_id: string
  // Optional: conversation from AdvisorChat. When present, the user has been
  // discussing a specific initiative with the advisor — fold the conversation
  // into the prompt so the generated quest reflects what they talked about.
  messages?: { role: 'user' | 'assistant'; content: string }[]
}

const PILLAR_BY_KEY: Record<keyof Suburb['scores'], QuestPillar> = {
  food:      'food_security',
  skills:    'skill_density',
  resources: 'resource_sharing',
  social:    'social_connectivity',
  emergency: 'emergency_preparedness',
}

function currentSeason(d = new Date()): 'summer' | 'autumn' | 'winter' | 'spring' {
  // Southern Hemisphere (Melbourne).
  const m = d.getMonth() + 1
  if (m >= 12 || m <= 2) return 'summer'
  if (m >= 3  && m <= 5) return 'autumn'
  if (m >= 6  && m <= 8) return 'winter'
  return 'spring'
}

function stripFences(raw: string): string {
  return raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
}

export const POST: RequestHandler = async ({ request }) => {
  if (!env.ANTHROPIC_API_KEY) {
    error(500, 'ANTHROPIC_API_KEY is not set in .env.local')
  }

  const { suburb_id, messages }: GenerateRequest = await request.json()
  const suburb = MOCK_SUBURBS.find((s) => s.id === suburb_id)
  if (!suburb) error(404, 'Suburb not found')

  const transcript = (messages ?? [])
    .map((m) => `${m.role === 'user' ? 'RESIDENT' : 'ADVISOR'}: ${m.content}`)
    .join('\n\n')

  const pillarEntries = Object.entries(suburb.scores) as [keyof Suburb['scores'], number][]
  const weakest = pillarEntries.reduce((min, e) => (e[1] < min[1] ? e : min), pillarEntries[0])
  const weakestPillar = PILLAR_BY_KEY[weakest[0]]

  const systemPrompt = `
You are a community resilience advisor for Melbourne, Australia.
Identify the most impactful missing community initiative for a suburb and generate a quest.

RULES:
- Target the LOWEST pillar.
- Quests must be achievable in 2–8 weeks by 3–10 ordinary residents.
- 3–5 concrete actionable steps.
- For high SEIFA disadvantage (7–10), prefer free or low-cost initiatives.
- Consider the current season for any outdoor/gardening element.

XP REWARD GUIDE: easy=100, medium=300, hard=700.

OUTPUT: Return ONLY a single valid JSON object. No preamble. No markdown fences.
Schema:
{
  "title":              string (max 8 words),
  "description":        string (2–3 sentences),
  "pillar":             "food_security" | "skill_density" | "resource_sharing" | "social_connectivity" | "emergency_preparedness",
  "difficulty":         "easy" | "medium" | "hard",
  "xp_reward":          number,
  "steps":              [ { "order": number, "description": string }, ... ],
  "participant_target": number,
  "ai_rationale":       string (one sentence: why this suburb needs this quest),
  "expires_days":       number
}
`.trim()

  const userContent = `
Suburb: ${suburb.name}
SEIFA disadvantage: ${suburb.seifa_score}/10 (10 = most disadvantaged)
Population: ${suburb.population}
Season: ${currentSeason()}

Resilience pillar scores (0–100):
- Food security:          ${suburb.scores.food}
- Skill density:          ${suburb.scores.skills}
- Resource sharing:       ${suburb.scores.resources}
- Social connectivity:    ${suburb.scores.social}
- Emergency preparedness: ${suburb.scores.emergency}

Weakest pillar: ${weakestPillar} (score ${weakest[1]})${
  transcript
    ? `\n\nPRIOR CONVERSATION WITH RESIDENT (use this as the leading signal for what to generate — the resident already discussed what they want):\n${transcript}`
    : ''
}

Generate the most impactful quest for this suburb right now.
`.trim()

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      MODEL,
      max_tokens: 900,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userContent }],
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    error(502, `Claude API error ${res.status}: ${detail.slice(0, 240)}`)
  }

  const data = await res.json()
  const text: string = data.content
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('')

  let quest: GeneratedQuest
  try {
    quest = JSON.parse(stripFences(text)) as GeneratedQuest
  } catch {
    error(502, `Could not parse quest JSON. Raw: ${text.slice(0, 240)}`)
  }

  // Bundle the generation metadata onto the quest so the UI can show
  // 'How this was created' transparently — what the model saw, when, etc.
  const dataSnapshot: QuestDataSnapshot = {
    suburb_name:    suburb.name,
    postcode:       suburb.postcode,
    seifa_score:    suburb.seifa_score,
    population:     suburb.population,
    season:         currentSeason(),
    pillar_scores:  suburb.scores,
    weakest_pillar: weakestPillar,
    weakest_score:  weakest[1],
  }
  quest.data_snapshot = dataSnapshot
  quest.model         = MODEL
  quest.generated_at  = new Date().toISOString()

  return json({ quest })
}
