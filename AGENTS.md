# MESH — AI Agents

All agents call `claude-sonnet-4-20250514` via the Anthropic API.
All live in `src/lib/agents/` (client-side safe wrappers) and are
invoked from Supabase Edge Functions (server-side, has service key).

---

## Shared pattern

Every agent follows this contract:

```typescript
// src/lib/agents/_base.ts
export interface AgentCall<TInput, TOutput> {
  input:  TInput
  output: TOutput    // always parsed JSON
}

async function callClaude(systemPrompt: string, userContent: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    }),
  })
  const data = await res.json()
  return data.content[0].text
}
```

---

## Agent 1 — Quest Generator

**File**: `src/lib/agents/quest-generator.ts`
**Trigger**: Supabase Edge Function `generate-quests`, runs daily after data sync
**Input**: Suburb row + current active quests for that suburb
**Output**: `GeneratedQuest` JSON object

### Types

```typescript
// src/lib/types/agents.ts

export interface SuburbContext {
  name: string
  seifa_score: number
  population: number
  score_food: number
  score_skills: number
  score_resources: number
  score_social: number
  score_emergency: number
  community_gardens: number
  neighbourhood_houses: string[]
  active_quests: { title: string; pillar: string }[]
  season: 'summer' | 'autumn' | 'winter' | 'spring'
}

export interface GeneratedQuest {
  title: string                    // max 8 words
  description: string              // 2–3 sentences
  pillar: QuestPillar
  difficulty: 'easy' | 'medium' | 'hard'
  xp_reward: number                // easy=100, medium=300, hard=700
  steps: { order: number; description: string }[]  // 3–5 steps
  participant_target: number
  ai_rationale: string             // why this suburb needs this quest
  expires_days: number             // suggested days until expiry
}
```

### Prompt

```typescript
// src/lib/agents/quest-generator.ts

const SYSTEM_PROMPT = `
You are a community resilience advisor for Melbourne, Australia.
Your job: read suburb data, identify the most impactful missing initiative,
and generate a concrete community quest residents can complete together.

RULES:
- Target the suburb's LOWEST resilience pillar
- Quests must be achievable by 3–10 ordinary residents in 2–8 weeks
- Steps must be concrete and actionable (not vague)
- Avoid duplicating any quest in active_quests
- Consider the current season for gardening/outdoor quests
- For low SEIFA suburbs (<5), prefer low-cost or free initiatives

OUTPUT: Return ONLY a valid JSON object. No preamble. No markdown fences.
Schema: { title, description, pillar, difficulty, xp_reward, steps, participant_target, ai_rationale, expires_days }
`

export async function generateQuest(ctx: SuburbContext): Promise<GeneratedQuest> {
  const userContent = `
Suburb: ${ctx.name}
SEIFA disadvantage score: ${ctx.seifa_score}/10 (10 = most disadvantaged)
Population: ${ctx.population}
Season: ${ctx.season}

Resilience pillar scores (0–100):
- Food security: ${ctx.score_food}
- Skill density: ${ctx.score_skills}
- Resource sharing: ${ctx.score_resources}
- Social connectivity: ${ctx.score_social}
- Emergency preparedness: ${ctx.score_emergency}

Existing assets:
- Community gardens: ${ctx.community_gardens}
- Neighbourhood Houses: ${ctx.neighbourhood_houses.join(', ') || 'none'}

Active quests (do NOT duplicate):
${ctx.active_quests.map(q => `- ${q.title} (${q.pillar})`).join('\n') || '- none'}

Generate the most impactful quest for this suburb right now.
`
  const raw = await callClaude(SYSTEM_PROMPT, userContent)
  return JSON.parse(raw) as GeneratedQuest
}
```

---

## Agent 2 — Submission Verifier

**File**: `src/lib/agents/submission-verifier.ts`
**Trigger**: DB webhook on `quest_submissions` insert
**Input**: Submission row + quest details + optional photo (base64)
**Output**: `VerificationVerdict`

### Types

```typescript
export interface VerificationInput {
  quest_title: string
  quest_description: string
  quest_pillar: string
  quest_difficulty: string
  resident_description: string
  participant_count: number
  photo_base64?: string          // optional, from Supabase Storage
  photo_mime?: string
}

export interface VerificationVerdict {
  verdict: 'approved' | 'needs_more' | 'rejected'
  confidence: number             // 0.0–1.0
  reason: string                 // shown to resident
  xp_multiplier: number          // 0.5 | 1.0 | 1.5
}
```

### Prompt

```typescript
const SYSTEM_PROMPT = `
You are a community initiative verifier for a Melbourne civic platform.
A resident is claiming they completed a community quest.
Assess whether their evidence plausibly demonstrates genuine completion.

Be GENEROUS for good-faith effort. Be STRICT for obvious fabrication.
A low participant count for a hard quest is "needs_more", not "rejected".

CONFIDENCE GUIDE:
- 0.9+: Clear evidence, description matches quest well
- 0.7–0.9: Plausible, minor gaps
- 0.5–0.7: Uncertain, human should review
- <0.5: Implausible or clearly off-topic

XP MULTIPLIER GUIDE:
- 1.5: Exceptional effort, exceeded participant target
- 1.0: Met requirements
- 0.5: Partial completion, approved with reduced reward

OUTPUT: Return ONLY valid JSON. Schema:
{ verdict, confidence, reason, xp_multiplier }
`

export async function verifySubmission(input: VerificationInput): Promise<VerificationVerdict> {
  const messages: any[] = []

  // Build user content — include photo if present
  const content: any[] = []

  if (input.photo_base64 && input.photo_mime) {
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: input.photo_mime,
        data: input.photo_base64,
      },
    })
  }

  content.push({
    type: 'text',
    text: `
Quest: "${input.quest_title}"
Description: ${input.quest_description}
Pillar: ${input.quest_pillar}
Difficulty: ${input.quest_difficulty}

Resident's submission:
"${input.resident_description}"

Claimed participants: ${input.participant_count}
${input.photo_base64 ? 'Photo evidence: see attached image above.' : 'No photo provided.'}

Assess this submission.
    `.trim(),
  })

  const raw = await callClaudeWithContent(SYSTEM_PROMPT, content)
  return JSON.parse(raw) as VerificationVerdict
}
```

---

## Agent 3 — Resource Matchmaker

**File**: `src/lib/agents/resource-matchmaker.ts`
**Trigger**: DB webhook on `resources` insert
**Input**: New resource + recent unmatched resources within 10km
**Output**: `ResourceMatch[]` (top 3)

### Prompt

```typescript
const SYSTEM_PROMPT = `
You are a community resource matchmaker for Melbourne neighbourhoods.
Given a new resource post and a list of existing unmatched posts,
find the best semantic matches — prioritising nearby suburbs and perishable items.

A good match:
- New "offer" matches an existing "need" of the same category, or vice versa
- Descriptions are semantically compatible (e.g. "zucchini" matches "vegetables")
- Closer suburbs ranked higher

OUTPUT: Return ONLY a JSON array of up to 3 matches (can be empty []).
Each item: { resource_id, reason, intro_message, relevance_score }
intro_message: a natural 1-sentence intro the resident could send.
relevance_score: 0.0–1.0
`
```

---

## Agent 4 — Suburb Narrator

**File**: `src/lib/agents/suburb-narrator.ts`
**Trigger**: pg_cron every Monday 08:00 AEST
**Input**: Suburb + score deltas from past week + completed quests + new resources
**Output**: Plain-English narrative string (2–3 paragraphs)

### Prompt

```typescript
const SYSTEM_PROMPT = `
You are a friendly community correspondent writing a weekly update for a Melbourne suburb.
Write in warm, plain Australian English. Be specific — reference actual pillar scores,
real quest names, real numbers. Acknowledge progress AND gaps honestly.
End with ONE clear suggested focus for the coming week.

Tone: encouraging but grounded. Not corporate. Not preachy.
Length: 2–3 short paragraphs.
OUTPUT: Plain text only. No markdown, no headers.
`
```

---

## Agent 5 — Initiative Advisor (Streaming)

**File**: `src/lib/agents/initiative-advisor.ts`
**Trigger**: Resident opens chat on suburb page
**Mode**: Streaming (SSE via SvelteKit server endpoint)
**Input**: Conversation history + suburb context in system prompt

### Stream endpoint

```typescript
// src/routes/api/agents/advisor/+server.ts
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ request, locals }) => {
  const { messages, suburb_id } = await request.json()
  const suburb = await getSuburbContext(suburb_id, locals.supabase)

  const systemPrompt = buildAdvisorSystemPrompt(suburb)

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      stream: true,
      system: systemPrompt,
      messages,
    }),
  })

  // Pipe Claude's SSE stream directly to the client
  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  })
}

function buildAdvisorSystemPrompt(suburb: SuburbContext): string {
  return `
You are a community initiative advisor for ${suburb.name}, Melbourne.
You help residents plan and launch local resilience initiatives.

SUBURB CONTEXT:
- Resilience index: ${suburb.r_index}/100
- Weakest pillar: ${suburb.weakest_pillar} (score: ${suburb.weakest_score})
- Neighbourhood Houses nearby: ${suburb.neighbourhood_houses.join(', ') || 'none'}
- Active quests: ${suburb.active_quests.map(q => q.title).join(', ') || 'none'}
- SEIFA disadvantage: ${suburb.seifa_score}/10

Be concrete. Reference real local assets. Suggest realistic first steps.
When a resident describes an initiative, offer to create a quest from it.
Keep responses focused and action-oriented. Max 3 paragraphs per reply.
`
}
```

---

## Agent 6 — Anomaly Watcher

**File**: `src/lib/agents/anomaly-watcher.ts`
**Trigger**: After each `sync-open-data` Edge Function completes
**Input**: Previous vs current data snapshot diff for each suburb
**Output**: `DataAnomaly[]` — each may spawn a quest or send an alert

### Types

```typescript
export interface DataAnomaly {
  suburb_id: string
  type: 'opportunity' | 'risk' | 'info'
  summary: string
  should_spawn_quest: boolean
  quest_pillar?: QuestPillar
  affected_quest_ids?: string[]   // quests to update/expire
}
```

### Prompt

```typescript
const SYSTEM_PROMPT = `
You monitor open data changes for Melbourne suburbs and classify them
as opportunities, risks, or informational events for a community resilience platform.

OPPORTUNITY: New public asset, grant opened, council resource made available
RISK: Organisation closed, service reduced, key venue lost
INFO: Minor change, demographic shift, seasonal variation

For each change, decide if it warrants spawning a new community quest.
OUTPUT: Return ONLY a JSON array of anomaly objects (can be empty []).
Schema: { suburb_id, type, summary, should_spawn_quest, quest_pillar?, affected_quest_ids? }
`
```

---

## Cost management

| Agent | Avg tokens/call | Calls/day (50 suburbs) | Est. daily cost |
|---|---|---|---|
| Quest Generator | ~800 in + 400 out | 50 | ~$0.10 |
| Submission Verifier | ~600 in + 200 out | ~20 | ~$0.03 |
| Resource Matchmaker | ~500 in + 300 out | ~30 | ~$0.04 |
| Suburb Narrator | ~700 in + 500 out | 50 (weekly → /7) | ~$0.01/day |
| Initiative Advisor | ~400 in + 600 out | ~10 | ~$0.02 |
| Anomaly Watcher | ~400 in + 200 out | 1 batch | ~$0.01 |

**Total: ~$0.20–0.25/day** at 50 active suburbs. Scales linearly.

### Guards
```typescript
// Rate limit: max 1 quest generation per suburb per 24h
// Cache suburb narratives for 7 days (never re-generate mid-week)
// Skip matchmaker if < 5 resources exist in the suburb's 10km radius
// Skip anomaly watcher if data snapshot is identical to previous
```
