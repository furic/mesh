<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { userStore } from '$lib/stores/user.svelte';
  import { suburbStore } from '$lib/stores/suburb.svelte';
  import { badgeDef, BADGES } from '$lib/data/badges';
  import { levelProgress } from '$lib/utils/xp';
  import Avatar from '$lib/components/ui/Avatar.svelte';
  import XPBar from '$lib/components/ui/XPBar.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import SuburbPicker from '$lib/components/ui/SuburbPicker.svelte';
  import type { Profile } from '$lib/types';

  let profile = $derived(userStore.profile);
  let suburb  = $derived(profile ? suburbStore.all.find((s) => s.id === profile.suburb_id) ?? null : null);
  let lp      = $derived(profile ? levelProgress(profile.xp_total) : null);

  // Auth guard. Runs only in the browser (the store hydrates from
  // localStorage there), so server-side renders the page shell while the
  // client decides whether to redirect.
  onMount(() => {
    userStore.init();
    if (!userStore.profile) {
      goto('/login', { replaceState: true });
    }
  });

  // Edit-in-place state.
  let editingName  = $state(false);
  let nameDraft    = $state('');
  let editingSuburb = $state(false);
  let suburbDraft  = $state<string | null>(null);

  function startNameEdit() {
    if (!profile) return;
    nameDraft = profile.display_name ?? '';
    editingName = true;
  }
  function commitNameEdit() {
    if (!profile) return;
    const next = nameDraft.trim();
    if (next && next !== profile.display_name) {
      userStore.updateProfile({ display_name: next });
    }
    editingName = false;
  }
  function cancelNameEdit() {
    editingName = false;
  }

  function startSuburbEdit() {
    if (!profile) return;
    suburbDraft = profile.suburb_id ?? null;
    editingSuburb = true;
  }
  function commitSuburbEdit() {
    if (suburbDraft && suburbDraft !== profile?.suburb_id) {
      userStore.updateProfile({ suburb_id: suburbDraft });
      suburbStore.setCurrentById(suburbDraft);
    }
    editingSuburb = false;
  }
  function cancelSuburbEdit() {
    editingSuburb = false;
  }

  async function signOut() {
    userStore.signOut();
    await goto('/login');
  }

  // Format a date like "joined 4 months ago".
  function timeSince(iso?: string | null): string {
    if (!iso) return '';
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
    if (days < 1)   return 'today';
    if (days < 30)  return `${days} day${days === 1 ? '' : 's'} ago`;
    const months = Math.round(days / 30);
    if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
    return `${Math.floor(months / 12)} year${months >= 24 ? 's' : ''} ago`;
  }

  // Derived stats. Mock — real numbers come from quest_participants /
  // quest_submissions / resources aggregates once Supabase is online.
  function statsFor(p: Profile): { label: string; value: string | number; sub: string }[] {
    const completed = Math.floor(p.xp_total / 320);     // rough
    const joined    = completed + Math.floor(p.xp_total / 800);
    const shared    = Math.min(p.badges.length * 2, 12);
    const days      = Math.max(1, Math.floor((Date.now() - new Date(p.created_at).getTime()) / (24 * 60 * 60 * 1000)));
    return [
      { label: 'Quests joined',     value: joined,    sub: 'all time' },
      { label: 'Quests completed',  value: completed, sub: 'all time' },
      { label: 'Resources shared',  value: shared,    sub: 'all time' },
      { label: 'Days on MESH',      value: days,      sub: `since ${new Date(p.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}` },
    ];
  }

  interface ActivityItem {
    kind: 'badge' | 'quest' | 'resource' | 'join';
    label: string;
    when: string;
  }

  function mockActivityFor(p: Profile): ActivityItem[] {
    const items: ActivityItem[] = [];
    const suburbName = suburbStore.all.find((s) => s.id === p.suburb_id)?.name ?? 'your suburb';
    if (p.badges.length > 0) {
      const last = p.badges[p.badges.length - 1];
      items.push({ kind: 'badge', label: `Earned the ${badgeDef(last).label} badge`, when: '2 days ago' });
    }
    if (p.xp_total >= 300) {
      items.push({ kind: 'quest', label: `Completed the ${suburbName} food-rescue quest`, when: '5 days ago' });
    }
    if (p.xp_total >= 1000) {
      items.push({ kind: 'resource', label: 'Shared a resource: "Folding table, free to a good home"', when: '11 days ago' });
    }
    if (p.xp_total >= 4000) {
      items.push({ kind: 'quest', label: `Joined the ${suburbName} heatwave preparedness quest`, when: '3 weeks ago' });
    }
    items.push({ kind: 'join', label: `Joined MESH for ${suburbName}`, when: timeSince(p.created_at) });
    return items.slice(0, 5);
  }
</script>

<svelte:head>
  <title>{profile?.display_name ? `${profile.display_name} · Profile` : 'Profile'} · MESH</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,200..900,30..100;1,9..144,200..900,30..100&family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
</svelte:head>

{#if profile && lp}
  {@const stats    = statsFor(profile)}
  {@const activity = mockActivityFor(profile)}
  <main class="profile">
    <!-- Hero -->
    <section class="hero">
      <Avatar name={profile.display_name ?? ''} size="xl" />
      <div class="hero-body">
        {#if editingName}
          <form class="inline-edit" onsubmit={(e) => { e.preventDefault(); commitNameEdit(); }}>
            <input
              type="text"
              bind:value={nameDraft}
              maxlength="60"
              onkeydown={(e) => { if (e.key === 'Escape') cancelNameEdit(); }}
            />
            <button class="btn-tiny primary" type="submit">Save</button>
            <button class="btn-tiny ghost"   type="button" onclick={cancelNameEdit}>Cancel</button>
          </form>
        {:else}
          <h1 class="name display">
            {profile.display_name}
            <button class="edit-pencil" onclick={startNameEdit} aria-label="Edit display name">edit</button>
          </h1>
        {/if}

        <div class="hero-meta">
          {#if suburb}
            <a class="suburb-pill" href="/">
              <span class="suburb-dot"></span>
              {suburb.name}
              <span class="suburb-postcode">{suburb.postcode}</span>
            </a>
          {/if}
          <span class="level-chip">Level {lp.level}</span>
          <span class="since">Joined {timeSince(profile.created_at)}</span>
        </div>
      </div>
    </section>

    <!-- XP row -->
    <section class="xp-card">
      <div class="xp-head">
        <div>
          <p class="micro">Current progress</p>
          <h2 class="xp-title">Level <strong>{lp.level}</strong> → Level <strong>{lp.level + 1}</strong></h2>
        </div>
        <div class="xp-total">
          <span class="xp-total-n">{profile.xp_total.toLocaleString('en-AU')}</span>
          <span class="xp-total-l">total XP</span>
        </div>
      </div>
      <XPBar xp={profile.xp_total} />
    </section>

    <!-- Stats grid -->
    <section class="stats">
      {#each stats as st (st.label)}
        <article class="stat">
          <p class="micro">{st.label}</p>
          <p class="stat-n">{st.value}</p>
          <p class="stat-sub">{st.sub}</p>
        </article>
      {/each}
    </section>

    <!-- Badges -->
    <section class="badges-block">
      <header class="block-head">
        <p class="micro">Badges</p>
        <h2>{profile.badges.length} earned · {Object.keys(BADGES).length - profile.badges.length} to discover</h2>
      </header>
      {#if profile.badges.length > 0}
        <ul class="badges-grid">
          {#each profile.badges as id (id)}
            <li><Badge def={badgeDef(id)} size="md" detail /></li>
          {/each}
        </ul>
      {:else}
        <p class="empty">
          No badges yet. Join your first quest to earn <em>First Quest</em>.
          <a href="/quests" class="empty-link">Go to quests →</a>
        </p>
      {/if}
    </section>

    <!-- Activity -->
    <section class="activity-block">
      <header class="block-head">
        <p class="micro">Recent activity</p>
        <h2>What you've been up to</h2>
      </header>
      <ol class="activity">
        {#each activity as a, i (i)}
          <li class="act act-{a.kind}">
            <span class="act-dot"></span>
            <div class="act-body">
              <p class="act-label">{a.label}</p>
              <p class="act-when">{a.when}</p>
            </div>
          </li>
        {/each}
      </ol>
    </section>

    <!-- Settings strip -->
    <section class="settings-block">
      <header class="block-head">
        <p class="micro">Settings</p>
        <h2>Tune your account</h2>
      </header>
      <div class="settings">
        <article class="setting">
          <p class="setting-label">Display name</p>
          <p class="setting-value">{profile.display_name}</p>
          <button class="btn-tiny ghost" onclick={startNameEdit}>Edit</button>
        </article>
        <article class="setting">
          <p class="setting-label">Suburb</p>
          {#if editingSuburb}
            <div class="suburb-edit">
              <SuburbPicker bind:value={suburbDraft} />
              <div class="row">
                <button class="btn-tiny primary" onclick={commitSuburbEdit} disabled={!suburbDraft}>Save</button>
                <button class="btn-tiny ghost"   onclick={cancelSuburbEdit}>Cancel</button>
              </div>
            </div>
          {:else}
            <p class="setting-value">{suburb?.name ?? '—'}</p>
            <button class="btn-tiny ghost" onclick={startSuburbEdit}>Change</button>
          {/if}
        </article>
        <article class="setting danger">
          <p class="setting-label">Session</p>
          <p class="setting-value">Demo session · stored in your browser</p>
          <button class="btn-tiny danger" onclick={signOut}>Sign out</button>
        </article>
      </div>
    </section>
  </main>
{:else}
  <main class="loading">
    <p>Loading…</p>
  </main>
{/if}

<style>
  :global(html), :global(body) {
    background: #06090f;
  }

  .profile {
    max-width: 1080px;
    margin: 0 auto;
    padding: 96px 28px 120px;
    color: #ecf1ff;
    font-family: 'Bricolage Grotesque', -apple-system, BlinkMacSystemFont, sans-serif;
    line-height: 1.55;
    background:
      radial-gradient(700px 500px at 80% -10%, rgba(127, 196, 151, 0.10), transparent 60%),
      radial-gradient(700px 600px at 0% 30%, rgba(232, 162, 62, 0.06), transparent 60%);
  }

  .loading {
    min-height: 60vh;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #8893ad;
  }

  /* ===== Hero ===== */
  .hero {
    display: flex;
    align-items: center;
    gap: 28px;
    padding-bottom: 36px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    margin-bottom: 36px;
  }
  .hero-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 14px; }

  .name {
    margin: 0;
    display: inline-flex;
    align-items: baseline;
    gap: 14px;
    flex-wrap: wrap;
  }
  .display {
    font-family: 'Fraunces', serif;
    font-weight: 400;
    font-size: clamp(2rem, 2.6vw + 1rem, 3.2rem);
    letter-spacing: -0.02em;
    line-height: 1.05;
    font-variation-settings: 'opsz' 144, 'SOFT' 40;
  }
  .edit-pencil {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.66rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #8893ad;
    border-radius: 999px;
    padding: 4px 10px;
    cursor: pointer;
    align-self: center;
    transition: all 180ms ease;
  }
  .edit-pencil:hover {
    color: #ecf1ff;
    border-color: rgba(255, 255, 255, 0.2);
  }

  .hero-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
  }
  .suburb-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px 6px 10px;
    border-radius: 999px;
    background: rgba(127, 196, 151, 0.1);
    color: #b3e3a3;
    border: 1px solid rgba(127, 196, 151, 0.3);
    text-decoration: none;
    font-weight: 500;
    font-size: 0.92rem;
    transition: background 180ms ease;
  }
  .suburb-pill:hover { background: rgba(127, 196, 151, 0.18); }
  .suburb-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #7fc497;
    box-shadow: 0 0 10px rgba(127, 196, 151, 0.7);
  }
  .suburb-postcode {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.7rem;
    color: #7fc497;
    letter-spacing: 0.08em;
  }
  .level-chip {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.72rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    padding: 6px 12px;
    border-radius: 999px;
    background: rgba(232, 162, 62, 0.1);
    color: #e8a23e;
    border: 1px solid rgba(232, 162, 62, 0.3);
  }
  .since {
    color: #8893ad;
    font-size: 0.86rem;
  }

  .inline-edit {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }
  .inline-edit input {
    background: #06090f;
    border: 1px solid rgba(127, 196, 151, 0.5);
    color: #ecf1ff;
    padding: 10px 14px;
    border-radius: 10px;
    font-family: 'Fraunces', serif;
    font-weight: 400;
    font-size: clamp(1.4rem, 2vw + 0.8rem, 2.4rem);
    min-width: 280px;
  }
  .inline-edit input:focus { outline: 0; }

  /* ===== Block heads ===== */
  .micro {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.66rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #8893ad;
    margin: 0 0 8px;
  }
  .block-head { margin-bottom: 18px; }
  .block-head h2 {
    font-family: 'Fraunces', serif;
    font-weight: 420;
    font-size: 1.6rem;
    margin: 0;
    letter-spacing: -0.012em;
    color: #ecf1ff;
  }
  .xp-title { font-family: 'Fraunces', serif; font-weight: 380; font-size: 1.55rem; margin: 0; letter-spacing: -0.012em; }
  .xp-title strong { font-weight: 600; color: #7fc497; }

  /* ===== XP card ===== */
  .xp-card {
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 24px 26px;
    background: rgba(255, 255, 255, 0.02);
    margin-bottom: 28px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .xp-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
    flex-wrap: wrap;
  }
  .xp-total {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }
  .xp-total-n {
    font-family: 'Fraunces', serif;
    font-weight: 400;
    font-size: 2rem;
    line-height: 1;
    color: #ecf1ff;
  }
  .xp-total-l {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.66rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #8893ad;
    margin-top: 4px;
  }

  /* ===== Stats grid ===== */
  .stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 1px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 14px;
    overflow: hidden;
    margin-bottom: 48px;
  }
  @media (max-width: 740px) {
    .stats { grid-template-columns: repeat(2, 1fr); }
  }
  .stat {
    background: rgba(255, 255, 255, 0.02);
    padding: 20px 22px;
  }
  .stat .micro { margin-bottom: 6px; }
  .stat-n {
    font-family: 'Fraunces', serif;
    font-weight: 400;
    font-size: 2rem;
    line-height: 1;
    color: #ecf1ff;
    margin: 0;
  }
  .stat-sub {
    margin: 6px 0 0;
    color: #6b7894;
    font-size: 0.78rem;
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: 0.05em;
  }

  /* ===== Badges ===== */
  .badges-block { margin-bottom: 48px; }
  .badges-grid {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 12px;
  }
  .empty {
    color: #8893ad;
    font-size: 0.96rem;
    border: 1px dashed rgba(255, 255, 255, 0.12);
    padding: 22px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.015);
  }
  .empty em { color: #ecf1ff; font-style: italic; }
  .empty-link {
    color: #7fc497;
    text-decoration: none;
    margin-left: 6px;
    font-weight: 500;
  }

  /* ===== Activity ===== */
  .activity-block { margin-bottom: 48px; }
  .activity {
    list-style: none;
    padding: 0;
    margin: 0;
    position: relative;
  }
  .activity::before {
    content: '';
    position: absolute;
    top: 6px;
    bottom: 6px;
    left: 5px;
    width: 1px;
    background: rgba(255, 255, 255, 0.08);
  }
  .act {
    display: flex;
    align-items: flex-start;
    gap: 18px;
    padding: 14px 0;
    position: relative;
  }
  .act-dot {
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: #06090f;
    border: 2px solid #7fc497;
    margin-top: 6px;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
  }
  .act-quest    .act-dot { border-color: #8bb6ff; }
  .act-resource .act-dot { border-color: #caa5d6; }
  .act-join     .act-dot { border-color: #6b7894; background: #6b7894; }
  .act-body { flex: 1; min-width: 0; }
  .act-label {
    margin: 0;
    color: #ecf1ff;
    font-size: 0.98rem;
  }
  .act-when {
    margin: 4px 0 0;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #6b7894;
  }

  /* ===== Settings strip ===== */
  .settings {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  @media (max-width: 900px) { .settings { grid-template-columns: 1fr; } }
  .setting {
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    padding: 18px 20px;
    background: rgba(255, 255, 255, 0.02);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .setting-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.66rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #8893ad;
    margin: 0;
  }
  .setting-value {
    color: #ecf1ff;
    font-size: 1.04rem;
    margin: 0;
    font-family: 'Fraunces', serif;
    font-weight: 420;
    letter-spacing: -0.005em;
  }
  .setting.danger .setting-value {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-weight: 400;
    font-size: 0.92rem;
    color: #8893ad;
  }
  .suburb-edit {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .suburb-edit .row {
    display: flex;
    gap: 8px;
  }

  /* ===== Buttons ===== */
  .btn-tiny {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 0.84rem;
    padding: 9px 14px;
    border-radius: 999px;
    border: 1px solid transparent;
    cursor: pointer;
    align-self: flex-start;
    margin-top: 4px;
    transition: transform 180ms ease, background 180ms ease, color 180ms ease;
  }
  .btn-tiny.primary {
    background: #7fc497;
    color: #0a1a12;
    box-shadow: 0 8px 20px -10px rgba(127, 196, 151, 0.5);
  }
  .btn-tiny.primary:hover:not(:disabled) { transform: translateY(-1px); }
  .btn-tiny.primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }
  .btn-tiny.ghost {
    background: transparent;
    color: #c9d2e6;
    border-color: rgba(255, 255, 255, 0.12);
  }
  .btn-tiny.ghost:hover { background: rgba(255, 255, 255, 0.04); }
  .btn-tiny.danger {
    background: transparent;
    color: #f0a896;
    border-color: rgba(240, 168, 150, 0.3);
  }
  .btn-tiny.danger:hover { background: rgba(240, 168, 150, 0.08); }
</style>
