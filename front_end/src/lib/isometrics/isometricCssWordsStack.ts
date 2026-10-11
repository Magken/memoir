import type { CSSProperties } from 'react'
import type { IsometricCssWordsLayout } from './isometricScroll'

/** Ref `isometric2` at 68px — left 29 · clip 50 · inner line 45. */
export const ISOMETRIC_CSS_WORDS_REF = {
  fontSizePx: 68,
  leftStepPx: 29,
  clipHeightPx: 50,
  lineHeightPx: 45,
} as const

export const ISOMETRIC_CSS_WORDS_RATIOS = {
  leftStepEm: ISOMETRIC_CSS_WORDS_REF.leftStepPx / ISOMETRIC_CSS_WORDS_REF.fontSizePx,
  clipHeightEm: ISOMETRIC_CSS_WORDS_REF.clipHeightPx / ISOMETRIC_CSS_WORDS_REF.fontSizePx,
  lineHeightEm: ISOMETRIC_CSS_WORDS_REF.lineHeightPx / ISOMETRIC_CSS_WORDS_REF.fontSizePx,
} as const

/** Vertical pitch multiplier on clip height — full stack vs skew-compressed diagonal. */
const ROW_PITCH: Record<IsometricCssWordsLayout, number> = {
  diagonal: 0.58,
  vertical: 1.05,
}

export type IsometricCssWordsStackMetrics = {
  lines: readonly string[]
  pairs: readonly [string, string][]
  rowCount: number
  maxSlotCh: number
  leftSpanEm: number
  style: CSSProperties
}

/** Accept a phrase array or newline-separated string — trim empty rows. */
export function normalizeIsometricCssWordsLines(
  input: readonly string[] | string,
): readonly string[] {
  const raw =
    typeof input === 'string'
      ? input.split(/\r?\n/)
      : input
  return raw.map((line) => line.trim()).filter((line) => line.length > 0)
}

/** Build `[prev, next]` pairs for each clipped row — ref `item-reference/front-end/isometric2`. */
export function isometricCssWordPairs(lines: readonly string[]): readonly [string, string][] {
  if (lines.length === 0) return []
  const pairs: [string, string][] = [['\u00A0', lines[0]!]]
  for (let i = 1; i < lines.length; i += 1) {
    pairs.push([lines[i - 1]!, lines[i]!])
  }
  pairs.push([lines[lines.length - 1]!, '\u00A0'])
  return pairs
}

function maxVisibleLength(pairs: readonly [string, string][]): number {
  let max = 1
  for (const [prev, next] of pairs) {
    for (const word of [prev, next]) {
      if (word === '\u00A0') continue
      max = Math.max(max, word.length)
    }
  }
  return max
}

/** Derive row count, step span, slot width, and scene sizing from `lines` alone. */
export function isometricCssWordsStackMetrics(
  input: readonly string[] | string,
  layout: IsometricCssWordsLayout = 'diagonal',
): IsometricCssWordsStackMetrics {
  const lines = normalizeIsometricCssWordsLines(input)
  const pairs = isometricCssWordPairs(lines)
  const rowCount = pairs.length
  const maxSlotCh = maxVisibleLength(pairs)
  const leftSpanEm =
    layout === 'diagonal' ? rowCount * ISOMETRIC_CSS_WORDS_RATIOS.leftStepEm : 0
  const rowPitch = ROW_PITCH[layout]

  const style = {
    '--iso-words-row-count': rowCount,
    '--iso-words-row-pitch': rowPitch,
    '--iso-words-left-span': `${leftSpanEm}em`,
    '--iso-words-slot-ch': maxSlotCh,
    '--iso-words-scene-pad': layout === 'vertical' ? '2rem' : '2.75rem',
  } as CSSProperties

  return { lines, pairs, rowCount, maxSlotCh, leftSpanEm, style }
}
