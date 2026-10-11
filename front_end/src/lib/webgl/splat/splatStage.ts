/**
 * Splat page renderer: three r186's own GaussianSplat on a WebGPU renderer (WebGL2
 * fallback), set up exactly like the reference page, sized to its host element.
 */
import * as THREE from 'three-r186/webgpu'
import { OrbitControls } from 'three-r186/addons/controls/OrbitControls.js'
import { GaussianSplatPLYLoader } from 'three-r186/addons/loaders/GaussianSplatPLYLoader.js'
import { SPZLoader } from 'three-r186/addons/loaders/SPZLoader.js'
import { GaussianSplat } from 'three-r186/addons/objects/GaussianSplat.js'
import { applyPadNudge, type PadNudge } from '../../dotpad/padKeys'
import type { SplatFormat, SplatSessionStage, SplatView, Vec3 } from './splatViews'

export type SplatStage = {
  /** Parsed splats stay cached by key, so showing one again skips fetch and parse. */
  show: (
    key: string,
    bytes: () => Promise<ArrayBuffer>,
    format: SplatFormat,
  ) => Promise<{ count: number; radius: number; cached: boolean }>
  has: (key: string) => boolean
  setFlip: (flip: boolean) => void
  fit: () => void
  getView: () => SplatView
  getSession: () => SplatSessionStage
  setView: (view: SplatView) => void
  setFov: (fov: number) => void
  /** JPEG data URL of the next frame, cropped to `crop` (fractions of the canvas), longest side ≤ `maxSide`. */
  capture: (crop?: SplatCrop, maxSide?: number) => Promise<string>
  /** One Dot Pad button move: turn, tilt, or zoom round the target. */
  nudge: (move: PadNudge) => void
  /** Orbit the scene from another element (same camera and target). Returns detach. */
  addControlSurface: (surface: HTMLElement) => () => void
  /** Every `every` frames, hands `onPixels` the `crop` scaled to `columns × rows` RGBA. Returns stop. */
  sample: (crop: SplatCrop, columns: number, rows: number, every: number, onPixels: (rgba: Uint8ClampedArray) => void) => () => void
  dispose: () => void
}

export type SplatCrop = { x: number; y: number; w: number; h: number }

/** Fetch a splat while reporting the downloaded fraction 0–1 (stays 0 without Content-Length). */
export async function fetchSplatBytes(url: string, onFraction: (fraction: number) => void): Promise<ArrayBuffer> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not fetch ${url} (${response.status})`)
  const total = Number(response.headers.get('Content-Length') ?? 0)
  if (!response.body || !total) {
    const buffer = await response.arrayBuffer()
    onFraction(1)
    return buffer
  }
  const out = new Uint8Array(total)
  const reader = response.body.getReader()
  let received = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    out.set(value, received)
    received += value.length
    onFraction(Math.min(received / total, 1))
  }
  return out.buffer
}

function round(value: number): number {
  return Number(value.toFixed(4))
}

export async function createSplatStage(host: HTMLElement, onView: (view: SplatView) => void): Promise<SplatStage> {
  THREE.ColorManagement.workingColorSpace = THREE.SRGBColorSpace
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100)
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x07080f)
  const renderer = new THREE.WebGPURenderer({ forceWebGL: !('gpu' in navigator) })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.domElement.className = 'theme-webgl-toolkit__canvas'
  host.appendChild(renderer.domElement)
  await renderer.init()

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true

  let splats: InstanceType<typeof GaussianSplat> | null = null
  let center = new THREE.Vector3()
  let radius = 1
  let flipped = false

  const resize = () => {
    const width = Math.max(host.clientWidth, 1)
    const height = Math.max(host.clientHeight, 1)
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  resize()

  const getView = (): SplatView => ({
    camera: camera.position.toArray().map(round) as Vec3,
    target: controls.target.toArray().map(round) as Vec3,
    fov: round(camera.fov),
  })

  let lastKey = ''
  let pendingShots: (() => void)[] = []
  const samplers = new Set<() => void>()
  const extraControls = new Set<InstanceType<typeof OrbitControls>>()
  renderer.setAnimationLoop(() => {
    controls.update()
    for (const extra of extraControls) extra.update()
    renderer.render(scene, camera)
    for (const sampler of samplers) sampler()
    if (pendingShots.length) {
      const shots = pendingShots
      pendingShots = []
      for (const shot of shots) shot()
    }
    const view = getView()
    const key = JSON.stringify(view)
    if (key !== lastKey) {
      lastKey = key
      onView(view)
    }
  })

  let source: InstanceType<typeof THREE.BufferGeometry> | null = null
  let wanted = ''
  const cache = new Map<
    string,
    { splat: InstanceType<typeof GaussianSplat>; geometry: InstanceType<typeof THREE.BufferGeometry>; count: number }
  >()

  const measure = () => {
    if (!splats || !source) return
    if (!source.boundingSphere) source.computeBoundingSphere()
    splats.updateWorldMatrix(true, false)
    const sphere = source.boundingSphere.clone().applyMatrix4(splats.matrixWorld)
    center = sphere.center
    radius = Math.max(sphere.radius, 0.01)
  }

  const fit = () => {
    const distance = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov) * 0.5)
    controls.target.copy(center)
    controls.minDistance = radius * 0.001
    controls.maxDistance = radius * 8
    camera.position.set(0, 0.35, 1).normalize().multiplyScalar(distance * 1.15).add(center)
    camera.near = Math.max(distance / 1000, 0.001)
    camera.far = Math.max(distance * 10, 10)
    camera.updateProjectionMatrix()
    controls.update()
  }

  const setView = (view: SplatView) => {
    camera.fov = view.fov
    camera.position.set(...view.camera)
    controls.target.set(...view.target)
    if (camera.position.distanceTo(controls.target) < 1e-6) camera.position.z += Math.max(radius * 0.01, 0.01)
    const distance = camera.position.distanceTo(controls.target)
    controls.minDistance = Math.min(radius * 0.001, distance * 0.5)
    controls.maxDistance = Math.max(radius * 8, distance * 2)
    camera.near = Math.max(Math.min(distance / 100, radius / 1000), 0.001)
    camera.far = Math.max(radius * 10 + distance, 10)
    camera.updateProjectionMatrix()
    controls.update()
  }

  return {
    async show(key, bytes, format) {
      wanted = key
      let item = cache.get(key)
      const cached = Boolean(item)
      if (!item) {
        const buffer = await bytes()
        const geometry =
          format === 'ply' ? new GaussianSplatPLYLoader().parse(buffer) : await new SPZLoader().parse(buffer)
        item = { splat: new GaussianSplat(geometry), geometry, count: geometry.getAttribute('position').count as number }
        cache.set(key, item)
      }
      if (wanted !== key) return { count: item.count, radius, cached }
      if (splats) scene.remove(splats)
      source = item.geometry
      splats = item.splat
      splats.rotation.set(flipped ? Math.PI : 0, 0, 0)
      scene.add(splats)
      measure()
      return { count: item.count, radius, cached }
    },
    has: (key) => cache.has(key),
    setFlip(flip) {
      flipped = flip
      if (!splats) return
      splats.rotation.set(flip ? Math.PI : 0, 0, 0)
      measure()
    },
    fit,
    getView,
    getSession() {
      const r3 = (v: { toArray: () => number[] }) => v.toArray().map(round) as Vec3
      const q4 = (q: { toArray: () => number[] }) => q.toArray().map(round) as [number, number, number, number]
      const offset = camera.position.clone().sub(controls.target)
      const model = splats
      return {
        camera: {
          position: r3(camera.position),
          target: r3(controls.target),
          up: r3(camera.up),
          quaternion: q4(camera.quaternion),
          fov: round(camera.fov),
          near: round(camera.near),
          far: round(camera.far),
          orbit: {
            azimuth: round(controls.getAzimuthalAngle()),
            polar: round(controls.getPolarAngle()),
            radius: round(offset.length()),
          },
        },
        model: model
          ? { position: r3(model.position), rotation: [round(model.rotation.x), round(model.rotation.y), round(model.rotation.z)], quaternion: q4(model.quaternion), scale: r3(model.scale) }
          : { position: [0, 0, 0], rotation: [0, 0, 0], quaternion: [0, 0, 0, 1], scale: [1, 1, 1] },
        bounds: { center: r3(center), radius: round(radius) },
        viewport: { width: host.clientWidth, height: host.clientHeight, pixelRatio: renderer.getPixelRatio() },
        backend: renderer.backend?.isWebGPUBackend ? 'webgpu' : 'webgl2',
      }
    },
    setView,
    setFov(fov) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    },
    capture(crop = { x: 0, y: 0, w: 1, h: 1 }, maxSide = 1024) {
      return new Promise<string>((resolve, reject) => {
        pendingShots.push(() => {
          const source = renderer.domElement
          const sw = source.width * crop.w
          const sh = source.height * crop.h
          const scale = Math.min(1, maxSide / Math.max(sw, sh))
          const out = document.createElement('canvas')
          out.width = Math.max(1, Math.round(sw * scale))
          out.height = Math.max(1, Math.round(sh * scale))
          const ctx = out.getContext('2d')
          if (!ctx) {
            reject(new Error('Could not capture the scene'))
            return
          }
          ctx.drawImage(source, source.width * crop.x, source.height * crop.y, sw, sh, 0, 0, out.width, out.height)
          resolve(out.toDataURL('image/jpeg', 0.9))
        })
      })
    },
    nudge(move) {
      applyPadNudge(camera, controls.target, move, radius * 0.05, radius * 20)
      controls.update()
    },
    addControlSurface(surface) {
      const extra = new OrbitControls(camera, surface)
      extra.target = controls.target
      extra.enableDamping = true
      extra.update()
      extraControls.add(extra)
      return () => {
        extraControls.delete(extra)
        extra.dispose()
      }
    },
    sample(crop, columns, rows, every, onPixels) {
      const out = document.createElement('canvas')
      out.width = columns
      out.height = rows
      const ctx = out.getContext('2d', { willReadFrequently: true })
      let frame = 0
      const sampler = () => {
        frame += 1
        if (!ctx || frame % every) return
        const source = renderer.domElement
        ctx.drawImage(source, source.width * crop.x, source.height * crop.y, source.width * crop.w, source.height * crop.h, 0, 0, columns, rows)
        onPixels(ctx.getImageData(0, 0, columns, rows).data)
      }
      samplers.add(sampler)
      return () => {
        samplers.delete(sampler)
      }
    },
    dispose() {
      samplers.clear()
      for (const extra of extraControls) extra.dispose()
      extraControls.clear()
      renderer.setAnimationLoop(null)
      observer.disconnect()
      controls.dispose()
      for (const item of cache.values()) {
        item.splat.geometry.dispose()
        item.splat.material.dispose()
        item.geometry.dispose()
      }
      cache.clear()
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
