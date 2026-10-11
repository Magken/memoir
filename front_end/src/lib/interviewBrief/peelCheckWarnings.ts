import {
  collectCheckSuite,
  type CheckSuiteWarning,
} from '../../../../back_end/supabase/functions/interview-brief-edit/checkSuite.ts'

export type PeelCheckWarning = CheckSuiteWarning

function trimStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

/** Drop incomplete Check Suite rows before they reach the peel sheet. */
export function normalizePeelCheckWarnings(raw: unknown): PeelCheckWarning[] {
  if (!Array.isArray(raw)) return []
  const out: PeelCheckWarning[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue
    const rec = row as Record<string, unknown>
    const id = trimStr(rec.id)
    const short = trimStr(rec.short)
    const sectionId = trimStr(rec.sectionId)
    if (!id || !short || !sectionId) continue
    const historyFocus = trimStr(rec.historyFocus)
    out.push(historyFocus ? { id, short, sectionId, historyFocus } : { id, short, sectionId })
  }
  return out
}

/** Live scan — same list the peel sheet and Dashboard ctx must show. */
export function peelCheckWarningsFromDoc(
  doc: Record<string, unknown> | null | undefined,
): PeelCheckWarning[] {
  return normalizePeelCheckWarnings(collectCheckSuite(doc))
}

/**
 * Prefer `getContext().checkWarnings` (already scanned). Fall back to scanning
 * `body` so a bot apply can refresh the sheet in the same turn.
 */
export function peelCheckWarningsFromContext(ctx: unknown): PeelCheckWarning[] {
  if (!ctx || typeof ctx !== 'object' || Array.isArray(ctx)) return []
  const rec = ctx as Record<string, unknown>
  if ('checkWarnings' in rec) return normalizePeelCheckWarnings(rec.checkWarnings)
  const body = rec.body
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    return peelCheckWarningsFromDoc(body as Record<string, unknown>)
  }
  return []
}
