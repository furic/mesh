<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { browser } from '$app/environment'
  import maplibregl, { type Map as MapLibreMap, type MapMouseEvent } from 'maplibre-gl'
  import 'maplibre-gl/dist/maplibre-gl.css'
  import type { Suburb } from '$lib/types'
  import suburbGeoRaw from '$lib/data/suburb-geometries.json'

  // Type-narrow the imported JSON. TS imports JSON with widened literals
  // (geometry.type becomes `string`), so we cast once at the top.
  interface SuburbGeoEntry {
    id:           string
    name:         string
    postcode:     string
    display_name: string
    bbox:         [number, number, number, number]
    geometry:     GeoJSON.Polygon | GeoJSON.MultiPolygon
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

  let container: HTMLDivElement
  let burstEl:   HTMLDivElement
  let map: MapLibreMap | undefined
  let hoveredId: string | null = null
  let topId:     string | null = null   // highest r_index suburb — always pulses
  let pulseRaf:  number | undefined

  // Dark, label-light CARTO Voyager — free, no API key, retina tiles.
  // Alternative: dark-matter (more austere). Voyager strikes a balance
  // between MESH's editorial dark mood and enough street context to read.
  const STYLE_URL = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

  // Bounding box covering all 5 demo suburbs with breathing room.
  const FIT_BOUNDS: [[number, number], [number, number]] = [
    [144.85, -37.84],
    [145.05, -37.74],
  ]

  function colourForRIndex(r: number): string {
    // 30 → red, 60 → amber, 90+ → green. Matches the existing palette.
    const t = Math.max(0, Math.min(1, (r - 30) / 60))
    const hue = 0 + t * (135 - 0)      // 0=red → 135=green (HSL hue)
    return `hsl(${Math.round(hue)}, 65%, 55%)`
  }

  // Compose a GeoJSON FeatureCollection of the 5 suburb polygons enriched
  // with their app-level metadata (r_index, fill colour, level).
  function buildFeatureCollection(suburbs: Suburb[]) {
    const bySlug = Object.fromEntries(suburbs.map((s) => [s.id, s]))
    return {
      type: 'FeatureCollection' as const,
      features: suburbGeoData.suburbs.map((g) => {
        const s = bySlug[g.id]
        const r = s?.r_index ?? 50
        return {
          type: 'Feature' as const,
          id:   g.id,
          properties: {
            id:        g.id,
            name:      g.name,
            postcode:  g.postcode,
            r_index:   r,
            level:     s?.level ?? 1,
            fill:      colourForRIndex(r),
            centroid:  g.centroid,
          },
          geometry: g.geometry,
        }
      }),
    }
  }

  function buildCentroidFC(suburbs: Suburb[]) {
    const bySlug = Object.fromEntries(suburbs.map((s) => [s.id, s]))
    return {
      type: 'FeatureCollection' as const,
      features: suburbGeoData.suburbs.map((g) => {
        const s = bySlug[g.id]
        const r = s?.r_index ?? 50
        return {
          type: 'Feature' as const,
          id:   g.id,
          properties: {
            id:        g.id,
            name:      g.name,
            r_index:   r,
            level:     s?.level ?? 1,
            fill:      colourForRIndex(r),
          },
          geometry: {
            type:        'Point' as const,
            coordinates: g.centroid,
          },
        }
      }),
    }
  }

  function setupLayers(m: MapLibreMap) {
    const fc        = buildFeatureCollection(suburbs)
    const centroids = buildCentroidFC(suburbs)

    // Pick the highest r_index suburb — gets a permanent pulsing crown ring.
    topId = suburbs.reduce<{ id: string | null; r: number }>(
      (a, s) => (s.r_index > a.r ? { id: s.id, r: s.r_index } : a),
      { id: null, r: -Infinity },
    ).id

    m.addSource('suburbs',           { type: 'geojson', data: fc })
    m.addSource('suburb-centroids',  { type: 'geojson', data: centroids })

    // Resilience halo — a soft glow around each centroid whose radius and
    // opacity scale with r_index. This is the 2D substitute for 3D
    // extrusion: bigger glow = healthier suburb, no camera pitch required.
    m.addLayer({
      id:     'resilience-halo',
      type:   'circle',
      source: 'suburb-centroids',
      paint: {
        'circle-color':   ['get', 'fill'],
        'circle-radius': [
          'interpolate', ['linear'], ['get', 'r_index'],
          30,  16,
          50,  28,
          70,  48,
          90,  72,
        ],
        'circle-blur':    1.0,
        'circle-opacity': [
          'interpolate', ['linear'], ['get', 'r_index'],
          30,  0.18,
          70,  0.40,
          90,  0.55,
        ],
      },
    })

    // Fill layer — soft pillar-colour wash so the suburb reads as a place,
    // not just a label. Sits flat under the extrusion so the colour is
    // visible from any pitch.
    m.addLayer({
      id:     'suburb-fill',
      type:   'fill',
      source: 'suburbs',
      paint: {
        'fill-color': ['get', 'fill'],
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'selected'], false], 0.45,
          ['boolean', ['feature-state', 'hover'],    false], 0.32,
          0.18,
        ],
      },
    })

    // (3D fill-extrusion was tried here. MapLibre supports it cleanly and
    // OpenFreeMap can serve OSM building:height as `render_height`, but the
    // Carto dark-matter basemap stays flat 2D, so the suburb prisms ended
    // up floating above unrelated streets. The visual mismatch outweighed
    // the 'altitude = resilience' read. Reverted in favour of the
    // resilience-halo above + sharper hover/selection on the flat fill.)

    // Outline — slightly brighter than fill so the boundary is legible.
    m.addLayer({
      id:     'suburb-outline',
      type:   'line',
      source: 'suburbs',
      paint: {
        'line-color': ['get', 'fill'],
        'line-width': [
          'case',
          ['boolean', ['feature-state', 'selected'], false], 3.0,
          ['boolean', ['feature-state', 'hover'],    false], 2.0,
          1.2,
        ],
        'line-opacity': 0.95,
      },
    })

    // Centroid dot — anchors the eye, especially when zoomed out.
    m.addLayer({
      id:     'suburb-dot',
      type:   'circle',
      source: 'suburb-centroids',
      paint: {
        'circle-color':         ['get', 'fill'],
        'circle-radius': [
          'case',
          ['boolean', ['feature-state', 'selected'], false], 9,
          ['boolean', ['feature-state', 'hover'],    false], 7,
          5,
        ],
        'circle-stroke-color':  '#0c1320',
        'circle-stroke-width':  1.5,
        'circle-opacity':       0.95,
      },
    })

    // Label — suburb name, then r_index in a smaller weight.
    m.addLayer({
      id:     'suburb-label',
      type:   'symbol',
      source: 'suburb-centroids',
      layout: {
        'text-field': [
          'format',
          ['get', 'name'], { 'font-scale': 1.0 },
          '\n', {},
          ['concat', 'r·', ['to-string', ['get', 'r_index']]], { 'font-scale': 0.78 },
        ],
        'text-font':            ['Open Sans Semibold', 'Arial Unicode MS Regular'],
        'text-size':            14,
        'text-offset':          [0, 1.2],
        'text-anchor':          'top',
        'text-allow-overlap':   false,
        'text-letter-spacing':  0.05,
      },
      paint: {
        'text-color':         '#f3f6ff',
        'text-halo-color':    'rgba(6, 9, 15, 0.85)',
        'text-halo-width':    1.4,
        'text-halo-blur':     0.6,
      },
    })

    // Top suburb — golden double-ring under the centroid. Two layers so the
    // RAF loop can pulse the outer ring's radius/opacity independently.
    if (topId) {
      m.addLayer({
        id:     'top-pulse-outer',
        type:   'circle',
        source: 'suburb-centroids',
        filter: ['==', ['get', 'id'], topId],
        paint: {
          'circle-color':         '#f3c460',
          'circle-radius':        16,
          'circle-opacity':       0.0,           // RAF drives this
          'circle-stroke-color':  '#f3c460',
          'circle-stroke-width':  1.2,
          'circle-stroke-opacity': 0.5,
        },
      })
      m.addLayer({
        id:     'top-pulse-inner',
        type:   'circle',
        source: 'suburb-centroids',
        filter: ['==', ['get', 'id'], topId],
        paint: {
          'circle-color':         'transparent',
          'circle-radius':        11,
          'circle-stroke-color':  '#fff0c2',
          'circle-stroke-width':  2,
          'circle-stroke-opacity': 0.95,
        },
      })
    }

    // Connecting lines (resilience mesh) — pair every suburb to every other,
    // line width by combined r_index. Subtle base; lights up when either
    // endpoint is the selection.
    const edges = []
    for (let i = 0; i < suburbGeoData.suburbs.length; i++) {
      for (let j = i + 1; j < suburbGeoData.suburbs.length; j++) {
        const a = suburbGeoData.suburbs[i]
        const b = suburbGeoData.suburbs[j]
        const aR = bySlug(suburbs)[a.id]?.r_index ?? 50
        const bR = bySlug(suburbs)[b.id]?.r_index ?? 50
        edges.push({
          type:       'Feature' as const,
          properties: { a: a.id, b: b.id, strength: (aR + bR) / 200 },
          geometry: {
            type:        'LineString' as const,
            coordinates: [a.centroid, b.centroid],
          },
        })
      }
    }
    m.addSource('mesh-edges', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: edges },
    })
    m.addLayer(
      {
        id:     'mesh-edges',
        type:   'line',
        source: 'mesh-edges',
        paint: {
          'line-color':   '#8bb6ff',
          'line-opacity': ['interpolate', ['linear'], ['get', 'strength'], 0.3, 0.08, 0.8, 0.25],
          'line-width':   ['interpolate', ['linear'], ['get', 'strength'], 0.3, 0.6, 0.8, 1.6],
          'line-blur':    0.6,
        },
      },
      'suburb-fill',
    )
  }

  // Tiny helper so the edge builder reads cleanly.
  function bySlug(list: Suburb[]): Record<string, Suburb> {
    return Object.fromEntries(list.map((s) => [s.id, s]))
  }

  function applyFeatureState(id: string | null, key: 'hover' | 'selected', on: boolean) {
    if (!map || !id) return
    map.setFeatureState({ source: 'suburbs',          id }, { [key]: on })
    map.setFeatureState({ source: 'suburb-centroids', id }, { [key]: on })
  }

  function attachHandlers(m: MapLibreMap) {
    const enterLayers = ['suburb-fill', 'suburb-dot']

    for (const layer of enterLayers) {
      m.on('mousemove', layer, (e: MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
        const f = e.features?.[0]
        const id = (f?.properties?.id as string) ?? null
        if (id === hoveredId) return
        if (hoveredId) applyFeatureState(hoveredId, 'hover', false)
        hoveredId = id
        if (id) applyFeatureState(id, 'hover', true)
        m.getCanvas().style.cursor = 'pointer'
        onhover({ id })
      })
      m.on('mouseleave', layer, () => {
        if (hoveredId) applyFeatureState(hoveredId, 'hover', false)
        hoveredId = null
        m.getCanvas().style.cursor = ''
        onhover({ id: null })
      })
      m.on('click', layer, (e: MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
        e.preventDefault?.()
        const f = e.features?.[0]
        const id = (f?.properties?.id as string) ?? null
        onselect({ id: id === selectedId ? null : id })
      })
    }

    // Click on bare basemap deselects.
    m.on('click', (e) => {
      if (e.defaultPrevented) return
      onselect({ id: null })
    })
  }

  function flyToSelection(id: string | null) {
    if (!map) return
    if (!id) {
      map.flyTo({
        center: [144.95, -37.79],
        zoom:   12.0,
        pitch:  0,
        bearing: 0,
        speed:  1.2,
        curve:  1.4,
        essential: true,
      })
      return
    }
    const geo = suburbGeoData.suburbs.find((g) => g.id === id)
    if (!geo) return
    map.flyTo({
      center:   geo.centroid as [number, number],
      zoom:     13.6,
      pitch:    0,
      bearing:  0,
      speed:    1.4,
      curve:    1.3,
      essential: true,
    })
    triggerBurst(geo.centroid as [number, number])
  }

  // Drive the top-suburb pulse via RAF — MapLibre can't animate paint
  // properties over time on its own, so we set a sin-wave radius + opacity
  // every frame. Cheap (one feature, one layer update per frame).
  function startPulseLoop(m: MapLibreMap) {
    if (!topId) return
    const start = performance.now()
    const tick = (now: number) => {
      if (!map) return
      const t = ((now - start) / 1800) % 1            // 1.8s cycle
      const phase = Math.sin(t * Math.PI * 2)         // -1..1
      const radius  = 18 + (phase + 1) * 11           // 18..40
      const opacity = 0.45 - (phase + 1) * 0.22       // 0.45..0.01
      m.setPaintProperty('top-pulse-outer', 'circle-radius', radius)
      m.setPaintProperty('top-pulse-outer', 'circle-opacity', Math.max(0, opacity))
      m.setPaintProperty('top-pulse-outer', 'circle-stroke-opacity', Math.max(0, opacity + 0.1))
      pulseRaf = requestAnimationFrame(tick)
    }
    pulseRaf = requestAnimationFrame(tick)
  }

  // Burst: animate the overlay div outward from a screen-projected centroid.
  // The CSS keyframe does the visual; this function just positions + restarts
  // the animation each time a new selection lands.
  function triggerBurst(lngLat: [number, number]) {
    if (!map || !burstEl) return
    const p = map.project(lngLat)
    burstEl.style.left = `${p.x}px`
    burstEl.style.top  = `${p.y}px`
    // Restart by toggling the class — remove, force reflow, re-add.
    burstEl.classList.remove('burst-fire')
    void burstEl.offsetWidth
    burstEl.classList.add('burst-fire')
  }

  // React to external selection changes (e.g. clicking a sidebar row).
  let lastSelected: string | null = null
  $effect(() => {
    if (!map) return
    // Selected state on features
    if (lastSelected && lastSelected !== selectedId) {
      applyFeatureState(lastSelected, 'selected', false)
    }
    if (selectedId && selectedId !== lastSelected) {
      applyFeatureState(selectedId, 'selected', true)
      flyToSelection(selectedId)
    } else if (!selectedId && lastSelected) {
      flyToSelection(null)
    }
    lastSelected = selectedId
  })

  onMount(() => {
    if (!browser) return
    map = new maplibregl.Map({
      container,
      style:        STYLE_URL,
      bounds:       FIT_BOUNDS,
      fitBoundsOptions: { padding: 80 },
      minZoom:      10.5,
      maxZoom:      16,
      maxPitch:     0,                              // 2D only — see flyToSelection comment
      maxBounds: [
        [144.70, -37.95],
        [145.20, -37.65],
      ],
      attributionControl: { compact: true },
      cooperativeGestures: false,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    map.on('load', () => {
      if (!map) return
      setupLayers(map)
      attachHandlers(map)
      startPulseLoop(map)
      // If a selection was already set by the parent before the map loaded,
      // apply it.
      if (selectedId) {
        applyFeatureState(selectedId, 'selected', true)
        flyToSelection(selectedId)
      }
    })
  })

  onDestroy(() => {
    if (!browser) return
    if (pulseRaf) cancelAnimationFrame(pulseRaf)
    map?.remove()
  })
</script>

<div class="map-host" bind:this={container}>
  <div class="select-burst" bind:this={burstEl} aria-hidden="true"></div>
</div>

<style>
  .map-host {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  /* Selection burst — a triple-ring expanding from the projected centroid
     each time a suburb is selected. The element sits absolute over the map
     canvas; JS sets left/top to map.project(centroid) and re-fires the
     animation by toggling .burst-fire. */
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
  /* `.burst-fire` is toggled from JS; Svelte's static scoper can't see it,
     so we wrap the pseudo-element animation rules in :global(). */
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
  /* Tweak MapLibre's default chrome to fit MESH dark theme. */
  :global(.maplibregl-ctrl-attrib) {
    background: rgba(6, 9, 15, 0.55) !important;
    color: #6e7993 !important;
    font-size: 0.66rem !important;
    backdrop-filter: blur(4px);
  }
  :global(.maplibregl-ctrl-attrib a) {
    color: #8bb6ff !important;
  }
  :global(.maplibregl-ctrl-group) {
    background: rgba(12, 18, 35, 0.78) !important;
    border: 1px solid rgba(139, 182, 255, 0.18) !important;
    box-shadow: none !important;
  }
  :global(.maplibregl-ctrl-group button) {
    background: transparent !important;
  }
  :global(.maplibregl-ctrl-group button:hover) {
    background: rgba(139, 182, 255, 0.10) !important;
  }
</style>
