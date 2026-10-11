/**
 * Persist Coach / Copilot utterances onto InterviewResponse.messages.
 * Sitting peel hydrates from that SSOT on Start. Check/X receipts stay Verify-only.
 */
import {
  appendResponseMessage,
  ensureInterviewResponse,
} from './interviewResponse'
import type {
  InterviewResponse,
  InterviewResponseComposeMeta,
  InterviewResponseMessage,
} from './talkTypes'

export function persistAssistCandidateMessage(input: {
  briefId: string
  phaseId: string
  text: string
  id?: string
}): { doc: InterviewResponse; message: InterviewResponseMessage } {
  return appendResponseMessage(ensureInterviewResponse(input.briefId), {
    id: input.id,
    phaseId: input.phaseId,
    topicId: null,
    role: 'candidate',
    text: input.text,
    probeId: null,
    kind: 'answer',
  })
}

export function persistAssistAssistantMessage(input: {
  briefId: string
  phaseId: string
  text: string
  id?: string
  compose?: InterviewResponseComposeMeta
}): { doc: InterviewResponse; message: InterviewResponseMessage } | null {
  const text = input.text.trim()
  if (!text) return null
  return appendResponseMessage(ensureInterviewResponse(input.briefId), {
    id: input.id,
    phaseId: input.phaseId,
    topicId: null,
    role: 'assistant',
    text,
    probeId: null,
    kind: 'assist',
    compose: input.compose,
  })
}

export function persistCopilotApplyReceipt(input: {
  briefId: string
  phaseId: string
  files: readonly string[]
  id?: string
}): { doc: InterviewResponse; message: InterviewResponseMessage } {
  const names = input.files.map((f) => f.trim()).filter(Boolean)
  const label = names.length ? names.join(', ') : 'workspace files'
  return persistCopilotEditOutcome({
    briefId: input.briefId,
    phaseId: input.phaseId,
    status: 'applied',
    locus: label,
    summary: `changes to ${label}`,
    id: input.id,
  })
}

export function persistCopilotEditOutcome(input: {
  briefId: string
  phaseId: string
  status: 'accepted' | 'rejected' | 'applied'
  locus: string
  summary: string
  id?: string
}): { doc: InterviewResponse; message: InterviewResponseMessage } {
  const verb =
    input.status === 'rejected' ? 'Rejected' : input.status === 'accepted' ? 'Kept' : 'Applied'
  const text = `${verb} Copilot change on ${input.locus}: ${input.summary}`.trim()
  return appendResponseMessage(ensureInterviewResponse(input.briefId), {
    id: input.id,
    phaseId: input.phaseId,
    topicId: null,
    role: 'assistant',
    text,
    probeId: null,
    kind: 'assist',
    compose: {
      situation: input.status === 'rejected' ? 'rejected' : 'applied',
      missingGaps: [],
      sampleIdsUsed: [],
      model: 'copilot-propose',
    },
  })
}

/** Every Assist row on a phase, receipts included — the live rail shows Check/X chips. */
export function assistMessagesForPhase(
  messages: readonly InterviewResponseMessage[],
  phaseId: string,
): InterviewResponseMessage[] {
  const id = phaseId.trim()
  if (!id) return []
  return messages.filter(
    (m) =>
      m.phaseId === id &&
      (m.kind === 'assist' || m.kind === 'answer' || m.role === 'candidate'),
  )
}

/**
 * Assist rows as a readable conversation. Apply / reject stamps are audit rows, not speech,
 * and reading them back as bubbles in Verify made the transcript look like machine chatter.
 */
export function assistTranscriptForPhase(
  messages: readonly InterviewResponseMessage[],
  phaseId: string,
): InterviewResponseMessage[] {
  return assistMessagesForPhase(messages, phaseId).filter((m) => !isCopilotReceiptPersist(m))
}

const COPILOT_OUTCOME_RE = /^(Kept|Rejected|Applied) Copilot change on /i
const PEEL_RECEIPT_RE = /^(accepted|rejected|applied|expired|miss)\s*·/i

/** Check/X persist rows — Verify SSOT, never Sam peel speech. */
export function isCopilotReceiptPersist(m: InterviewResponseMessage): boolean {
  const sit = String(m.compose?.situation ?? '')
  if (sit === 'applied' || sit === 'rejected' || sit === 'accepted') return true
  const t = String(m.text ?? '').trim()
  return COPILOT_OUTCOME_RE.test(t) || PEEL_RECEIPT_RE.test(t)
}

export type PeelRuntimeRow = {
  id: string
  role: 'assistant' | 'candidate'
  text: string
  at?: string
}

/** Speech for Copilot `history[]` — recover markdown / Questions when `text` is empty. */
export function assistHistoryText(message: {
  text?: string
  parts?: ReadonlyArray<{ type: string; markdown?: string }>
}): string {
  const direct = String(message.text ?? '').trim()
  if (direct) return direct
  const parts = Array.isArray(message.parts) ? message.parts : []
  const md = parts
    .filter((p) => p.type === 'markdown')
    .map((p) => String(p.markdown ?? '').trim())
    .filter(Boolean)
    .join('\n')
  if (md) return md
  if (parts.some((p) => p.type === 'planning')) return '(Questions)'
  return ''
}

export function assistHistoryForCopilot(
  messages: ReadonlyArray<{
    role: string
    text?: string
    at?: string
    parts?: ReadonlyArray<{ type: string; markdown?: string }>
  }>,
): Array<{ role: string; text: string; at?: string }> {
  return messages.map((m) => ({
    role: m.role,
    text: assistHistoryText(m),
    ...(m.at?.trim() ? { at: m.at.trim() } : {}),
  }))
}

/** Sitting peel seed from InterviewResponse — drop receipts so Check/X never becomes a Sam bubble. */
export function peelRuntimeFromPersisted(
  messages: readonly InterviewResponseMessage[],
  phaseId: string,
): PeelRuntimeRow[] {
  return assistTranscriptForPhase(messages, phaseId)
    .filter((m) => m.role === 'assistant' || m.role === 'candidate')
    .filter((m) => String(m.text ?? '').trim())
    .reduce<PeelRuntimeRow[]>((rows, m) => {
      const row: PeelRuntimeRow = {
        id: m.id,
        role: m.role === 'assistant' ? 'assistant' : 'candidate',
        text: m.text,
        at: m.at,
      }
      const idx = rows.findIndex((r) => r.id === row.id)
      if (idx >= 0) rows[idx] = row
      else rows.push(row)
      return rows
    }, [])
}
