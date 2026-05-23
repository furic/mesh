<script lang="ts">
  import { browser } from '$app/environment'

  // Scroll-reveal action. Triggers a one-shot fade-in when the node enters
  // the viewport. Falls back gracefully: if the observer never fires (no JS,
  // printing, headless fullPage capture), the element is already visible
  // because the initial style is applied via inline `animation`, not as a
  // baseline `opacity: 0`. Worst case = no fade-in, never an invisible page.
  function reveal(node: HTMLElement, opts: { delay?: number } = {}) {
    if (!browser) return {}
    const delay = opts.delay ?? 0
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          const el = e.target as HTMLElement
          el.style.animation = `pitch-fade-up 700ms cubic-bezier(0.2, 0.7, 0.2, 1) ${delay}ms both`
          io.unobserve(el)
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(node)
    return { destroy: () => io.disconnect() }
  }

  // Real suburb data for the hero constellation.
  // Hand-placed positions for visual rhythm, not strict cartography.
  const suburbs = [
    { id: 'brunswick', name: 'Brunswick', cx: 430, cy: 100, r: 38, color: '#7fc497', textColor: '#0a1a12' },
    { id: 'carlton',   name: 'Carlton',   cx: 490, cy: 220, r: 40, color: '#7fc497', textColor: '#0a1a12' },
    { id: 'fitzroy',   name: 'Fitzroy',   cx: 605, cy: 250, r: 36, color: '#7fc497', textColor: '#0a1a12' },
    { id: 'richmond',  name: 'Richmond',  cx: 660, cy: 365, r: 30, color: '#e8a23e', textColor: '#231605' },
    { id: 'footscray', name: 'Footscray', cx: 160, cy: 300, r: 26, color: '#d76f5b', textColor: '#fff5f0' },
  ]

  const edges = [
    ['carlton',  'fitzroy'],
    ['carlton',  'brunswick'],
    ['fitzroy',  'richmond'],
    ['carlton',  'richmond'],
    ['carlton',  'footscray'],
    ['brunswick','fitzroy'],
  ] as const

  const byId = Object.fromEntries(suburbs.map((s) => [s.id, s]))

  const pillars = [
    {
      key: 'food',
      title: 'Food security',
      tag:   'F',
      blurb: 'Community gardens, food-rescue networks, fresh-food access in disadvantaged pockets.',
      hue:   '#7fc497',
    },
    {
      key: 'skills',
      title: 'Skill density',
      tag:   'S',
      blurb: 'Neighbourhood houses, free training, who-can-teach-what mapped per postcode.',
      hue:   '#8bb6ff',
    },
    {
      key: 'resources',
      title: 'Resource sharing',
      tag:   'R',
      blurb: 'Tool libraries, materials exchange, the circular-economy edge of every suburb.',
      hue:   '#caa5d6',
    },
    {
      key: 'social',
      title: 'Social connectivity',
      tag:   'C',
      blurb: 'Foot traffic, third places, the texture of weak ties that holds a place together.',
      hue:   '#e8a23e',
    },
    {
      key: 'emergency',
      title: 'Emergency preparedness',
      tag:   'E',
      blurb: 'Heatwave plans, defibrillator coverage, who calls who when the grid wobbles.',
      hue:   '#d76f5b',
    },
  ]

  const agents = [
    {
      tag:    '01',
      title:  'Quest Generator',
      role:   'Reads suburb data. Proposes the missing initiative.',
      detail: 'Conditions on SEIFA, weakest pillar, season, and what was already tried. Returns a 3–5 step plan, an XP reward, and a plain-English rationale.',
      image:  '/pitch/quests-board.png',
      alt:    'Quest board showing AI-generated quests for Footscray',
    },
    {
      tag:    '02',
      title:  'Submission Verifier',
      role:   'Checks photo + text. Decides if XP is earned.',
      detail: 'Vision-capable. Awards XP, queues for human review when confidence drops below 0.7, never silently swallows a submission.',
      image:  null,
      alt:    null,
    },
    {
      tag:    '03',
      title:  'Resource Matchmaker',
      role:   'Pairs supply with demand within 10km.',
      detail: 'Semantic match across "I have" and "I need" posts, draft intro message included. Skips when the radius is too sparse to be useful.',
      image:  null,
      alt:    null,
    },
    {
      tag:    '04',
      title:  'Suburb Narrator',
      role:   'Writes a weekly digest of what changed.',
      detail: 'Plain text, cached for 7 days, never regenerated mid-week. The narrative is grounded in real pillar deltas, not hallucinated headlines.',
      image:  '/pitch/narrator.png',
      alt:    'Weekly narrative for Brunswick',
    },
    {
      tag:    '05',
      title:  'Initiative Advisor',
      role:   'Chat. Plans your community project step by step.',
      detail: 'Streaming SSE. Injects live suburb context — population, SEIFA, weakest pillar — so the advice is grounded in this postcode, not a generic prompt.',
      image:  '/pitch/advisor.png',
      alt:    'Initiative Advisor conversation for Carlton',
    },
    {
      tag:    '06',
      title:  'Anomaly Watcher',
      role:   'Notices when a number moves and asks why.',
      detail: 'Runs on each data sync. Classifies each delta as opportunity / risk / info and spawns the relevant quest or alert.',
      image:  null,
      alt:    null,
    },
  ]

  const provenance = [
    { suburb: 'Carlton',   lga: 'Melbourne',     food: 'real',    skills: 'real',    resources: 'real',    social: 'real',    emergency: 'real' },
    { suburb: 'Fitzroy',   lga: 'Yarra',         food: 'seifa',   skills: 'real',    resources: 'real',    social: 'real',    emergency: 'seifa' },
    { suburb: 'Brunswick', lga: 'Merri-bek',     food: 'seifa',   skills: 'seifa',   resources: 'seifa',   social: 'seifa',   emergency: 'seifa' },
    { suburb: 'Footscray', lga: 'Maribyrnong',   food: 'seifa',   skills: 'seifa',   resources: 'seifa',   social: 'seifa',   emergency: 'seifa' },
    { suburb: 'Richmond',  lga: 'Yarra',         food: 'seifa',   skills: 'seifa',   resources: 'seifa',   social: 'seifa',   emergency: 'seifa' },
  ]

  const sprints = [
    { n: '00', title: 'Foundations',           state: 'done',    note: 'SvelteKit scaffold, Vercel deploy, brand bones' },
    { n: '01', title: 'Data pipeline',         state: 'done',    note: 'Open-data wrappers, real-data seed' },
    { n: '02', title: 'Schema & types',        state: 'done',    note: 'Migrations + typed Supabase client (offline)' },
    { n: '03', title: 'Map (2.5D)',            state: 'done',    note: 'Google Maps WebGL vector + tilt + 3D buildings + 2D/3D toggle' },
    { n: '04', title: 'Auth & profile',        state: 'done',    note: 'Demo personas + Admin role + /admin route; magic-link gated on Supabase' },
    { n: '05', title: 'Quests UI',             state: 'partial', note: 'Seeded + AI cards, EXAMPLE/AI chips, persistence; submission UI in 07' },
    { n: '06', title: 'Quest Generator',       state: 'done',    note: 'Endpoint + signal strip + How-this-was-created panel; edge-fn pending' },
    { n: '07', title: 'Submission Verifier',   state: 'next',    note: 'Vision agent, photo verification' },
    { n: '08', title: 'Matchmaker + Exchange', state: 'next',    note: 'Resource board + AI pairing' },
    { n: '09', title: 'Narrator + Advisor',    state: 'partial', note: 'Both agents live; weekly cron pending' },
    { n: '10', title: 'Polish + launch',       state: 'next',    note: 'Anomaly Watcher, a11y, public beta' },
  ]

  function pathFor(a: string, b: string) {
    const A = byId[a]
    const B = byId[b]
    return `M${A.cx},${A.cy} Q${(A.cx + B.cx) / 2},${(A.cy + B.cy) / 2 - 18} ${B.cx},${B.cy}`
  }

  // Smooth scroll for in-page anchors.
  function scrollTo(e: MouseEvent, target: string) {
    if (!browser) return
    e.preventDefault()
    document.querySelector(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
</script>

<svelte:head>
  <title>MESH — The Pitch</title>
  <meta name="description" content="MESH turns Melbourne suburbs into a living, multiplayer game of resilience — powered by open data, six AI agents, and the people already doing the work." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,200..900,30..100;1,9..144,200..900,30..100&family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
</svelte:head>

<main class="pitch">
  <div class="grain" aria-hidden="true"></div>

  <!-- 01 — HERO -->
  <section class="hero" id="hero">
    <div class="hero-grid">
      <div class="hero-text" use:reveal>
        <p class="eyebrow"><span class="dot"></span>01 — Pitch Brief · 2026</p>
        <h1 class="display">
          <span>Cities have spare <em>capacity</em>.</span>
          <span>We're building a <strong>game</strong></span>
          <span>that finds it.</span>
        </h1>
        <p class="lede">
          MESH turns Melbourne suburbs into a living, multiplayer game of resilience —
          powered by open data, six AI agents, and the people already doing the work.
        </p>
        <div class="cta-row">
          <a class="cta primary" href="/">See the prototype →</a>
          <a class="cta ghost" href="#premise" onclick={(e) => scrollTo(e, '#premise')}>Read the brief ↓</a>
        </div>
        <ul class="meta">
          <li><span>Status</span><strong>Sprint 03 / 10</strong></li>
          <li><span>Suburbs</span><strong>5 seeded</strong></li>
          <li><span>Agents</span><strong>4 / 6 live</strong></li>
        </ul>
      </div>

      <div class="hero-art" use:reveal={{ delay: 200 }}>
        <svg viewBox="0 0 760 460" role="img" aria-label="A constellation of Melbourne suburbs connected as a mesh.">
          <defs>
            <radialGradient id="halo" cx="50%" cy="50%" r="50%">
              <stop offset="0%"  stop-color="#7fc497" stop-opacity="0.32" />
              <stop offset="60%" stop-color="#7fc497" stop-opacity="0" />
            </radialGradient>
            <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          <!-- soft compass markers -->
          <g class="compass" stroke="rgba(229,236,255,0.06)" fill="none">
            <circle cx="400" cy="240" r="180" />
            <circle cx="400" cy="240" r="280" />
            <line x1="400" y1="40"  x2="400" y2="440" />
            <line x1="80"  y1="240" x2="720" y2="240" />
          </g>

          <!-- edges -->
          <g class="edges" stroke="rgba(229,236,255,0.18)" fill="none" stroke-width="1.1">
            {#each edges as [a, b], i (a + b)}
              <path d={pathFor(a, b)} class="edge" style="animation-delay: {300 + i * 120}ms" />
            {/each}
          </g>

          <!-- nodes -->
          <g class="nodes">
            {#each suburbs as s, i (s.id)}
              <g class="node" style="--c: {s.color}; animation-delay: {600 + i * 140}ms">
                <circle cx={s.cx} cy={s.cy} r={s.r * 1.7} fill="url(#halo)" class="halo" />
                <circle cx={s.cx} cy={s.cy} r={s.r}       fill="var(--c)" class="dot" filter="url(#soft-glow)" />
                <text x={s.cx} y={s.cy + 4} text-anchor="middle" class="node-label" style="fill: {s.textColor}">{s.name}</text>
              </g>
            {/each}
          </g>
        </svg>

        <div class="legend">
          <span><i style="background:#7fc497"></i>thriving</span>
          <span><i style="background:#e8a23e"></i>at risk</span>
          <span><i style="background:#d76f5b"></i>under-served</span>
        </div>
      </div>
    </div>
  </section>

  <!-- 02 — PREMISE -->
  <section class="premise" id="premise">
    <header class="section-head" use:reveal>
      <p class="eyebrow">02 — Premise</p>
      <h2 class="section-title">Resilience is the next civic asset class.</h2>
    </header>

    <div class="premise-body" use:reveal>
      <p>
        Every Australian suburb is sitting on quiet abundance — gardens that produce too much,
        retirees who could teach welding, neighbours who'd happily check on each other in a heatwave
        if anyone asked. The capacity exists. The wiring doesn't.
      </p>
    </div>

    <ol class="insights">
      <li use:reveal={{ delay:  50 }}>
        <span class="roman">i.</span>
        <h3>Civic capacity is fragmented.</h3>
        <p>There's no shared map of who can teach what, who has spare zucchini, who's ready in a heatwave. The information lives in group chats, in heads, in council PDFs that nobody reads.</p>
      </li>
      <li use:reveal={{ delay: 150 }}>
        <span class="roman">ii.</span>
        <h3>Open data is inert.</h3>
        <p>data.melbourne.vic.gov.au alone publishes 239 datasets. Almost none of them inform a decision a resident will make this week. The data isn't missing — the loop is.</p>
      </li>
      <li use:reveal={{ delay: 250 }}>
        <span class="roman">iii.</span>
        <h3>The unit of resilience is the suburb.</h3>
        <p>"City-wide" is too coarse to coordinate; "neighbourhood" is too granular to measure. The 3-mile suburb — Carlton, Footscray, Brunswick — is the natural unit. We score, narrate, and gamify at that scale.</p>
      </li>
    </ol>
  </section>

  <!-- 03 — PILLARS -->
  <section class="pillars" id="pillars">
    <header class="section-head" use:reveal>
      <p class="eyebrow">03 — Resilience Pillars</p>
      <h2 class="section-title">Five dimensions. <em>One score</em> per suburb.</h2>
      <p class="section-sub">Each pillar maps to a measurable, defensible signal in open data. The resilience index is their average — generated in the database, never written by the app.</p>
    </header>

    <div class="pillar-grid">
      {#each pillars as p, i (p.key)}
        <article class="pillar" style="--hue: {p.hue}" use:reveal={{ delay: i * 60 }}>
          <header>
            <span class="pillar-tag">{p.tag}</span>
            <h3>{p.title}</h3>
          </header>
          <p>{p.blurb}</p>
          <span class="pillar-rule"></span>
        </article>
      {/each}
    </div>
  </section>

  <!-- 04 — THE LOOP -->
  <section class="loop" id="loop">
    <header class="section-head" use:reveal>
      <p class="eyebrow">04 — The Loop</p>
      <h2 class="section-title">Open data → quests → residents → XP → resilience.</h2>
    </header>

    <div class="loop-diagram" use:reveal>
      <ol class="loop-steps">
        <li><span class="loop-num">A</span><strong>Sync</strong><em>Daily pull from data.vic.gov.au + Melbourne open data.</em></li>
        <li><span class="loop-num">B</span><strong>Score</strong><em>Five pillars per suburb. Generated column for r_index.</em></li>
        <li><span class="loop-num">C</span><strong>Generate</strong><em>Quest Generator drafts a quest for the weakest pillar.</em></li>
        <li><span class="loop-num">D</span><strong>Join</strong><em>Residents accept. Steps become a shared checklist.</em></li>
        <li><span class="loop-num">E</span><strong>Verify</strong><em>Submit photo + text. Vision agent awards XP, queues edge cases.</em></li>
        <li><span class="loop-num">F</span><strong>Reflect</strong><em>Narrator writes the weekly digest. The score moves.</em></li>
      </ol>
    </div>
  </section>

  <!-- 05 — AGENTS -->
  <section class="agents" id="agents">
    <header class="section-head" use:reveal>
      <p class="eyebrow">05 — Six Agents</p>
      <h2 class="section-title">Six narrow agents, <em>one civic mission</em>.</h2>
      <p class="section-sub">Each agent has a single job and a strict output schema. No hallucinated abundance. No vibe-based moderation. Pin to <code>claude-sonnet-4-20250514</code>.</p>
    </header>

    <div class="agent-grid">
      {#each agents as a, i (a.tag)}
        <article class="agent" use:reveal={{ delay: (i % 3) * 80 }}>
          <header>
            <span class="agent-tag">{a.tag}</span>
            <h3>{a.title}</h3>
          </header>
          <p class="role">{a.role}</p>
          <p class="detail">{a.detail}</p>
          {#if a.image && a.alt}
            <figure>
              <img src={a.image} alt={a.alt} loading="lazy" />
            </figure>
          {/if}
        </article>
      {/each}
    </div>
  </section>

  <!-- 06 — GAMIFICATION -->
  <section class="game" id="game">
    <header class="section-head" use:reveal>
      <p class="eyebrow">06 — The Game Layer</p>
      <h2 class="section-title">Make showing up feel <em>as good as scrolling</em>.</h2>
    </header>

    <div class="game-grid">
      <div class="game-copy" use:reveal>
        <p>
          The point isn't badges. The point is to make a hot tip from a neighbour, a Sunday-morning
          fence repair, a free CPR class — feel like progress that's <em>seen</em> by your community,
          not lost to the void.
        </p>
        <ul class="game-bullets">
          <li><strong>XP per quest</strong> — easy 100 · medium 300 · hard 700, modulated by the verifier's confidence.</li>
          <li><strong>Suburb leaderboards</strong> — postcode pride is real; we lean into it without weaponising it.</li>
          <li><strong>Append-only XP ledger</strong> — every award is auditable. No silent admin claw-backs.</li>
          <li><strong>Personal badges</strong> — earned, not bought. Tied to specific local acts.</li>
        </ul>
      </div>
      <figure class="game-shot" use:reveal={{ delay: 120 }}>
        <img src="/pitch/suburb-footscray.png" alt="A real Footscray quest generated by the prototype." loading="lazy" />
        <figcaption>Real Footscray quest, generated end-to-end by the prototype.</figcaption>
      </figure>
    </div>
  </section>

  <!-- 07 — PROVENANCE -->
  <section class="provenance" id="provenance">
    <header class="section-head" use:reveal>
      <p class="eyebrow">07 — Provenance</p>
      <h2 class="section-title">We tell you <em>what's real</em>.</h2>
      <p class="section-sub">data.melbourne.vic.gov.au only covers the City of Melbourne LGA. Suburbs across the river get SEIFA-derived approximations. The app records this per-row, in code, so nobody is misled.</p>
    </header>

    <div class="prov-table" role="table" aria-label="Data coverage by suburb" use:reveal>
      <div class="prov-head" role="row">
        <span role="columnheader">Suburb</span>
        <span role="columnheader">LGA</span>
        <span role="columnheader">Food</span>
        <span role="columnheader">Skills</span>
        <span role="columnheader">Resources</span>
        <span role="columnheader">Social</span>
        <span role="columnheader">Emergency</span>
      </div>
      {#each provenance as r, i (r.suburb)}
        <div class="prov-row" role="row" use:reveal={{ delay: i * 50 }}>
          <span class="prov-suburb" role="cell">{r.suburb}</span>
          <span class="prov-lga" role="cell">{r.lga}</span>
          <span class="cov cov-{r.food}"      role="cell">{r.food}</span>
          <span class="cov cov-{r.skills}"    role="cell">{r.skills}</span>
          <span class="cov cov-{r.resources}" role="cell">{r.resources}</span>
          <span class="cov cov-{r.social}"    role="cell">{r.social}</span>
          <span class="cov cov-{r.emergency}" role="cell">{r.emergency}</span>
        </div>
      {/each}
    </div>

    <div class="prov-legend" use:reveal>
      <span><i class="cov cov-real"></i>real — pulled from a survey or sensor</span>
      <span><i class="cov cov-seifa"></i>seifa — approximated from ABS 2021 IRSD decile</span>
    </div>

    <div class="prov-datasets" use:reveal>
      <p class="prov-datasets-head">Datasets used</p>
      <ul>
        <li>
          <a href="https://data.melbourne.vic.gov.au/api/explore/v2.1/catalog/datasets/social-indicators-for-city-of-melbourne-residents-2023/information" target="_blank" rel="noopener">
            social-indicators-for-city-of-melbourne-residents-2023
          </a>
          <span>— City of Melbourne resident survey. Feeds food security + emergency preparedness for Carlton.</span>
        </li>
        <li>
          <a href="https://data.melbourne.vic.gov.au/api/explore/v2.1/catalog/datasets/landmarks-and-places-of-interest-including-schools-theatres-health-services-spor/information" target="_blank" rel="noopener">
            landmarks-and-places-of-interest
          </a>
          <span>— spatial filter within 1.5 km of each centroid drives skill density + resource sharing.</span>
        </li>
        <li>
          <a href="https://data.melbourne.vic.gov.au/api/explore/v2.1/catalog/datasets/pedestrian-counting-system-monthly-counts-per-hour/information" target="_blank" rel="noopener">
            pedestrian-counting-system-monthly-counts-per-hour
          </a>
          <span>— hourly counts within radius drive the social-connectivity score.</span>
        </li>
        <li>
          <a href="https://www.abs.gov.au/statistics/people/people-and-communities/socio-economic-indexes-areas-seifa-australia/latest-release" target="_blank" rel="noopener">
            ABS 2021 SEIFA (IRSD decile)
          </a>
          <span>— hand-curated reference values in <code>scripts/seed-suburbs.ts</code>. Used as the fallback for any pillar with no direct signal.</span>
        </li>
        <li>
          <a href="https://nominatim.openstreetmap.org/" target="_blank" rel="noopener">
            OpenStreetMap via Nominatim
          </a>
          <span>— suburb boundary polygons fetched once by <code>pnpm fetch:suburb-geo</code> into <code>src/lib/data/suburb-geometries.json</code>.</span>
        </li>
      </ul>
    </div>
  </section>

  <!-- 08 — STACK -->
  <section class="stack" id="stack">
    <header class="section-head" use:reveal>
      <p class="eyebrow">08 — Stack</p>
      <h2 class="section-title">Boring tech, <em>bold ambitions</em>.</h2>
    </header>

    <ul class="stack-list" use:reveal>
      <li><span>Frontend</span><strong>SvelteKit 2 + Svelte 5 runes</strong></li>
      <li><span>Map</span><strong>Google Maps · WebGL vector · 2.5D tilt + 3D buildings</strong></li>
      <li><span>Data</span><strong>Supabase, Postgres 15, PostGIS</strong></li>
      <li><span>Agents</span><strong>Claude Sonnet 4 · pinned model</strong></li>
      <li><span>Deploy</span><strong>Vercel (adapter-vercel)</strong></li>
      <li><span>Open data</span><strong>Opendatasoft v2.1 · CKAN v3</strong></li>
    </ul>
  </section>

  <!-- 09 — ROADMAP -->
  <section class="roadmap" id="roadmap">
    <header class="section-head" use:reveal>
      <p class="eyebrow">09 — Roadmap</p>
      <h2 class="section-title">Ten sprints. <em>We're on three.</em></h2>
    </header>

    <ol class="roadmap-rail" use:reveal>
      {#each sprints as sp, i (sp.n)}
        <li class="rail-item state-{sp.state}" use:reveal={{ delay: i * 40 }}>
          <span class="rail-num">{sp.n}</span>
          <h4>{sp.title}</h4>
          <p>{sp.note}</p>
          <span class="rail-pin"></span>
        </li>
      {/each}
    </ol>
  </section>

  <!-- 10 — CLOSING -->
  <section class="closing" id="closing">
    <header use:reveal>
      <p class="eyebrow">10 — Join</p>
      <h2 class="display closing-display">
        <span>Built in <em>Melbourne</em>.</span>
        <span>Open to <strong>collaborators</strong>.</span>
      </h2>
    </header>
    <div class="closing-cta" use:reveal={{ delay: 120 }}>
      <a class="cta primary" href="/">Open the prototype →</a>
      <a class="cta ghost"   href="https://github.com/" rel="noopener">View the code (soon) ↗</a>
    </div>
    <p class="closing-note" use:reveal={{ delay: 220 }}>
      MESH is a prototype, deliberately scoped: five suburbs, six agents, ten sprints.
      If the loop works at this scale, it scales sideways to every LGA in the country.
    </p>
  </section>
</main>

<style>
  @keyframes fade-up {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes draw-edge {
    from { stroke-dashoffset: 400; opacity: 0; }
    to   { stroke-dashoffset: 0;   opacity: 1; }
  }
  @keyframes pulse-dot {
    0%, 100% { transform: scale(1);    opacity: 1; }
    50%      { transform: scale(1.04); opacity: 0.92; }
  }

  .pitch {
    --bg:        #06090f;
    --bg-tint:   #0a1018;
    --surface:   #0f1626;
    --fg:        #ecf1ff;
    --muted:     #8893ad;
    --rule:      rgba(236, 241, 255, 0.08);
    --blue:      #8bb6ff;
    --green:     #7fc497;
    --amber:     #e8a23e;
    --terra:     #d76f5b;

    --display:   'Fraunces', 'Times New Roman', serif;
    --body:      'Bricolage Grotesque', -apple-system, BlinkMacSystemFont, sans-serif;
    --mono:      'JetBrains Mono', ui-monospace, Menlo, monospace;

    color: var(--fg);
    font-family: var(--body);
    font-size: 17px;
    line-height: 1.55;
    background:
      radial-gradient(900px 500px at 80% -10%, rgba(127, 196, 151, 0.10), transparent 60%),
      radial-gradient(900px 700px at 0% 30%,  rgba(232, 162, 62, 0.07), transparent 60%),
      radial-gradient(700px 600px at 100% 80%, rgba(139, 182, 255, 0.07), transparent 60%),
      var(--bg);
    overflow-x: hidden;
    padding-top: 56px;
    position: relative;
  }

  .grain {
    pointer-events: none;
    position: fixed;
    inset: 0;
    z-index: 1;
    opacity: 0.45;
    mix-blend-mode: overlay;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.18'/></svg>");
  }

  /* Sections share a max-width container, but the hero breaks it. */
  section {
    position: relative;
    z-index: 2;
    max-width: 1160px;
    margin: 0 auto;
    padding: 96px 32px;
  }
  @media (max-width: 720px) {
    section { padding: 64px 22px; }
  }

  /* === Reveal ===
     The reveal action attaches an inline animation when the node intersects.
     The animation keyframes go FROM hidden TO visible — so if the animation
     never plays, the element rests in its default visible state. This means
     no-JS, print, and headless fullPage screenshots all render content. */
  @keyframes pitch-fade-up {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: none; }
  }

  /* === Typography primitives === */
  .eyebrow {
    font-family: var(--mono);
    font-size: 0.74rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--muted);
    margin: 0 0 28px;
    display: inline-flex;
    align-items: center;
    gap: 10px;
  }
  .dot {
    width: 6px;
    height: 6px;
    background: var(--green);
    border-radius: 50%;
    box-shadow: 0 0 12px rgba(127, 196, 151, 0.7);
  }

  .display {
    font-family: var(--display);
    font-weight: 350;
    font-size: clamp(2.2rem, 4.4vw + 0.8rem, 4.8rem);
    line-height: 1.04;
    letter-spacing: -0.02em;
    font-variation-settings: 'opsz' 144, 'SOFT' 60;
    margin: 0;
    color: var(--fg);
    text-wrap: balance;
  }
  .display span { display: block; }
  .display em {
    font-style: italic;
    color: var(--green);
    font-weight: 350;
  }
  .display strong {
    font-weight: 800;
    color: var(--amber);
    font-style: normal;
  }

  .section-head {
    margin-bottom: 56px;
    max-width: 880px;
  }
  .section-title {
    font-family: var(--display);
    font-weight: 360;
    font-size: clamp(1.85rem, 2.6vw + 1rem, 3.2rem);
    line-height: 1.06;
    letter-spacing: -0.018em;
    font-variation-settings: 'opsz' 144, 'SOFT' 40;
    margin: 0;
  }
  .section-title em {
    font-style: italic;
    color: var(--amber);
    font-weight: 360;
  }
  .section-sub {
    color: var(--muted);
    margin: 20px 0 0;
    max-width: 700px;
    font-size: 1.02rem;
  }

  /* === Hero === */
  .hero {
    min-height: calc(100vh - 56px);
    display: flex;
    align-items: center;
    max-width: 1280px;
    padding-top: 32px;
    padding-bottom: 80px;
  }
  .hero-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
    gap: 64px;
    width: 100%;
    align-items: center;
  }
  @media (max-width: 920px) {
    .hero-grid { grid-template-columns: 1fr; gap: 48px; }
  }

  .lede {
    font-size: 1.2rem;
    color: #cdd5ec;
    max-width: 540px;
    margin: 28px 0 36px;
    line-height: 1.5;
  }
  .cta-row {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
  }
  .cta {
    font-family: var(--body);
    font-weight: 500;
    text-decoration: none;
    padding: 13px 22px;
    border-radius: 999px;
    font-size: 0.95rem;
    letter-spacing: 0.005em;
    transition: transform 180ms ease, background 180ms ease, color 180ms ease, box-shadow 200ms ease;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    line-height: 1;
    border: 1px solid transparent;
  }
  .cta.primary {
    background: var(--green);
    color: #0a1a12;
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.4), 0 12px 30px -12px rgba(127, 196, 151, 0.6);
  }
  .cta.primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.4), 0 18px 40px -14px rgba(127, 196, 151, 0.7);
  }
  .cta.ghost {
    background: transparent;
    color: var(--fg);
    border-color: var(--rule);
  }
  .cta.ghost:hover {
    background: rgba(236, 241, 255, 0.06);
    border-color: rgba(236, 241, 255, 0.16);
  }

  .meta {
    list-style: none;
    padding: 0;
    margin: 56px 0 0;
    display: flex;
    gap: 36px;
    flex-wrap: wrap;
  }
  .meta li {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .meta span {
    font-family: var(--mono);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--muted);
  }
  .meta strong {
    font-family: var(--display);
    font-weight: 400;
    font-size: 1.25rem;
  }

  .hero-art {
    position: relative;
  }
  .hero-art svg {
    width: 100%;
    height: auto;
    display: block;
  }
  .hero-art .compass { opacity: 0.6; }
  .hero-art .edge {
    stroke-dasharray: 400;
    animation: draw-edge 1.6s cubic-bezier(0.2, 0.7, 0.2, 1) both;
  }
  .hero-art .node {
    animation: fade-up 900ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
  }
  .hero-art .dot {
    transform-origin: center;
    transform-box: fill-box;
    animation: pulse-dot 4.2s ease-in-out infinite;
  }
  .hero-art .node-label {
    font-family: var(--display);
    font-style: italic;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: -0.005em;
    pointer-events: none;
  }

  .legend {
    display: flex;
    gap: 18px;
    margin-top: 16px;
    flex-wrap: wrap;
    font-family: var(--mono);
    font-size: 0.74rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }
  .legend i {
    display: inline-block;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    margin-right: 8px;
    vertical-align: middle;
  }

  /* === Premise === */
  .premise-body {
    font-family: var(--display);
    font-size: clamp(1.25rem, 1.4vw + 0.9rem, 1.7rem);
    line-height: 1.45;
    color: #d3dbee;
    max-width: 860px;
    margin-bottom: 64px;
    font-weight: 300;
    font-variation-settings: 'opsz' 96, 'SOFT' 60;
  }

  .insights {
    list-style: none;
    padding: 0;
    margin: 0;
    counter-reset: insight;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 36px;
  }
  @media (max-width: 900px) {
    .insights { grid-template-columns: 1fr; gap: 28px; }
  }
  .insights li {
    border-top: 1px solid var(--rule);
    padding-top: 22px;
  }
  .roman {
    font-family: var(--display);
    font-style: italic;
    font-size: 1.15rem;
    color: var(--amber);
    margin-bottom: 8px;
    display: block;
  }
  .insights h3 {
    font-family: var(--display);
    font-weight: 420;
    font-size: 1.35rem;
    margin: 0 0 12px;
    line-height: 1.2;
    letter-spacing: -0.012em;
  }
  .insights p {
    color: #b9c2d8;
    margin: 0;
    font-size: 0.97rem;
  }

  /* === Pillars === */
  .pillar-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 1px;
    background: var(--rule);
    border: 1px solid var(--rule);
    border-radius: 18px;
    overflow: hidden;
  }
  @media (max-width: 1080px) {
    .pillar-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  }
  @media (max-width: 640px) {
    .pillar-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  .pillar {
    background: var(--bg-tint);
    padding: 32px 26px 30px;
    position: relative;
    transition: background 220ms ease, transform 220ms ease;
  }
  .pillar:hover {
    background: linear-gradient(180deg, rgba(255,255,255,0.02), transparent), var(--bg-tint);
  }
  .pillar header {
    display: flex;
    align-items: baseline;
    gap: 14px;
    margin-bottom: 18px;
  }
  .pillar-tag {
    font-family: var(--mono);
    font-size: 0.7rem;
    letter-spacing: 0.18em;
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--hue);
    border: 1px solid currentColor;
    border-radius: 6px;
  }
  .pillar h3 {
    font-family: var(--display);
    font-weight: 450;
    font-size: 1.32rem;
    margin: 0;
    line-height: 1.15;
    letter-spacing: -0.01em;
  }
  .pillar p {
    color: #a9b3cb;
    margin: 0 0 18px;
    font-size: 0.92rem;
  }
  .pillar-rule {
    display: block;
    width: 36px;
    height: 2px;
    background: var(--hue);
    opacity: 0.7;
  }

  /* === Loop === */
  .loop-diagram {
    border: 1px solid var(--rule);
    border-radius: 18px;
    padding: 38px 30px;
    background: linear-gradient(180deg, rgba(15, 22, 38, 0.6), rgba(10, 16, 24, 0.6));
  }
  .loop-steps {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 1px;
    background: var(--rule);
  }
  @media (max-width: 1000px) {
    .loop-steps { grid-template-columns: repeat(3, 1fr); }
  }
  @media (max-width: 640px) {
    .loop-steps { grid-template-columns: repeat(2, 1fr); }
  }
  .loop-steps li {
    background: transparent;
    padding: 20px 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 130px;
  }
  .loop-num {
    font-family: var(--mono);
    font-size: 0.74rem;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 1px solid var(--rule);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--green);
    margin-bottom: 6px;
  }
  .loop-steps strong {
    font-family: var(--display);
    font-weight: 460;
    font-size: 1.1rem;
    letter-spacing: -0.005em;
  }
  .loop-steps em {
    font-style: normal;
    color: var(--muted);
    font-size: 0.86rem;
    line-height: 1.4;
  }

  /* === Agents === */
  .agent-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 24px;
  }
  @media (max-width: 1000px) { .agent-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 640px)  { .agent-grid { grid-template-columns: 1fr; } }

  .agent {
    background: var(--bg-tint);
    border: 1px solid var(--rule);
    border-radius: 16px;
    padding: 26px 24px 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    transition: border-color 200ms ease, transform 200ms ease;
  }
  .agent:hover {
    border-color: rgba(139, 182, 255, 0.25);
    transform: translateY(-2px);
  }
  .agent header {
    display: flex;
    align-items: baseline;
    gap: 14px;
  }
  .agent-tag {
    font-family: var(--mono);
    font-size: 0.74rem;
    letter-spacing: 0.16em;
    color: var(--blue);
  }
  .agent h3 {
    font-family: var(--display);
    font-weight: 450;
    font-size: 1.28rem;
    margin: 0;
    letter-spacing: -0.01em;
  }
  .agent .role {
    font-family: var(--display);
    font-style: italic;
    font-weight: 380;
    color: #cfd6eb;
    font-size: 1.04rem;
    margin: 0;
    line-height: 1.35;
  }
  .agent .detail {
    color: var(--muted);
    font-size: 0.92rem;
    margin: 0;
  }
  .agent figure {
    margin: 8px 0 0;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid var(--rule);
    background: #06090f;
  }
  .agent img {
    display: block;
    width: 100%;
    height: auto;
  }

  /* === Game === */
  .game-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
    gap: 56px;
    align-items: start;
  }
  @media (max-width: 920px) {
    .game-grid { grid-template-columns: 1fr; gap: 36px; }
  }
  .game-copy p {
    font-family: var(--display);
    font-size: 1.3rem;
    line-height: 1.45;
    color: #d3dbee;
    margin: 0 0 28px;
    font-weight: 320;
    font-variation-settings: 'opsz' 96, 'SOFT' 60;
  }
  .game-copy em {
    font-style: italic;
    color: var(--amber);
  }
  .game-bullets {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .game-bullets li {
    padding-left: 26px;
    position: relative;
    font-size: 0.97rem;
    color: #bcc4dc;
  }
  .game-bullets li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0.7em;
    width: 14px;
    height: 1px;
    background: var(--green);
  }
  .game-bullets strong {
    color: var(--fg);
    font-weight: 600;
  }
  .game-shot {
    margin: 0;
    border: 1px solid var(--rule);
    border-radius: 16px;
    overflow: hidden;
    background: #06090f;
  }
  .game-shot img {
    display: block;
    width: 100%;
    height: auto;
  }
  .game-shot figcaption {
    padding: 12px 18px;
    font-family: var(--mono);
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--muted);
    border-top: 1px solid var(--rule);
  }

  /* === Provenance === */
  .prov-table {
    border: 1px solid var(--rule);
    border-radius: 14px;
    overflow: hidden;
    font-family: var(--mono);
    font-size: 0.86rem;
  }
  .prov-head,
  .prov-row {
    display: grid;
    grid-template-columns: 1.1fr 1fr repeat(5, 1fr);
    gap: 1px;
    background: var(--rule);
  }
  .prov-head span,
  .prov-row span {
    background: var(--bg-tint);
    padding: 14px 16px;
    color: #c8d0e7;
  }
  .prov-head {
    background: var(--rule);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.72rem;
  }
  .prov-head span { color: var(--muted); background: var(--bg); }
  .prov-suburb { color: var(--fg) !important; font-family: var(--display); font-size: 1rem; font-weight: 450; }
  .prov-lga { color: var(--muted) !important; }

  .cov {
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 0.72rem;
  }
  .cov-real    { color: var(--green) !important; }
  .cov-seifa   { color: var(--amber) !important; }
  i.cov {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-right: 8px;
    background: currentColor;
  }
  .prov-legend {
    display: flex;
    gap: 28px;
    margin-top: 18px;
    font-family: var(--mono);
    font-size: 0.78rem;
    color: var(--muted);
    flex-wrap: wrap;
  }
  .prov-legend span { display: inline-flex; align-items: center; }

  .prov-datasets {
    margin-top: 28px;
    padding-top: 22px;
    border-top: 1px solid var(--rule);
  }
  .prov-datasets-head {
    font-family: var(--mono);
    font-size: 0.72rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--muted);
    margin: 0 0 14px;
  }
  .prov-datasets ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .prov-datasets li {
    color: #b9c2d8;
    font-size: 0.92rem;
    line-height: 1.45;
  }
  .prov-datasets a {
    font-family: var(--mono);
    font-size: 0.84rem;
    color: var(--green);
    text-decoration: none;
    border-bottom: 1px dotted color-mix(in oklab, var(--green) 50%, transparent);
  }
  .prov-datasets a:hover { color: #b3e3a3; }
  .prov-datasets li span { color: var(--muted); }
  .prov-datasets code {
    font-family: var(--mono);
    font-size: 0.78rem;
    background: rgba(255, 255, 255, 0.05);
    padding: 1px 5px;
    border-radius: 4px;
    color: #ecf1ff;
  }

  /* === Stack === */
  .stack-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1px;
    background: var(--rule);
    border: 1px solid var(--rule);
    border-radius: 14px;
    overflow: hidden;
  }
  @media (max-width: 640px) { .stack-list { grid-template-columns: 1fr; } }
  .stack-list li {
    background: var(--bg-tint);
    padding: 22px 24px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .stack-list span {
    font-family: var(--mono);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--muted);
  }
  .stack-list strong {
    font-family: var(--display);
    font-weight: 440;
    font-size: 1.15rem;
    letter-spacing: -0.005em;
  }

  /* === Roadmap === */
  .roadmap-rail {
    list-style: none;
    padding: 18px 6px 8px;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(11, minmax(170px, 1fr));
    gap: 18px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    border-top: 1px solid var(--rule);
    border-bottom: 1px solid var(--rule);
    padding-block: 28px;
  }
  .rail-item {
    scroll-snap-align: start;
    background: var(--bg-tint);
    border: 1px solid var(--rule);
    border-radius: 12px;
    padding: 18px 16px;
    position: relative;
  }
  .rail-num {
    font-family: var(--mono);
    font-size: 0.72rem;
    color: var(--muted);
    letter-spacing: 0.12em;
  }
  .rail-item h4 {
    font-family: var(--display);
    font-weight: 460;
    font-size: 1.04rem;
    margin: 4px 0 8px;
    letter-spacing: -0.005em;
    line-height: 1.15;
  }
  .rail-item p {
    color: var(--muted);
    margin: 0;
    font-size: 0.84rem;
    line-height: 1.4;
  }
  .rail-pin {
    position: absolute;
    bottom: -6px;
    left: 18px;
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: var(--bg);
    border: 2px solid var(--muted);
  }
  .rail-item.state-done .rail-pin    { background: var(--green); border-color: var(--green); box-shadow: 0 0 12px rgba(127,196,151,0.5); }
  .rail-item.state-partial .rail-pin { background: var(--amber); border-color: var(--amber); }
  .rail-item.state-next .rail-pin    { background: transparent; border-color: rgba(255,255,255,0.25); }
  .rail-item.state-done { border-color: rgba(127,196,151,0.3); }

  /* === Closing === */
  .closing {
    text-align: left;
    padding-bottom: 140px;
  }
  .closing-display em {
    color: var(--amber);
    font-style: italic;
  }
  .closing-display strong {
    font-weight: 800;
    color: var(--green);
  }
  .closing-cta {
    margin-top: 36px;
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
  }
  .closing-note {
    margin-top: 56px;
    max-width: 640px;
    color: var(--muted);
    font-size: 0.95rem;
  }

  /* Reduce motion preference */
  @media (prefers-reduced-motion: reduce) {
    .hero-art .edge,
    .hero-art .dot,
    .hero-art .node {
      animation: none;
    }
    [class*='reveal'],
    .pitch * {
      transition: none !important;
    }
  }
</style>
