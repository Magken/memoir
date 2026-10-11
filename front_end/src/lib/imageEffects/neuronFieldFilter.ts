/** Canvas neuron-field ASCII filter — ref.image-effect-1 */

export type Rgb = { r: number; g: number; b: number }

export type NeuronFieldPalette = {
  c1: Rgb
  c2: Rgb
  c3: Rgb
  c4: Rgb
  /** Letterbox / canvas clear — fixed dark surround (same in light + dark theme). */
  background: string
}

/** Props exposed on the gallery component — rest use internal defaults. */
export type NeuronFieldPublicParams = {
  dotSize?: number
  neuronIntensity?: number
  morphProgress?: number
  /** Time-based twinkle, color drift, and continuous RAF. false = static field + pointer redraw only. */
  motion?: boolean
}

export type NeuronFieldMouseMode = 'swirl' | 'push' | 'morph' | 'neuron'

type NeuronFieldInternalParams = {
  gapX: number
  gapY: number
  charset: string
  fitMode: 'contain' | 'cover' | 'stretch'
  zoom: number
  panX: number
  panY: number
  morphStrength: number
  morphScale: number
  morphFeather: number
  threshold: number
  dither: number
  contrast: number
  gamma: number
  brightness: number
  saturation: number
  colorMode: 'original' | 'remap' | 'blend'
  mix: number
  neuronOn: boolean
  speed: number
  spark: number
  colorAnimOn: boolean
  colorAmt: number
  colorSpd: number
  colorScale: number
  colorAnimMode: 'hue' | 'duotone'
  mouseOn: boolean
  mouseMode: NeuronFieldMouseMode
  mouseRadius: number
  mouseStrength: number
  mouseSmooth: number
}

export const NEURON_FIELD_DEFAULT_PUBLIC: Required<
  Pick<NeuronFieldPublicParams, 'dotSize' | 'neuronIntensity' | 'morphProgress' | 'motion'>
> = {
  dotSize: 4,
  neuronIntensity: 0.55,
  morphProgress: 0,
  motion: true,
}

const INTERNAL_DEFAULTS: NeuronFieldInternalParams = {
  gapX: 2,
  gapY: 2,
  charset: '⬤',
  fitMode: 'contain',
  zoom: 1,
  panX: 0,
  panY: 0,
  morphStrength: 0.85,
  morphScale: 0.12,
  morphFeather: 0.12,
  threshold: 128,
  dither: 0.45,
  contrast: 1.1,
  gamma: 1,
  brightness: 1,
  saturation: 1,
  colorMode: 'blend',
  mix: 0.55,
  neuronOn: true,
  speed: 1,
  spark: 0.006,
  colorAnimOn: true,
  colorAmt: 0.25,
  colorSpd: 0.9,
  colorScale: 0.12,
  colorAnimMode: 'hue',
  mouseOn: true,
  mouseMode: 'neuron',
  mouseRadius: 220,
  mouseStrength: 0.85,
  mouseSmooth: 0.1,
}

const MOUSE_FALLOFF_POWER = 4.2
const MOUSE_GAIN = 2.6
const PRESSURE_BOOST = 1.75
const MORPH_BRUSH_GAIN = 1.35
const NEURON_BOOST_GAIN = 0.95

const bayer4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => (v + 0.5) / 16))

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const clamp01 = (v: number) => clamp(v, 0, 1)

function cssColorToRgb(color: string): Rgb | null {
  const probe = document.createElement('canvas')
  probe.width = probe.height = 1
  const ctx = probe.getContext('2d')
  if (!ctx || !color.trim()) return null
  ctx.fillStyle = color.trim()
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return { r, g, b }
}

const REF_PERIWINKLE: Rgb = { r: 154, g: 167, b: 255 }
const REF_CANVAS_DARK: Rgb = { r: 11, g: 12, b: 16 }

/** One palette for all themes — ref.image-effect-1 dark look; accent from theme picker. */
export function readNeuronFieldPalette(themeEl: Element | null): NeuronFieldPalette {
  const root = themeEl ?? document.documentElement
  const styles = getComputedStyle(root)
  const accent = styles.getPropertyValue('--theme-accent').trim()
  const accentRgb = cssColorToRgb(accent) ?? { r: 58, g: 77, b: 216 }
  const insetRgb = mixRgb(REF_CANVAS_DARK, accentRgb, 0.1)

  const c4 = mixRgb(REF_CANVAS_DARK, insetRgb, 0.35)
  const c3 = accentRgb
  const c2 = REF_PERIWINKLE
  const c1 = mixRgb(c4, c2, 0.82)

  return {
    c1,
    c2,
    c3,
    c4,
    background: rgbToFill(c4),
  }
}

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  }
}

function rgbToFill({ r, g, b }: Rgb) {
  return `rgb(${r | 0},${g | 0},${b | 0})`
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  const d = max - min
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    switch (max) {
      case r:
        h = ((g - b) / d) % 6
        break
      case g:
        h = (b - r) / d + 2
        break
      default:
        h = (r - g) / d + 4
        break
    }
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s, l }
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  h = ((h % 360) + 360) % 360
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let rp = 0
  let gp = 0
  let bp = 0
  if (h < 60) {
    rp = c
    gp = x
  } else if (h < 120) {
    rp = x
    gp = c
  } else if (h < 180) {
    gp = c
    bp = x
  } else if (h < 240) {
    gp = x
    bp = c
  } else if (h < 300) {
    rp = x
    bp = c
  } else {
    rp = c
    bp = x
  }
  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  }
}

function luminance(r: number, g: number, b: number) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

function applyContrast(x: number, c: number) {
  return clamp01((x - 0.5) * c + 0.5)
}

function applyGamma(x: number, g: number) {
  return clamp01(x ** (1 / g))
}

function hash2(i: number, j: number) {
  let x = i * 374761393 + j * 668265263
  x = (x ^ (x >> 13)) * 1274126177
  x = (x ^ (x >> 16)) >>> 0
  return x / 4294967295
}

function valueNoise(x: number, y: number) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const a = hash2(xi, yi)
  const b = hash2(xi + 1, yi)
  const c = hash2(xi, yi + 1)
  const d = hash2(xi + 1, yi + 1)
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const ab = a + (b - a) * u
  const cd = c + (d - c) * u
  return ab + (cd - ab) * v
}

function fbm(x: number, y: number) {
  let v = 0
  let a = 0.55
  let fx = x
  let fy = y
  for (let i = 0; i < 4; i++) {
    v += a * valueNoise(fx, fy)
    fx *= 2.02
    fy *= 2.02
    a *= 0.55
  }
  return v
}

function curl(x: number, y: number) {
  const e = 0.35
  const n1 = fbm(x, y + e)
  const n2 = fbm(x, y - e)
  const a = (n1 - n2) / (2 * e)
  const n3 = fbm(x + e, y)
  const n4 = fbm(x - e, y)
  const b = (n3 - n4) / (2 * e)
  return { vx: a, vy: -b }
}

function sampleRGB(data: Uint8ClampedArray, W: number, H: number, sx: number, sy: number): Rgb {
  const x = Math.max(0, Math.min(W - 1, sx | 0))
  const y = Math.max(0, Math.min(H - 1, sy | 0))
  const i = (y * W + x) * 4
  return { r: data[i], g: data[i + 1], b: data[i + 2] }
}

function loadImageBitmap(src: string) {
  return fetch(src, { mode: 'cors', cache: 'force-cache' })
    .then((resp) => {
      if (!resp.ok) throw new Error(`HTTP ${resp.status} loading ${src}`)
      return resp.blob()
    })
    .then((blob) => createImageBitmap(blob))
}

export class NeuronFieldFilterEngine {
  private readonly canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D | null = null
  private readonly srcCanvasA = document.createElement('canvas')
  private readonly srcCanvasB = document.createElement('canvas')
  private readonly srcCtxA = this.srcCanvasA.getContext('2d', { willReadFrequently: true })
  private readonly srcCtxB = this.srcCanvasB.getContext('2d', { willReadFrequently: true })
  private bmpA: ImageBitmap | null = null
  private bmpB: ImageBitmap | null = null
  private readonly bitmapCache = new Map<string, ImageBitmap>()
  private readonly t0 = performance.now()
  private rafId: number | null = null
  private ro: ResizeObserver | null = null
  private destroyed = false
  private reducedMotion = false
  private themeEl: Element | null = null
  private publicParams = { ...NEURON_FIELD_DEFAULT_PUBLIC }
  private internal: NeuronFieldInternalParams = { ...INTERNAL_DEFAULTS }
  private palette: NeuronFieldPalette = readNeuronFieldPalette(null)
  private readonly mouse = { x: 0, y: 0, tx: 0, ty: 0, down: false, inside: false }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
  }

  setThemeRoot(el: Element | null) {
    this.themeEl = el
    this.palette = readNeuronFieldPalette(el)
  }

  setPublicParams(params: NeuronFieldPublicParams) {
    const wasMotion = this.isMotionEnabled()
    this.publicParams = { ...this.publicParams, ...params }
    if (!this.ctx) return
    const nowMotion = this.isMotionEnabled()
    if (wasMotion && !nowMotion && this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    } else if (!wasMotion && nowMotion) {
      this.loop()
      return
    }
    if (!nowMotion) this.renderStatic()
  }

  private isMotionEnabled() {
    if (this.reducedMotion) return false
    return this.publicParams.motion !== false
  }

  private renderStatic() {
    this.render(performance.now())
  }

  async preloadImages(urls: readonly string[]) {
    await Promise.all(
      urls.map(async (url) => {
        if (this.bitmapCache.has(url)) return
        this.bitmapCache.set(url, await loadImageBitmap(url))
      }),
    )
  }

  setSlidePair(imageA: string, imageB: string) {
    this.bmpA = this.bitmapCache.get(imageA) ?? null
    this.bmpB = this.bitmapCache.get(imageB) ?? null
  }

  setSlide(imageUrl: string) {
    const bmp = this.bitmapCache.get(imageUrl)
    if (!bmp) return
    this.bmpA = bmp
    this.bmpB = bmp
  }

  async setImageUrls(imageA: string, imageB: string) {
    await this.preloadImages([imageA, imageB])
    this.setSlidePair(imageA, imageB)
  }

  init() {
    const ctx = this.canvas.getContext('2d', { alpha: false })
    if (!ctx || !this.srcCtxA || !this.srcCtxB) throw new Error('Canvas 2D not supported')
    this.ctx = ctx
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    this.ro = new ResizeObserver(() => {
      this.fitCanvas()
      if (!this.isMotionEnabled()) this.renderStatic()
    })
    this.ro.observe(this.canvas)

    this.canvas.addEventListener('pointerdown', this.onPointerDown)
    this.canvas.addEventListener('pointerup', this.onPointerUp)
    this.canvas.addEventListener('pointerenter', this.onPointerEnter)
    this.canvas.addEventListener('pointerleave', this.onPointerLeave)
    this.canvas.addEventListener('pointermove', this.onPointerMove)

    this.fitCanvas()
    this.loop()
  }

  private onPointerDown = (e: PointerEvent) => {
    this.mouse.down = true
    this.mouse.inside = true
    this.canvas.setPointerCapture?.(e.pointerId)
    this.updateMouseFromEvent(e)
    if (!this.isMotionEnabled()) this.renderStatic()
  }

  private onPointerUp = () => {
    this.mouse.down = false
    if (!this.isMotionEnabled()) this.renderStatic()
  }

  private onPointerEnter = () => {
    this.mouse.inside = true
  }

  private onPointerLeave = () => {
    this.mouse.inside = false
    this.mouse.down = false
    if (!this.isMotionEnabled()) this.renderStatic()
  }

  private onPointerMove = (e: PointerEvent) => {
    this.updateMouseFromEvent(e)
    if (!this.isMotionEnabled()) this.renderStatic()
  }

  private updateMouseFromEvent(e: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect()
    this.mouse.tx = e.clientX - rect.left
    this.mouse.ty = e.clientY - rect.top
  }

  private fitCanvas() {
    const ctx = this.ctx
    if (!ctx) return { w: 0, h: 0 }
    const rect = this.canvas.getBoundingClientRect()
    const dpr = Math.max(1, window.devicePixelRatio || 1)
    const w = Math.floor(rect.width * dpr)
    const h = Math.floor(rect.height * dpr)
    const resized = this.canvas.width !== w || this.canvas.height !== h
    if (resized) {
      this.canvas.width = w
      this.canvas.height = h
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    return { w: rect.width, h: rect.height }
  }

  private drawBitmapInto(
    ctx2d: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    bmp: ImageBitmap | null,
    w: number,
    h: number,
  ) {
    canvas.width = w
    canvas.height = h
    ctx2d.clearRect(0, 0, w, h)
    if (!bmp) return ctx2d.getImageData(0, 0, w, h)

    const iw = bmp.width
    const ih = bmp.height
    const { fitMode, zoom, panX, panY } = this.internal
    const scaleX = w / iw
    const scaleY = h / ih

    if (fitMode === 'stretch') {
      const dw = iw * scaleX * zoom
      const dh = ih * scaleY * zoom
      const extraX = Math.max(0, dw - w)
      const extraY = Math.max(0, dh - h)
      const dx = (w - dw) / 2 - (panX * extraX) / 2
      const dy = (h - dh) / 2 - (panY * extraY) / 2
      ctx2d.drawImage(bmp, dx, dy, dw, dh)
      return ctx2d.getImageData(0, 0, w, h)
    }

    const base = fitMode === 'cover' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY)
    const scale = base * zoom
    const dw = iw * scale
    const dh = ih * scale
    const extraX = Math.max(0, dw - w)
    const extraY = Math.max(0, dh - h)
    const dx = (w - dw) / 2 - (panX * extraX) / 2
    const dy = (h - dh) / 2 - (panY * extraY) / 2
    ctx2d.drawImage(bmp, dx, dy, dw, dh)
    return ctx2d.getImageData(0, 0, w, h)
  }

  private applyBrightnessSaturation(r: number, g: number, b: number) {
    const bright = this.internal.brightness
    const sat = this.internal.saturation
    r = clamp(r * bright, 0, 255)
    g = clamp(g * bright, 0, 255)
    b = clamp(b * bright, 0, 255)
    const hsl = rgbToHsl(r, g, b)
    hsl.s = clamp01(hsl.s * sat)
    return hslToRgb(hsl.h, hsl.s, hsl.l)
  }

  private applyColorAnimation(col: Rgb, gx: number, gy: number, time: number): Rgb {
    if (!this.internal.colorAnimOn) return col
    const { colorAmt, colorSpd, colorScale, colorAnimMode } = this.internal
    const drift =
      valueNoise(gx * colorScale + time * 0.45 * colorSpd, gy * colorScale + time * 0.22 * colorSpd) *
        0.65 +
      valueNoise(
        gx * colorScale * 0.6 - time * 0.31 * colorSpd,
        gy * colorScale * 0.6 + time * 0.36 * colorSpd,
      ) *
        0.35
    const d = drift * 2 - 1

    if (colorAnimMode === 'duotone') {
      const duo = mixRgb(this.palette.c2, this.palette.c3, clamp01(0.5 + d * 0.5))
      return mixRgb(col, duo, colorAmt * 0.6)
    }

    const hsl = rgbToHsl(col.r, col.g, col.b)
    const hueShift = d * 35 * colorAmt
    const satBoost = 1 + 0.15 * colorAmt * Math.abs(d)
    const rgb = hslToRgb(hsl.h + hueShift, clamp01(hsl.s * satBoost), hsl.l)
    return mixRgb(col, rgb, colorAmt)
  }

  private loop = () => {
    if (this.destroyed) return
    this.render(performance.now())
    if (this.isMotionEnabled()) {
      this.rafId = requestAnimationFrame(this.loop)
    } else {
      this.rafId = null
    }
  }

  private render(now: number) {
    const ctx = this.ctx
    if (!ctx) return

    this.palette = readNeuronFieldPalette(this.themeEl)
    const { w, h } = this.fitCanvas()
    const W = w | 0
    const H = h | 0

    const sm = this.internal.mouseSmooth
    this.mouse.x += (this.mouse.tx - this.mouse.x) * (1 - sm)
    this.mouse.y += (this.mouse.ty - this.mouse.y) * (1 - sm)

    ctx.fillStyle = this.palette.background
    ctx.fillRect(0, 0, W, H)

    if (!this.bmpA && !this.bmpB) return

    const srcA = this.bmpA ?? this.bmpB
    const srcB = this.bmpB ?? this.bmpA
    if (!srcA || !srcB || !this.srcCtxA || !this.srcCtxB) return

    const idA = this.drawBitmapInto(this.srcCtxA, this.srcCanvasA, srcA, W, H)
    const idB = this.drawBitmapInto(this.srcCtxB, this.srcCanvasB, srcB, W, H)
    const A = idA.data
    const B = idB.data

    const targetDot = this.publicParams.dotSize
    const { gapX, gapY } = this.internal
    const cellX = Math.max(1, targetDot + gapX)
    const cellY = Math.max(1, targetDot + gapY)

    const threshold = this.internal.threshold / 255
    const ditherStrength = this.internal.dither
    const { contrast, gamma, charset, colorMode, mix: mixAmt, neuronOn, speed, spark } =
      this.internal
    const neuronIntensityBase = this.publicParams.neuronIntensity
    const motion = this.isMotionEnabled()
    const time = motion ? (now - this.t0) * 0.001 * speed : 0

    const cols = [this.palette.c1, this.palette.c2, this.palette.c3, this.palette.c4]
    const p = clamp01(this.publicParams.morphProgress)
    const { morphStrength: flowStrength, morphScale: flowScale, morphFeather: feather } =
      this.internal
    const { mouseOn, mouseMode, mouseRadius, mouseStrength } = this.internal

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `${targetDot}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`

    const warpMagBase = flowStrength * (10 + targetDot * 0.9)
    const glyphSet = charset.length ? charset : '⬤'

    for (let y = 0, gy = 0; y < H; y += cellY, gy++) {
      for (let x = 0, gx = 0; x < W; x += cellX, gx++) {
        const warpMag = warpMagBase

        const j = hash2(gx * 991, gy * 997) - 0.5
        const j2 = hash2(gx * 233, gy * 239) - 0.5
        const sx = Math.min(W - 1, x + cellX * 0.5 + j * 0.85)
        const sy = Math.min(H - 1, y + cellY * 0.5 + j2 * 0.85)

        let mxVx = 0
        let mxVy = 0
        let localMorphPush = 0
        let neuronBoost = 0

        if (mouseOn && this.mouse.inside) {
          const dx = sx - this.mouse.x
          const dy = sy - this.mouse.y
          const dist = Math.sqrt(dx * dx + dy * dy) + 1e-6
          const n = clamp01(1 - dist / mouseRadius)
          const wgt = n ** MOUSE_FALLOFF_POWER
          const pressure = this.mouse.down ? PRESSURE_BOOST : 1
          const w2 = wgt * (mouseStrength * MOUSE_GAIN) * pressure

          if (wgt > 0) {
            const nx = dx / dist
            const ny = dy / dist
            if (mouseMode === 'push') {
              mxVx += nx * w2
              mxVy += ny * w2
            } else if (mouseMode === 'swirl') {
              mxVx += -ny * w2
              mxVy += nx * w2
            } else if (mouseMode === 'morph' && this.mouse.down) {
              localMorphPush = w2 * MORPH_BRUSH_GAIN
            } else if (mouseMode === 'neuron') {
              neuronBoost = w2 * NEURON_BOOST_GAIN
            }
          }
        }

        const fx = sx * flowScale + time * 0.18
        const fy = sy * flowScale - time * 0.14
        const f = curl(fx, fy)
        let vx = f.vx + mxVx * 0.12
        let vy = f.vy + mxVy * 0.12

        const pLocal = clamp01(p + localMorphPush * 0.08)
        const ax = sx + vx * warpMag * pLocal
        const ay = sy + vy * warpMag * pLocal
        const bx = sx - vx * warpMag * (1 - pLocal)
        const by = sy - vy * warpMag * (1 - pLocal)

        const field = fbm(sx * flowScale * 0.9 + time * 0.1, sy * flowScale * 0.9 - time * 0.08)
        const m =
          feather <= 0.0001
            ? field < pLocal
              ? 1
              : 0
            : (() => {
                const t = clamp01((field - (pLocal - feather)) / (2 * feather))
                return t * t * (3 - 2 * t)
              })()

        const rnd = hash2(gx * 131 + ((time * 20) | 0), gy * 137 + ((time * 17) | 0))
        const pickB = rnd < m
        const rgb = pickB ? sampleRGB(B, W, H, bx, by) : sampleRGB(A, W, H, ax, ay)

        let { r, g, b } = this.applyBrightnessSaturation(rgb.r, rgb.g, rgb.b)
        let L = luminance(r, g, b)
        L = applyContrast(L, contrast)
        L = applyGamma(L, gamma)

        const bx4 = gx % 4
        const by4 = gy % 4
        L = clamp01(L + (bayer4[by4][bx4] - 0.5) * (0.35 * ditherStrength))
        const bias = (L - threshold) * 0.9
        let Lb = clamp01(L + bias)

        let act = 0
        let jitterX = 0
        let jitterY = 0
        const neuronIntensity = clamp01(neuronIntensityBase + neuronBoost)

        if (neuronOn && motion) {
          const nA = valueNoise(gx * 0.1 + time * 0.55, gy * 0.1 + time * 0.28)
          const nB = valueNoise(gx * 0.06 - time * 0.35, gy * 0.06 + time * 0.47)
          const raw = nA * 0.65 + nB * 0.35
          const t = clamp01((raw - 0.62) / (0.93 - 0.62))
          act = t * t * (3 - 2 * t) * neuronIntensity
          const rr = hash2(gx * 7 + ((time * 12) | 0), gy * 11)
          if (rr < spark) act = Math.max(act, 0.95 * neuronIntensity)
          jitterX = (nB - 0.5) * 0.95 * neuronIntensity
          jitterY = (nA - 0.5) * 0.95 * neuronIntensity
          Lb = clamp01(Lb + act * 0.12)
        }

        let ci = Math.round((1 - Lb) * (glyphSet.length - 1))
        ci = clamp(ci, 0, glyphSet.length - 1)
        let ch = glyphSet[ci]

        if (neuronOn && motion && act > 0.35) {
          const neuronGlyphs = ' ·•oO@'
          const pick = Math.min(neuronGlyphs.length - 1, Math.floor(act * 2.2))
          ch = neuronGlyphs[pick] ?? ch
        }

        const orig = { r, g, b }
        const lvl = Lb >= 0.75 ? 0 : Lb >= 0.5 ? 1 : Lb >= 0.25 ? 2 : 3
        const remap = cols[lvl]
        let col = orig
        if (colorMode === 'remap') col = remap
        else if (colorMode === 'blend') col = mixRgb(orig, remap, mixAmt)
        if (neuronOn && motion && act > 0) col = mixRgb(col, { r: 255, g: 255, b: 255 }, clamp01(act * 0.18))
        if (motion) col = this.applyColorAnimation(col, gx, gy, time)

        ctx.fillStyle = rgbToFill(col)
        ctx.fillText(ch, x + cellX / 2 + jitterX, y + cellY / 2 + jitterY)
      }
    }
  }

  destroy() {
    this.destroyed = true
    if (this.rafId !== null) cancelAnimationFrame(this.rafId)
    this.ro?.disconnect()
    this.canvas.removeEventListener('pointerdown', this.onPointerDown)
    this.canvas.removeEventListener('pointerup', this.onPointerUp)
    this.canvas.removeEventListener('pointerenter', this.onPointerEnter)
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave)
    this.canvas.removeEventListener('pointermove', this.onPointerMove)
    this.bmpA = null
    this.bmpB = null
    for (const bmp of this.bitmapCache.values()) {
      bmp.close?.()
    }
    this.bitmapCache.clear()
  }
}
