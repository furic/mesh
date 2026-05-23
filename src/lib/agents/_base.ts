// src/lib/agents/_base.ts
// Shared Claude API call utility used by all MESH agents.

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-20250514'

// ─── Simple text → text call ─────────────────────────────────────────────────

export async function callClaude(
  systemPrompt: string,
  userContent: string,
  maxTokens = 1000
): Promise<string> {
  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Claude API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  const text = data.content
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('')

  return text
}

// ─── Multi-modal call (text + optional image) ─────────────────────────────────

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }

export async function callClaudeWithContent(
  systemPrompt: string,
  content: ContentBlock[],
  maxTokens = 1000
): Promise<string> {
  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Claude API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return data.content
    .filter((b: { type: string }) => b.type === 'text')
    .map((b: { text: string }) => b.text)
    .join('')
}

// ─── JSON-safe parse helper ───────────────────────────────────────────────────

export function parseAgentJSON<T>(raw: string): T {
  // Strip accidental markdown fences if model adds them despite instructions
  const cleaned = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
  return JSON.parse(cleaned) as T
}
