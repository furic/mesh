// src/lib/agents/quest-generator.ts

import { callClaude, parseAgentJSON } from './_base'

// ─── Types ────────────────────────────────────────────────────────────────────

export type QuestPillar =
  | 'food_security'
  | 'skill_density'
  | 'resource_sharing'
  | 'social_connectivity'
  | 'emergency_preparedness'

export interface SuburbContext {
  name: string
  seifa_score: number          // 1–10, 10 = most disadvantaged
  population: number
  season: 'summer' | 'autumn' | 'winter' | 'spring'
  score_food: number           // 0–100
  score_skills: number
  score_resources: number
  score_social: number
  score_emergency: number
  community_gardens: number
  neighbourhood_houses: string[]
  active_quests: { title: string; pillar: QuestPillar }[]
}

export interface GeneratedQuest {
  title: string                                         // max 8 words
  description: string                                   // 2–3 sentences
  pillar: QuestPillar
  difficulty: 'easy' | 'medium' | 'hard'
  xp_reward: number                                     // easy=100, medium=300, hard=700
  steps: { order: number; description: string }[]       // 3–5 steps
  participant_target: number
  ai_rationale: string                                  // internal: why this suburb needs this
  expires_days: number
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `
You are a community resilience advisor for Melbourne, Australia.
Your job: read suburb data, identify the most impactful missing initiative,
and generate a concrete community quest residents can complete together.

RULES:
- Target the suburb's LOWEST resilience pillar score
- Quests must be achievable by 3–10 ordinary residents in 2–8 weeks
- Steps must be concrete and actionable (not vague like "organise a meeting")
- Avoid duplicating any quest listed in active_quests
- Consider the current season for gardening or outdoor quests
- For high SEIFA disadvantage suburbs (score 7–10), prefer free/low-cost initiatives
- xp_reward: easy=100, medium=300, hard=700

OUTPUT: Return ONLY a valid JSON object matching this schema exactly.
No preamble. No markdown fences. No explanation.
Schema: { title, description, pillar, difficulty, xp_reward, steps, participant_target, ai_rationale, expires_days }
`.trim()

// ─── Agent call ───────────────────────────────────────────────────────────────

export async function generateQuest(ctx: SuburbContext): Promise<GeneratedQuest> {
  const lowestPillar = getLowestPillar(ctx)

  const userContent = `
Suburb: ${ctx.name}
SEIFA disadvantage score: ${ctx.seifa_score}/10 (10 = most disadvantaged)
Population: ${ctx.population}
Season: ${ctx.season}

Resilience pillar scores (0–100):
- Food security:          ${ctx.score_food}
- Skill density:          ${ctx.score_skills}
- Resource sharing:       ${ctx.score_resources}
- Social connectivity:    ${ctx.score_social}
- Emergency preparedness: ${ctx.score_emergency}

Lowest pillar: ${lowestPillar.name} (${lowestPillar.score})

Existing assets:
- Community gardens: ${ctx.community_gardens}
- Neighbourhood Houses: ${ctx.neighbourhood_houses.join(', ') || 'none within data'}

Active quests (DO NOT duplicate):
${ctx.active_quests.length > 0
    ? ctx.active_quests.map(q => `- "${q.title}" (${q.pillar})`).join('\n')
    : '- none'}

Generate the single most impactful quest for this suburb right now.
  `.trim()

  const raw = await callClaude(SYSTEM_PROMPT, userContent, 800)
  return parseAgentJSON<GeneratedQuest>(raw)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLowestPillar(ctx: SuburbContext): { name: QuestPillar; score: number } {
  const pillars: { name: QuestPillar; score: number }[] = [
    { name: 'food_security',          score: ctx.score_food },
    { name: 'skill_density',          score: ctx.score_skills },
    { name: 'resource_sharing',       score: ctx.score_resources },
    { name: 'social_connectivity',    score: ctx.score_social },
    { name: 'emergency_preparedness', score: ctx.score_emergency },
  ]
  return pillars.reduce((min, p) => p.score < min.score ? p : min)
}

export function getSeason(): SuburbContext['season'] {
  const month = new Date().getMonth() + 1  // 1–12
  if (month >= 12 || month <= 2) return 'summer'
  if (month >= 3  && month <= 5) return 'autumn'
  if (month >= 6  && month <= 8) return 'winter'
  return 'spring'
}
