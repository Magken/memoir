/**
 * Process grains: Edge tape_process first, tape digest fallback when LLM is missing.
 */
import { compactAssistTurnsForLeave } from './assistTurnMarks'
import { buildTimelineIndex } from './editorCapture/timelineIndex'
import { digestEditorTape } from './editorCapture/tapeDigest'
import { loadEditorTape } from './editorCapture/store'
import { getInterviewResponse } from './interviewResponse'
import {
  scoreApproachGrain,
  scoreAuthorshipGrain,
} from './processMarks'
import {
  parseBucketNotes,
  parsePasteBursts,
} from './recruiterProcess'
import { classifyTapeInsert, uniqueInsertActions } from './insertSource'
import { runInterviewToolAssess } from './toolAssessEdgeClient'
import type { AnalysisGrainStub } from './talkTypes'

function rec(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function mergeDigestExtras(
  incoming: AnalysisGrainStub,
  fallback: AnalysisGrainStub | undefined,
): AnalysisGrainStub {
  if (incoming.status !== 'filled' || !fallback || fallback.status !== 'filled') return incoming
  const lr = rec(incoming.result) ?? {}
  const dr = rec(fallback.result) ?? {}
  const bucketNotes = parseBucketNotes(lr.bucketNotes)
  const pasteBursts = parsePasteBursts(lr.pasteBursts)
  return {
    ...incoming,
    result: {
      ...dr,
      ...lr,
      ...(bucketNotes.length ? { bucketNotes } : dr.bucketNotes ? { bucketNotes: dr.bucketNotes } : {}),
      ...(pasteBursts.length ? { pasteBursts } : dr.pasteBursts ? { pasteBursts: dr.pasteBursts } : {}),
      sessionMix: lr.sessionMix ?? dr.sessionMix,
    },
  }
}

export function digestProcessGrains(input: {
  hostRef: string
  processIds: readonly string[]
  digest: ReturnType<typeof digestEditorTape>
  atlas?: ReturnType<typeof buildTimelineIndex>['atlas'] | null
  phaseId?: string
  copilotSection?: boolean
}): Record<string, AnalysisGrainStub> {
  const grains: Record<string, AnalysisGrainStub> = {}
  const shared = {
    hostRef: input.hostRef,
    digest: input.digest,
    atlas: input.atlas,
    phaseId: input.phaseId,
    copilotSection: input.copilotSection,
  }
  if (input.processIds.includes('mark.code.approach.v1')) {
    grains['mark.code.approach.v1'] = scoreApproachGrain({
      ...shared,
      templateId: 'mark.code.approach.v1',
    })
  }
  if (input.processIds.includes('mark.doc.approach.v1')) {
    grains['mark.doc.approach.v1'] = scoreApproachGrain({
      ...shared,
      templateId: 'mark.doc.approach.v1',
    })
  }
  if (input.processIds.includes('mark.code.authorship.v1')) {
    grains['mark.code.authorship.v1'] = scoreAuthorshipGrain({
      ...shared,
      templateId: 'mark.code.authorship.v1',
    })
  }
  if (input.processIds.includes('mark.doc.authorship.v1')) {
    grains['mark.doc.authorship.v1'] = scoreAuthorshipGrain({
      ...shared,
      templateId: 'mark.doc.authorship.v1',
    })
  }
  return grains
}

export async function fillProcessGrainsFromTape(input: {
  briefId: string
  phaseId: string
  hostRef: string
  processIds: readonly string[]
  tapeKind: 'coding' | 'doc'
  copilotSection?: boolean
  assess?: typeof runInterviewToolAssess
  aim?: {
    roleTitle?: string
    roleDescription?: string
    systemGoals?: string[]
    phaseTitle?: string
    phaseInstructions?: string
  } | null
}): Promise<{ grains: Record<string, AnalysisGrainStub>; source: 'llm' | 'digest' }> {
  const tape = loadEditorTape(input.briefId, input.phaseId)
  const digest = digestEditorTape(tape)
  const doc = getInterviewResponse(input.briefId)
  const index = tape
    ? buildTimelineIndex({
        tape,
        messages: doc.messages,
        phaseId: input.phaseId,
      })
    : null
  const fallback = digestProcessGrains({
    hostRef: input.hostRef,
    processIds: input.processIds,
    digest,
    atlas: index?.atlas ?? null,
    phaseId: input.phaseId,
    copilotSection: input.copilotSection,
  })
  if (!tape || !input.processIds.length) {
    return { grains: fallback, source: 'digest' }
  }
  const applyCount = digest?.actions.filter((a) => a.action === 'copilot_apply').length ?? 0
  const pasteEvidence = uniqueInsertActions(digest?.actions ?? [])
    .map((a) => {
      const detail = a.detail && typeof a.detail === 'object' ? (a.detail as Record<string, unknown>) : {}
      const excerpt = String(detail.excerpt ?? '').trim().slice(0, 200)
      if (!excerpt && !detail.wholeFile && !detail.path) return null
      const source = classifyTapeInsert(a.action, a.detail)
      return {
        t: a.t,
        ...(typeof detail.path === 'string' ? { file: detail.path } : {}),
        ...(typeof detail.chars === 'number' ? { chars: detail.chars } : {}),
        ...(excerpt ? { excerpt } : {}),
        ...(typeof detail.lineCount === 'number' ? { lineCount: detail.lineCount } : {}),
        ...(detail.wholeFile ? { wholeFile: true } : {}),
        ...(source ? { route: source } : {}),
      }
    })
    .filter(Boolean)
    .slice(0, 12)
  try {
    const assess = input.assess ?? runInterviewToolAssess
    const result = await assess({
      body: {
        kind: 'tape_process',
        briefId: input.briefId,
        hostRef: input.hostRef,
        phaseId: input.phaseId,
        tapeKind: input.tapeKind,
        timelineIndex: index?.atlas,
        afterTurnGrains: compactAssistTurnsForLeave(doc, input.hostRef),
        applyCount,
        ...(pasteEvidence.length ? { pasteEvidence } : {}),
        ...(input.aim ? { aim: input.aim } : {}),
      },
    })
    const grains: Record<string, AnalysisGrainStub> = {}
    let usedLlm = false
    for (const id of input.processIds) {
      const incoming = result.grains[id]
      if (incoming && incoming.status !== 'pending') {
        grains[id] = mergeDigestExtras(incoming, fallback[id])
        if (incoming.status === 'filled') usedLlm = true
      } else if (fallback[id]) {
        grains[id] = fallback[id]
      }
    }
    if (!Object.keys(grains).length) return { grains: fallback, source: 'digest' }
    return { grains, source: usedLlm ? 'llm' : 'digest' }
  } catch {
    return { grains: fallback, source: 'digest' }
  }
}
