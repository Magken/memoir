import type { WebGpuGalleryEngine } from './gpuEngine'
import type { WebGpuRect } from './types'

const BASE_HEIGHT_VH = 0.22
const VIEWPORT_PADDING = 0.3
const FOCAL_LENGTH = 600
const Z_SPREAD = 350
const NEAR_CLIP = 50
const DRAG_SENSITIVITY = 0.003
const MOMENTUM_DECAY = 0.95
const MOMENTUM_MIN = 0.00005

function seededRandom(seed: number) {
  let t = (seed + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export class WebGpuIndexFloat {
  private gpu: WebGpuGalleryEngine
  private host: HTMLElement
  worldPositions: { x: number; y: number; z: number }[] = []
  baseSizes: { w: number; h: number }[] = []
  targets: WebGpuRect[] = []
  rotX = 0
  rotY = 0
  velX = 0
  velY = 0
  isDragging = false
  private lastX = 0
  private lastY = 0
  private running = false

  constructor(gpu: WebGpuGalleryEngine, host: HTMLElement) {
    this.gpu = gpu
    this.host = host
    this.onDown = this.onDown.bind(this)
    this.onMove = this.onMove.bind(this)
    this.onUp = this.onUp.bind(this)
  }

  prepare() {
    this.computeLayout()
    this.targets = this.project()
  }

  computeLayout() {
    const vw = Math.max(1, this.host.clientWidth)
    const vh = Math.max(1, this.host.clientHeight)
    this.worldPositions = []
    this.baseSizes = []
    for (let i = 0; i < this.gpu.planes.length; i += 1) {
      const plane = this.gpu.planes[i]!
      if (plane.kind !== 'main') continue
      const aspect = this.gpu.aspects[plane.image] ?? 4 / 5
      const zNorm = seededRandom(i * 31 + 7)
      const zWorld = (zNorm - 0.5) * 2 * Z_SPREAD
      const baseH = vh * BASE_HEIGHT_VH
      const baseW = baseH * aspect
      const xRange = vw * (1 - 2 * VIEWPORT_PADDING)
      const yRange = vh * (1 - 2 * VIEWPORT_PADDING)
      const xWorld = -xRange / 2 + seededRandom(i * 17 + 3) * xRange
      const yWorld = -yRange / 2 + seededRandom(i * 23 + 11) * yRange
      this.worldPositions[i] = { x: xWorld, y: yWorld, z: zWorld }
      this.baseSizes[i] = { w: baseW, h: baseH }
    }
  }

  private project() {
    const hostRect = this.host.getBoundingClientRect()
    const vw = hostRect.width
    const vh = hostRect.height
    const cosX = Math.cos(this.rotX)
    const sinX = Math.sin(this.rotX)
    const cosY = Math.cos(this.rotY)
    const sinY = Math.sin(this.rotY)
    const rects: WebGpuRect[] = []
    for (let i = 0; i < this.gpu.planes.length; i += 1) {
      const pos = this.worldPositions[i]
      const size = this.baseSizes[i]
      if (!pos || !size) continue

      const rx = pos.x * cosY + pos.z * sinY
      let ry = pos.y
      let rz = -pos.x * sinY + pos.z * cosY
      const ry2 = ry * cosX - rz * sinX
      const rz2 = ry * sinX + rz * cosX
      ry = ry2
      rz = rz2

      const depth = FOCAL_LENGTH + rz
      if (depth < NEAR_CLIP) {
        rects[i] = { x: -9999, y: -9999, w: 0, h: 0, z: rz }
        continue
      }

      const f = FOCAL_LENGTH / depth
      const w = size.w * f
      const h = size.h * f
      const cx = rx * f + vw / 2 + hostRect.left
      const cy = ry * f + vh / 2 + hostRect.top
      rects[i] = { x: cx - w / 2, y: cy - h / 2, w, h, z: rz }
    }
    return rects
  }

  applyProjection() {
    const rects = this.project()
    for (let i = 0; i < this.gpu.planes.length; i += 1) {
      const r = rects[i]
      if (!r) continue
      const plane = this.gpu.planes[i]!
      plane.bounds.x = r.x
      plane.bounds.y = r.y
      plane.bounds.w = r.w
      plane.bounds.h = r.h
      plane.bounds.z = r.z
    }
  }

  start() {
    this.running = true
    this.applyProjection()
    this.host.addEventListener('pointerdown', this.onDown)
    window.addEventListener('pointermove', this.onMove)
    window.addEventListener('pointerup', this.onUp)
  }

  stop() {
    this.running = false
    this.host.removeEventListener('pointerdown', this.onDown)
    window.removeEventListener('pointermove', this.onMove)
    window.removeEventListener('pointerup', this.onUp)
    this.isDragging = false
    this.velX = 0
    this.velY = 0
  }

  measure() {
    this.rotX = 0
    this.rotY = 0
    this.velX = 0
    this.velY = 0
    this.computeLayout()
    this.targets = this.project()
    this.applyProjection()
  }

  getTargets() {
    return this.targets
  }

  tick() {
    if (!this.running) return
    if (this.isDragging) return
    if (Math.abs(this.velX) < MOMENTUM_MIN && Math.abs(this.velY) < MOMENTUM_MIN) {
      this.velX = 0
      this.velY = 0
      return
    }
    this.rotX += this.velX
    this.rotY += this.velY
    this.velX *= MOMENTUM_DECAY
    this.velY *= MOMENTUM_DECAY
    this.applyProjection()
  }

  private onDown(e: PointerEvent) {
    if ((e.target as HTMLElement | null)?.closest?.('a,button')) return
    this.isDragging = true
    this.lastX = e.clientX
    this.lastY = e.clientY
    this.velX = 0
    this.velY = 0
  }

  private onMove(e: PointerEvent) {
    if (!this.isDragging) return
    const dx = e.clientX - this.lastX
    const dy = e.clientY - this.lastY
    this.lastX = e.clientX
    this.lastY = e.clientY
    this.rotY += dx * DRAG_SENSITIVITY
    this.rotX += dy * DRAG_SENSITIVITY
    this.velY = dx * DRAG_SENSITIVITY
    this.velX = dy * DRAG_SENSITIVITY
    this.applyProjection()
  }

  private onUp() {
    this.isDragging = false
  }
}
