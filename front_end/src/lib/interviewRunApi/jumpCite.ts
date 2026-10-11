/**
 * Jump cites from grain evidenceRefs (tool Verify).
 */
import type { TalkVerifyMarkingCard } from './talkVerifyModal'

export type JumpCite = {
  kind: string
  ref: string
  t?: number
  end?: number
  quote?: string
}

const ARTIFACT_KINDS = new Set(['question', 'file', 'doc', 'message', 'case'])

function asCite(
  raw: NonNullable<TalkVerifyMarkingCard['evidenceRefs']>[number],
): JumpCite | null {
  const kind = String(raw.kind ?? '').trim()
  const ref = String(raw.ref ?? '').trim()
  if (!kind) return null
  if (kind === 'tape_action') {
    if (typeof raw.t !== 'number' || !Number.isFinite(raw.t)) return null
    return {
      kind,
      ref: ref || 'tape',
      t: raw.t,
      ...(typeof raw.end === 'number' ? { end: raw.end } : {}),
      ...(raw.quote ? { quote: raw.quote } : {}),
    }
  }
  if (!ref || !ARTIFACT_KINDS.has(kind)) return null
  return {
    kind,
    ref,
    ...(typeof raw.t === 'number' ? { t: raw.t } : {}),
    ...(typeof raw.end === 'number' ? { end: raw.end } : {}),
    ...(raw.quote ? { quote: raw.quote } : {}),
  }
}

export function firstJumpCite(
  refs: TalkVerifyMarkingCard['evidenceRefs'] | undefined | null,
): JumpCite | null {
  if (!refs?.length) return null
  for (const raw of refs) {
    const cite = asCite(raw)
    if (cite) return cite
  }
  return null
}

export type JumpCiteApis = {
  revealQuestion?: (questionId: string) => void
  revealFileRange?: (path: string, startLine?: number, endLine?: number) => void
  revealEssayRange?: (startLine?: number, endLine?: number, search?: string) => void
  revealMessage?: (messageId: string) => void
  seekTape?: (t: number) => void
  jumpToSection?: (sectionId: string) => void
}

export function jumpFromCite(cite: JumpCite, apis: JumpCiteApis): void {
  if (cite.kind === 'tape_action') apis.seekTape?.(cite.t ?? 0)
  else if (cite.kind === 'question') apis.revealQuestion?.(cite.ref)
  else if (cite.kind === 'file') apis.revealFileRange?.(cite.ref, cite.t, cite.end)
  else if (cite.kind === 'doc') apis.revealEssayRange?.(cite.t, cite.end, cite.quote)
  else if (cite.kind === 'message') apis.revealMessage?.(cite.ref)
  else if (cite.kind === 'case') apis.jumpToSection?.(cite.ref)
}

export function cardHasJump(card: TalkVerifyMarkingCard): boolean {
  return Boolean(firstJumpCite(card.evidenceRefs) || card.anchorMessageId)
}

export function jumpFromCard(card: TalkVerifyMarkingCard, apis: JumpCiteApis): void {
  const refs = card.evidenceRefs ?? []
  const tape = refs.map(asCite).find((c) => c?.kind === 'tape_action') ?? null
  if (tape) jumpFromCite(tape, apis)
  const other =
    refs
      .map(asCite)
      .find((c) => c && c.kind !== 'tape_action') ?? null
  if (other) {
    jumpFromCite(other, apis)
    return
  }
  if (!tape && card.anchorMessageId) apis.revealMessage?.(card.anchorMessageId)
}

/** Overview → Work/Conversation pending seek or message flash. */
export type PendingReviewJump = { seekT?: number; messageId?: string }

let pendingReviewJump: PendingReviewJump | null = null

export function setPendingReviewJump(next: PendingReviewJump | null): void {
  pendingReviewJump = next
}

export function takePendingReviewJump(): PendingReviewJump | null {
  const next = pendingReviewJump
  pendingReviewJump = null
  return next
}

/** Sitting transcript id → Results step. Creator leftover jump uses the same Conversation open. */
export function sectionIdForCitedUtterance(
  messageId: string,
  input: {
    messages?: Array<{ id?: string; phaseId?: string }>
    cards?: Array<{ anchorMessageId?: string; messageIds?: string[]; phaseId?: string }>
    fallbackSectionId?: string
  },
): string | null {
  const id = String(messageId ?? '').trim()
  if (!id) return null
  for (const row of input.messages ?? []) {
    if (String(row.id ?? '').trim() !== id) continue
    const phase = String(row.phaseId ?? '').trim()
    if (phase) return phase
  }
  for (const card of input.cards ?? []) {
    const ids = [
      String(card.anchorMessageId ?? '').trim(),
      ...(Array.isArray(card.messageIds) ? card.messageIds.map((row) => String(row).trim()) : []),
    ]
    if (!ids.includes(id)) continue
    const phase = String(card.phaseId ?? '').trim()
    if (phase) return phase
  }
  const fallback = String(input.fallbackSectionId ?? '').trim()
  return fallback || null
}
