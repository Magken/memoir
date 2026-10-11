import type { RetrievedMemoryPack } from './types'

export type DayHistoryTurn = {
  role: 'assistant' | 'candidate'
  text: string
  phaseId: string
}

const DEFAULT_LIMIT = 14

function asTurn(h: { role: string; text: string; phaseId: string }): DayHistoryTurn {
  const role = h.role === 'assistant' ? 'assistant' : 'candidate'
  return { role, text: h.text, phaseId: h.phaseId }
}

/**
 * Keep lean prior-section turns when retrieve is empty.
 * When retrieve has hits, unique-concat then keep the most recent slice.
 */
export function unionDayHistoryTail(
  lean: DayHistoryTurn[] | undefined,
  retrieved: Pick<RetrievedMemoryPack, 'dayHits' | 'phaseHits'> | null | undefined,
  limit = DEFAULT_LIMIT,
): DayHistoryTurn[] {
  const base = Array.isArray(lean) ? lean : []
  const extra = [
    ...(retrieved?.dayHits ?? []).map(asTurn),
    ...(retrieved?.phaseHits ?? []).map(asTurn),
  ]
  if (!extra.length) return base.slice(-limit)
  const seen = new Set<string>()
  const out: DayHistoryTurn[] = []
  for (const row of [...base, ...extra]) {
    const key = `${row.phaseId}|${row.role}|${row.text}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(row)
  }
  return out.slice(-limit)
}
