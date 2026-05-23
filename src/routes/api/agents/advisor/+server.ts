// src/routes/api/agents/advisor/+server.ts
// Streaming chat endpoint for the Initiative Advisor agent.
// Pipes Claude's SSE stream directly to the browser.
//
// SPRINT-0 state: pulls suburb context from MOCK_SUBURBS instead of Supabase.
// Sprint 9 (per SPRINT_PLAN.md) replaces the lookup with a real DB query.

import { error } from '@sveltejs/kit'
import { env } from '$env/dynamic/private'
import type { RequestHandler } from './$types'
import type { QuestPillar } from '$lib/types'
import { MOCK_SUBURBS } from '$lib/data/mock-suburbs'

interface AdvisorRequest {
  messages:  { role: 'user' | 'assistant'; content: string }[]
  suburb_id: string
}

interface AdvisorContext {
  name:                 string
  r_index:              number
  weakest_pillar:       QuestPillar
  weakest_score:        number
  neighbourhood_houses: string[]
  active_quest_titles:  string[]
  seifa_score:          number
  population:           number
}

const PILLAR_FROM_KEY: Record<keyof typeof MOCK_SUBURBS[number]['scores'], QuestPillar> = {
  food:      'food_security',
  skills:    'skill_density',
  resources: 'resource_sharing',
  social:    'social_connectivity',
  emergency: 'emergency_preparedness',
}

export const POST: RequestHandler = async ({ request }) => {
  if (!env.ANTHROPIC_API_KEY) {
    error(500, 'ANTHROPIC_API_KEY is not set in .env.local')
  }

  const body: AdvisorRequest = await request.json()
  const suburb = MOCK_SUBURBS.find((s) => s.id === body.suburb_id)
  if (!suburb) error(404, 'Suburb not found')

  // Weakest pillar: lowest pillar score wins.
  const pillarEntries = Object.entries(suburb.scores) as [
    keyof typeof suburb.scores,
    number,
  ][]
  const [weakestKey, weakestScore] = pillarEntries.reduce(
    (min, e) => (e[1] < min[1] ? e : min),
    pillarEntries[0],
  )

  const ctx: AdvisorContext = {
    name:                  suburb.name,
    r_index:               suburb.r_index,
    weakest_pillar:        PILLAR_FROM_KEY[weakestKey],
    weakest_score:         weakestScore,
    neighbourhood_houses: [],
    active_quest_titles:  [],  // Sprint 5 wires this up
    seifa_score:           suburb.seifa_score,
    population:            suburb.population,
  }

  const systemPrompt = buildSystemPrompt(ctx)

  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 1000,
      stream:     true,
      system:     systemPrompt,
      messages:   body.messages,
    }),
  })

  if (!claudeRes.ok || !claudeRes.body) {
    const detail = await claudeRes.text().catch(() => '<no body>')
    error(502, `Claude API error ${claudeRes.status}: ${detail.slice(0, 240)}`)
  }

  return new Response(claudeRes.body, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  })
}

function buildSystemPrompt(ctx: AdvisorContext): string {
  return `
You are a community initiative advisor for ${ctx.name}, Melbourne, on a civic platform called MESH.
You help residents plan and launch local resilience initiatives.

SUBURB CONTEXT:
- Resilience index: ${ctx.r_index}/100
- Weakest pillar: ${ctx.weakest_pillar.replace(/_/g, ' ')} (score: ${ctx.weakest_score}/100)
- Population: ${ctx.population}
- SEIFA disadvantage: ${ctx.seifa_score}/10 (10 = most disadvantaged)
- Neighbourhood Houses nearby: ${ctx.neighbourhood_houses.join(', ') || 'none in data'}
- Active community quests: ${ctx.active_quest_titles.join(', ') || 'none yet'}

BEHAVIOUR:
- Be concrete. Reference real local assets when you know them.
- Suggest realistic first steps, not grand visions.
- If budget matters (high SEIFA), suggest free or low-cost initiatives.
- When a resident describes an initiative they want to start, offer to help them
  create a formal quest from it (say "I can turn this into a quest for your suburb").
- Keep responses focused. Max 3 short paragraphs per reply.
- No corporate language. Plain, warm Australian English.
`.trim()
}
