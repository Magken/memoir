/**
 * Published ordinal → unit maps (mapsVersion 1).
 * Equal-rank encoding for Decision soft grades — keep ordinals beside means.
 */

export const ORDINAL_MAPS_VERSION = 1
export { DEPTH_STANDARD_VERSION } from '../../../../back_end/supabase/functions/_shared/interview-assessors/depthLadder.ts'

const WEAK_MIXED_STRONG: Record<string, number> = {
  weak: 0,
  mixed: 0.5,
  strong: 1,
}

const MISSING_THIN_PRESENT: Record<string, number> = {
  missing: 0,
  thin: 0.5,
  present: 1,
}

/** Quality low→high (enum / blameShift forward before reverse). */
const LOW_MED_HIGH: Record<string, number> = {
  low: 0,
  med: 0.5,
  medium: 0.5,
  mixed: 0.5,
  high: 1,
}

/** Ownership blameShift: high blame = low quality. */
const BLAME_SHIFT: Record<string, number> = {
  low: 1,
  mixed: 0.5,
  med: 0.5,
  medium: 0.5,
  high: 0,
}

export function normalizeOrdinalToken(raw: unknown): string {
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw)
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

/** Map a dimension score (ordinal label or legacy 1–5) to 0–1, or null if unusable. */
export function ordinalToUnit(input: {
  templateId: string
  dimKey: string
  score: unknown
  options?: readonly string[]
}): number | null {
  const { templateId, dimKey, score, options } = input
  if (score == null || score === '') return null

  if (typeof score === 'number' && Number.isFinite(score)) {
    // Legacy Talk Edge 1–5
    if (score >= 1 && score <= 5) return Math.min(1, Math.max(0, (score - 1) / 4))
    // Already unit or 0–100
    if (score >= 0 && score <= 1) return score
    if (score > 1 && score <= 100) return Math.min(1, score / 100)
    return null
  }

  const token = normalizeOrdinalToken(score)
  // Strip band suffixes like "1 - Limited"
  const head = token.split(/[-–—]/)[0]?.trim() || token
  const compact = head.replace(/[^a-z0-9_]/g, '')

  if (templateId === 'iv.ownership.v1' && dimKey === 'blameShift') {
    if (compact in BLAME_SHIFT) return BLAME_SHIFT[compact]!
    return null
  }

  if (compact in WEAK_MIXED_STRONG) return WEAK_MIXED_STRONG[compact]!
  if (compact in MISSING_THIN_PRESENT) return MISSING_THIN_PRESENT[compact]!
  if (compact in LOW_MED_HIGH) return LOW_MED_HIGH[compact]!

  // Option-list index / (n-1) when author custom bands
  if (options?.length) {
    const idx = options.findIndex((o) => normalizeOrdinalToken(o) === token || normalizeOrdinalToken(o) === compact)
    if (idx >= 0) {
      if (options.length === 1) return 1
      return idx / (options.length - 1)
    }
  }

  return null
}

export function meanUnits(units: readonly number[]): number | null {
  if (!units.length) return null
  const sum = units.reduce((a, b) => a + b, 0)
  return sum / units.length
}

export const ORDERED_ENUM_SETS: readonly (readonly string[])[] = [
  ['weak', 'mixed', 'strong'],
  ['missing', 'thin', 'present'],
  ['low', 'med', 'high'],
  ['low', 'medium', 'high'],
  ['low', 'mixed', 'high'],
  ['low', 'medium', 'high', 'critical'],
  ['low', 'med', 'high', 'critical'],
]

export function isOrderedQualityEnum(values: readonly string[]): boolean {
  if (values.length < 2) return false
  const norm = values.map((v) => normalizeOrdinalToken(v))
  return ORDERED_ENUM_SETS.some(
    (set) =>
      set.length === norm.length && set.every((s, i) => s === norm[i] || (s === 'med' && (norm[i] === 'medium' || norm[i] === 'mixed'))),
  )
}
