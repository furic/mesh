<script lang="ts">
  import QuestCard from '$lib/components/quest/QuestCard.svelte'
  import { MOCK_SUBURBS } from '$lib/data/mock-suburbs'
  import { questStore } from '$lib/stores/quests.svelte'

  // Eagerly materialise slots for each suburb so the store and the page agree.
  MOCK_SUBURBS.forEach((s) => questStore.ensure(s.id))

  async function generateAll() {
    await Promise.all(
      MOCK_SUBURBS
        .filter((s) => !questStore.slot(s.id).quest && !questStore.slot(s.id).loading)
        .map((s) => questStore.generate(s.id)),
    )
  }

  let allLoading = $derived(MOCK_SUBURBS.some((s) => questStore.slot(s.id).loading))
  let allDone    = $derived(MOCK_SUBURBS.every((s) => questStore.slot(s.id).quest))
</script>

<main>
  <header class="page-head">
    <div>
      <span class="eyebrow">Quest board · AI generated</span>
      <h1>Community quests</h1>
      <p class="lede">
        Claude reads each suburb's pillar scores and proposes one concrete,
        achievable initiative — targeting whichever pillar is weakest.
      </p>
    </div>
    <button class="generate-all" onclick={generateAll} disabled={allLoading || allDone}>
      {#if allLoading}
        Generating…
      {:else if allDone}
        All generated
      {:else}
        Generate all
      {/if}
    </button>
  </header>

  <section class="grid">
    {#each MOCK_SUBURBS as suburb (suburb.id)}
      {@const s = questStore.slot(suburb.id)}
      <QuestCard
        {suburb}
        quest={s.quest}
        loading={s.loading}
        error={s.error}
        onGenerate={() => questStore.generate(suburb.id)}
      />
    {/each}
  </section>
</main>

<style>
  main {
    min-height: 100vh;
    padding: 80px 32px 64px;
    max-width: 1200px;
    margin: 0 auto;
    color: #e5ecff;
  }

  .page-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 24px;
    margin-bottom: 32px;
    flex-wrap: wrap;
  }
  .eyebrow {
    font-size: 0.7rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #8bb6ff;
    font-weight: 600;
  }
  h1 {
    margin: 4px 0 8px;
    font-size: 2rem;
    font-weight: 600;
    letter-spacing: -0.02em;
  }
  .lede {
    margin: 0;
    color: #aab4cc;
    font-size: 0.92rem;
    line-height: 1.55;
    max-width: 540px;
  }

  .generate-all {
    background: linear-gradient(180deg, #5481d6, #3962b8);
    border: 1px solid rgba(139, 182, 255, 0.5);
    color: white;
    border-radius: 10px;
    padding: 10px 18px;
    font: inherit;
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    transition: filter 120ms ease;
  }
  .generate-all:hover:not(:disabled) { filter: brightness(1.15); }
  .generate-all:disabled { opacity: 0.5; cursor: default; }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
    gap: 18px;
  }

  @media (max-width: 720px) {
    main { padding: 72px 16px 40px; }
    h1 { font-size: 1.6rem; }
  }
</style>
