<script lang="ts">
  import type { QuestPillar, Suburb } from '$lib/types'
  import { PILLAR_LABELS } from '$lib/types'

  interface Props {
    suburb: Suburb
  }
  let { suburb }: Props = $props()

  interface NarratorResult {
    narrative:    string
    deltas:       Record<QuestPillar, number>
    focus_pillar: QuestPillar
  }

  let result   = $state<NarratorResult | null>(null)
  let loading  = $state(false)
  let errorMsg = $state<string | null>(null)

  // Reset whenever the user picks a different suburb.
  $effect(() => {
    void suburb.id
    result = null
    errorMsg = null
  })

  async function generate() {
    loading = true
    errorMsg = null
    try {
      const res = await fetch('/api/agents/narrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suburb_id: suburb.id }),
      })
      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        throw new Error(detail || `HTTP ${res.status}`)
      }
      result = (await res.json()) as NarratorResult
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : String(e)
    } finally {
      loading = false
    }
  }

  function deltaClass(d: number): string {
    if (d > 0) return 'up'
    if (d < 0) return 'down'
    return 'flat'
  }
  function deltaLabel(d: number): string {
    if (d === 0) return '0'
    return d > 0 ? `+${d}` : `${d}`
  }
</script>

<section class="digest" aria-label="Weekly suburb digest">
  <header>
    <span class="eyebrow">This week · suburb narrator</span>
    <h4>How is {suburb.name} tracking?</h4>
  </header>

  {#if result}
    <p class="narrative">{result.narrative}</p>

    <div class="deltas" aria-label="Pillar score changes this week">
      {#each Object.entries(result.deltas) as [pillar, delta] (pillar)}
        <span class="chip {deltaClass(delta)}">
          <span class="chip-label">{PILLAR_LABELS[pillar as QuestPillar].split(' ')[0]}</span>
          <span class="chip-value">{deltaLabel(delta)}</span>
        </span>
      {/each}
    </div>

    <button class="link-btn" onclick={generate} disabled={loading}>
      {loading ? 'Refreshing…' : 'Refresh narrative'}
    </button>
  {:else if errorMsg}
    <p class="err">{errorMsg}</p>
    <button class="cta" onclick={generate} disabled={loading}>Try again</button>
  {:else}
    <p class="hint">
      A two-paragraph weekly update written by Claude — what shifted, what's
      working, and one suggested focus for the week ahead.
    </p>
    <button class="cta" onclick={generate} disabled={loading}>
      {loading ? 'Writing…' : 'Generate weekly briefing'}
    </button>
  {/if}
</section>

<style>
  .digest {
    background: linear-gradient(180deg, rgba(255, 231, 194, 0.05), rgba(139, 182, 255, 0.04));
    border: 1px solid rgba(255, 231, 194, 0.16);
    border-radius: 12px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  header {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .eyebrow {
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: #e6b860;
    font-weight: 600;
  }
  header h4 {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: #e5ecff;
  }

  .narrative {
    margin: 0;
    font-size: 0.86rem;
    line-height: 1.62;
    color: #d6dcec;
    white-space: pre-wrap;
  }

  .deltas {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 2px;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 8px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.04);
    font-size: 0.7rem;
    font-weight: 500;
    color: #aab4cc;
  }
  .chip-label {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.6rem;
    color: #8a96b3;
  }
  .chip-value {
    font-variant-numeric: tabular-nums;
    font-weight: 700;
  }
  .chip.up   .chip-value { color: #57d99e; }
  .chip.down .chip-value { color: #e57373; }
  .chip.flat .chip-value { color: #6e7993; }

  .hint, .err {
    margin: 0;
    font-size: 0.82rem;
    line-height: 1.55;
    color: #8a96b3;
  }
  .err { color: #e57373; }

  .cta {
    align-self: flex-start;
    background: linear-gradient(180deg, #e6b860, #c79237);
    border: 1px solid rgba(255, 231, 194, 0.5);
    color: #1a1410;
    border-radius: 8px;
    padding: 7px 14px;
    font: inherit;
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
  }
  .cta:hover:not(:disabled) { filter: brightness(1.1); }
  .cta:disabled { opacity: 0.5; cursor: default; }

  .link-btn {
    align-self: flex-start;
    background: transparent;
    border: none;
    color: #e6b860;
    font: inherit;
    font-size: 0.74rem;
    cursor: pointer;
    padding: 0;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .link-btn:hover:not(:disabled) { color: #ffe7c2; }
  .link-btn:disabled { opacity: 0.5; cursor: default; }
</style>
