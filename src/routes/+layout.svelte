<script lang="ts">
  import favicon from '$lib/assets/favicon.svg'
  import { page } from '$app/state'

  let { children } = $props()

  const tabs = [
    { href: '/',       label: 'Globe' },
    { href: '/quests', label: 'Quests' },
    { href: '/pitch',  label: 'Pitch' },
  ]
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>MESH — Melbourne Resilience Network</title>
</svelte:head>

<nav class="topnav">
  <a class="brand" href="/" aria-label="MESH home">
    <span class="logo-dot" aria-hidden="true"></span>
    <span class="logo-text">MESH</span>
    <span class="tagline">Melbourne Resilience Network</span>
  </a>
  <ul role="list" class="tabs">
    {#each tabs as t (t.href)}
      <li>
        <a href={t.href} class:active={page.url.pathname === t.href}>{t.label}</a>
      </li>
    {/each}
  </ul>
</nav>

{@render children()}

<style>
  :global(html), :global(body) {
    margin: 0;
    padding: 0;
    height: 100%;
    background: #06090f;
    color: #e5ecff;
    font-family:
      'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
      'Helvetica Neue', Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }
  :global(*) { box-sizing: border-box; }
  :global(a) { color: #8bb6ff; }

  .topnav {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 24px;
    background: linear-gradient(180deg, rgba(6, 9, 15, 0.78), rgba(6, 9, 15, 0));
    backdrop-filter: blur(8px);
    pointer-events: none;
  }
  .brand, .tabs { pointer-events: auto; }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
    color: inherit;
  }
  .logo-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, #c2d8ff, #5481d6 60%, #2a4a91);
    box-shadow: 0 0 12px rgba(139, 182, 255, 0.6);
  }
  .logo-text {
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0.22em;
  }
  .tagline {
    color: #6e7993;
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    margin-left: 4px;
  }
  @media (max-width: 600px) {
    .tagline { display: none; }
  }

  .tabs {
    display: flex;
    gap: 4px;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .tabs a {
    display: inline-block;
    padding: 7px 14px;
    font-size: 0.82rem;
    color: #aab4cc;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 500;
    transition: background 120ms ease, color 120ms ease;
  }
  .tabs a:hover { background: rgba(139, 182, 255, 0.08); color: #e5ecff; }
  .tabs a.active {
    background: rgba(139, 182, 255, 0.14);
    color: #e5ecff;
    box-shadow: 0 0 0 1px rgba(139, 182, 255, 0.3) inset;
  }
</style>
