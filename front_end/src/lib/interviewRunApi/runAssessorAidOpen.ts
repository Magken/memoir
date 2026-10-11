/**
 * Assessor Aid first peel bubble - Edge `open`, pack-backed fallback.
 * Never seeds Happy-to-walk overlay tours or "pack is in front of you" greeters.
 */
import { DataApiError } from '../dataApi'
import type { AssessorAidReport } from './buildAssessorAidReport'
import {
  buildAssessorAidContext,
  type AssessorAidModalLike,
} from './buildAssessorAidContext'
import { composeAssessorAid } from './assessorAidEdgeClient'
import {
  aidReportIsReady,
  composeAssessorAidOpenerUtterance,
} from './composeAssessorAidOpenerUtterance'
import {
  aidConversationNeedsOpen,
  isCannedAidOpener,
  loadAssessorAidConversation,
  saveAssessorAidConversation,
  type AssessorAidFixtureMessage,
} from './assessorAidConversationFixture'

export type AssessorAidOpenResult = {
  utterance: string
  from: 'edge' | 'fallback' | 'existing'
  messages: AssessorAidFixtureMessage[]
}

type ComposeFn = typeof composeAssessorAid

export { aidReportIsReady }

/** Poll until the Results card has handed the pack up, or the timeout/stale check fires. */
export async function waitForAidReport(
  getReport: () => AssessorAidReport | null | undefined,
  opts?: { timeoutMs?: number; intervalMs?: number; isStale?: () => boolean },
): Promise<AssessorAidReport | null> {
  const timeoutMs = opts?.timeoutMs ?? 4000
  const intervalMs = opts?.intervalMs ?? 80
  const started = Date.now()
  while (true) {
    if (opts?.isStale?.()) return getReport() ?? null
    const report = getReport() ?? null
    if (aidReportIsReady(report)) return report
    if (Date.now() - started >= timeoutMs) return report
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
}

function spokenAid(text: string): string {
  return String(text ?? '')
    .replace(/[\u2014\u2013]/g, '-')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function usableOpener(text: string, messages?: unknown): string {
  const spoken = spokenAid(text)
  if (!spoken || isCannedAidOpener(spoken)) return ''
  if (aidUtteranceIsTranscriptEcho(spoken, messages)) return ''
  return spoken
}

export function aidUtteranceIsTranscriptEcho(utterance: string, messages: unknown): boolean {
  const spoken = String(utterance ?? '')
    .replace(/[\u2014\u2013]/g, '-')
    .replace(/^i'?m assessor aid\.?\s*/i, '')
    .split(/\s+/)
    .join(' ')
    .trim()
    .toLowerCase()
  if (spoken.length < 12) return false
  if (/\*\*[^*]+\*\*/.test(String(utterance ?? ''))) return false
  if (!Array.isArray(messages)) return false
  for (const row of messages) {
    const line = String(
      row && typeof row === 'object' && 'text' in row ? (row as { text?: unknown }).text : '',
    )
      .replace(/[\u2014\u2013]/g, '-')
      .split(/\s+/)
      .join(' ')
      .trim()
      .toLowerCase()
    if (line.length < 24) continue
    if (spoken === line || spoken.startsWith(line)) return true
    if (spoken.length >= 12 && line.startsWith(spoken)) return true
  }
  return false
}

/** Drop sitting-line "Aid" bubbles so compose does not continue Copilot/Talk as Aid. */
export function peelForAidCompose<T extends { role: string; text: string }>(
  peel: T[],
  transcript: unknown,
): T[] {
  return peel.filter((row) => {
    if (row.role !== 'assistant') return true
    if (isCannedAidOpener(row.text)) return false
    return !aidUtteranceIsTranscriptEcho(row.text, transcript)
  })
}

export function composeAidPackFallback(input: {
  report?: AssessorAidReport | null
  title?: string
  messages?: unknown
}): string {
  return usableOpener(
    composeAssessorAidOpenerUtterance({
      report: input.report,
      title: input.title,
    }),
    input.messages,
  )
}

export async function runAssessorAidOpen(
  input: {
    fixtureKey: string
    sectionKey: string
    briefId: string
    modal: AssessorAidModalLike
    report?: AssessorAidReport | null
    onComposeDelta?: (fullText: string) => void
  },
  deps?: { compose?: ComposeFn },
): Promise<AssessorAidOpenResult> {
  const existing = loadAssessorAidConversation(input.fixtureKey, input.sectionKey)
  if (!aidConversationNeedsOpen(existing.messages)) {
    const last = existing.messages.filter((row) => row.role === 'assistant').at(-1)
    return {
      utterance: last?.text ?? '',
      from: 'existing',
      messages: existing.messages,
    }
  }

  const ctx = buildAssessorAidContext({
    modal: input.modal,
    report: input.report,
  })
  const fallback = usableOpener(
    composeAssessorAidOpenerUtterance({
      report: input.report,
      title: input.modal.title,
    }),
    ctx.messages,
  )
  const persist = (utterance: string): AssessorAidFixtureMessage[] => {
    const messages: AssessorAidFixtureMessage[] = [
      {
        id: `aid-open-${Date.now().toString(36)}`,
        role: 'assistant',
        text: utterance,
        at: new Date().toISOString(),
      },
    ]
    saveAssessorAidConversation({
      conversationId: `aid:${input.fixtureKey}:${input.sectionKey}`,
      fixtureKey: input.fixtureKey,
      sectionKey: input.sectionKey,
      messages,
      draft: existing.draft,
      updatedAt: new Date().toISOString(),
    })
    return messages
  }

  const compose = deps?.compose ?? composeAssessorAid
  try {
    const result = await compose({
      assessorAidContext: ctx,
      messages: [],
      situation: 'open',
      briefId: input.briefId,
      onUtteranceDelta: (_delta, full) => {
        const spoken = usableOpener(full, ctx.messages)
        if (spoken) input.onComposeDelta?.(spoken)
      },
    })
    const spoken = usableOpener(result.utterance, ctx.messages)
    if (!spoken) throw new Error('empty_aid_open')
    return { utterance: spoken, from: 'edge', messages: persist(spoken) }
  } catch (e: unknown) {
    const code =
      e instanceof DataApiError
        ? e.code
        : e instanceof Error
          ? e.message
          : 'unknown'
    if (!/missing_openai_key|not_authenticated|empty_aid_open|compose_empty/i.test(String(code))) {
      /* fall through */
    }
    if (!fallback) {
      throw e instanceof Error ? e : new Error('compose_empty')
    }
    return { utterance: fallback, from: 'fallback', messages: persist(fallback) }
  }
}
