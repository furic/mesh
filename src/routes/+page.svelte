<script lang="ts">
  import MeshGlobe     from '$lib/components/globe/MeshGlobe.svelte'
  import SuburbList    from '$lib/components/suburb/SuburbList.svelte'
  import AdvisorChat   from '$lib/components/suburb/AdvisorChat.svelte'
  import SuburbDigest  from '$lib/components/suburb/SuburbDigest.svelte'
  import { MOCK_SUBURBS } from '$lib/data/mock-suburbs'
  import { PILLAR_LABELS } from '$lib/types'

  let selectedId: string | null = $state(null)
  let hoveredId:  string | null = $state(null)

  const suburbs = MOCK_SUBURBS

  let selected = $derived(suburbs.find((s) => s.id === selectedId) ?? null)

  function onSelect(detail: { id: string | null }) {
    selectedId = detail.id
  }
  function onHover(detail: { id: string | null }) {
    hoveredId = detail.id
  }
</script>

<main>
  <section class="stage">
    <div class="globe-wrap">
      <MeshGlobe {suburbs} {selectedId} onselect={onSelect} onhover={onHover} />
    </div>

    {#if selected}
      <div class="detail">
        <div class="detail-top">
          <h3>{selected.name} <span class="postcode">{selected.postcode}</span></h3>
          <div class="r-index-big">
            <span class="label">R-index</span>
            <span class="value">{selected.r_index}</span>
          </div>
        </div>
        <SuburbDigest suburb={selected} />

        <div class="detail-cols">
          <ul class="pillars">
            {#each Object.entries(selected.scores) as [key, score] (key)}
              {@const pillarKey =
                key === 'food'      ? 'food_security' :
                key === 'skills'    ? 'skill_density' :
                key === 'resources' ? 'resource_sharing' :
                key === 'social'    ? 'social_connectivity' :
                                      'emergency_preparedness'}
              <li>
                <span class="pillar-name">{PILLAR_LABELS[pillarKey]}</span>
                <div class="bar">
                  <div class="bar-fill" style="width: {score}%"></div>
                </div>
                <span class="score">{score}</span>
              </li>
            {/each}
          </ul>
          <AdvisorChat suburb={selected} />
        </div>
      </div>
    {:else}
      <div class="hint">Click a node or sidebar row to inspect a suburb.</div>
    {/if}
  </section>

  <SuburbList
    {suburbs}
    {selectedId}
    {hoveredId}
    onselect={onSelect}
    onhover={onHover}
  />
</main>

<style>
  main {
    display: grid;
    grid-template-columns: 1fr 360px;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
  }

  .stage {
    position: relative;
    overflow: hidden;
    background:
      radial-gradient(ellipse at 30% 30%, rgba(139, 182, 255, 0.10), transparent 55%),
      radial-gradient(ellipse at 70% 80%, rgba(255, 231, 194, 0.06), transparent 55%),
      #06090f;
  }

  .globe-wrap {
    position: absolute;
    inset: 0;
  }

  .hint {
    position: absolute;
    bottom: 28px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.78rem;
    color: #6e7993;
    letter-spacing: 0.04em;
    pointer-events: none;
    z-index: 2;
  }

  .detail {
    position: absolute;
    bottom: 28px;
    left: 28px;
    right: 28px;
    z-index: 2;
    padding: 18px 22px 20px;
    background: linear-gradient(180deg, rgba(12, 18, 35, 0.85), rgba(8, 11, 22, 0.78));
    border: 1px solid rgba(139, 182, 255, 0.18);
    border-radius: 14px;
    backdrop-filter: blur(10px);
    color: #e5ecff;
    max-width: 880px;
  }
  .detail-cols {
    display: grid;
    grid-template-columns: minmax(280px, 1fr) minmax(320px, 1.1fr);
    gap: 18px;
    align-items: stretch;
    margin-top: 14px;
  }
  .detail-top {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 14px;
  }
  .detail-top h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .detail-top .postcode {
    color: #6e7993;
    font-size: 0.85rem;
    font-weight: 400;
    margin-left: 6px;
    font-variant-numeric: tabular-nums;
  }
  .r-index-big {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }
  .r-index-big .label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: #6e7993;
  }
  .r-index-big .value {
    font-size: 1.8rem;
    font-weight: 700;
    color: #8bb6ff;
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }

  .pillars {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .pillars li {
    display: grid;
    grid-template-columns: 180px 1fr 36px;
    align-items: center;
    gap: 12px;
    font-size: 0.78rem;
  }
  .pillar-name {
    color: #aab4cc;
  }
  .bar {
    height: 6px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 3px;
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #5481d6, #8bb6ff);
    border-radius: 3px;
    transition: width 240ms ease;
  }
  .score {
    text-align: right;
    color: #e5ecff;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  @media (max-width: 880px) {
    main { grid-template-columns: 1fr; grid-template-rows: 1fr auto; }
    .detail { left: 16px; right: 16px; bottom: 16px; padding: 14px 16px; }
    .detail-cols { grid-template-columns: 1fr; }
    .pillars li { grid-template-columns: 130px 1fr 30px; }
  }
</style>
