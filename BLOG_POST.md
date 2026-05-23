# Building MESH in a day: turning Melbourne suburbs into a multiplayer game of civic resilience

> A one-day hackathon project at the Claude Impact Lab (Melbourne, May 2026). The brief was open. I built MESH — *Melbourne Exchange & Solidarity Hub* — a gamified civic platform where residents see their suburb as a node in a network and AI agents read live open data to suggest the most useful thing the community can do next.
>
> **Live demo:** https://mesh-pi-topaz.vercel.app/
> **Source:** https://github.com/furic/mesh

![Melbourne 2.5D map with Carlton selected and 3D building extrusion](docs/screenshots/map-hero.png)

---

## 1. Why MESH

Every Australian suburb is sitting on quiet abundance. Gardens that produce too much. Retirees who could teach welding. Neighbours who'd happily check on each other in a heatwave if anyone asked. The capacity exists. The wiring doesn't.

Three observations led me to MESH:

1. **Civic capacity is fragmented.** There's no shared map of who can teach what, who has spare zucchini, who's ready in a heatwave. The information lives in group chats, in heads, in council PDFs nobody reads.
2. **Open data is inert.** `data.melbourne.vic.gov.au` alone publishes 239 datasets. Almost none of them inform a decision a resident will make this week. The data isn't missing — the *loop* is.
3. **The unit of resilience is the suburb.** "City-wide" is too coarse to coordinate. "Neighbourhood" is too granular to measure. The 3-km suburb — Carlton, Footscray, Brunswick — is the natural unit. So MESH scores, narrates, and gamifies at that scale.

The vision: each Melbourne suburb gets a **resilience index** (R-index) derived from five pillars — food security, skill density, resource sharing, social connectivity, emergency preparedness. AI agents read each suburb's data and suggest the most impactful initiative residents could run *this week*. Completing it earns XP. The suburb's score moves. The board updates. Other residents see it. It is meant to feel like a slow-motion multiplayer game.

---

## 2. What it does — a five-minute tour

### The map

The home page is the centrepiece. A real Google Maps WebGL view of inner Melbourne with five suburb polygons (OSM-sourced) colour-coded by R-index. Clicking a suburb (or a sidebar row) tilts the camera to 2.5D, zooms in, and reveals 3D building extrusion native to the basemap. A top-r_index suburb gets a permanent pulsing golden ring; every selection fires a screen-projected burst animation; flowing dots travel along the inter-suburb lines as a stand-in for *potential exchange capacity*.

A small **(i) provenance icon** next to the suburb name expands a panel showing exactly where that suburb's data came from — real / partial / SEIFA-approximated — with links to each underlying dataset. The detail card also embeds a live **advisor chat** that streams Claude responses contextualised to the selected suburb.

![Streaming advisor chat for Carlton](docs/screenshots/advisor-chat.png)

### The quest board

Five hand-curated **EXAMPLE** quests load on first paint (one per suburb, each targeting that suburb's weakest pillar). A single click — *"Regenerate with Claude →"* — replaces the seed with a fresh AI-generated quest, marked **AI**, that persists to `localStorage` so it survives a refresh. Quests generated from the advisor chat appear here too — the two surfaces share state.

![Quest board with seeded + AI-generated cards](docs/screenshots/quest-board.png)

### The pitch + the admin surface

There's also `/pitch` (a long-form editorial walkthrough I built for the hackathon judging panel — Fraunces display type, scroll-paced narrative covering vision, pillars, the data → quest → XP loop, the six agents, honest data provenance, the stack, the roadmap) and `/admin` (gated on `profile.is_admin === true`, used to bulk-regenerate every quest with Claude in front of a live audience).

`/login` has demo personas — pick Maya from Carlton, Tom from Brunswick, Sofia from Footscray, the Admin operator, or play yourself.

---

## 3. Real data, transparent AI

This is the bit I'm most proud of.

### Real open data with honest provenance

The five suburb pillar scores aren't made up. They're pulled by `scripts/seed-suburbs.ts` from three live Melbourne open-data feeds:

- `social-indicators-for-city-of-melbourne-residents-2023` (City of Melbourne resident survey)
- `landmarks-and-places-of-interest` (community-facility density within 1.5 km of each centroid)
- `pedestrian-counting-system-monthly-counts-per-hour` (foot traffic → social-connectivity proxy)

Plus **ABS 2021 SEIFA IRSD deciles** as the fallback for any pillar without a direct signal, and OSM via Nominatim for the boundary polygons.

The catch: `data.melbourne.vic.gov.au` only covers the City of Melbourne LGA. So of my five demo suburbs, only Carlton has full real data. Fitzroy gets partial coverage (sensors and landmarks reach across the LGA border). Brunswick, Footscray, and Richmond — different LGAs — fall back to SEIFA approximations.

Rather than hide that, I made it the brand. Every suburb's detail card shows a `real` / `partial` / `seifa` chip with links to the exact datasets used. The `/pitch` page has a full provenance table. The `mock-suburbs.ts` file has a per-suburb comment header showing the derivation for the most recent seed run. The schema even has a `data_source` column on the `suburbs` table to enforce this at the database level.

> The "we tell you what's real" framing is more interesting than any made-up score.

### Glass-box AI

There are six agents in the design (see [AGENTS.md](AGENTS.md)); three are wired end-to-end today: **Quest Generator** (returns one structured JSON quest for a suburb), **Initiative Advisor** (streaming SSE chat grounded in the selected suburb's context), and **Suburb Narrator** (weekly plain-English digest).

Every AI quest card surfaces *why* it exists, in two layers.

**Always visible — the signal strip** (amber left-border, between badges and description):

> SIGNAL · Claude targeted **food security** because Carlton scored **27/100** — the lowest of its five pillars.

This is the smallest possible "data → AI choice" lineage: one sentence, one number. The audience sees in plain English which pillar was lowest and why the agent picked it.

**Expandable — "How this was created":**

- The model name (`claude-sonnet-4-20250514`)
- Generation timestamp
- The full input the model saw (suburb · SEIFA · population · season)
- The weakest pillar + score (what triggered the choice)
- All five pillar scores at generation time as F/S/R/C/E chips
- A link to `/pitch#provenance` for the underlying datasets

The agent endpoint at `src/routes/api/quests/+server.ts` returns the `data_snapshot` alongside the quest, the snapshot persists with the quest in `localStorage`, so refreshing keeps the panel populated. The DB schema already has a `data_snapshot jsonb` column on the `quests` table — when Supabase comes online the persistence layer is already aligned.

> No vibe-based moderation. Every AI decision is auditable in the UI.

The output discipline is strict: all JSON-returning agents end their system prompt with `OUTPUT: Return ONLY valid JSON.` and route raw output through a `parseAgentJSON()` helper that strips accidental ```` ```json ```` fences before `JSON.parse`. The advisor is streamed without parsing — its SSE response body pipes straight to the browser. Cost guardrails baked in: max one quest generation per suburb per 24h, narratives cached for 7 days, Matchmaker skipped when the radius is too sparse.

---

## 4. The stack, briefly

- **Frontend** — SvelteKit 2 + Svelte 5 with runes mode + TypeScript strict. Svelte 5's `$state` / `$effect` / `$derived` runes made the reactive flow — store hydration from `localStorage`, runtime feature-state toggles on the map, the XP-burst on level-up — read cleanly. No external state library.
- **Map** — Google Maps Platform's WebGL vector renderer with a Map ID configured for tilt + rotation. Pitch 67.5° + heading 20° gives cohesive 2.5D with native 3D building extrusion in the CBD. Polygon overlays sit at zIndex 1000 above the fills; flowing dots are `google.maps.Polyline` icons stepped via RAF. I tried MapLibre first; it works but the basemap stays flat and our 3D extrusions float — Google's WebGL vector is the only path to coherent tilt-with-buildings without a custom tile pipeline.
- **AI** — Anthropic Claude (`claude-sonnet-4-20250514`) called directly from SvelteKit endpoints (streaming SSE for the advisor; JSON-mode for everything else). Cost-guarded.
- **Open data** — `data.melbourne.vic.gov.au` (Opendatasoft v2.1, anonymous reads) + OpenStreetMap via Nominatim. A one-time fetch script (`pnpm fetch:suburb-geo`) writes polygon boundaries to a committed JSON file.
- **Database** — Supabase Postgres 15 + PostGIS. Schema + RLS policies fully written (13 SQL migrations) and the typed `SupabaseClient<Database>` is wired into a per-request server client in `hooks.server.ts` with a typed-Proxy fallback when env is unconfigured. Provisioning a real Supabase project is one user action away; everything else is offline-complete.
- **Hosting** — Vercel via `@sveltejs/adapter-vercel`, auto-deploy on push to `main`. Preview deploys per PR.

---

## 5. What's next

MESH is a 10-sprint roadmap; this hackathon got me to roughly sprint 4. The remaining headline pieces:

- **Sprint 7** — Submission Verifier. The agent that closes the loop: residents submit photo + text evidence of a completed quest, Claude vision verifies, XP is awarded or routed to a moderation queue.
- **Sprint 8** — Resource Matchmaker. The agent that powers the "Exchange" in the name. Posts of "I have 10 kg of zucchini" get semantically matched to "I need vegetables for a community kitchen" within a 10 km PostGIS `<->` radius, and the mesh edges between matched suburbs light up.
- **Sprint 10** — Anomaly Watcher. Watches each open-data sync for deltas, classifies them as opportunity / risk / info, and spawns reactive quests or alerts.

The architecture is already shaped to land them quickly once the Supabase project is provisioned. The data-snapshot + transparency pattern I built into the Quest Generator transfers directly to each new agent.

---

## Try it

- **Live demo →** https://mesh-pi-topaz.vercel.app/
- **Source →** https://github.com/furic/mesh
- **Pitch deck-as-a-page →** https://mesh-pi-topaz.vercel.app/pitch

A few things worth clicking:

1. Sign in as **Admin · Demo** on `/login`, then hit **"Generate all 5 with Claude →"** on `/admin`. Watch the EXAMPLE chips flip to AI in real time.
2. On `/quests`, expand any AI quest's *"How this was created"* — the full agent lineage is right there.
3. On `/`, click the **(i)** next to any suburb name to see exactly which datasets fed its scores.

Built in a day for the **Claude Impact Lab** hackathon (Melbourne, 23 May 2026). Coffee was consumed. Polygons were fetched. AI rationales were strict-JSON-fenced. The streets of Carlton tilted on cue.
