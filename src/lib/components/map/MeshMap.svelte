<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { browser } from '$app/environment'
  import { env as publicEnv } from '$env/dynamic/public'
  import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
  import type { Suburb } from '$lib/types'
  import suburbGeoRaw from '$lib/data/suburb-geometries.json'

  // Inline GeoJSON shapes so we don't depend on a @types/geojson install.
  type PolygonGeom      = { type: 'Polygon';      coordinates: number[][][] }
  type MultiPolygonGeom = { type: 'MultiPolygon'; coordinates: number[][][][] }

  // Type-narrow the imported GeoJSON. TS widens JSON literals, so we cast once.
  interface SuburbGeoEntry {
    id:           string
    name:         string
    postcode:     string
    display_name: string
    bbox:         [number, number, number, number]
    geometry:     PolygonGeom | MultiPolygonGeom
    centroid:     [number, number]
    point_count:  number
  }
  const suburbGeoData = suburbGeoRaw as unknown as {
    generated_at: string
    source:       string
    license:      string
    suburbs:      SuburbGeoEntry[]
  }

  interface Props {
    suburbs:    Suburb[]
    selectedId: string | null
    onselect:   (detail: { id: string | null }) => void
    onhover:    (detail: { id: string | null }) => void
  }

  let { suburbs, selectedId, onselect, onhover }: Props = $props()

  const apiKey = publicEnv.PUBLIC_GOOGLE_MAPS_API_KEY
  const mapId  = publicEnv.PUBLIC_GOOGLE_MAPS_MAP_ID
  const ready  = Boolean(apiKey && mapId)

  let container: HTMLDivElement | undefined = $state()
  let burstEl:   HTMLDivElement | undefined = $state()
  // `map` is $state so the $effect that handles selection re-runs once
  // the async loader finishes and assigns the map instance.
  let map:       google.maps.Map | undefined = $state()
  let topId:     string | null = null
  let pulseRaf:  number | undefined
  let topPulse:  google.maps.Circle | undefined
  let hoveredId: string | null = null
  let lastSelected: string | null = null
  // User-facing 2D / 3D toggle. Defaults to 3D; persisted in localStorage.
  let view3D: boolean = $state(true)

  // Per-suburb polygon overlay handles.
  const polygons = new Map<string, google.maps.Polygon>()

  function colourForRIndex(r: number): string {
    const t = Math.max(0, Math.min(1, (r - 30) / 60))
    const hue = Math.round(0 + t * 135)
    return `hsl(${hue}, 65%, 55%)`
  }

  function paths(geo: SuburbGeoEntry): google.maps.LatLngLiteral[][] {
    const rings: number[][][] = geo.geometry.type === 'Polygon'
      ? [geo.geometry.coordinates[0]]
      : geo.geometry.coordinates.map((p: number[][][]) => p[0])
    return rings.map((ring) => ring.map(([lng, lat]: number[]) => ({ lat, lng })))
  }

  function applyState(id: string) {
    const p = polygons.get(id)
    if (!p) return
    const isSelected = id === selectedId
    const isHover    = id === hoveredId
    const opacity     = isSelected ? 0.45 : isHover ? 0.32 : 0.18
    const strokeWidth = isSelected ? 3    : isHover ? 2    : 1.4
    p.setOptions({ fillOpacity: opacity, strokeWeight: strokeWidth })
  }

  function setupPolygons(m: google.maps.Map) {
    const bySlug = Object.fromEntries(suburbs.map((s) => [s.id, s]))

    // Pick the top-r_index suburb for the permanent pulse ring.
    topId = suburbs.reduce<{ id: string | null; r: number }>(
      (a, s) => (s.r_index > a.r ? { id: s.id, r: s.r_index } : a),
      { id: null, r: -Infinity },
    ).id

    for (const geo of suburbGeoData.suburbs) {
      const s    = bySlug[geo.id]
      const r    = s?.r_index ?? 50
      const color = colourForRIndex(r)

      const polygon = new google.maps.Polygon({
        paths:           paths(geo),
        strokeColor:     color,
        strokeOpacity:   0.95,
        strokeWeight:    1.4,
        fillColor:       color,
        fillOpacity:     0.18,
        zIndex:          r,
        clickable:       true,
      })
      polygon.setMap(m)
      polygons.set(geo.id, polygon)

      polygon.addListener('mouseover', () => {
        if (hoveredId === geo.id) return
        const previous = hoveredId
        hoveredId = geo.id
        if (previous) applyState(previous)
        applyState(geo.id)
        m.getDiv().style.cursor = 'pointer'
        onhover({ id: geo.id })
      })
      polygon.addListener('mouseout', () => {
        const previous = hoveredId
        hoveredId = null
        if (previous) applyState(previous)
        m.getDiv().style.cursor = ''
        onhover({ id: null })
      })
      polygon.addListener('click', (e: google.maps.PolyMouseEvent) => {
        e.stop?.()
        onselect({ id: geo.id === selectedId ? null : geo.id })
      })
    }

    // Top-suburb golden ring at its centroid. We animate via RAF below.
    if (topId) {
      const geo = suburbGeoData.suburbs.find((g) => g.id === topId)
      if (geo) {
        topPulse = new google.maps.Circle({
          center:        { lat: geo.centroid[1], lng: geo.centroid[0] },
          radius:        300,                                // metres, RAF-animated
          strokeColor:   '#f3c460',
          strokeOpacity: 0.65,
          strokeWeight:  2,
          fillColor:     '#f3c460',
          fillOpacity:   0.10,
          clickable:     false,
          map:           m,
        })
        startPulseLoop()
      }
    }
  }

  function startPulseLoop() {
    const start = performance.now()
    const tick = (now: number) => {
      if (!topPulse) return
      const t = ((now - start) / 1800) % 1
      const phase = Math.sin(t * Math.PI * 2)        // -1..1
      const radius  = 280 + (phase + 1) * 180        // 280..640 metres
      const opacity = 0.40 - (phase + 1) * 0.18      // 0.40..0.04
      topPulse.setRadius(radius)
      topPulse.setOptions({
        strokeOpacity: Math.max(0, opacity + 0.15),
        fillOpacity:   Math.max(0, opacity * 0.35),
      })
      pulseRaf = requestAnimationFrame(tick)
    }
    pulseRaf = requestAnimationFrame(tick)
  }

  function triggerBurst(centroid: [number, number]) {
    if (!map || !burstEl) return
    const projection = map.getProjection()
    if (!projection) return
    // Approximate world-pixel projection. For an exact screen position we'd
    // need MapCanvasProjection from an OverlayView; this is close enough at
    // our zoom range that the burst lands on the suburb.
    const div     = map.getDiv()
    const bounds  = map.getBounds()
    if (!bounds) return
    const ne      = bounds.getNorthEast()
    const sw      = bounds.getSouthWest()
    const x = ((centroid[0] - sw.lng()) / (ne.lng() - sw.lng())) * div.clientWidth
    const y = ((ne.lat() - centroid[1]) / (ne.lat() - sw.lat())) * div.clientHeight
    burstEl.style.left = `${x}px`
    burstEl.style.top  = `${y}px`
    burstEl.classList.remove('burst-fire')
    void burstEl.offsetWidth
    burstEl.classList.add('burst-fire')
  }

  function flyTo(id: string | null) {
    if (!map) return
    if (!id) {
      map.panTo({ lat: -37.79, lng: 144.95 })
      map.setZoom(12)
      map.setTilt(0)
      map.setHeading(0)
      return
    }
    const geo = suburbGeoData.suburbs.find((g) => g.id === id)
    if (!geo) return
    map.panTo({ lat: geo.centroid[1], lng: geo.centroid[0] })
    map.setZoom(15)
    if (view3D) {
      map.setTilt(67.5)     // Google clamps this to 60° max for vector maps.
      map.setHeading(20)
    } else {
      map.setTilt(0)
      map.setHeading(0)
    }
    triggerBurst(geo.centroid)
  }

  // Toggle 2D ↔ 3D. Persisted so it survives reloads.
  const LS_VIEW = 'mesh.map.view3d'
  function setView3D(next: boolean) {
    view3D = next
    if (browser) {
      try { localStorage.setItem(LS_VIEW, next ? '1' : '0') } catch {}
    }
    if (map) {
      if (!next) {
        map.setTilt(0)
        map.setHeading(0)
      } else if (selectedId) {
        // Re-apply the tilt for the current selection.
        const geo = suburbGeoData.suburbs.find((g) => g.id === selectedId)
        if (geo) {
          map.setTilt(67.5)
          map.setHeading(20)
        }
      }
    }
  }

  // React to external selection changes (sidebar clicks).
  $effect(() => {
    if (!map) return
    if (lastSelected && lastSelected !== selectedId) applyState(lastSelected)
    if (selectedId && selectedId !== lastSelected) {
      applyState(selectedId)
      flyTo(selectedId)
    } else if (!selectedId && lastSelected) {
      flyTo(null)
    }
    lastSelected = selectedId
  })

  onMount(async () => {
    if (!browser || !ready) return
    // Restore the 2D/3D preference before the map loads.
    try {
      const persisted = localStorage.getItem(LS_VIEW)
      if (persisted === '0') view3D = false
    } catch {}
    // v2 functional API: setOptions() then importLibrary() per surface needed.
    setOptions({ key: apiKey!, v: 'weekly' })
    const { Map }     = await importLibrary('maps')
    const { Polygon } = await importLibrary('maps')      // same lib; pull both
    void Polygon       // silence unused — also required for the Polygon class to be on `google.maps`

    map = new Map(container!, {
      colorScheme: google.maps.ColorScheme.DARK,
      center:           { lat: -37.79, lng: 144.95 },
      zoom:             12,
      mapId:            mapId!,                          // vector + tilt + 3D buildings
      tilt:             0,
      heading:          0,
      disableDefaultUI: false,
      streetViewControl: false,
      mapTypeControl:   false,
      fullscreenControl: false,
      rotateControl:    true,
      zoomControl:      true,
      restriction: {
        latLngBounds: { north: -37.65, south: -37.95, west: 144.70, east: 145.20 },
        strictBounds: false,
      },
    })

    setupPolygons(map)

    map.addListener('click', () => {
      onselect({ id: null })
    })

    if (selectedId) {
      applyState(selectedId)
      flyTo(selectedId)
    }
  })

  onDestroy(() => {
    if (!browser) return
    if (pulseRaf) cancelAnimationFrame(pulseRaf)
    polygons.forEach((p) => p.setMap(null))
    polygons.clear()
    topPulse?.setMap(null)
  })
</script>

{#if ready}
  <div class="map-wrapper">
    <!-- Google Maps wipes any children inside the container on init, so the
         burst overlay and the 2D/3D toggle live as *siblings* of .map-host. -->
    <div class="map-host" bind:this={container}></div>
    <div class="select-burst" bind:this={burstEl} aria-hidden="true"></div>
    <div class="view-toggle" role="group" aria-label="Map view">
      <button
        class:active={!view3D}
        onclick={() => setView3D(false)}
        type="button"
      >2D</button>
      <button
        class:active={view3D}
        onclick={() => setView3D(true)}
        type="button"
      >3D</button>
    </div>
  </div>
{:else}
  <div class="setup-card" role="region" aria-label="Google Maps setup required">
    <p class="eyebrow">SETUP REQUIRED</p>
    <h2>Drop in a Google Maps key</h2>
    <p class="lede">
      The 2.5D map uses Google Maps Platform — free for our usage but needs a one-time
      key + Map ID setup. The dev server reads them from <code>.env.local</code>.
    </p>
    <ol>
      <li>Open <a href="https://console.cloud.google.com" target="_blank" rel="noopener">Google Cloud Console</a> → create or select a project.</li>
      <li>Enable <strong>billing</strong> (Maps APIs require it; $200/mo free credit).</li>
      <li>Enable <strong>Maps JavaScript API</strong> under APIs &amp; Services → Library.</li>
      <li>Create an <strong>API key</strong>; restrict it to <code>localhost:5173/*</code> + your Vercel URL.</li>
      <li>Create a <strong>Map ID</strong> under Maps Platform → Map Management. Map type = JavaScript. Enable <em>Tilt</em> + <em>Rotation</em>.</li>
      <li>Add to <code>.env.local</code>:
        <pre>PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
PUBLIC_GOOGLE_MAPS_MAP_ID=abc123...</pre>
      </li>
      <li>Restart the dev server. The 2.5D map will appear here.</li>
    </ol>
    <p class="footnote">See <code>.env.example</code> for the same instructions in source form.</p>
  </div>
{/if}

<style>
  .map-wrapper {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .map-host {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  /* 2D / 3D segmented toggle, top-left of the map. */
  .view-toggle {
    position: absolute;
    top: 72px;       /* below the topnav */
    left: 16px;
    z-index: 5;
    display: inline-flex;
    background: rgba(12, 18, 35, 0.85);
    border: 1px solid rgba(139, 182, 255, 0.25);
    border-radius: 999px;
    padding: 3px;
    backdrop-filter: blur(8px);
    box-shadow: 0 8px 20px -10px rgba(0, 0, 0, 0.4);
  }
  .view-toggle button {
    appearance: none;
    background: transparent;
    border: 0;
    color: #aab4cc;
    padding: 6px 14px;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 0.74rem;
    letter-spacing: 0.14em;
    border-radius: 999px;
    cursor: pointer;
    transition: background 180ms ease, color 180ms ease;
  }
  .view-toggle button:hover { color: #e5ecff; }
  .view-toggle button.active {
    background: linear-gradient(180deg, #5481d6, #3962b8);
    color: #fff;
    box-shadow: 0 0 0 1px rgba(139, 182, 255, 0.3) inset;
  }

  /* === Setup-card fallback shown when Google Maps env vars are missing === */
  .setup-card {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    padding: 48px 56px;
    color: #ecf1ff;
    font-family: 'Bricolage Grotesque', -apple-system, BlinkMacSystemFont, sans-serif;
    line-height: 1.55;
    background:
      radial-gradient(700px 500px at 70% 10%, rgba(127, 196, 151, 0.10), transparent 60%),
      radial-gradient(700px 600px at 10% 80%, rgba(232, 162, 62, 0.07), transparent 60%),
      #06090f;
  }
  .setup-card .eyebrow {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 0.72rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #e8a23e;
    margin: 0 0 18px;
  }
  .setup-card h2 {
    font-family: 'Fraunces', serif;
    font-weight: 380;
    font-size: clamp(1.8rem, 3vw + 0.8rem, 3rem);
    margin: 0 0 14px;
    letter-spacing: -0.02em;
    line-height: 1.06;
  }
  .setup-card .lede {
    color: #c9d2e6;
    font-size: 1.02rem;
    max-width: 640px;
    margin: 0 0 24px;
  }
  .setup-card ol {
    margin: 0 0 24px;
    padding-left: 22px;
    color: #c9d2e6;
    max-width: 640px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .setup-card ol li::marker {
    color: #e8a23e;
    font-family: 'JetBrains Mono', monospace;
  }
  .setup-card strong { color: #ecf1ff; font-weight: 600; }
  .setup-card em     { color: #e8a23e; font-style: italic; }
  .setup-card code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.86rem;
    background: rgba(255, 255, 255, 0.05);
    padding: 2px 6px;
    border-radius: 4px;
    color: #ecf1ff;
  }
  .setup-card pre {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 12px 14px;
    border-radius: 8px;
    font-size: 0.84rem;
    margin: 8px 0 0;
    color: #b3e3a3;
    font-family: 'JetBrains Mono', monospace;
    overflow-x: auto;
  }
  .setup-card .footnote {
    color: #8893ad;
    font-size: 0.88rem;
    margin: 0;
  }
  .setup-card a { color: #8bb6ff; }

  /* === Selection burst (same idiom as the MapLibre version) === */
  .select-burst {
    position: absolute;
    width: 0; height: 0;
    pointer-events: none;
    z-index: 4;
    opacity: 0;
  }
  .select-burst::before,
  .select-burst::after {
    content: '';
    position: absolute;
    left: 0; top: 0;
    width: 24px; height: 24px;
    margin: -12px 0 0 -12px;
    border-radius: 50%;
    border: 1.5px solid rgba(243, 196, 96, 0.85);
    box-shadow: 0 0 24px rgba(243, 196, 96, 0.55);
    opacity: 0;
  }
  :global(.select-burst.burst-fire::before) {
    animation: burst-ring 900ms cubic-bezier(0.16, 0.7, 0.2, 1) forwards;
  }
  :global(.select-burst.burst-fire::after) {
    animation: burst-ring 900ms 150ms cubic-bezier(0.16, 0.7, 0.2, 1) forwards;
  }
  @keyframes burst-ring {
    0%   { transform: scale(0.6); opacity: 0.9; }
    60%  { opacity: 0.7; }
    100% { transform: scale(8);   opacity: 0;   }
  }
</style>
