// src/lib/agents/resource-matchmaker.ts

import { callClaude, parseAgentJSON } from './_base'

export interface ResourcePost {
  id: string
  type: 'offer' | 'need'
  category: string
  title: string
  description: string
  quantity?: string
  is_perishable: boolean
  suburb_name: string
  distance_km?: number   // from new post
}

export interface ResourceMatch {
  resource_id: string
  reason: string          // plain language, shown to resident
  intro_message: string   // draft message they can send
  relevance_score: number // 0.0–1.0
}

const SYSTEM_PROMPT = `
You are a community resource matchmaker for Melbourne neighbourhoods.
Given a new resource post and existing unmatched posts, find semantic matches.

MATCHING RULES:
- An "offer" should match a "need" of compatible description, and vice versa
- Semantic compatibility matters more than exact category match
  (e.g. "excess zucchini" matches "looking for vegetables")
- Rank by: (1) semantic fit, (2) shorter distance, (3) perishable items first
- intro_message: a warm, natural 1-sentence message the poster could send

OUTPUT: Return ONLY a JSON array of up to 3 matches ([] if none).
Each item: { resource_id, reason, intro_message, relevance_score }
No preamble. No markdown fences.
`.trim()

export async function matchResources(
  newPost: ResourcePost,
  candidates: ResourcePost[]
): Promise<ResourceMatch[]> {
  if (candidates.length === 0) return []

  const userContent = `
New post:
- Type: ${newPost.type}
- Title: "${newPost.title}"
- Description: "${newPost.description}"
- Category: ${newPost.category}
- Quantity: ${newPost.quantity ?? 'not specified'}
- Perishable: ${newPost.is_perishable}
- Suburb: ${newPost.suburb_name}

Candidates to match against:
${candidates.map((c, i) => `
[${i + 1}] ID: ${c.id}
  Type: ${c.type} | Category: ${c.category}
  Title: "${c.title}"
  Description: "${c.description}"
  Suburb: ${c.suburb_name} (${c.distance_km?.toFixed(1) ?? '?'} km away)
  Perishable: ${c.is_perishable}
`).join('\n')}

Return the best matches.
`.trim()

  const raw = await callClaude(SYSTEM_PROMPT, userContent, 600)
  return parseAgentJSON<ResourceMatch[]>(raw)
}
