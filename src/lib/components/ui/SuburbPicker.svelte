<script lang="ts">
  import { suburbStore } from '$lib/stores/suburb.svelte';

  interface Props {
    value:  string | null;            // currently selected suburb id (slug)
    name?:  string;                   // radio group name
  }
  let { value = $bindable(null), name = 'suburb-picker' }: Props = $props();

  const suburbs = suburbStore.all;
</script>

<fieldset class="picker">
  <legend class="sr-only">Suburb</legend>
  {#each suburbs as s (s.id)}
    <label class="card" class:selected={value === s.id}>
      <input
        type="radio"
        {name}
        value={s.id}
        bind:group={value}
      />
      <span class="dot" style="--pulse: { 100 - s.r_index }%"></span>
      <span class="text">
        <span class="name">{s.name}</span>
        <span class="postcode">{s.postcode}</span>
      </span>
      <span class="meta">
        <span class="r-index">{s.r_index}</span>
        <span class="r-label">r_index</span>
      </span>
    </label>
  {/each}
</fieldset>

<style>
  .picker {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 10px;
    border: 0;
    padding: 0;
    margin: 0;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    cursor: pointer;
    transition: border-color 200ms ease, background 200ms ease, transform 200ms ease;
  }
  .card:hover {
    border-color: rgba(127, 196, 151, 0.35);
    background: rgba(255, 255, 255, 0.04);
  }
  .card.selected {
    border-color: rgba(127, 196, 151, 0.6);
    background: rgba(127, 196, 151, 0.08);
    box-shadow: 0 0 0 1px rgba(127, 196, 151, 0.4) inset;
  }
  .card input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: linear-gradient(140deg, #7fc497, #5a9d75);
    box-shadow: 0 0 12px rgba(127, 196, 151, 0.55);
    flex-shrink: 0;
  }

  .text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
  }
  .name {
    font-family: 'Bricolage Grotesque', -apple-system, sans-serif;
    font-weight: 600;
    color: #ecf1ff;
    font-size: 0.98rem;
    letter-spacing: -0.005em;
  }
  .postcode {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    color: #8893ad;
    font-size: 0.72rem;
    letter-spacing: 0.1em;
  }

  .meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }
  .r-index {
    font-family: 'Fraunces', serif;
    font-weight: 460;
    font-size: 1.4rem;
    color: #ecf1ff;
    line-height: 1;
  }
  .r-label {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: #6b7894;
  }
</style>
