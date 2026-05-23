// supabase/functions/generate-quests/index.ts
// Deno edge function. Called after sync-open-data completes.
// Generates AI quests for each suburb that hasn't had one generated today.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-20250514'

serve(async (req) => {
  // Auth check — only callable by service role or pg_cron
  const authHeader = req.headers.get('Authorization')
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  if (authHeader !== `Bearer ${serviceKey}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    serviceKey
  )

  // Fetch suburbs that don't have an active quest generated today
  const today = new Date().toISOString().split('T')[0]
  const { data: suburbs, error } = await supabase
    .from('suburbs')
    .select(`
      id, name, seifa_score, population,
      score_food, score_skills, score_resources, score_social, score_emergency,
      community_gardens:community_garden_count,
      quests!left(title, pillar, status, created_at)
    `)
    .limit(50)  // batch: process 50 suburbs per invocation

  if (error) return new Response(error.message, { status: 500 })

  const results = []

  for (const suburb of suburbs ?? []) {
    // Skip if we already generated a quest for this suburb today
    const hasRecentQuest = suburb.quests?.some(
      (q: { created_at: string }) => q.created_at?.startsWith(today)
    )
    if (hasRecentQuest) continue

    const activeQuests = (suburb.quests ?? [])
      .filter((q: { status: string }) => q.status === 'active')
      .map((q: { title: string; pillar: string }) => ({ title: q.title, pillar: q.pillar }))

    try {
      const quest = await generateQuest(suburb, activeQuests)

      // Insert as 'draft' — admin or auto-approve logic can activate
      const { error: insertError } = await supabase.from('quests').insert({
        suburb_id:         suburb.id,
        title:             quest.title,
        description:       quest.description,
        pillar:            quest.pillar,
        difficulty:        quest.difficulty,
        xp_reward:         quest.xp_reward,
        steps:             quest.steps,
        participant_target: quest.participant_target,
        ai_rationale:      quest.ai_rationale,
        source:            'ai_generated',
        status:            'draft',
        expires_at:        new Date(Date.now() + quest.expires_days * 86400000).toISOString(),
      })

      results.push({ suburb: suburb.name, success: !insertError, error: insertError?.message })
    } catch (err) {
      results.push({ suburb: suburb.name, success: false, error: String(err) })
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { 'Content-Type': 'application/json' }
  })
})

// ─── Inline agent call (Deno-compatible) ─────────────────────────────────────

async function generateQuest(suburb: SuburbRow, activeQuests: ActiveQuest[]) {
  const season = getSeason()

  const systemPrompt = `
You are a community resilience advisor for Melbourne, Australia.
Identify the most impactful missing community initiative for a suburb and generate a quest.
Target the LOWEST pillar. Quests must be achievable in 2–8 weeks by 3–10 ordinary residents.
For high SEIFA disadvantage (7–10), prefer free/low-cost initiatives.
OUTPUT: Return ONLY valid JSON. Schema:
{ title, description, pillar, difficulty, xp_reward, steps:[{order,description}], participant_target, ai_rationale, expires_days }
`.trim()

  const userContent = `
Suburb: ${suburb.name}
SEIFA: ${suburb.seifa_score}/10 | Population: ${suburb.population} | Season: ${season}
Pillar scores: food=${suburb.score_food} skills=${suburb.score_skills} resources=${suburb.score_resources} social=${suburb.score_social} emergency=${suburb.score_emergency}
Community gardens: ${suburb.community_gardens ?? 0}
Active quests (avoid duplicating): ${activeQuests.map(q => q.title).join(', ') || 'none'}
`.trim()

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    }),
  })

  const data = await res.json()
  const text: string = data.content[0].text
  return JSON.parse(text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim())
}

function getSeason(): string {
  const m = new Date().getMonth() + 1
  if (m >= 12 || m <= 2) return 'summer'
  if (m >= 3  && m <= 5) return 'autumn'
  if (m >= 6  && m <= 8) return 'winter'
  return 'spring'
}

interface SuburbRow {
  id: string; name: string; seifa_score: number; population: number
  score_food: number; score_skills: number; score_resources: number
  score_social: number; score_emergency: number; community_gardens: number
  quests: { title: string; pillar: string; status: string; created_at: string }[]
}
interface ActiveQuest { title: string; pillar: string }
