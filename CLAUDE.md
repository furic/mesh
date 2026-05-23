# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

SvelteKit (Svelte 5, runes mode) is scaffolded at the repo root. The five resilience pillars, mock suburb data, and a Three.js globe landing page are live; Supabase and Anthropic are not yet wired (no real keys consumed at runtime). Sprint 0–2 work in [SPRINT_PLAN.md](SPRINT_PLAN.md) is still ahead — only the visible-prototype slice is in place.

Current layout (the bits that aren't auto-generated):

```
src/
├── app.d.ts                          # App.Locals.supabase is a STUB type
├── lib/
│   ├── agents/                       # callClaude + 5 agent stubs (NOT yet imported)
│   │   ├── _base.ts
│   │   ├── quest-generator.ts
│   │   ├── submission-verifier.ts
│   │   ├── resource-matchmaker.ts
│   │   └── suburb-narrator.ts
│   ├── components/
│   │   ├── globe/MeshGlobe.svelte    # Three.js scene; browser-only
│   │   └── suburb/SuburbList.svelte  # sidebar
│   ├── data/mock-suburbs.ts          # 5 hard-coded Melbourne suburbs
│   └── types/index.ts                # Suburb, QuestPillar, PILLAR_LABELS
└── routes/
    ├── +layout.svelte                # dark theme, body styles
    ├── +page.svelte                  # globe + sidebar + suburb detail
    └── api/agents/advisor/+server.ts # streaming-chat stub (not yet callable)

supabase/functions/generate-quests/index.ts   # Deno edge-function stub
```

The advisor `+server.ts` and the agent stubs typecheck but **are not exercised at runtime yet** — there is no `locals.supabase` provider, no `hooks.server.ts`. Treat the agent files as design fixtures until they are wired in Sprint 6+.

## Stack and commands

SvelteKit (`@sveltejs/kit@2.60`, `svelte@5.55`, runes mode) + `three@0.184`. Backend pieces (Supabase, Anthropic) are env-only for now.

```bash
pnpm install
pnpm dev                          # vite dev — http://localhost:5173
pnpm check                        # svelte-kit sync && svelte-check (typecheck)
pnpm build                        # production build
pnpm preview                      # serve the build
```

The dev server is the canonical verification: visit `/` and confirm the globe renders and clicking a node opens the suburb detail panel. There is no test runner yet.

**Svelte 5 runes mode is the project default.** Components must use `$props()` (not `export let`) and `onclick=` callbacks (not `on:click`). Browser-only globals (`cancelAnimationFrame`, `WebGLRenderer`, `ResizeObserver`) must be guarded behind the `browser` import from `$app/environment` — `onDestroy` runs during SSR even when `onMount` does not.

## Env vars

`.env.example` is the committed template; `.env.local` is gitignored. `ANTHROPIC_API_KEY` is the only key needed for the AI agents in Sprints 6–10. The Supabase keys land in Sprint 2; `VIC_DATA_API_KEY` and `MELBOURNE_DATA_APP_TOKEN` are optional (anonymous reads work for the relevant open-data endpoints) and only matter from Sprint 1 onwards.

## Agent architecture

Six AI agents are described in detail in [AGENTS.md](AGENTS.md); read it before touching any `src/lib/agents/*` file. All agents share two invariants:

**Shared core (`_base.ts`):**
- `callClaude(systemPrompt, userContent, maxTokens?)` — text-only call.
- `callClaudeWithContent(systemPrompt, ContentBlock[], maxTokens?)` — multi-modal; pass photos as `{ type: 'image', source: { type: 'base64', media_type, data } }`.
- `parseAgentJSON<T>(raw)` — strips accidental ```` ```json ```` fences before `JSON.parse`. Every JSON-returning agent MUST funnel its raw output through this.
- **Heads-up:** the stub omits the `x-api-key` and `anthropic-version: 2023-06-01` headers that the actual Anthropic API requires (the edge-function `index.ts` and `+server.ts` add them). Add them when wiring `_base.ts` for real.

**Output discipline:**
- Quest Generator, Submission Verifier, Resource Matchmaker, Anomaly Watcher — return strict JSON matching the typed schema. Prompts always end with `OUTPUT: Return ONLY valid JSON.` No markdown fences, no preamble.
- Suburb Narrator — returns plain text (no JSON).
- Initiative Advisor — **streamed**: the server endpoint pipes Claude's SSE response body directly to the browser without parsing (see `+server.ts`). Do not buffer or transform.

**Model pin:** all agents use `claude-sonnet-4-20250514`. This is intentional in the design — don't bump it casually.

## Edge function ↔ agent duplication (intentional)

Supabase Edge Functions run on Deno and cannot import from `src/lib/agents/*` (which is SvelteKit/Node territory). Each edge function therefore **inlines its own copy** of `callClaude` + the system prompt + JSON parse — see `index.ts` (`supabase/functions/generate-quests/`) for the canonical pattern.

When you change an agent prompt or output schema in `src/lib/agents/<x>.ts`, you MUST update the matching `supabase/functions/<y>/index.ts` in the same change. The two are sibling implementations of the same contract, not a library and a consumer.

Edge functions check `Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}` at the top — they are only callable by pg_cron and DB webhooks, never by the browser.

## Data layer ([SCHEMA.md](SCHEMA.md))

- **PostGIS required.** Suburb locations are `geography(point, 4326)` with a GIST index — the Resource Matchmaker depends on nearest-neighbour queries (`<->` operator, 10km radius).
- **RLS is on every table.** Public-readable rows are gated by status (`quests.status = 'active'`, `resources.status = 'open'`); residents own their `profiles`, `quest_participants`, `quest_submissions`, and `resources` rows. Edge functions insert/mutate with the service-role key, which bypasses RLS.
- **Resilience index is a generated column:** `r_index = (food + skills + resources + social + emergency) / 5` — never write to it.
- **XP is append-only** via `xp_ledger`. `profiles.xp_total` and `suburbs.xp_total` are aggregates; level transitions happen in app logic, not as DB triggers.

## Domain vocabulary

- **Five resilience pillars** (the `quest_pillar` enum): `food_security`, `skill_density`, `resource_sharing`, `social_connectivity`, `emergency_preparedness`. `QuestPillar` is defined in `quest-generator.ts` and re-exported by other agents.
- **SEIFA score** is 1–10 with **10 = most disadvantaged** (inverted from the ABS scale used elsewhere). Prompts that condition on SEIFA respect this orientation — preserve it.
- **Season** is Southern Hemisphere: see `getSeason()` in `index.ts` (Dec–Feb summer, Jun–Aug winter).

## Cost guardrails (from [AGENTS.md](AGENTS.md))

These are budget-critical and easy to break:

- Max 1 quest generation per suburb per 24h (dedupe on `quests.created_at::date = today`).
- Cache `suburb_narratives` for 7 days — never regenerate mid-week.
- Skip Resource Matchmaker when <5 resources exist in the 10km radius.
- Skip Anomaly Watcher when the current `data_snapshots.snapshot` equals the previous one.

## Sprint ordering

Work follows the 10-sprint sequence in [SPRINT_PLAN.md](SPRINT_PLAN.md). Foundations (Sprint 0) → data pipeline (1) → schema (2) → Three.js globe (3) → auth (4) → quests UI (5) → AI agents one-at-a-time (6–9) → polish + Anomaly Watcher (10). The agent prompts and schemas are already drafted in `AGENTS.md`, so when you reach an agent sprint, the work is wiring + the inlined edge-function copy, not prompt design from scratch.
