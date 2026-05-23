<script lang="ts">
  import type { BadgeDef } from '$lib/data/badges';

  interface Props {
    def:    BadgeDef;
    size?:  'sm' | 'md';
    detail?: boolean;     // show description below the label
  }
  let { def, size = 'md', detail = false }: Props = $props();
</script>

<div class="badge size-{size}" style="--hue: {def.hue}" title={def.description}>
  <span class="glyph">{def.glyph}</span>
  <div class="text">
    <span class="label">{def.label}</span>
    {#if detail}
      <span class="desc">{def.description}</span>
    {/if}
  </div>
</div>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px 10px 10px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    transition: border-color 200ms ease, background 200ms ease, transform 200ms ease;
  }
  .badge:hover {
    border-color: color-mix(in oklab, var(--hue) 50%, transparent);
    background: rgba(255, 255, 255, 0.035);
  }
  .size-sm { padding: 6px 10px 6px 6px; gap: 8px; }

  .glyph {
    width: 30px;
    height: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: color-mix(in oklab, var(--hue) 18%, transparent);
    color: var(--hue);
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-weight: 600;
    font-size: 0.95rem;
    box-shadow: 0 0 0 1px color-mix(in oklab, var(--hue) 40%, transparent) inset;
    flex-shrink: 0;
  }
  .size-sm .glyph { width: 22px; height: 22px; font-size: 0.78rem; }

  .text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .label {
    color: #ecf1ff;
    font-family: 'Bricolage Grotesque', -apple-system, sans-serif;
    font-weight: 600;
    font-size: 0.92rem;
    letter-spacing: -0.005em;
  }
  .size-sm .label { font-size: 0.82rem; }
  .desc {
    color: #8893ad;
    font-size: 0.82rem;
    line-height: 1.35;
  }
</style>
