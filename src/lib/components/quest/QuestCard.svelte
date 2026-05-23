<script lang="ts">
  import type { GeneratedQuest, Suburb } from '$lib/types'
  import { PILLAR_LABELS } from '$lib/types'

  interface Props {
    suburb: Suburb
    quest:  GeneratedQuest | null
    loading: boolean
    error:   string | null
    onGenerate: () => void
  }
  let { suburb, quest, loading, error, onGenerate }: Props = $props()

  function difficultyClass(d: string): string {
    return `diff-${d}`
  }
</script>

<article class="card" class:has-quest={!!quest}>
  <header class="card-head">
    <div>
      <span class="eyebrow">{suburb.name}</span>
      {#if quest}
        <h3>{quest.title}</h3>
      {:else}
        <h3 class="placeholder">No quest yet</h3>
      {/if}
    </div>
    {#if quest}
      <div class="badges">
        <span class="badge pillar">{PILLAR_LABELS[quest.pillar]}</span>
        <span class="badge {difficultyClass(quest.difficulty)}">{quest.difficulty}</span>
        <span class="badge xp">+{quest.xp_reward} XP</span>
      </div>
    {/if}
  </header>

  {#if quest}
    <p class="description">{quest.description}</p>

    <ol class="steps">
      {#each quest.steps as step (step.order)}
        <li>
          <span class="step-num">{step.order}</span>
          <span class="step-text">{step.description}</span>
        </li>
      {/each}
    </ol>

    <footer class="meta">
      <span><strong>{quest.participant_target}</strong> residents · expires in <strong>{quest.expires_days}d</strong></span>
      <details>
        <summary>Why this quest?</summary>
        <p>{quest.ai_rationale}</p>
      </details>
    </footer>
  {:else if error}
    <p class="error">{error}</p>
    <button class="cta" onclick={onGenerate} disabled={loading}>Try again</button>
  {:else}
    <p class="hint">
      Generate an AI quest for {suburb.name} — Claude picks the weakest pillar and proposes a
      concrete community initiative.
    </p>
    <button class="cta" onclick={onGenerate} disabled={loading}>
      {loading ? 'Generating…' : 'Generate quest'}
    </button>
  {/if}
</article>

<style>
  .card {
    background: linear-gradient(180deg, rgba(20, 28, 48, 0.7), rgba(12, 17, 30, 0.7));
    border: 1px solid rgba(139, 182, 255, 0.14);
    border-radius: 14px;
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    transition: border-color 200ms ease;
  }
  .card.has-quest { border-color: rgba(139, 182, 255, 0.3); }

  .card-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    flex-wrap: wrap;
  }
  .eyebrow {
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: #8bb6ff;
    font-weight: 600;
  }
  h3 {
    margin: 4px 0 0;
    font-size: 1.05rem;
    font-weight: 600;
    line-height: 1.35;
    color: #e5ecff;
    letter-spacing: -0.01em;
  }
  h3.placeholder {
    color: #6e7993;
    font-weight: 500;
    font-style: italic;
  }

  .badges {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .badge {
    font-size: 0.66rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 3px 8px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.06);
    color: #c2d8ff;
  }
  .badge.pillar    { background: rgba(139, 182, 255, 0.15); color: #c2d8ff; }
  .badge.xp        { background: rgba(87, 217, 158, 0.12); color: #8dd5b1; }
  .badge.diff-easy   { background: rgba(87, 217, 158, 0.12); color: #8dd5b1; }
  .badge.diff-medium { background: rgba(230, 184, 96, 0.14); color: #e6b860; }
  .badge.diff-hard   { background: rgba(229, 115, 115, 0.12); color: #e57373; }

  .description {
    margin: 0;
    font-size: 0.88rem;
    line-height: 1.55;
    color: #c2d0e6;
  }

  .steps {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .steps li {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 0.82rem;
    line-height: 1.5;
  }
  .step-num {
    flex: 0 0 22px;
    height: 22px;
    border-radius: 50%;
    background: rgba(139, 182, 255, 0.18);
    color: #c2d8ff;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.72rem;
    margin-top: 1px;
  }
  .step-text {
    color: #aab4cc;
  }

  .meta {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    font-size: 0.78rem;
    color: #8a96b3;
  }
  .meta strong {
    color: #e5ecff;
    font-weight: 600;
  }
  details summary {
    cursor: pointer;
    user-select: none;
    color: #8bb6ff;
    font-weight: 500;
  }
  details summary:hover { color: #c2d8ff; }
  details p {
    margin: 6px 0 0;
    color: #aab4cc;
    line-height: 1.5;
    font-size: 0.78rem;
  }

  .hint, .error {
    margin: 0;
    font-size: 0.85rem;
    line-height: 1.55;
    color: #8a96b3;
  }
  .error { color: #e57373; }

  .cta {
    align-self: flex-start;
    background: linear-gradient(180deg, #5481d6, #3962b8);
    border: 1px solid rgba(139, 182, 255, 0.5);
    color: white;
    border-radius: 8px;
    padding: 8px 16px;
    font: inherit;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: filter 120ms ease;
  }
  .cta:hover:not(:disabled) { filter: brightness(1.15); }
  .cta:disabled { opacity: 0.5; cursor: default; }
</style>
