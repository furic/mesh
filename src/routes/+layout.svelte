<script lang="ts">
  import { onMount } from 'svelte'
  import favicon from '$lib/assets/favicon.svg'
  import { page } from '$app/state'
  import { userStore } from '$lib/stores/user.svelte'
  import Avatar from '$lib/components/ui/Avatar.svelte'

  let { children } = $props()

  // Hydrate the demo session from localStorage on first browser tick.
  // Server renders neutrally (signed-out chrome); the client upgrades.
  onMount(() => userStore.init())

  const tabs = [
    { href: '/',       label: 'Globe' },
    { href: '/quests', label: 'Quests' },
    { href: '/pitch',  label: 'Pitch' },
  ]

  let profile = $derived(userStore.profile)
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
  <div class="right">
    <ul role="list" class="tabs">
      {#each tabs as t (t.href)}
        <li>
          <a href={t.href} class:active={page.url.pathname === t.href}>{t.label}</a>
        </li>
      {/each}
    </ul>
    {#if profile}
      <a class="user-chip" href="/app/profile" class:active={page.url.pathname.startsWith('/app/profile')}>
        <Avatar name={profile.display_name ?? ''} size="sm" />
        <span class="user-name">{profile.display_name}</span>
      </a>
    {:else}
      <a class="signin-btn" href="/login" class:active={page.url.pathname === '/login'}>Sign in</a>
    {/if}
  </div>
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
  .brand, .right { pointer-events: auto; }

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

  .right {
    display: inline-flex;
    align-items: center;
    gap: 10px;
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

  .signin-btn {
    display: inline-flex;
    align-items: center;
    padding: 7px 14px;
    font-size: 0.82rem;
    color: #0a1a12;
    background: #7fc497;
    text-decoration: none;
    border-radius: 999px;
    font-weight: 600;
    box-shadow: 0 8px 20px -10px rgba(127, 196, 151, 0.5);
    transition: transform 180ms ease;
  }
  .signin-btn:hover { transform: translateY(-1px); }
  .signin-btn.active { box-shadow: 0 0 0 2px rgba(127, 196, 151, 0.4); }

  .user-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 4px 12px 4px 4px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    text-decoration: none;
    color: #ecf1ff;
    font-size: 0.82rem;
    font-weight: 500;
    max-width: 200px;
    transition: background 180ms ease, border-color 180ms ease;
  }
  .user-chip:hover {
    background: rgba(127, 196, 151, 0.08);
    border-color: rgba(127, 196, 151, 0.3);
  }
  .user-chip.active {
    background: rgba(127, 196, 151, 0.1);
    border-color: rgba(127, 196, 151, 0.4);
  }
  .user-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  @media (max-width: 540px) {
    .user-name { display: none; }
    .user-chip { padding: 4px; }
  }
</style>
