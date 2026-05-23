# MESH — Sprint Plan

## Overview

10 sprints × ~1 week each. Solo developer pace (you).
Each sprint has a concrete deliverable you can demo.

---

## Sprint 0 — Foundations (Week 0)

**Goal**: Repo, env, CI, Supabase project, skeleton routes live.

### Tasks
- [x] Init SvelteKit project (`pnpm create svelte@latest`) — used the modern `sv create` (Svelte 5 + TS, minimal template)
- [x] Configure TypeScript strict mode — default in scaffold
- [ ] Set up ESLint + Prettier
- [ ] Create Supabase project, enable PostGIS extension
- [x] Configure `.env.local` with all keys — `ANTHROPIC_API_KEY` populated; Supabase + VIC keys still blank (not yet needed)
- [ ] Deploy skeleton to Vercel (auto-deploy on push)
- [ ] Set up GitHub repo + branch protection on `main` — repo is not yet `git init`-ed

### Env vars needed
```
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
VIC_DATA_API_KEY=
MELBOURNE_DATA_APP_TOKEN=
```

### Deliverable
`pnpm dev` runs, Vercel preview URL live, Supabase tables empty but connected.

---

## Sprint 1 — Data Pipeline (Week 1)

**Goal**: Pull real Victorian open data into Supabase on a schedule.

### Tasks
- [ ] Register for data.vic.gov.au API access
- [ ] Register for data.melbourne.vic.gov.au Socrata app token
- [ ] Build `src/lib/utils/vic-data.ts` — typed fetch wrappers for each endpoint
- [ ] Build `src/lib/utils/melb-data.ts` — typed fetch wrappers
- [ ] Write Supabase Edge Function: `sync-open-data` (runs daily via pg_cron)
- [ ] Migrations: `suburbs`, `community_orgs`, `community_gardens` tables
- [ ] Seed script: populate suburbs with lat/lng, SEIFA scores, baseline data

### Key data endpoints
```
GET https://data.melbourne.vic.gov.au/api/explore/v2.1/catalog/datasets/community-garden-locations/records
GET https://data.vic.gov.au/api/3/action/datastore_search?resource_id=<neighbourhood-houses>
GET https://data.melbourne.vic.gov.au/api/explore/v2.1/catalog/datasets/pedestrian-counting-system-monthly-counts-per-hour/records
```

### Deliverable
Supabase `suburbs` table has real Melbourne suburbs with baseline resilience data.

---

## Sprint 2 — Database Schema & Types (Week 2)

**Goal**: Full schema live, TypeScript types generated, RLS policies in place.

### Tasks
- [ ] Write all migrations (see `docs/SCHEMA.md`)
- [ ] Enable Row Level Security on all tables
- [ ] Write RLS policies: residents own their resources/submissions
- [ ] Generate TypeScript types from Supabase schema (`supabase gen types`)
- [ ] Build `src/lib/types/index.ts` — domain types (Quest, Resource, Suburb, etc.)
- [ ] Build `src/lib/stores/` — Svelte stores for user, suburb, quests

### Deliverable
All tables live, types generated, RLS tested in Supabase Studio.

---

## Sprint 3 — Three.js Globe (Week 3)

**Goal**: The money shot. Melbourne as a living 3D mesh.

### Tasks
- [x] Install Three.js — `three@0.184` installed (GSAP not yet)
- [x] Build `src/lib/components/globe/MeshGlobe.svelte` — the main scene
- [x] Load suburb centroids as spheres — currently 5 mock lat/lng (real GeoJSON deferred to Sprint 1)
- [x] Color-code nodes by resilience score (green → amber → red) — HSL-mapped to r_index
- [ ] Add `OrbitControls`, constrained to Melbourne bounds — auto-orbit camera is in; OrbitControls not yet
- [ ] Animate mesh edges: `TubeGeometry` + particle flow between active suburbs — currently flat `THREE.Line` edges weighted by combined resilience
- [x] Click handler: select suburb → emit `select` event — sidebar + detail panel synced (no GSAP fly-in yet)
- [x] Hover: node halo glow, suburb selection synced to sidebar
- [ ] Day/night ambient light cycle (60s loop)
- [ ] `InstancedMesh` XP burst particle effect on level-up event

### Deliverable
Full-screen globe renders Melbourne suburbs, click flies into suburb, mobile-responsive.

---

## Sprint 4 — Auth & Resident Profile (Week 4)

**Goal**: Residents can sign up, claim their suburb, see their XP.

### Tasks
- [ ] Supabase Auth: magic link + Google OAuth
- [ ] `src/routes/login/+page.svelte` — clean auth page
- [ ] `src/routes/app/profile/+page.svelte` — XP, level, suburb, badges
- [ ] On signup: resident selects their suburb → stored in `profiles` table
- [ ] Suburb store: reactive Svelte store tied to auth session
- [ ] `src/lib/components/ui/XPBar.svelte` — animated XP progress bar

### Deliverable
End-to-end: sign up → claim suburb → see profile with XP = 0.

---

## Sprint 5 — Quests UI (Week 5)

**Goal**: Residents can browse and accept quests for their suburb.

### Tasks
- [x] `src/routes/quests/+page.svelte` — quest board (live at `/quests`, per-suburb "Generate" buttons)
- [x] `src/lib/components/quest/QuestCard.svelte` — card with pillar / difficulty / XP badges, numbered steps, "Why this quest?" expander
- [ ] `src/lib/components/quest/QuestDetail.svelte` — modal with steps, participants
- [ ] Quest filtering: by pillar, difficulty, suburb
- [ ] "Join quest" action → `quest_participants` insert (needs Supabase)
- [ ] Quest progress: aggregate participant count, visual progress bar
- [ ] `src/routes/app/quests/[id]/submit/+page.svelte` — submission form

### Deliverable
Quest board live with real seeded quests. Residents can join and view progress.

---

## Sprint 6 — AI Agent: Quest Generator (Week 6)

**Goal**: First AI agent live. Quests auto-generated from open data.

### Tasks
- [x] Build the Quest Generator agent — currently inlined in `src/routes/api/quests/+server.ts` (SvelteKit endpoint). The `src/lib/agents/quest-generator.ts` design stub still awaits its real call wiring.
- [ ] Supabase Edge Function: `generate-quests` (triggered by data sync OR manual)
- [x] Prompt engineering: suburb context injection, JSON-only output (markdown-fence-stripping defensive parse)
- [ ] Dedup logic (skip if quest generated for this suburb today)
- [ ] Validate + upsert generated quests to DB (no DB yet)
- [ ] Admin UI: preview generated quests before publishing (toggle in settings)
- [x] Test with 5 mock Melbourne suburbs, review output quality — Footscray verified end-to-end, generates a real Footscray-specific emergency-prep quest

### Agent prompt pattern
```typescript
const systemPrompt = `
You are a community resilience advisor for Melbourne, Australia.
Given suburb data, identify the most impactful community initiative missing
and return ONLY a valid JSON object matching the Quest schema.
No preamble, no markdown, no explanation.
`;
```

### Deliverable
Run the edge function → 3–5 real quests appear in the DB for test suburbs.

---

## Sprint 7 — AI Agent: Submission Verifier (Week 7)

**Goal**: Quest completions verified by Claude before XP is awarded.

### Tasks
- [ ] Build `src/lib/agents/submission-verifier.ts`
- [ ] Submission form: text description + optional photo upload (Supabase Storage)
- [ ] Edge Function: `verify-submission` — triggered on submission insert
- [ ] Pass photo as base64 to Claude vision API
- [ ] Parse verdict JSON: `{ verdict, confidence, reason, xp_multiplier }`
- [ ] If `confidence < 0.7` → insert into `moderation_queue`
- [ ] XP award logic: only fires on `approved` verdict
- [ ] Notification: resident gets in-app toast with verdict + reason

### Deliverable
Submit a quest with a photo → Claude verifies → XP awarded or queued.

---

## Sprint 8 — AI Agent: Resource Matchmaker + Exchange UI (Week 8)

**Goal**: Resource board live, AI matches supply/demand across suburbs.

### Tasks
- [ ] `src/routes/app/resources/+page.svelte` — exchange board
- [ ] `src/lib/components/resource/ResourceCard.svelte`
- [ ] Post a resource: type (offer/need), category, description, suburb
- [ ] Build `src/lib/agents/resource-matchmaker.ts`
- [ ] Edge Function: `match-resources` — triggered on resource insert
- [ ] Semantic match: Claude compares new post against recent unmatched posts
- [ ] Surface top 3 matches with plain-language reason + draft intro message
- [ ] Matched resources → light up mesh edge in Three.js globe

### Deliverable
Post "I have 10kg zucchini" → Claude surfaces 2 matching needs → mesh edge glows.

---

## Sprint 9 — AI Agent: Suburb Narrator + Advisor Chat (Week 9)

**Goal**: Weekly suburb digest emails + live initiative advisor chat.

### Tasks
- [ ] Build `src/lib/agents/suburb-narrator.ts` — weekly digest generator
- [ ] Edge Function: `narrate-suburbs` — pg_cron every Monday 8am
- [x] Suburb detail panel — pillar-score breakdown in the home page's detail card (deferred dedicated `/suburb/[id]` route)
- [ ] Recent activity feed
- [x] Build the Initiative Advisor agent — inlined in `src/routes/api/agents/advisor/+server.ts` (streaming SSE pass-through)
- [x] `src/lib/components/suburb/AdvisorChat.svelte` — chat UI with streaming, blinking caret while assistant streams
- [x] Inject suburb context (name, r_index, weakest pillar + score, SEIFA, population) into system prompt
- [ ] "Create quest from this conversation" button → calls Quest Generator

### Deliverable
Suburb page shows weekly narrative. Chat advisor gives grounded local advice.

---

## Sprint 10 — Polish, Anomaly Watcher, Launch Prep (Week 10)

**Goal**: All 6 agents live, globe polished, ready for public beta.

### Tasks
- [ ] Build `src/lib/agents/anomaly-watcher.ts`
- [ ] Edge Function: `watch-data-anomalies` — runs on each data sync, diffs vs previous
- [ ] Classify changes: opportunity / risk / info → spawn quests or alerts
- [ ] Globe polish: LOD (Level of Detail) for mobile, WebGL fallback to 2D Mapbox
- [ ] Onboarding flow: new resident → suburb select → first quest suggested
- [ ] SEO: suburb pages statically rendered via `+page.server.ts`
- [ ] Performance: Three.js scene lazy-loaded, code-split per route
- [ ] Accessibility: skip-nav, ARIA labels on globe controls, keyboard nav
- [ ] Error monitoring: Sentry integration
- [ ] Analytics: Plausible (privacy-first)
- [ ] Write `CONTRIBUTING.md`, `LICENSE`

### Deliverable
Public beta URL. All 6 AI agents running. Globe live with real Melbourne data.

---

## Milestone summary

| Sprint | Deliverable |
|---|---|
| 0 | Repo + CI + Supabase connected |
| 1 | Real Victorian data in DB |
| 2 | Full schema + TypeScript types |
| 3 | Three.js globe live |
| 4 | Auth + resident profiles |
| 5 | Quest board UI |
| 6 | AI Quest Generator |
| 7 | AI Submission Verifier |
| 8 | AI Resource Matchmaker |
| 9 | AI Narrator + Advisor Chat |
| 10 | All agents live, public beta |
