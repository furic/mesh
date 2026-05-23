<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { MOCK_SUBURBS } from '$lib/data/mock-suburbs'
  import { questStore } from '$lib/stores/quests.svelte'
  import { userStore } from '$lib/stores/user.svelte'
  import { PILLAR_LABELS } from '$lib/types'

  // Materialise the slot for every suburb so the page can render rows
  // before the user does anything.
  MOCK_SUBURBS.forEach((s) => questStore.ensure(s.id))

  // Auth guard. /admin requires profile.is_admin. Resident personas + signed-
  // out visitors are redirected to /login with a hint param.
  onMount(() => {
    userStore.init()
    questStore.init()
    if (!userStore.isAuthenticated) {
      goto('/login?from=admin', { replaceState: true })
    } else if (!userStore.isAdmin) {
      goto('/app/profile?from=admin', { replaceState: true })
    }
  })

  let profile = $derived(userStore.profile)
  let isAdmin = $derived(userStore.isAdmin)

  let bulkLoading  = $state(false)
  let lastAction   = $state<string | null>(null)

  let slots = $derived(MOCK_SUBURBS.map((s) => ({ suburb: s, slot: questStore.slot(s.id) })))
  let aiCount     = $derived(slots.filter((r) => r.slot.source === 'ai').length)
  let seedCount   = $derived(slots.filter((r) => r.slot.source === 'seed').length)
  let emptyCount  = $derived(slots.filter((r) => !r.slot.quest).length)
  let anyLoading  = $derived(slots.some((r) => r.slot.loading))

  async function generateAll() {
    bulkLoading = true
    lastAction  = `Generating ${MOCK_SUBURBS.length} quests in parallel via Claude…`
    try {
      await Promise.all(MOCK_SUBURBS.map((s) => questStore.generate(s.id)))
      lastAction = `Generated ${MOCK_SUBURBS.length} fresh AI quests at ${new Date().toLocaleTimeString('en-AU')}.`
    } catch (e) {
      lastAction = `Bulk generate failed: ${e instanceof Error ? e.message : String(e)}`
    } finally {
      bulkLoading = false
    }
  }

  function resetAll() {
    if (!confirm('Reset all 5 suburbs to their hand-curated example quests? This clears any AI-generated quests from localStorage.')) return
    MOCK_SUBURBS.forEach((s) => questStore.reset(s.id))
    lastAction = `Reset all 5 to seeded examples at ${new Date().toLocaleTimeString('en-AU')}.`
  }
</script>

<svelte:head>
  <title>Admin · MESH</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,200..900,30..100;1,9..144,200..900,30..100&family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
</svelte:head>

{#if !profile || !isAdmin}
  <main class="admin guard">
    <p>Redirecting…</p>
  </main>
{:else}
<main class="admin">
  <header class="head">
    <p class="eyebrow">DEMO · ADMIN · signed in as {profile.display_name}</p>
    <h1 class="display">Generate every quest. <em>For the demo</em>.</h1>
    <p class="lede">
      One button hits the Quest Generator agent for all five suburbs in parallel and
      replaces their seeded examples with real Claude output. Useful when you want a
      live audience to watch the AI react to suburb data in front of them. The AI
      quests persist to localStorage — refresh and they're still there.
      <strong>Reset all</strong> drops back to the curated examples.
    </p>
  </header>

  <section class="counts">
    <article class="count count-seed">
      <span class="count-label">Examples</span>
      <span class="count-n">{seedCount}</span>
    </article>
    <article class="count count-ai">
      <span class="count-label">AI generated</span>
      <span class="count-n">{aiCount}</span>
    </article>
    <article class="count count-empty">
      <span class="count-label">Empty</span>
      <span class="count-n">{emptyCount}</span>
    </article>
  </section>

  <section class="actions">
    <button
      class="cta primary"
      onclick={generateAll}
      disabled={bulkLoading || anyLoading}
      type="button"
    >
      {bulkLoading ? 'Generating…' : 'Generate all 5 with Claude →'}
    </button>
    <button
      class="cta ghost"
      onclick={resetAll}
      disabled={bulkLoading || anyLoading}
      type="button"
    >Reset all to example</button>
    <a class="cta link" href="/quests">View on quest board ↗</a>
  </section>

  {#if lastAction}
    <p class="last-action">{lastAction}</p>
  {/if}

  <section class="grid" aria-label="Per-suburb quest state">
    {#each slots as { suburb, slot } (suburb.id)}
      <article class="row" class:loading={slot.loading}>
        <header>
          <div class="who">
            <span class="suburb-name">{suburb.name}</span>
            <span class="suburb-postcode">{suburb.postcode}</span>
          </div>
          {#if slot.source === 'seed'}
            <span class="chip seed">EXAMPLE</span>
          {:else if slot.source === 'ai'}
            <span class="chip ai">AI</span>
          {:else}
            <span class="chip empty">EMPTY</span>
          {/if}
        </header>
        {#if slot.quest}
          <p class="title">{slot.quest.title}</p>
          <p class="meta">
            <span class="pillar">{PILLAR_LABELS[slot.quest.pillar]}</span>
            · <span class="difficulty">{slot.quest.difficulty}</span>
            · <span class="xp">+{slot.quest.xp_reward} XP</span>
          </p>
        {:else}
          <p class="title placeholder">No quest</p>
        {/if}
        <footer>
          <button
            class="cta tiny"
            onclick={() => questStore.generate(suburb.id)}
            disabled={slot.loading || bulkLoading}
            type="button"
          >{slot.loading ? 'Generating…' : 'Regenerate'}</button>
          {#if slot.source === 'ai'}
            <button
              class="cta tiny ghost"
              onclick={() => questStore.reset(suburb.id)}
              disabled={slot.loading || bulkLoading}
              type="button"
            >Reset to example</button>
          {/if}
        </footer>
        {#if slot.error}
          <p class="error">{slot.error}</p>
        {/if}
      </article>
    {/each}
  </section>

  <p class="footnote">
    Demo auth gate: this route requires <code>profile.is_admin === true</code>. Sign in
    as <strong>Admin · Demo</strong> on the login page to land here. Once Supabase is
    provisioned, the same flag drives a server-side guard in <code>+page.server.ts</code>.
  </p>
</main>
{/if}

<style>
  :global(html), :global(body) { background: #06090f; }

  .admin {
    max-width: 980px;
    margin: 0 auto;
    padding: 96px 28px 120px;
    color: #ecf1ff;
    font-family: 'Bricolage Grotesque', -apple-system, sans-serif;
    line-height: 1.55;
    background:
      radial-gradient(700px 500px at 80% -10%, rgba(232, 162, 62, 0.10), transparent 60%),
      radial-gradient(700px 600px at 0% 30%, rgba(139, 182, 255, 0.08), transparent 60%);
  }
  .admin.guard {
    min-height: 60vh;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #8893ad;
  }

  .head { margin-bottom: 36px; }
  .eyebrow {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.72rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #e8a23e;
    margin: 0 0 18px;
  }
  .display {
    font-family: 'Fraunces', serif;
    font-weight: 360;
    font-size: clamp(2rem, 3.4vw + 1rem, 3.6rem);
    line-height: 1.06;
    letter-spacing: -0.02em;
    margin: 0 0 18px;
    text-wrap: balance;
  }
  .display em { font-style: italic; color: #e8a23e; }
  .lede {
    color: #c9d2e6;
    font-size: 1rem;
    max-width: 720px;
    margin: 0;
  }
  .lede strong { color: #ecf1ff; font-weight: 600; }

  .counts {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin: 32px 0 24px;
  }
  .count {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .count-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.68rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #8893ad;
  }
  .count-n {
    font-family: 'Fraunces', serif;
    font-weight: 400;
    font-size: 2rem;
    line-height: 1;
  }
  .count-seed  .count-n { color: #c9d2e6; }
  .count-ai    .count-n { color: #b3e3a3; }
  .count-empty .count-n { color: #6e7993; }

  .actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }
  .cta {
    font-family: inherit;
    font-weight: 500;
    padding: 11px 20px;
    border-radius: 999px;
    font-size: 0.92rem;
    cursor: pointer;
    transition: transform 180ms ease, background 180ms ease;
    border: 1px solid transparent;
    text-decoration: none;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .cta.primary {
    background: #e8a23e;
    color: #231605;
    box-shadow: 0 12px 30px -12px rgba(232, 162, 62, 0.5);
  }
  .cta.primary:hover:not(:disabled) { transform: translateY(-1px); }
  .cta.primary:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    background: rgba(232, 162, 62, 0.32);
    box-shadow: none;
  }
  .cta.ghost {
    background: transparent;
    color: #c9d2e6;
    border-color: rgba(255, 255, 255, 0.14);
  }
  .cta.ghost:hover:not(:disabled) { background: rgba(255, 255, 255, 0.04); }
  .cta.ghost:disabled { opacity: 0.5; cursor: not-allowed; }
  .cta.link {
    background: transparent;
    color: #8bb6ff;
    padding: 11px 0;
  }
  .cta.link:hover { color: #c2d8ff; }
  .cta.tiny {
    font-size: 0.78rem;
    padding: 7px 14px;
  }

  .last-action {
    color: #b3e3a3;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.82rem;
    margin: 0 0 28px;
    padding: 10px 14px;
    border-radius: 8px;
    background: rgba(127, 196, 151, 0.08);
    border: 1px solid rgba(127, 196, 151, 0.18);
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .row {
    display: grid;
    grid-template-columns: 1.3fr 2fr auto;
    gap: 18px;
    align-items: center;
    padding: 16px 18px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
  }
  .row.loading { border-color: rgba(232, 162, 62, 0.35); }
  .row header {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .who { display: flex; flex-direction: column; gap: 1px; }
  .suburb-name {
    font-family: 'Fraunces', serif;
    font-weight: 450;
    font-size: 1.1rem;
  }
  .suburb-postcode {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.68rem;
    color: #6e7993;
    letter-spacing: 0.08em;
  }
  .chip {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.6rem;
    letter-spacing: 0.14em;
    padding: 2px 7px;
    border-radius: 999px;
    border: 1px solid transparent;
  }
  .chip.seed  { color: #aab4cc; background: rgba(170, 180, 204, 0.12); border-color: rgba(170, 180, 204, 0.2); }
  .chip.ai    { color: #b3e3a3; background: rgba(127, 196, 151, 0.15); border-color: rgba(127, 196, 151, 0.3); }
  .chip.empty { color: #6e7993; background: rgba(110, 121, 147, 0.10); border-color: rgba(110, 121, 147, 0.2); }

  .title {
    margin: 0;
    font-size: 0.95rem;
    color: #ecf1ff;
    line-height: 1.4;
  }
  .title.placeholder { color: #6e7993; font-style: italic; }
  .meta {
    grid-column: 2;
    margin: 4px 0 0;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.7rem;
    color: #8893ad;
    letter-spacing: 0.06em;
  }
  .row footer {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .error {
    grid-column: 1 / -1;
    color: #f0a896;
    font-size: 0.82rem;
    margin: 4px 0 0;
  }

  .footnote {
    color: #6e7993;
    font-size: 0.82rem;
    margin: 32px 0 0;
    padding-top: 22px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }
  .footnote code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.78rem;
    background: rgba(255, 255, 255, 0.04);
    padding: 1px 5px;
    border-radius: 4px;
    color: #c9d2e6;
  }

  @media (max-width: 720px) {
    .counts { grid-template-columns: 1fr; }
    .row    { grid-template-columns: 1fr; }
    .row footer { justify-content: flex-start; }
  }
</style>
