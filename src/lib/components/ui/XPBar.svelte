<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { levelProgress } from '$lib/utils/xp';

  interface Props {
    xp:     number;
    label?: boolean;       // show "Level N · 1240 / 2000" under the bar
  }
  let { xp, label = true }: Props = $props();

  let lp = $derived(levelProgress(xp));
  let pct = $derived(Math.round(lp.progress * 100));

  // Level-up detection. We seed `lastLevel` from the very first computed
  // value AFTER mount so the bar doesn't burst on initial hydration. After
  // that, any rise in lp.level fires the burst animation for ~2s.
  let lastLevel = $state<number | null>(null);
  let bursting  = $state(false);
  let burstLevel = $state(0);

  onMount(() => {
    lastLevel = lp.level;
  });

  $effect(() => {
    if (!browser || lastLevel === null) return;
    if (lp.level > lastLevel) {
      burstLevel = lp.level;
      bursting   = true;
      setTimeout(() => (bursting = false), 2200);
    }
    lastLevel = lp.level;
  });

  // 14 confetti particles with deterministic random-looking spread.
  const PARTICLES = Array.from({ length: 14 }).map((_, i) => {
    const a = (i / 14) * Math.PI * 2 + 0.4;
    const r = 70 + ((i * 37) % 35);              // 70..105 px
    return {
      x:    Math.cos(a) * r,
      y:    Math.sin(a) * r,
      hue:  [127, 232, 139, 195][i % 4],          // green / amber / blue / purple
      size: 5 + ((i * 13) % 5),                   // 5..9 px
    };
  });
</script>

<div class="xp">
  <div
    class="track"
    class:bursting
    role="progressbar"
    aria-valuenow={pct}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-label="XP progress to next level"
  >
    <div class="fill" style="width: {pct}%"></div>
    <div class="shimmer" aria-hidden="true"></div>
  </div>

  {#if label}
    <div class="meta">
      <span class="level" class:bursting>
        Level {lp.level}
        {#if bursting}<span class="level-up-flag">LEVEL UP</span>{/if}
      </span>
      <span class="xp-frac">{lp.xpInLevel.toLocaleString('en-AU')} / {lp.xpForNextLevel.toLocaleString('en-AU')} XP</span>
    </div>
  {/if}

  {#if bursting}
    <div class="burst" aria-hidden="true">
      <span class="level-badge">+{burstLevel}</span>
      {#each PARTICLES as p, i (i)}
        <span
          class="confetti"
          style="--x: {p.x}px; --y: {p.y}px; --size: {p.size}px; --hue: {p.hue}; --delay: {i * 25}ms"
        ></span>
      {/each}
    </div>
  {/if}
</div>

<style>
  .xp {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    position: relative;
  }

  .track {
    position: relative;
    height: 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.05);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.04) inset;
    overflow: hidden;
    transition: box-shadow 600ms ease;
  }
  .track.bursting {
    box-shadow:
      0 0 0 1px rgba(127, 196, 151, 0.6) inset,
      0 0 24px rgba(127, 196, 151, 0.55);
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
    display: inline-flex;
    align-items: center;
    gap: 10px;
  }
  .level.bursting { color: #b3e3a3; }
  .level-up-flag {
    font-size: 0.62rem;
    padding: 2px 8px;
    border-radius: 999px;
    background: rgba(127, 196, 151, 0.18);
    color: #b3e3a3;
    border: 1px solid rgba(127, 196, 151, 0.4);
    animation: flag-pop 1.8s cubic-bezier(0.2, 0.7, 0.2, 1) both;
  }
  @keyframes flag-pop {
    0%   { transform: scale(0.5); opacity: 0;   }
    20%  { transform: scale(1.05); opacity: 1;  }
    80%  { transform: scale(1);    opacity: 1;  }
    100% { transform: scale(0.95); opacity: 0;  }
  }

  /* === Level-up burst === */
  .burst {
    position: absolute;
    top: 5px;                            /* anchor in the centre of the bar */
    left: 50%;
    width: 0;
    height: 0;
    pointer-events: none;
  }
  .level-badge {
    position: absolute;
    left: 0;
    top: 0;
    transform: translate(-50%, -50%);
    font-family: 'Fraunces', serif;
    font-weight: 600;
    font-style: italic;
    font-size: 2.4rem;
    color: #b3e3a3;
    text-shadow:
      0 0 16px rgba(127, 196, 151, 0.7),
      0 0 32px rgba(127, 196, 151, 0.4);
    animation: badge-rise 1.8s cubic-bezier(0.2, 0.6, 0.2, 1) both;
  }
  @keyframes badge-rise {
    0%   { transform: translate(-50%, -50%) scale(0.4); opacity: 0; }
    25%  { transform: translate(-50%, -70%) scale(1.15); opacity: 1; }
    60%  { transform: translate(-50%, -80%) scale(1);    opacity: 1; }
    100% { transform: translate(-50%, -110%) scale(0.9); opacity: 0; }
  }

  .confetti {
    position: absolute;
    left: 0;
    top: 0;
    width:  var(--size);
    height: var(--size);
    margin: calc(var(--size) / -2);
    border-radius: 50%;
    background: hsl(var(--hue), 70%, 60%);
    box-shadow: 0 0 8px hsl(var(--hue), 70%, 60%);
    animation: confetti-fly 1.6s cubic-bezier(0.2, 0.7, 0.2, 1) var(--delay) both;
  }
  @keyframes confetti-fly {
    0%   { transform: translate(0, 0)              scale(0.4); opacity: 0; }
    20%  { transform: translate(calc(var(--x) * 0.3), calc(var(--y) * 0.3)) scale(1); opacity: 1; }
    100% { transform: translate(var(--x), calc(var(--y) + 80px)) scale(0.6); opacity: 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .level-badge,
    .confetti,
    .level-up-flag,
    .shimmer { animation: none !important; }
  }
</style>
