import {
  WEBGPU_CAROUSEL_GAP_PX,
  WEBGPU_CAROUSEL_LERP,
  WEBGPU_CAROUSEL_PARALLAX_X,
  WEBGPU_CAROUSEL_PARALLAX_Y,
  WEBGPU_CAROUSEL_WHEEL_SCALE,
} from './constants'

export type WebGpuCarouselScrollState = {
  scrollX: number
  targetScrollX: number
}

export class WebGpuGalleryCarousel {
  private rootEl: HTMLElement
  private host: HTMLElement
  private slots: HTMLElement[]
  scrollX = 0
  targetScrollX = 0
  cellW = 0
  stepX = 0
  periodX = 0
  velocity = 0
  private slotRelX: number[] = []

  constructor(rootEl: HTMLElement, host: HTMLElement) {
    this.rootEl = rootEl
    this.host = host
    this.slots = Array.from(rootEl.querySelectorAll<HTMLElement>('.theme-webgpu-transition-gallery__slot'))
    this.onWheel = this.onWheel.bind(this)
  }

  prepare() {
    this.measure()
    void this.slots[0]?.offsetHeight
    this.applyTransforms()
  }

  start() {
    this.prepare()
    this.host.addEventListener('wheel', this.onWheel, { capture: true, passive: false })
  }

  stop() {
    this.host.removeEventListener('wheel', this.onWheel, { capture: true })
  }

  measure() {
    this.cellW = this.slots[0]?.offsetWidth ?? 0
    this.stepX = this.cellW + WEBGPU_CAROUSEL_GAP_PX
    this.periodX = this.slots.length * this.stepX
  }

  getHalfPeriod() {
    return this.periodX / 2
  }

  getSlotRelX(index: number) {
    return this.slotRelX[index] ?? 0
  }

  exportScroll(): WebGpuCarouselScrollState {
    return { scrollX: this.scrollX, targetScrollX: this.targetScrollX }
  }

  restoreScroll(state: WebGpuCarouselScrollState) {
    this.scrollX = state.scrollX
    this.targetScrollX = state.targetScrollX
  }

  getCellWidth() {
    return this.cellW
  }

  onWheel(e: WheelEvent) {
    e.preventDefault()
    e.stopImmediatePropagation()
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
    this.targetScrollX += delta * WEBGPU_CAROUSEL_WHEEL_SCALE
  }

  applyTransforms() {
    if (this.cellW <= 0 || this.periodX <= 0) return

    const vw = this.rootEl.clientWidth
    const vh = this.rootEl.clientHeight
    const half = this.periodX / 2
    const c = Math.floor(this.slots.length / 2)

    for (let i = 0; i < this.slots.length; i += 1) {
      let relX = (i - c) * this.stepX - this.scrollX
      relX = ((relX % this.periodX) + this.periodX) % this.periodX
      if (relX >= half) relX -= this.periodX
      this.slotRelX[i] = relX

      const cellH = this.slots[i]!.offsetHeight
      const x = vw / 2 + relX - this.cellW / 2
      const y = vh / 2 - cellH / 2
      const norm = relX / Math.max(half, 1)
      const driftY = norm * WEBGPU_CAROUSEL_PARALLAX_Y
      const driftX = norm * WEBGPU_CAROUSEL_PARALLAX_X
      const depthScale = 1 - Math.min(Math.abs(norm), 1) * 0.035

      this.slots[i]!.style.transform = `translate(${x + driftX}px, ${y + driftY}px) scale(${depthScale})`
    }
  }

  tick() {
    const prev = this.scrollX
    this.scrollX += (this.targetScrollX - this.scrollX) * WEBGPU_CAROUSEL_LERP
    this.velocity = this.scrollX - prev
    this.applyTransforms()
  }
}
