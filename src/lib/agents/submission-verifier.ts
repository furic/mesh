// src/lib/agents/submission-verifier.ts

import { callClaudeWithContent, parseAgentJSON, type ContentBlock } from './_base'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VerificationInput {
  quest_title: string
  quest_description: string
  quest_pillar: string
  quest_difficulty: 'easy' | 'medium' | 'hard'
  resident_description: string
  participant_count: number
  participant_target: number
  photo_base64?: string
  photo_mime?: string    // 'image/jpeg' | 'image/png' | 'image/webp'
}

export interface VerificationVerdict {
  verdict: 'approved' | 'needs_more' | 'rejected'
  confidence: number      // 0.0–1.0
  reason: string          // shown to the resident — keep it kind
  xp_multiplier: number   // 0.5 | 1.0 | 1.5
}

// ─── Threshold ───────────────────────────────────────────────────────────────

/** Below this confidence → route to human moderation queue */
export const HUMAN_REVIEW_THRESHOLD = 0.7

// ─── Prompt ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `
You are a community initiative verifier for a Melbourne civic platform called MESH.
A resident is claiming they completed a community quest. Assess whether their
evidence plausibly demonstrates genuine, good-faith completion.

VERDICT GUIDE:
- approved:    Evidence reasonably supports completion. Give the benefit of the doubt.
- needs_more:  Plausible but insufficient — ask for one specific thing.
- rejected:    Clearly fabricated, off-topic, or harmful content.

CONFIDENCE GUIDE (how certain you are of your verdict):
- 0.9+  Clear evidence, description matches quest well, photo confirms
- 0.7–0.9  Plausible, description is relevant, minor gaps
- 0.5–0.7  Uncertain — human moderator should review
- <0.5   Implausible, incoherent, or clearly unrelated

XP MULTIPLIER GUIDE:
- 1.5  Exceptional — exceeded participant target, strong evidence
- 1.0  Met requirements — standard completion
- 0.5  Partial — good faith effort but incomplete (still approve if plausible)

TONE: The reason field is shown directly to the resident. Be encouraging for
approved/needs_more verdicts. Be firm but respectful for rejections.
Max 2 sentences in reason.

OUTPUT: Return ONLY a valid JSON object. No preamble. No markdown fences.
Schema: { verdict, confidence, reason, xp_multiplier }
`.trim()

// ─── Agent call ───────────────────────────────────────────────────────────────

export async function verifySubmission(
  input: VerificationInput
): Promise<VerificationVerdict> {
  const content: ContentBlock[] = []

  // Attach photo if provided
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
    text: buildUserPrompt(input),
  })

  const raw = await callClaudeWithContent(SYSTEM_PROMPT, content, 400)
  const verdict = parseAgentJSON<VerificationVerdict>(raw)

  // Clamp values to valid ranges
  verdict.confidence = Math.max(0, Math.min(1, verdict.confidence))
  verdict.xp_multiplier = [0.5, 1.0, 1.5].includes(verdict.xp_multiplier)
    ? verdict.xp_multiplier
    : 1.0

  return verdict
}

function buildUserPrompt(input: VerificationInput): string {
  return `
Quest: "${input.quest_title}"
Quest description: ${input.quest_description}
Pillar: ${input.quest_pillar}
Difficulty: ${input.quest_difficulty}
Participant target: ${input.participant_target}

Resident's submission:
"${input.resident_description}"

Claimed participants: ${input.participant_count}
Photo evidence: ${input.photo_base64 ? 'Attached above.' : 'None provided.'}

Assess this submission and return your verdict.
  `.trim()
}

// ─── XP calculation ───────────────────────────────────────────────────────────

export function calculateXP(
  baseXP: number,
  verdict: VerificationVerdict
): number {
  if (verdict.verdict !== 'approved') return 0
  return Math.round(baseXP * verdict.xp_multiplier)
}
