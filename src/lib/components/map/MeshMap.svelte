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
  let map: MapLibreMap | undefined
  let hoveredId: string | null = null

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

    m.addSource('suburbs',           { type: 'geojson', data: fc })
    m.addSource('suburb-centroids',  { type: 'geojson', data: centroids })

    // Fill layer — soft pillar-colour wash so the suburb reads as a place,
    // not just a label.
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
      map.fitBounds(FIT_BOUNDS, { padding: 80, duration: 800 })
      return
    }
    const geo = suburbGeoData.suburbs.find((g) => g.id === id)
    if (!geo) return
    map.flyTo({
      center:   geo.centroid as [number, number],
      zoom:     13.4,
      speed:    1.4,
      curve:    1.3,
      essential: true,
    })
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
    map?.remove()
  })
</script>

<div class="map-host" bind:this={container}></div>

<style>
  .map-host {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
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
