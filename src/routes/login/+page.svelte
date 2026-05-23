<script lang="ts">
  import { goto } from '$app/navigation';
  import { env as publicEnv } from '$env/dynamic/public';
  import { userStore } from '$lib/stores/user.svelte';
  import { suburbStore } from '$lib/stores/suburb.svelte';
  import { DEMO_PERSONAS, freshDemoPersona, type DemoPersona } from '$lib/data/personas';
  import Avatar from '$lib/components/ui/Avatar.svelte';
  import SuburbPicker from '$lib/components/ui/SuburbPicker.svelte';
  import XPBar from '$lib/components/ui/XPBar.svelte';

  const supabaseReady = Boolean(publicEnv.PUBLIC_SUPABASE_URL && publicEnv.PUBLIC_SUPABASE_ANON_KEY);

  let email = $state('');
  let magicSubmitted = $state(false);
  let magicError = $state('');

  let customOpen = $state(false);
  let customName = $state('');
  let customSuburb = $state<string | null>(suburbStore.all[0]?.id ?? null);

  function suburbName(id: string): string {
    return suburbStore.all.find((s) => s.id === id)?.name ?? id;
  }

  function timeSince(iso: string): string {
    const now = Date.now();
    const then = new Date(iso).getTime();
    const days = Math.floor((now - then) / (24 * 60 * 60 * 1000));
    if (days < 1)   return 'today';
    if (days < 30)  return `${days} day${days === 1 ? '' : 's'} ago`;
    const months = Math.round(days / 30);
    if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
    const years = Math.floor(months / 12);
    return `${years} year${years === 1 ? '' : 's'} ago`;
  }

  async function signInAs(persona: DemoPersona) {
    userStore.signInDemo(persona.profile);
    suburbStore.setCurrentById(persona.profile.suburb_id ?? '');
    await goto('/app/profile');
  }

  async function submitCustom(e: SubmitEvent) {
    e.preventDefault();
    const suburbId = customSuburb;
    if (!suburbId) return;
    const persona = freshDemoPersona(customName, suburbId);
    await signInAs(persona);
  }

  function submitMagic(e: SubmitEvent) {
    e.preventDefault();
    magicError = '';
    if (!supabaseReady) {
      magicError = 'Magic-link sign-in needs the Supabase project to be provisioned. Use a demo persona below for now.';
      return;
    }
    // Real flow will land here once Supabase is connected — see Sprint 4
    // checklist in SPRINT_PLAN.md.
    magicSubmitted = true;
  }
</script>

<svelte:head>
  <title>Sign in · MESH</title>
  <meta name="description" content="Sign in to MESH — pick a demo persona or play yourself." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,200..900,30..100;1,9..144,200..900,30..100&family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
</svelte:head>

<main class="auth">
  <header class="auth-head">
    <p class="eyebrow"><span class="dot"></span>Sign in</p>
    <h1 class="display">Welcome back to <em>your suburb</em>.</h1>
    <p class="lede">
      Sign in to claim your postcode, accept quests, and watch your suburb's resilience
      index move. No real account is created — Supabase isn't wired yet, so this is a
      browser-local demo session.
    </p>
  </header>

  <section class="email-block" aria-labelledby="email-h">
    <h2 id="email-h" class="block-h">Magic link</h2>
    <form class="email-form" onsubmit={submitMagic}>
      <label class="sr-only" for="email">Email address</label>
      <input
        id="email"
        type="email"
        placeholder="you@example.com"
        bind:value={email}
        required
        autocomplete="email"
        disabled={!supabaseReady}
      />
      <button class="cta primary" type="submit" disabled={!supabaseReady}>
        {supabaseReady ? 'Send link →' : 'Awaiting Supabase'}
      </button>
    </form>
    {#if magicError}
      <p class="form-error">{magicError}</p>
    {/if}
    {#if magicSubmitted && supabaseReady}
      <p class="form-ok">Check your inbox.</p>
    {/if}
    {#if !supabaseReady}
      <p class="block-note">
        Once <code>PUBLIC_SUPABASE_URL</code> and <code>PUBLIC_SUPABASE_ANON_KEY</code> are
        set in <code>.env.local</code>, this form will send a passwordless link. Until then,
        use a persona.
      </p>
    {/if}
  </section>

  <div class="divider"><span>or jump in as someone</span></div>

  <section class="personas" aria-labelledby="personas-h">
    <h2 id="personas-h" class="block-h">Demo personas</h2>
    <ul class="persona-grid">
      {#each DEMO_PERSONAS as p (p.profile.id)}
        <li>
          <button class="persona-card" onclick={() => signInAs(p)} aria-label={`Sign in as ${p.profile.display_name}`}>
            <header>
              <Avatar name={p.profile.display_name ?? '·'} size="lg" />
              <div class="who">
                <span class="name">{p.profile.display_name}</span>
                <span class="suburb">{suburbName(p.profile.suburb_id ?? '')} · joined {timeSince(p.joined)}</span>
              </div>
            </header>
            <p class="blurb">{p.blurb}</p>
            <XPBar xp={p.profile.xp_total} />
            <ul class="badges">
              {#each p.profile.badges.slice(0, 3) as b (b)}
                <li>{b.replace(/_/g, ' ')}</li>
              {/each}
              {#if p.profile.badges.length > 3}
                <li class="more">+{p.profile.badges.length - 3}</li>
              {/if}
            </ul>
            <span class="enter">Sign in →</span>
          </button>
        </li>
      {/each}
    </ul>
  </section>

  <section class="custom" aria-labelledby="custom-h">
    <header class="custom-head">
      <h2 id="custom-h" class="block-h">Play yourself</h2>
      <button class="link-btn" onclick={() => (customOpen = !customOpen)}>
        {customOpen ? 'Cancel ↑' : 'Start fresh ↓'}
      </button>
    </header>
    {#if customOpen}
      <form class="custom-form" onsubmit={submitCustom}>
        <label class="field">
          <span class="field-label">Your display name</span>
          <input
            type="text"
            placeholder="Pat from down the road"
            bind:value={customName}
            required
            maxlength="60"
          />
        </label>
        <div class="field">
          <span class="field-label">Pick your suburb</span>
          <SuburbPicker bind:value={customSuburb} />
        </div>
        <button class="cta primary" type="submit" disabled={!customSuburb}>Enter the mesh →</button>
      </form>
    {/if}
  </section>
</main>

<style>
  :global(html), :global(body) {
    background: #06090f;
  }

  .auth {
    max-width: 920px;
    margin: 0 auto;
    padding: 110px 28px 120px;
    color: #ecf1ff;
    font-family: 'Bricolage Grotesque', -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 16px;
    line-height: 1.55;
    background:
      radial-gradient(700px 500px at 80% -10%, rgba(127, 196, 151, 0.12), transparent 60%),
      radial-gradient(700px 600px at 0% 30%, rgba(232, 162, 62, 0.08), transparent 60%);
  }

  .auth-head { margin-bottom: 56px; }

  .eyebrow {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 0.72rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #8893ad;
    margin: 0 0 22px;
    display: inline-flex;
    align-items: center;
    gap: 10px;
  }
  .dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #7fc497;
    box-shadow: 0 0 12px rgba(127, 196, 151, 0.7);
  }

  .display {
    font-family: 'Fraunces', serif;
    font-weight: 360;
    font-size: clamp(2.1rem, 3.4vw + 1rem, 3.8rem);
    line-height: 1.06;
    letter-spacing: -0.02em;
    font-variation-settings: 'opsz' 144, 'SOFT' 60;
    margin: 0 0 24px;
    text-wrap: balance;
  }
  .display em { font-style: italic; color: #7fc497; font-weight: 360; }

  .lede {
    color: #c9d2e6;
    font-size: 1.05rem;
    max-width: 620px;
    margin: 0;
  }

  .block-h {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 0.74rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #8893ad;
    margin: 0 0 16px;
    font-weight: 500;
  }

  .email-block {
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 24px 24px 22px;
    background: rgba(255, 255, 255, 0.02);
    margin-bottom: 36px;
  }
  .email-form {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  .email-form input {
    flex: 1 1 240px;
    min-width: 0;
    background: #06090f;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #ecf1ff;
    padding: 13px 16px;
    border-radius: 999px;
    font-size: 0.98rem;
    font-family: inherit;
    transition: border-color 180ms ease, background 180ms ease;
  }
  .email-form input:focus {
    outline: 0;
    border-color: rgba(127, 196, 151, 0.5);
    background: #08111a;
  }
  .email-form input:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .form-error { color: #f0a896; margin: 12px 0 0; font-size: 0.92rem; }
  .form-ok    { color: #7fc497; margin: 12px 0 0; font-size: 0.92rem; }
  .block-note {
    color: #8893ad;
    font-size: 0.88rem;
    margin: 14px 0 0;
    line-height: 1.55;
  }
  .block-note code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.84rem;
    background: rgba(255, 255, 255, 0.04);
    padding: 2px 6px;
    border-radius: 4px;
    color: #c9d2e6;
  }

  .cta {
    font-family: inherit;
    font-weight: 500;
    padding: 13px 22px;
    border-radius: 999px;
    font-size: 0.95rem;
    cursor: pointer;
    transition: transform 180ms ease, background 180ms ease, box-shadow 180ms ease;
    border: 1px solid transparent;
    line-height: 1;
  }
  .cta.primary {
    background: #7fc497;
    color: #0a1a12;
    box-shadow: 0 12px 30px -12px rgba(127, 196, 151, 0.5);
  }
  .cta.primary:hover:not(:disabled) { transform: translateY(-1px); }
  .cta.primary:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    background: rgba(127, 196, 151, 0.32);
    color: #0a1a12;
    box-shadow: none;
  }

  .divider {
    display: flex;
    align-items: center;
    gap: 16px;
    margin: 36px 0;
    color: #6b7894;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.72rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .divider::before,
  .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255, 255, 255, 0.08);
  }

  .personas { margin-bottom: 40px; }
  .persona-grid {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }
  @media (max-width: 820px) { .persona-grid { grid-template-columns: 1fr; } }

  .persona-card {
    width: 100%;
    text-align: left;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    padding: 20px 18px 18px;
    color: inherit;
    cursor: pointer;
    font-family: inherit;
    display: flex;
    flex-direction: column;
    gap: 14px;
    transition: border-color 200ms ease, background 200ms ease, transform 200ms ease;
  }
  .persona-card:hover {
    border-color: rgba(127, 196, 151, 0.5);
    background: rgba(127, 196, 151, 0.05);
    transform: translateY(-2px);
  }
  .persona-card header {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .who { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .name {
    font-family: 'Fraunces', serif;
    font-size: 1.2rem;
    font-weight: 460;
    letter-spacing: -0.01em;
  }
  .suburb {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.7rem;
    color: #8893ad;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .blurb {
    color: #c9d2e6;
    font-size: 0.92rem;
    margin: 0;
    line-height: 1.45;
    min-height: 2.6em;
  }
  .badges {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .badges li {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    padding: 4px 8px;
    background: rgba(139, 182, 255, 0.1);
    color: #8bb6ff;
    border-radius: 999px;
  }
  .badges .more {
    background: rgba(255, 255, 255, 0.04);
    color: #8893ad;
  }
  .enter {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.72rem;
    color: #7fc497;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    margin-top: 4px;
  }

  .custom-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
  }
  .link-btn {
    background: transparent;
    border: 0;
    color: #8bb6ff;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.74rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    cursor: pointer;
    padding: 0;
  }
  .link-btn:hover { color: #c2d8ff; }

  .custom-form {
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 22px;
    background: rgba(255, 255, 255, 0.02);
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .field-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.7rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #8893ad;
  }
  .custom-form input[type="text"] {
    background: #06090f;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #ecf1ff;
    padding: 12px 16px;
    border-radius: 10px;
    font-size: 0.98rem;
    font-family: inherit;
  }
  .custom-form input[type="text"]:focus {
    outline: 0;
    border-color: rgba(127, 196, 151, 0.5);
  }

  .sr-only {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
  }
</style>
