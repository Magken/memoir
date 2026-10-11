/**
 * Assist after_turn stubs — dedicated id list, never catalog afterTurnEligible.
 * Talk after_turn allowlists stay afterTurnTemplateIds only.
 */
import { awaitInFlightAfterTurns, trackAfterTurnWork } from './discussionRunner'
import {
  getInterviewResponse,
  mergeToolAssessResult,
  saveInterviewResponse,
  writePendingAfterToolGrains,
} from './interviewResponse'
import { currentMarkGeneration, enqueueMarkJob } from './markJobs'
import { runInterviewToolAssess } from './toolAssessEdgeClient'
import { scoreAssistUseGrain } from './processMarks'
import { loadEditorTape } from './editorCapture/store'
import { digestEditorTape } from './editorCapture/tapeDigest'
import type { AnalysisGrainStub, InterviewResponse, InterviewResponseMessage } from './talkTypes'
import type { AssistLiveComposition } from './sanitizeLiveComposition'

export const ASSIST_TURN_TEMPLATE_ID = 'mark.assist.use.v1'
export const ASSIST_AFTER_TURN_IDS = [ASSIST_TURN_TEMPLATE_ID] as const

export function isAssistTurnTemplateId(templateId: string): boolean {
  return templateId === ASSIST_TURN_TEMPLATE_ID
}

function dimensionShells(): AnalysisGrainStub['dimensions'] {
  return [
    { key: 'asked_well', label: 'Asked well', score: '' },
    { key: 'over_reliance', label: 'Over-reliance', score: '' },
    { key: 'applied_judgment', label: 'Applied judgment', score: '' },
    { key: 'integrity', label: 'Integrity', score: '' },
  ]
}

/** Explicit stub writer — does not call afterTurnTemplateIds. */
export function writePendingAssistTurnGrains(
  doc: InterviewResponse,
  input: {
    messageId: string
    hostRef: string
    order: number
  },
): InterviewResponse {
  const turns = { ...doc.analysis.turns }
  const row = { ...(turns[input.messageId] ?? {}) }
  if (row[ASSIST_TURN_TEMPLATE_ID]) return doc
  row[ASSIST_TURN_TEMPLATE_ID] = {
    templateId: ASSIST_TURN_TEMPLATE_ID,
    hostRef: input.hostRef,
    grain: 'after_turn',
    order: input.order,
    status: 'pending',
    result: null,
    dimensions: dimensionShells(),
    justification: '',
  }
  turns[input.messageId] = row
  return saveInterviewResponse({
    ...doc,
    analysis: { ...doc.analysis, turns },
  })
}

export function mergeFilledAssistTurnGrains(
  doc: InterviewResponse,
  messageId: string,
  grains: Record<string, AnalysisGrainStub>,
): InterviewResponse {
  const incoming = grains[ASSIST_TURN_TEMPLATE_ID]
  if (!incoming) return doc
  const turns = { ...doc.analysis.turns }
  const row = { ...(turns[messageId] ?? {}) }
  const status: AnalysisGrainStub['status'] =
    incoming.status === 'skipped' || incoming.status === 'pending' ? incoming.status : 'filled'
  row[ASSIST_TURN_TEMPLATE_ID] = {
    ...row[ASSIST_TURN_TEMPLATE_ID],
    ...incoming,
    templateId: ASSIST_TURN_TEMPLATE_ID,
    hostRef: incoming.hostRef || row[ASSIST_TURN_TEMPLATE_ID]?.hostRef || '',
    grain: 'after_turn',
    status,
  }
  turns[messageId] = row
  return saveInterviewResponse({
    ...doc,
    analysis: { ...doc.analysis, turns },
  })
}

export function skipPendingAssistTurnGrains(
  doc: InterviewResponse,
  phaseId: string,
  reason = 'Stage forfeited — remaining assist marks skipped.',
): InterviewResponse {
  const id = phaseId.trim()
  if (!id) return doc
  const messageIds = new Set(
    doc.messages.filter((m) => m.phaseId === id).map((m) => m.id),
  )
  const turns = { ...doc.analysis.turns }
  let changed = false
  for (const [messageId, row] of Object.entries(turns)) {
    if (!messageIds.has(messageId)) continue
    const grain = row?.[ASSIST_TURN_TEMPLATE_ID]
    if (!grain || grain.status !== 'pending') continue
    turns[messageId] = {
      ...row,
      [ASSIST_TURN_TEMPLATE_ID]: {
        ...grain,
        status: 'skipped',
        justification: reason,
        confidence: 'low',
      },
    }
    changed = true
  }
  if (!changed) return doc
  return saveInterviewResponse({
    ...doc,
    analysis: { ...doc.analysis, turns },
  })
}

export function compactAssistTurnsForLeave(
  doc: InterviewResponse,
  hostRef: string,
): Record<string, Record<string, Partial<AnalysisGrainStub>>> {
  const out: Record<string, Record<string, Partial<AnalysisGrainStub>>> = {}
  for (const [messageId, row] of Object.entries(doc.analysis.turns ?? {})) {
    const g = row?.[ASSIST_TURN_TEMPLATE_ID]
    if (!g || g.hostRef !== hostRef) continue
    if (g.status !== 'filled' && g.status !== 'skipped') continue
    out[messageId] = {
      [ASSIST_TURN_TEMPLATE_ID]: {
        status: g.status,
        dimensions: g.dimensions,
        justification: g.justification,
        evidence: g.evidence,
        evidenceRefs: g.evidenceRefs,
      },
    }
  }
  return out
}

function threadSlice(
  messages: readonly InterviewResponseMessage[],
  phaseId: string,
  cap = 8,
): Array<{ id: string; role: string; text: string; kind: string; at?: string }> {
  return messages
    .filter((m) => m.phaseId === phaseId)
    .slice(-cap)
    .map((m) => ({
      id: m.id,
      role: m.role,
      text: m.text.slice(0, 600),
      kind: m.kind,
      ...(m.at?.trim() ? { at: m.at.trim() } : {}),
    }))
}

/** Exported for unit gates — assist_turn thread payload must carry send times. */
export function assistMarkThreadSlice(
  messages: readonly InterviewResponseMessage[],
  phaseId: string,
  cap = 8,
) {
  return threadSlice(messages, phaseId, cap)
}

/** Non-blocking after_turn. Does not use catalog afterTurnEligible. */
export function enqueueAssistTurnMark(input: {
  briefId: string
  hostRef: string
  phaseId: string
  messageId: string
  message: InterviewResponseMessage
  liveComposition?: AssistLiveComposition | null
}): void {
  let doc = getInterviewResponse(input.briefId)
  doc = writePendingAssistTurnGrains(doc, {
    messageId: input.messageId,
    hostRef: input.hostRef,
    order: Object.keys(doc.analysis.turns ?? {}).length + 1,
  })
  const gen = currentMarkGeneration()
  enqueueMarkJob(gen, async (signal) => {
    const work = (async () => {
      if (signal.aborted) return
      const fresh = getInterviewResponse(input.briefId)
      try {
        const result = await runInterviewToolAssess({
          body: {
            kind: 'assist_turn',
            mode: 'turn',
            briefId: input.briefId,
            hostRef: input.hostRef,
            phaseId: input.phaseId,
            messageId: input.messageId,
            message: {
              id: input.message.id,
              phaseId: input.message.phaseId,
              role: input.message.role,
              text: input.message.text,
              kind: input.message.kind,
              at: input.message.at,
            },
            thread: threadSlice(fresh.messages, input.phaseId),
            liveComposition: input.liveComposition ?? null,
          },
        })
        if (signal.aborted) return
        mergeFilledAssistTurnGrains(
          getInterviewResponse(input.briefId),
          input.messageId,
          result.grains,
        )
      } catch {
        mergeFilledAssistTurnGrains(getInterviewResponse(input.briefId), input.messageId, {
          [ASSIST_TURN_TEMPLATE_ID]: {
            templateId: ASSIST_TURN_TEMPLATE_ID,
            hostRef: input.hostRef,
            grain: 'after_turn',
            order: 1,
            status: 'skipped',
            result: null,
            justification: 'Assist turn mark failed — skipped so Soft Decision does not hang.',
            confidence: 'low',
          },
        })
      }
    })()
    trackAfterTurnWork(work)
    await work
  })
}

export async function fillAssistLeaveDisplay(input: {
  briefId: string
  hostRef: string
  phaseId: string
  applyCount?: number
  signal?: AbortSignal
}): Promise<void> {
  await awaitInFlightAfterTurns({ signal: input.signal })
  if (input.signal?.aborted) return
  const packed = compactAssistTurnsForLeave(getInterviewResponse(input.briefId), input.hostRef)
  writePendingAfterToolGrains(getInterviewResponse(input.briefId), {
    hostRef: input.hostRef,
    templateIds: [ASSIST_TURN_TEMPLATE_ID],
  })
  if (!Object.keys(packed).length) {
    const fresh = getInterviewResponse(input.briefId)
    const digest = digestEditorTape(loadEditorTape(input.briefId, input.phaseId))
    mergeToolAssessResult(getInterviewResponse(input.briefId), input.hostRef, {
      grains: {
        [ASSIST_TURN_TEMPLATE_ID]: scoreAssistUseGrain({
          hostRef: input.hostRef,
          phaseId: input.phaseId,
          messages: fresh.messages ?? [],
          digest,
          chat: true,
        }),
      },
    })
    return
  }
  const fresh = getInterviewResponse(input.briefId)
  const result = await runInterviewToolAssess({
    body: {
      kind: 'assist_turn',
      mode: 'leave',
      briefId: input.briefId,
      hostRef: input.hostRef,
      phaseId: input.phaseId,
      afterTurnGrains: packed,
      applyCount: input.applyCount ?? 0,
      thread: threadSlice(fresh.messages, input.phaseId, 16),
    },
  })
  if (input.signal?.aborted) return
  mergeToolAssessResult(getInterviewResponse(input.briefId), input.hostRef, result)
}
