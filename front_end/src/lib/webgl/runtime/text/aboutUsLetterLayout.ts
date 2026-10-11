/** Two-row Megrim About Us — ceramic glyphs, play-in expand, no leave reverse. */

import { GRAS_LETTER_SIZE, GRAS_LETTER_TRACKING, grasWordCentersX } from './grasLetterLayout'

export const ABOUT_US_STEMS = ['A', 'U'] as const

export type AboutUsStemLetter = (typeof ABOUT_US_STEMS)[number]

/** Remainder that clip-slides in to the right of each stem on play-in. */
export const ABOUT_US_EXPAND = {
  A: { prefix: '', suffix: 'bout' },
  U: { prefix: '', suffix: 's' },
} as const

/** Gap between the About row and the Us row, metres. */
export const ABOUT_US_WORD_GAP = 0.18

export type AboutUsRowLayout = {
  letter: string
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

export function expandRowLayout(
  letter: string,
  prefix: string,
  suffix: string,
  widthOf: (ch: string) => number,
  tracking = GRAS_LETTER_TRACKING,
): AboutUsRowLayout {
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

export function aboutUsRowLayout(
  letter: AboutUsStemLetter,
  widthOf: (ch: string) => number,
  tracking = GRAS_LETTER_TRACKING,
): AboutUsRowLayout {
  const { prefix, suffix } = ABOUT_US_EXPAND[letter]
  return expandRowLayout(letter, prefix, suffix, widthOf, tracking)
}

export function aboutUsVisibleWidth(layout: AboutUsRowLayout, progress: number): number {
  const t = Math.min(1, Math.max(0, progress))
  const stemWidth = layout.stemRight - layout.stemLeft
  return stemWidth + (layout.totalWidth - stemWidth) * t
}

export type AboutUsPackAlign = 'center' | 'left'

export type AboutUsPack = {
  aboutX: number
  usX: number
  aboutY: number
  usY: number
  totalWidth: number
  totalHeight: number
}

/**
 * Two-row pack. About sits above Us. `center` stacks on the origin (viewer).
 * `left` keeps the left of A on the origin so a scene pin is the start of About.
 */
export function aboutUsPackX(
  about: AboutUsRowLayout,
  us: AboutUsRowLayout,
  progress: number,
  gap = ABOUT_US_WORD_GAP,
  align: AboutUsPackAlign = 'center',
  rowHeight = GRAS_LETTER_SIZE,
): AboutUsPack {
  const aboutW = aboutUsVisibleWidth(about, progress)
  const usW = aboutUsVisibleWidth(us, progress)
  const totalWidth = Math.max(aboutW, usW)
  const totalHeight = rowHeight * 2 + gap
  const aboutLeft = align === 'left' ? 0 : -aboutW / 2
  const usLeft = align === 'left' ? 0 : -usW / 2
  const rowPitch = rowHeight + gap
  return {
    aboutX: aboutLeft + aboutW / 2,
    usX: usLeft + usW / 2,
    aboutY: align === 'left' ? 0 : rowPitch / 2,
    usY: align === 'left' ? -rowPitch : -rowPitch / 2,
    totalWidth,
    totalHeight,
  }
}

/** Glyph fronts face +X — About Home looks from that side. Viewer keeps `GRAS_FRONT_YAW`. */
export const ABOUT_US_SCENE_FRONT_YAW = Math.PI / 2

/** Local A and U stem centres as the two rows expand. */
export function aboutUsIdleCenters(
  about: AboutUsRowLayout,
  us: AboutUsRowLayout,
  progress: number,
  gap = ABOUT_US_WORD_GAP,
  align: AboutUsPackAlign = 'center',
  rowHeight = GRAS_LETTER_SIZE,
): { x: [number, number]; y: [number, number] } {
  const t = Math.min(1, Math.max(0, progress))
  const pack = aboutUsPackX(about, us, progress, gap, align, rowHeight)
  return {
    x: [pack.aboutX + about.stemCenterX * t, pack.usX + us.stemCenterX * t],
    y: [pack.aboutY, pack.usY],
  }
}
