<script lang="ts">
  import { levelProgress } from '$lib/utils/xp';

  interface Props {
    xp:     number;
    label?: boolean;       // show "Level N · 1240 / 2000" under the bar
  }
  let { xp, label = true }: Props = $props();

  let lp = $derived(levelProgress(xp));
  // Multiply by 100 just before render so we don't string-format constantly
  // inside the reactive expression.
  let pct = $derived(Math.round(lp.progress * 100));
</script>

<div class="xp">
  <div class="track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="XP progress to next level">
    <div class="fill" style="width: {pct}%"></div>
    <div class="shimmer" aria-hidden="true"></div>
  </div>
  {#if label}
    <div class="meta">
      <span class="level">Level {lp.level}</span>
      <span class="xp-frac">{lp.xpInLevel.toLocaleString('en-AU')} / {lp.xpForNextLevel.toLocaleString('en-AU')} XP</span>
    </div>
  {/if}
</div>

<style>
  .xp { display: flex; flex-direction: column; gap: 10px; width: 100%; }

  .track {
    position: relative;
    height: 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.05);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.04) inset;
    overflow: hidden;
  }
  .fill {
    position: absolute;
    inset: 0 auto 0 0;
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, #7fc497 0%, #b3e3a3 100%);
    box-shadow: 0 0 16px rgba(127, 196, 151, 0.45);
    transition: width 1.2s cubic-bezier(0.2, 0.7, 0.2, 1);
  }
  .shimmer {
    position: absolute;
    inset: 0;
    background: linear-gradient(100deg, transparent 30%, rgba(255, 255, 255, 0.12) 50%, transparent 70%);
    transform: translateX(-100%);
    animation: shimmer 3.2s ease-in-out infinite;
  }
  @keyframes shimmer {
    0%   { transform: translateX(-100%); }
    60%  { transform: translateX(120%); }
    100% { transform: translateX(120%); }
  }

  .meta {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 0.74rem;
    color: #8893ad;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .level {
    color: #ecf1ff;
    letter-spacing: 0.12em;
  }
</style>
