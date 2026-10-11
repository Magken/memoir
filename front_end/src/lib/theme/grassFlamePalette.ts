/**
 * Grass flame palette — extract warm bands from Creation-of-Adam reference frames
 * (GENERAL + GRAS wordmark stills). Pure RGB in → hex out; no image decode here.
 *
 * Band intent (dark → light):
 *   dirty → ember → flame → gold → bright → specular
 * plus optional cyan scatter sparks.
 */

export type Rgb = { r: number; g: number; b: number }

export type GrassFlamePalette = {
  /** Deep dirty orange / near-black amber (hand recesses). */
  dirty: string
  /** Burnt ember mid-shadow. */
  ember: string
  /** Saturated flame orange (hand body). */
  flame: string
  /** Darker gold / amber ridge. */
  gold: string
  /** Bright golden yellow (fingertips / letter rim). */
  bright: string
  /** Pale glassy specular (oil highlight). */
  specular: string
  /** Cool spark accent between fingertips. */
  cyan: string
}

/** Combined pick from GENERAL + GRAS stills (lum-sorted warm body + hot ridges). */
export const GRASS_FLAME_FROM_REFS: GrassFlamePalette = {
  dirty: '#4A1F00',
  ember: '#553001',
  flame: '#B86A08',
  gold: '#E29D0E',
  bright: '#FFC400',
  specular: '#FFF0B3',
  cyan: '#3AB1DC',
}

export function clampByte(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(255, Math.max(0, Math.round(n)))
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const h = (n: number) => clampByte(n).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase()
}

export function hexToRgb(hex: string): Rgb | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!m) return null
  const n = Number.parseInt(m[1], 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function luminance({ r, g, b }: Rgb): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Warm orange/gold: red-led, blue subdued (matches SSS thickness + lamp family). */
export function isWarmFlamePixel(p: Rgb): boolean {
  return p.r > 40 && p.r >= p.g * 0.85 && p.b < p.r * 0.7 && luminance(p) > 35
}

export function isSpecularPixel(p: Rgb): boolean {
  return luminance(p) > 160 && p.r > 180 && p.g > 140
}

export function isCyanSparkPixel(p: Rgb): boolean {
  return p.b > 140 && p.b > p.r + 20 && p.b > p.g
}

function percentile(sorted: Rgb[], t: number): Rgb {
  if (sorted.length === 0) return { r: 0, g: 0, b: 0 }
  const i = Math.min(sorted.length - 1, Math.max(0, Math.floor(t * (sorted.length - 1))))
  return sorted[i]!
}

function medianChannel(arr: Rgb[]): Rgb {
  if (arr.length === 0) return { r: 0, g: 0, b: 0 }
  const rs = [...arr.map((p) => p.r)].sort((a, b) => a - b)
  const gs = [...arr.map((p) => p.g)].sort((a, b) => a - b)
  const bs = [...arr.map((p) => p.b)].sort((a, b) => a - b)
  const m = Math.floor(arr.length / 2)
  return { r: rs[m]!, g: gs[m]!, b: bs[m]! }
}

/**
 * Sort warm body pixels by luminance and pick flame stops.
 * Specular / cyan come from dedicated filters (glassy flecks + cool sparks).
 */
export function extractGrassFlamePalette(pixels: readonly Rgb[]): GrassFlamePalette {
  const body = pixels.filter(isWarmFlamePixel).sort((a, b) => luminance(a) - luminance(b))
  if (body.length < 8) {
    return { ...GRASS_FLAME_FROM_REFS }
  }

  const hot = body.filter((p) => luminance(p) > 90)
  const spec = pixels.filter(isSpecularPixel)
  const cyan = pixels.filter(isCyanSparkPixel)

  const flameSrc = hot.length >= 8 ? hot : body
  const flameSorted = [...flameSrc].sort((a, b) => luminance(a) - luminance(b))

  return {
    dirty: rgbToHex(percentile(body, 0.08)),
    ember: rgbToHex(percentile(body, 0.22)),
    flame: rgbToHex(percentile(flameSorted, 0.45)),
    gold: rgbToHex(percentile(flameSorted, 0.72)),
    bright: rgbToHex(percentile(flameSorted, 0.92)),
    specular: rgbToHex(spec.length ? medianChannel(spec) : percentile(body, 0.97)),
    cyan: rgbToHex(cyan.length ? medianChannel(cyan) : hexToRgb(GRASS_FLAME_FROM_REFS.cyan)!),
  }
}
