# MESH — Architecture

## System overview

```
Browser
  └── SvelteKit app (Vercel)
        ├── Three.js globe (WebGL)
        ├── Svelte stores ←→ Supabase Realtime (live suburb updates)
        └── API routes (SvelteKit server endpoints)
              ├── /api/agents/advisor   (streaming chat)
              ├── /api/quests/*
              └── /api/resources/*

Supabase
  ├── PostgreSQL + PostGIS (all data)
  ├── Auth (magic link + Google OAuth)
  ├── Storage (submission photos)
  ├── Realtime (suburb XP changes → globe pulses)
  └── Edge Functions (Deno)
        ├── sync-open-data       (daily cron)
        ├── generate-quests      (post data sync)
        ├── verify-submission    (DB webhook: quest_submissions)
        ├── match-resources      (DB webhook: resources)
        ├── narrate-suburbs      (weekly cron)
        └── watch-data-anomalies (post data sync)

External
  ├── Anthropic API (all AI agents)
  ├── data.melbourne.vic.gov.au (Socrata API)
  └── data.vic.gov.au (CKAN API)
```

---

## Key data flows

### Quest generation (daily)
```
pg_cron triggers sync-open-data
  → fetches latest suburb data from VIC/Melbourne APIs
  → upserts suburbs table
  → calls generate-quests edge function
      → for each suburb: callClaude(suburbContext) → GeneratedQuest JSON
      → upserts quests table (status: 'draft' → admin reviews → 'active')
      → Supabase Realtime fires → globe node pulses
```

### Quest submission
```
Resident fills form (text + optional photo)
  → photo uploaded to Supabase Storage → URL stored
  → quest_submissions row inserted
  → DB webhook fires verify-submission edge function
      → fetch photo bytes → base64 encode
      → callClaude(evidence) → VerificationVerdict JSON
      → if approved + confidence ≥ 0.7:
          award XP (insert xp_ledger, increment profiles.xp_total)
          check level threshold → level up if needed
          Realtime fires → suburb XP bar animates
      → if confidence < 0.7: insert moderation_queue row
```

### Resource match
```
Resident posts resource
  → resources row inserted
  → DB webhook fires match-resources edge function
      → SELECT nearby unmatched resources (PostGIS <-> operator, 10km radius)
      → callClaude(newResource, nearbyResources) → ResourceMatch[]
      → insert resource_matches rows
      → notify matched residents (Supabase pg_notify)
      → Supabase Realtime: edge lights up in Three.js globe
```

---

## Directory structure

```
mesh/
├── src/
│   ├── lib/
│   │   ├── agents/
│   │   │   ├── _base.ts                 # shared callClaude()
│   │   │   ├── quest-generator.ts
│   │   │   ├── submission-verifier.ts
│   │   │   ├── resource-matchmaker.ts
│   │   │   ├── suburb-narrator.ts
│   │   │   ├── initiative-advisor.ts
│   │   │   └── anomaly-watcher.ts
│   │   ├── components/
│   │   │   ├── globe/
│   │   │   │   ├── MeshGlobe.svelte     # Three.js scene
│   │   │   │   ├── SuburbNode.ts        # InstancedMesh logic
│   │   │   │   └── MeshEdge.ts          # TubeGeometry particle flow
│   │   │   ├── suburb/
│   │   │   │   ├── SuburbCard.svelte    # hover tooltip on globe
│   │   │   │   ├── SuburbDetail.svelte  # full suburb page
│   │   │   │   ├── ResilienceRadar.svelte # pillar score chart
│   │   │   │   └── AdvisorChat.svelte   # streaming chat UI
│   │   │   ├── quest/
│   │   │   │   ├── QuestBoard.svelte
│   │   │   │   ├── QuestCard.svelte
│   │   │   │   ├── QuestDetail.svelte
│   │   │   │   └── SubmissionForm.svelte
│   │   │   ├── resource/
│   │   │   │   ├── ResourceBoard.svelte
│   │   │   │   ├── ResourceCard.svelte
│   │   │   │   └── PostResourceForm.svelte
│   │   │   └── ui/
│   │   │       ├── XPBar.svelte
│   │   │       ├── SuburbLevel.svelte
│   │   │       └── Toast.svelte
│   │   ├── stores/
│   │   │   ├── auth.ts                  # user session store
│   │   │   ├── suburb.ts                # current suburb (reactive)
│   │   │   ├── quests.ts
│   │   │   └── globe.ts                 # Three.js scene state
│   │   ├── types/
│   │   │   ├── index.ts                 # domain types
│   │   │   ├── agents.ts                # agent I/O types
│   │   │   └── database.ts              # generated from supabase gen types
│   │   └── utils/
│   │       ├── vic-data.ts              # data.vic.gov.au fetch wrappers
│   │       ├── melb-data.ts             # data.melbourne.vic.gov.au wrappers
│   │       ├── xp.ts                    # XP + leveling logic
│   │       └── geo.ts                   # PostGIS helpers
│   └── routes/
│       ├── +layout.svelte               # auth session, nav
│       ├── +page.svelte                 # Globe homepage
│       ├── login/+page.svelte
│       ├── app/
│       │   ├── profile/+page.svelte
│       │   ├── quests/
│       │   │   ├── +page.svelte         # quest board
│       │   │   └── [id]/
│       │   │       ├── +page.svelte
│       │   │       └── submit/+page.svelte
│       │   ├── resources/+page.svelte
│       │   └── suburb/[id]/+page.svelte
│       └── api/
│           ├── agents/
│           │   └── advisor/+server.ts   # streaming chat endpoint
│           ├── quests/
│           │   └── +server.ts
│           └── resources/
│               └── +server.ts
├── supabase/
│   ├── functions/
│   │   ├── sync-open-data/index.ts
│   │   ├── generate-quests/index.ts
│   │   ├── verify-submission/index.ts
│   │   ├── match-resources/index.ts
│   │   ├── narrate-suburbs/index.ts
│   │   └── watch-data-anomalies/index.ts
│   └── migrations/
│       ├── 001_extensions.sql
│       ├── 002_suburbs.sql
│       ├── 003_profiles.sql
│       ├── 004_quests.sql
│       ├── 005_resources.sql
│       ├── 006_narratives.sql
│       └── 007_xp_ledger.sql
└── docs/
    ├── ARCHITECTURE.md  ← you are here
    ├── AGENTS.md
    ├── SCHEMA.md
    ├── DATA_SOURCES.md
    └── SPRINT_PLAN.md
```
