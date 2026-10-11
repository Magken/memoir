/**
 * Bot edit vs in-app paste vs outside paste.
 * Copilot/Assist apply must not count as a paste.
 */

export const INSERT_COVER_MS = 1_500

export type InsertSource = 'bot_edit' | 'internal_paste' | 'external_paste'

export type TapeActionLike = {
  t: number
  action: string
  detail?: Record<string, unknown>
}

export const INSERT_SOURCE_LABEL: Record<InsertSource, string> = {
  bot_edit: 'Bot edit',
  internal_paste: 'In-app paste',
  external_paste: 'Outside paste',
}

export function insertSourceLabel(source: InsertSource): string {
  return INSERT_SOURCE_LABEL[source]
}

export function coveredByTimes(t: number, others: readonly number[], windowMs = INSERT_COVER_MS): boolean {
  return others.some((at) => Math.abs(at - t) < windowMs)
}

export function classifyTapeInsert(
  action: string,
  detail?: Record<string, unknown> | null,
): InsertSource | null {
  const key = String(action ?? '')
  if (key === 'copilot_apply') return 'bot_edit'
  if (key === 'paste_route') {
    const from = String(detail?.from ?? '')
    const label = String(detail?.label ?? '')
    if (from === 'internal' || label === 'internal_assist_help' || label === 'internal_editor') {
      return 'internal_paste'
    }
    return 'external_paste'
  }
  if (key === 'paste') return 'external_paste'
  return null
}

export function classifySeriesInsert(kind: string, quote?: string): InsertSource | null {
  const key = String(kind ?? '')
  if (key === 'apply' || key === 'copilot_apply' || key === 'bot_edit') return 'bot_edit'
  if (key === 'paste_internal') return 'internal_paste'
  if (key === 'paste_route') {
    const q = String(quote ?? '')
    if (q.startsWith('internal')) return 'internal_paste'
    return 'external_paste'
  }
  if (key === 'paste') {
    const q = String(quote ?? '')
    if (q.startsWith('internal')) return 'internal_paste'
    return 'external_paste'
  }
  return null
}

/**
 * One insert per moment. Nearby inferred `paste` after a bot apply or a
 * routed paste is the same event, not a second paste.
 */
export function uniqueInsertActions(actions: readonly TapeActionLike[]): TapeActionLike[] {
  const applyTs = actions.filter((a) => a.action === 'copilot_apply').map((a) => a.t)
  const routeTs = actions
    .filter((a) => a.action === 'paste_route' && !coveredByTimes(a.t, applyTs))
    .map((a) => a.t)
  const out: TapeActionLike[] = []
  for (const row of actions) {
    if (row.action === 'copilot_apply') {
      out.push(row)
      continue
    }
    if (row.action === 'paste_route') {
      if (coveredByTimes(row.t, applyTs)) continue
      out.push(row)
      continue
    }
    if (row.action === 'paste') {
      if (coveredByTimes(row.t, applyTs) || coveredByTimes(row.t, routeTs)) continue
      out.push(row)
    }
  }
  return out
}

export function insertIncidentKind(source: InsertSource): 'apply' | 'paste_internal' | 'paste' {
  if (source === 'bot_edit') return 'apply'
  if (source === 'internal_paste') return 'paste_internal'
  return 'paste'
}

export type InsertClockMark = {
  t: number
  sectionId: string
  source: InsertSource
}

export function insertMarksFromIncidents(
  incidents: ReadonlyArray<{ kind: string; t: number; sectionId?: string }>,
): InsertClockMark[] {
  const out: InsertClockMark[] = []
  for (const row of incidents) {
    const source = classifySeriesInsert(row.kind)
    if (!source) continue
    out.push({
      t: row.t,
      sectionId: String(row.sectionId ?? ''),
      source,
    })
  }
  return out
}
