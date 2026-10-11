/** Shared prefix/suffix splice for text checkpoints. */

export type TextSplice = {
  start: number
  end: number
  text: string
}

export function spliceDiff(before: string, after: string): TextSplice | null {
  if (before === after) return null
  let start = 0
  const minLen = Math.min(before.length, after.length)
  while (start < minLen && before.charCodeAt(start) === after.charCodeAt(start)) start += 1
  let endBefore = before.length
  let endAfter = after.length
  while (
    endBefore > start &&
    endAfter > start &&
    before.charCodeAt(endBefore - 1) === after.charCodeAt(endAfter - 1)
  ) {
    endBefore -= 1
    endAfter -= 1
  }
  return { start, end: endBefore, text: after.slice(start, endAfter) }
}

export function applySplice(source: string, start: number, end: number, text: string): string {
  const s = Number.isFinite(start) ? Math.max(0, Math.min(source.length, start)) : 0
  const e = Number.isFinite(end) ? Math.max(s, Math.min(source.length, end)) : s
  return source.slice(0, s) + String(text ?? '') + source.slice(e)
}

/** Large insert in one tick — candidate-safe paste signal for later detectors. */
export function looksLikePaste(splice: TextSplice, threshold = 40): boolean {
  const deleted = splice.end - splice.start
  return splice.text.length >= threshold && splice.text.length > deleted + 8
}

export const PASTE_EXCERPT_MAX = 200

/** Bounded editor splice — never clipboard text. */
export function pasteActionDetails(
  splice: TextSplice,
  afterLen: number,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  const body = String(splice.text ?? '')
  const chars = body.length
  const excerpt = body.slice(0, PASTE_EXCERPT_MAX)
  const lineCount = body.split(/\r?\n/).length
  const denom = Math.max(0, Number(afterLen) || 0)
  const coverage = denom > 0 ? Math.min(1, chars / denom) : 1
  const wholeFile = coverage >= 0.85 && chars >= 80
  return {
    ...extra,
    chars,
    excerpt,
    lineCount,
    coverage,
    wholeFile,
  }
}
