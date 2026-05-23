<script lang="ts">
  import type { Suburb } from '$lib/types'

  interface Props {
    suburbs:    Suburb[]
    selectedId: string | null
    hoveredId:  string | null
    onselect:   (detail: { id: string | null }) => void
    onhover:    (detail: { id: string | null }) => void
  }

  let { suburbs, selectedId, hoveredId, onselect, onhover }: Props = $props()

  function tierClass(r: number): string {
    if (r >= 70) return 'tier-high'
    if (r >= 55) return 'tier-mid'
    return 'tier-low'
  }
</script>

<aside class="sidebar" aria-label="Suburb resilience board">
  <header>
    <span class="eyebrow">Live mesh</span>
    <h2>Suburb resilience</h2>
    <p class="lede">
      Five Melbourne suburbs, ranked by their resilience index — an average of
      five community pillars.
    </p>
  </header>

  <ul role="list">
    {#each suburbs as s (s.id)}
      <li>
        <button
          class:selected={s.id === selectedId}
          class:hovered={s.id === hoveredId && s.id !== selectedId}
          onclick={() => onselect({ id: s.id === selectedId ? null : s.id })}
          onmouseenter={() => onhover({ id: s.id })}
          onmouseleave={() => onhover({ id: null })}
        >
          <span class="row-top">
            <span class="dot {tierClass(s.r_index)}" aria-hidden="true"></span>
            <span class="name">{s.name}</span>
            <span class="postcode">{s.postcode}</span>
          </span>
          <span class="row-bottom">
            <span class="r-index">
              <span class="label">R-index</span>
              <span class="value {tierClass(s.r_index)}">{s.r_index}</span>
            </span>
            <span class="meta">Lvl {s.level} · {s.xp_total.toLocaleString()} XP</span>
          </span>
        </button>
      </li>
    {/each}
  </ul>

  <footer>
    <small>
      Mock data. Real Victorian open data lands in Sprint 1.
    </small>
  </footer>
</aside>

<style>
  .sidebar {
    position: relative;
    z-index: 2;
    width: 360px;
    max-width: 100%;
    padding: 28px 24px;
    color: #e5ecff;
    background: linear-gradient(180deg, rgba(12, 18, 35, 0.92), rgba(8, 11, 22, 0.88));
    backdrop-filter: blur(14px);
    border-left: 1px solid rgba(139, 182, 255, 0.12);
    display: flex;
    flex-direction: column;
    gap: 20px;
    overflow-y: auto;
  }

  header h2 {
    margin: 6px 0 8px;
    font-size: 1.4rem;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .eyebrow {
    font-size: 0.7rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #8bb6ff;
    font-weight: 600;
  }
  .lede {
    margin: 0;
    color: #aab4cc;
    font-size: 0.85rem;
    line-height: 1.5;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  button {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 14px;
    text-align: left;
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    color: inherit;
    cursor: pointer;
    transition: background 120ms ease, border-color 120ms ease, transform 120ms ease;
    font: inherit;
  }
  button:hover, button.hovered {
    background: rgba(139, 182, 255, 0.08);
    border-color: rgba(139, 182, 255, 0.3);
  }
  button.selected {
    background: rgba(139, 182, 255, 0.14);
    border-color: rgba(139, 182, 255, 0.6);
    box-shadow: 0 0 0 1px rgba(139, 182, 255, 0.35) inset;
  }

  .row-top {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    box-shadow: 0 0 8px currentColor;
  }
  .name {
    font-size: 0.98rem;
    font-weight: 600;
    flex: 1;
  }
  .postcode {
    font-size: 0.75rem;
    color: #6e7993;
    font-variant-numeric: tabular-nums;
  }

  .row-bottom {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding-left: 20px;
  }
  .r-index {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
  }
  .r-index .label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #6e7993;
  }
  .r-index .value {
    font-size: 1.15rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .meta {
    font-size: 0.72rem;
    color: #8a96b3;
    font-variant-numeric: tabular-nums;
  }

  .tier-high { color: #57d99e; }
  .tier-mid  { color: #e6b860; }
  .tier-low  { color: #e57373; }

  footer {
    margin-top: auto;
    padding-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }
  footer small {
    color: #6e7993;
    font-size: 0.72rem;
  }
</style>
