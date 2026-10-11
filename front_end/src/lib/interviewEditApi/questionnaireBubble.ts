/**
 * Questionnaire bubble id tracking — botRunFinalize maps local temp id → server
 * id for API. The visible ChatBubble key should stay on the local id so the
 * reply does not remount after type-in. Continue still patches the LIVE row
 * (local or remapped) or replies vanish and the unanswered sheet stays reopenable.
 */
import type { MessagePart } from '../chat/types'

export function followMessageIdMap(
  preferredId: string,
  idMap: Record<string, string>,
): string {
  let id = preferredId
  const seen = new Set<string>()
  while (idMap[id] && !seen.has(id)) {
    seen.add(id)
    id = idMap[id]!
  }
  return id
}

/** True when `msgId` is the same bubble as `preferredId` after remaps. */
export function messageMatchesMappedId(
  msgId: string,
  preferredId: string,
  idMap: Record<string, string>,
): boolean {
  if (msgId === preferredId) return true
  const live = followMessageIdMap(preferredId, idMap)
  if (msgId === live) return true
  return followMessageIdMap(msgId, idMap) === live
}

export function findBubbleIdByEditRun(
  messages: Array<{ id: string; parts: MessagePart[] }>,
  editRunId: string,
): string | null {
  if (!editRunId.trim()) return null
  const hit = messages.find((m) =>
    m.parts.some(
      (p) => p.type === 'planning' && String(p.editRunId ?? '') === editRunId,
    ),
  )
  return hit?.id ?? null
}

/** Prefer editRun match, else follow remaps, else preferred if still present. */
export function resolveQuestionnaireBubbleId(input: {
  preferredId: string
  editRunId: string
  idMap: Record<string, string>
  messages: Array<{ id: string; parts: MessagePart[] }>
}): string {
  const byRun = findBubbleIdByEditRun(input.messages, input.editRunId)
  if (byRun) return byRun
  const followed = followMessageIdMap(input.preferredId, input.idMap)
  if (input.messages.some((m) => m.id === followed)) return followed
  if (input.messages.some((m) => m.id === input.preferredId)) return input.preferredId
  return followed
}

/** Mark every planning part for this editRun as answered (idempotent). */
export function sealPlanningParts(
  parts: MessagePart[],
  editRunId: string,
  seal: {
    answers: Record<string, string | string[]>
    summary: string
  },
): MessagePart[] {
  return parts.map((p) => {
    if (p.type !== 'planning') return p
    if (editRunId && p.editRunId && p.editRunId !== editRunId) return p
    return {
      ...p,
      answered: true,
      collapsed: true,
      summary: seal.summary,
      answers: seal.answers,
    }
  })
}

/**
 * Ask persist must finalize its own bot-run even after continue starts a new one.
 * Never clear `currentRunId` unless it still equals the owned run (else continue vanishes).
 * Skip finalize when Stop already failed/cancelled that run.
 */
export function ownedBotRunPersistDecision(input: {
  ownedRunId: string | null | undefined
  currentRunId: string | null
  cancelledRunIds: ReadonlySet<string>
}): { finalize: boolean; clearCurrent: boolean } {
  const owned = typeof input.ownedRunId === 'string' ? input.ownedRunId.trim() : ''
  if (!owned) return { finalize: false, clearCurrent: false }
  if (input.cancelledRunIds.has(owned)) {
    return { finalize: false, clearCurrent: input.currentRunId === owned }
  }
  return {
    finalize: true,
    clearCurrent: input.currentRunId === owned,
  }
}
