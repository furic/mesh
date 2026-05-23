<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { browser } from '$app/environment'
  import * as THREE from 'three'
  import type { Suburb } from '$lib/types'

  interface Props {
    suburbs:    Suburb[]
    selectedId: string | null
    onselect:   (detail: { id: string | null }) => void
    onhover:    (detail: { id: string | null }) => void
  }

  let { suburbs, selectedId, onselect, onhover }: Props = $props()

  let canvas: HTMLCanvasElement
  let renderer: THREE.WebGLRenderer
  let scene:    THREE.Scene
  let camera:   THREE.PerspectiveCamera
  let nodeGroup: THREE.Group
  let edgeGroup: THREE.Group
  let raycaster: THREE.Raycaster
  let pointer:   THREE.Vector2
  let raf: number
  let resizeObs: ResizeObserver | undefined

  // Project lat/lng (small range) into the local XZ plane. Y is reserved for node lift.
  function project(suburb: Suburb, centre: { lat: number; lng: number }): THREE.Vector3 {
    const scale = 60                          // ~degrees → world units
    const x =  (suburb.lng - centre.lng) * scale
    const z = -(suburb.lat - centre.lat) * scale  // invert so north points +Z (towards camera)
    return new THREE.Vector3(x, 0, z)
  }

  // r_index → color, green (high) → amber → red (low)
  function nodeColour(rIndex: number): THREE.Color {
    const c = new THREE.Color()
    // 0 → red (0.0), 100 → green (0.33), HSL hue interpolation
    const hue = THREE.MathUtils.mapLinear(rIndex, 30, 90, 0.00, 0.36)
    c.setHSL(THREE.MathUtils.clamp(hue, 0, 0.36), 0.75, 0.55)
    return c
  }

  function nodeSize(suburb: Suburb): number {
    // Modest scaling on population for visual hierarchy.
    const min = 0.7, max = 1.6
    const popScale = Math.log10(Math.max(suburb.population, 1)) / 5  // ~0.6–1.0
    return THREE.MathUtils.mapLinear(popScale, 0.6, 1.0, min, max)
  }

  // ─── Per-suburb mesh handles (so we can hover/select/animate) ────────────────
  interface NodeHandle {
    suburb: Suburb
    mesh:   THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>
    halo:   THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>
    basePos: THREE.Vector3
  }
  let nodes: NodeHandle[] = []
  let hoveredId: string | null = null

  function buildScene(host: HTMLElement) {
    const w = host.clientWidth
    const h = host.clientHeight

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(w, h, false)

    scene = new THREE.Scene()

    camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 1000)
    camera.position.set(0, 14, 18)
    camera.lookAt(0, 0, 0)

    // Lights — warm key + cool fill for a "civic dusk" feel.
    const ambient = new THREE.AmbientLight(0x6b7fa8, 0.55)
    const key     = new THREE.DirectionalLight(0xffe7c2, 1.05)
    key.position.set(8, 12, 6)
    const fill    = new THREE.DirectionalLight(0x8bb6ff, 0.35)
    fill.position.set(-10, 6, -4)
    scene.add(ambient, key, fill)

    // Ground plane: faint grid hints at the city geography.
    const grid = new THREE.GridHelper(40, 20, 0x2a3550, 0x1a2238)
    ;(grid.material as THREE.Material).transparent = true
    ;(grid.material as THREE.Material).opacity = 0.55
    scene.add(grid)

    // Centre of mass for projection
    const cLat = suburbs.reduce((a, s) => a + s.lat, 0) / suburbs.length
    const cLng = suburbs.reduce((a, s) => a + s.lng, 0) / suburbs.length

    // Nodes
    nodeGroup = new THREE.Group()
    nodes = suburbs.map((suburb) => {
      const pos    = project(suburb, { lat: cLat, lng: cLng })
      pos.y        = 1.0
      const colour = nodeColour(suburb.r_index)
      const size   = nodeSize(suburb)

      const geom = new THREE.SphereGeometry(size, 32, 32)
      const mat  = new THREE.MeshStandardMaterial({
        color:        colour,
        emissive:     colour.clone().multiplyScalar(0.4),
        roughness:    0.4,
        metalness:    0.1,
      })
      const mesh = new THREE.Mesh(geom, mat)
      mesh.position.copy(pos)
      mesh.userData.suburbId = suburb.id

      // Halo for hover/selection glow.
      const haloGeom = new THREE.SphereGeometry(size * 1.4, 32, 32)
      const haloMat  = new THREE.MeshBasicMaterial({
        color:       colour,
        transparent: true,
        opacity:     0.0,
        depthWrite:  false,
      })
      const halo = new THREE.Mesh(haloGeom, haloMat)
      halo.position.copy(pos)

      nodeGroup.add(mesh, halo)
      return { suburb, mesh, halo, basePos: pos.clone() }
    })
    scene.add(nodeGroup)

    // Edges between every pair, opacity weighted by combined resilience.
    edgeGroup = new THREE.Group()
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j]
        const strength = (a.suburb.r_index + b.suburb.r_index) / 200  // 0–1
        if (strength < 0.45) continue                                  // skip weak links

        const mat = new THREE.LineBasicMaterial({
          color:       0x8bb6ff,
          transparent: true,
          opacity:     0.15 + strength * 0.35,
        })
        const geom = new THREE.BufferGeometry().setFromPoints([a.basePos, b.basePos])
        edgeGroup.add(new THREE.Line(geom, mat))
      }
    }
    scene.add(edgeGroup)

    raycaster = new THREE.Raycaster()
    pointer   = new THREE.Vector2()

    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('click',       onClick)

    // Resize handling — observe the host element so we adapt to layout changes.
    resizeObs = new ResizeObserver(() => {
      const W = host.clientWidth
      const H = host.clientHeight
      renderer.setSize(W, H, false)
      camera.aspect = W / H
      camera.updateProjectionMatrix()
    })
    resizeObs.observe(host)
  }

  function onPointerMove(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect()
    pointer.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1
    pointer.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1

    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObjects(nodes.map(n => n.mesh), false)
    const id = hits[0]?.object.userData.suburbId ?? null
    if (id !== hoveredId) {
      hoveredId = id
      onhover( { id })
      canvas.style.cursor = id ? 'pointer' : 'default'
    }
  }

  function onClick() {
    if (hoveredId) {
      onselect( { id: hoveredId === selectedId ? null : hoveredId })
    } else {
      onselect( { id: null })
    }
  }

  let t0 = 0
  function tick(t: number) {
    if (!t0) t0 = t
    const elapsed = (t - t0) / 1000

    // Gentle camera orbit so the scene feels alive.
    const radius = 22
    camera.position.x = Math.sin(elapsed * 0.12) * radius
    camera.position.z = Math.cos(elapsed * 0.12) * radius
    camera.position.y = 13 + Math.sin(elapsed * 0.4) * 0.4
    camera.lookAt(0, 0, 0)

    // Per-node animation: gentle bob + hover/selection halo
    for (const n of nodes) {
      const phase = (n.suburb.id.charCodeAt(0) % 7) * 0.4
      n.mesh.position.y = n.basePos.y + Math.sin(elapsed * 1.2 + phase) * 0.18
      n.halo.position.y = n.mesh.position.y

      const isHover    = n.suburb.id === hoveredId
      const isSelected = n.suburb.id === selectedId
      const targetOpacity = isSelected ? 0.55 : (isHover ? 0.32 : 0.0)
      const m = n.halo.material as THREE.MeshBasicMaterial
      m.opacity += (targetOpacity - m.opacity) * 0.15

      const targetScale = isSelected ? 1.25 : (isHover ? 1.1 : 1.0)
      n.mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.15)
    }

    renderer.render(scene, camera)
    raf = requestAnimationFrame(tick)
  }

  onMount(() => {
    if (!browser) return
    const host = canvas.parentElement!
    buildScene(host)
    raf = requestAnimationFrame(tick)
  })

  onDestroy(() => {
    if (!browser) return
    if (raf) cancelAnimationFrame(raf)
    resizeObs?.disconnect()
    canvas?.removeEventListener('pointermove', onPointerMove)
    canvas?.removeEventListener('click', onClick)
    renderer?.dispose()
    nodes.forEach((n) => {
      n.mesh.geometry.dispose()
      n.mesh.material.dispose()
      n.halo.geometry.dispose()
      n.halo.material.dispose()
    })
  })
</script>

<div class="globe-host">
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .globe-host {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
