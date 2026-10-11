/** Vertical Megrim GRAS wordmark — ceramic glyphs plus one cursor lamp. */

export const GRAS_LETTERS = ['G', 'R', 'A', 'S'] as const

export const GRAS_TYPEFACE_URL = '/fonts/megrim.typeface.json'

/** Same hex as Creation of Adam object / cage lamps. */
export const GRAS_OBJECT_COLOR = '#f2c48a'

/** Viewer Intensity slider max. */
export const GRAS_LIGHT_GAIN_MAX = 2

/** Cap height of each Megrim letter, metres. */
export const GRAS_LETTER_SIZE = 0.42

/** Gap between stacked letters, metres. */
export const GRAS_LETTER_GAP = 0.1

/** Extrude depth, metres. */
export const GRAS_LETTER_DEPTH = 0.08

/**
 * One hover lamp over the letters — same power as Adam’s cursor lamp
 * (`WIRE_LIGHT_HOVER_INTENSITY`) at scale 1. Glyphs receive light; they do not emit it.
 * PointLight `distance` is world metres and does not follow the parent scale, so range
 * and lift must be multiplied by the wordmark’s world scale (landing GRAS is 0.1).
 */
export const GRAS_CURSOR_LIGHT_POWER = 1.85
export const GRAS_CURSOR_LIGHT_DISTANCE = 0.8
/** Sit just off the glyph skin, in local metres at scale 1. */
export const GRAS_CURSOR_LIGHT_LIFT = 0.04
/** Rest lamp — same power as Adam’s traveling wave, not the 2000 sample. */
export const GRAS_IDLE_LIGHT_POWER = 1.15
/** Seconds for one G→R→A→S loop. */
export const GRAS_IDLE_LIGHT_PERIOD = 7
/** Hover lamp fade-in (slower than a snap). */
export const GRAS_LIGHT_FADE_IN = 1.05
/** Leave fade-out — slower than rise so the lamp does not pop off. */
export const GRAS_LIGHT_FADE_OUT = 0.7

export function grasCursorLightWorldScale(x: number, y: number, z: number): number {
  return Math.max(1e-6, Math.abs(x), Math.abs(y), Math.abs(z))
}

export function grasCursorLightDistance(worldScale: number): number {
  return GRAS_CURSOR_LIGHT_DISTANCE * Math.max(worldScale, 1e-6)
}

export function grasCursorLightLift(worldScale: number): number {
  return GRAS_CURSOR_LIGHT_LIFT * Math.max(worldScale, 1e-6)
}

export function grasCursorLightIntensity(hovered: boolean, worldScale = 1): number {
  if (!hovered) return 0
  return GRAS_CURSOR_LIGHT_POWER * Math.max(worldScale, 1e-6)
}

export function grasIdleLightIntensity(hovered: boolean, worldScale = 1): number {
  if (hovered) return 0
  return GRAS_IDLE_LIGHT_POWER * Math.max(worldScale, 1e-6)
}

/** Local Y of the rest lamp as it walks the stack. `phase` 0 is G; 1 returns to G. */
export function grasIdleLightY(phase: number, centersY: readonly number[]): number {
  const n = centersY.length
  if (n === 0) return 0
  if (n === 1) return centersY[0] ?? 0
  const wrapped = ((phase % 1) + 1) % 1
  const x = wrapped * n
  const i = Math.floor(x) % n
  const j = (i + 1) % n
  const u = x - Math.floor(x)
  const s = u * u * (3 - 2 * u)
  const a = centersY[i] ?? 0
  const b = centersY[j] ?? 0
  return a + (b - a) * s
}

export function grasLightEase(current: number, target: number, dt: number): number {
  const dropping = target < current - 1e-6
  const rate = dropping ? GRAS_LIGHT_FADE_OUT : GRAS_LIGHT_FADE_IN
  const next = current + (target - current) * (1 - Math.exp(-rate * Math.max(dt, 0)))
  if (target <= 0 && next < 0.004) return 0
  return next
}

/**
 * World Y of each letter center. Index 0 is G (top); the last letter sits on y = 0.
 * `heights` is each glyph's measured world height after centering.
 */
export function grasLetterCentersY(heights: readonly number[], gap = GRAS_LETTER_GAP): number[] {
  if (heights.length !== GRAS_LETTERS.length) {
    throw new Error(`grasLetterCentersY expected ${GRAS_LETTERS.length} heights, got ${heights.length}`)
  }
  const centers = new Array<number>(heights.length)
  let y = 0
  for (let i = heights.length - 1; i >= 0; i--) {
    const height = heights[i] ?? 0
    centers[i] = y + height / 2
    y += height + (i === 0 ? 0 : gap)
  }
  return centers
}

export function grasWordmarkHeight(heights: readonly number[], gap = GRAS_LETTER_GAP): number {
  if (!heights.length) return 0
  return heights.reduce((sum, height) => sum + height, 0) + (heights.length - 1) * gap
}

/** Nominal stack height from cap size (S on the ground, G at the top). */
export const GRAS_STACK_HEIGHT = grasWordmarkHeight([
  GRAS_LETTER_SIZE,
  GRAS_LETTER_SIZE,
  GRAS_LETTER_SIZE,
  GRAS_LETTER_SIZE,
])

/**
 * TextGeometry faces +Z. Adam / scene Home looks from −X, so identity placement
 * would show the letters edge-on. Yaw the stack so the glyph fronts face Home.
 */
export const GRAS_FRONT_YAW = -Math.PI / 2

export type GrasWordmarkAnchor = 'ground' | 'top' | 'left'

/**
 * Local Y of the stack group. `top` hangs G from the origin so a scene pin is the
 * top of the word, not the ground under S.
 */
export function grasWordmarkOriginY(anchor: GrasWordmarkAnchor, height: number): number {
  return anchor === 'top' ? -height : 0
}

/** Remainder that clip-slides in to the right of each stem on hover. */
export const GRAS_EXPAND_SUFFIX = {
  G: 'eneral',
  R: 'epresentation',
  A: 'bstract',
  S: 'ystems',
} as const

/** Tiny “of” that clip-slides in to the left of A (General Representation of Abstract Systems). */
export const GRAS_EXPAND_PREFIX = {
  G: '',
  R: '',
  A: 'of',
  S: '',
} as const

/** Cap height of remainder / prefix glyphs — smaller than the stem so the row fits. */
export const GRAS_SUFFIX_SIZE = 0.2

/** Gap between sub-letters in an expanded row, metres. */
export const GRAS_LETTER_TRACKING = 0.016

/** Extra +x on each suffix glyph at rest — they clip-slide in from the right. */
export const GRAS_EXPAND_SLIDE = 0.16

export const GRAS_EXPAND_DURATION = 0.64

export const GRAS_EXPAND_STAGGER = 0.048

export type GrasStemLetter = (typeof GRAS_LETTERS)[number]

export type GrasRowLayout = {
  letter: GrasStemLetter
  prefix: string
  suffix: string
  chars: string[]
  widths: number[]
  centersX: number[]
  totalWidth: number
  stemIndex: number
  stemCenterX: number
  stemLeft: number
  stemRight: number
  wordLeft: number
  wordRight: number
}

/**
 * Glyph centers along X for a left-to-right word, shifted so the bbox sits on x = 0.
 */
export function grasWordCentersX(
  widths: readonly number[],
  tracking = GRAS_LETTER_TRACKING,
): { centersX: number[]; totalWidth: number } {
  if (!widths.length) return { centersX: [], totalWidth: 0 }
  const totalWidth =
    widths.reduce((sum, width) => sum + width, 0) + Math.max(0, widths.length - 1) * tracking
  const centersX: number[] = []
  let x = -totalWidth / 2
  for (const width of widths) {
    centersX.push(x + width / 2)
    x += width + tracking
  }
  return { centersX, totalWidth }
}

/** Row local x: stem sits on the origin at rest; the full word is centered when expanded. */
export function grasRowAlignX(stemCenterX: number, progress: number): number {
  const t = Math.min(1, Math.max(0, progress))
  return -stemCenterX * (1 - t)
}

export function grasSuffixSlideX(finalX: number, progress: number, slide = GRAS_EXPAND_SLIDE): number {
  const t = Math.min(1, Math.max(0, progress))
  return finalX + slide * (1 - t)
}

export function grasPrefixSlideX(finalX: number, progress: number, slide = GRAS_EXPAND_SLIDE): number {
  const t = Math.min(1, Math.max(0, progress))
  return finalX - slide * (1 - t)
}

export function grasClipRightX(stemRight: number, wordRight: number, progress: number): number {
  const t = Math.min(1, Math.max(0, progress))
  return stemRight + (wordRight - stemRight) * t
}

export function grasClipLeftX(stemLeft: number, wordLeft: number, progress: number): number {
  const t = Math.min(1, Math.max(0, progress))
  return stemLeft + (wordLeft - stemLeft) * t
}

/** Padding around the expanded word so the hover box is the whole row, not a moving glyph. */
export const GRAS_ROW_HIT_PAD = 0.02

/** World size of the unmoving hover box: full expanded word, centered on x = 0. */
export function grasRowHitSize(
  totalWidth: number,
  rowHeight: number,
  depth = GRAS_LETTER_DEPTH,
  pad = GRAS_ROW_HIT_PAD,
): [number, number, number] {
  return [totalWidth + pad * 2, rowHeight + pad * 2, depth + pad * 2]
}

export function grasRowLayout(
  letter: GrasStemLetter,
  widthOf: (ch: string) => number,
  tracking = GRAS_LETTER_TRACKING,
): GrasRowLayout {
  const prefix = GRAS_EXPAND_PREFIX[letter]
  const suffix = GRAS_EXPAND_SUFFIX[letter]
  const chars = [...prefix, letter, ...suffix]
  const stemIndex = prefix.length
  const widths = chars.map((ch) => widthOf(ch))
  const { centersX, totalWidth } = grasWordCentersX(widths, tracking)
  const stemWidth = widths[stemIndex] ?? 0
  const stemCenterX = centersX[stemIndex] ?? 0
  const stemLeft = stemCenterX - stemWidth / 2
  const stemRight = stemCenterX + stemWidth / 2
  return {
    letter,
    prefix,
    suffix,
    chars,
    widths,
    centersX,
    totalWidth,
    stemIndex,
    stemCenterX,
    stemLeft,
    stemRight,
    wordLeft: -totalWidth / 2,
    wordRight: totalWidth / 2,
  }
}
