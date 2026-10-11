/**
 * Deterministic process / assist-use grains from tape digest + assist slice. No LLM.
 */
import type { AnalysisGrainStub, InterviewResponseMessage } from './talkTypes'
import type { TapeDigest } from './editorCapture/tapeDigest'
import type { TimelineIndex } from './editorCapture/timelineIndex'
import { uniqueInsertActions } from './insertSource'
import {
  digestBucketNotes,
  digestPasteBursts,
  stageSessionMix,
  type RecruiterBucketNote,
  type RecruiterPasteBurst,
  type RecruiterSessionMix,
} from './recruiterProcess'

function dim(
  key: string,
  label: string,
  score: 'weak' | 'mixed' | 'strong',
  notes?: string,
): { key: string; label: string; score: string; notes?: string } {
  return { key, label, score, ...(notes ? { notes } : {}) }
}

function bandFromCount(n: number, mixedAt: number, strongAt: number): 'weak' | 'mixed' | 'strong' {
  if (n >= strongAt) return 'strong'
  if (n >= mixedAt) return 'mixed'
  return 'weak'
}

function invertBand(b: 'weak' | 'mixed' | 'strong'): 'weak' | 'mixed' | 'strong' {
  if (b === 'weak') return 'strong'
  if (b === 'strong') return 'weak'
  return 'mixed'
}

function countActions(digest: TapeDigest, name: string): number {
  return digest.actions.filter((a) => a.action === name).length
}

function pasteActionCount(digest: TapeDigest): number {
  return uniqueInsertActions(digest.actions).filter((a) => a.action !== 'copilot_apply').length
}

function patchCountOf(digest: TapeDigest): number {
  return Math.max(0, digest.patchCount ?? 0)
}

/** Patches, runs, bot applies, or pastes. Opening a starter file is not work. */
export function digestHasEditorWork(digest: TapeDigest): boolean {
  return (
    patchCountOf(digest) > 0 ||
    countActions(digest, 'run') > 0 ||
    countActions(digest, 'copilot_apply') > 0 ||
    pasteActionCount(digest) > 0
  )
}

function mixFor(
  digest: TapeDigest,
  input: { phaseId?: string; hostRef: string; essay: boolean },
): RecruiterSessionMix | null {
  if (!input.phaseId) return null
  return stageSessionMix({
    phaseId: input.phaseId,
    toolRef: input.hostRef,
    bucket: input.essay ? 'essay' : 'codingMethod',
    digest,
  })
}

function approachCopy(digest: TapeDigest): { summary: string; justification: string } {
  const runs = countActions(digest, 'run')
  const paste = pasteActionCount(digest)
  const applies = countActions(digest, 'copilot_apply')
  const files = digest.filesTouched?.length ?? 0
  const patches = patchCountOf(digest)
  const bits = [
    files ? `${files} file${files === 1 ? '' : 's'}` : '',
    runs ? `${runs} run${runs === 1 ? '' : 's'}` : '',
    applies ? `${applies} bot edit${applies === 1 ? '' : 's'}` : '',
    paste ? `${paste} paste${paste === 1 ? '' : 's'}` : '',
    patches ? `${patches} typed edit${patches === 1 ? '' : 's'}` : '',
  ].filter(Boolean)
  const justification = bits.length
    ? `Session mix from the tape: ${bits.join(', ')}. Idle gaps stay idle.`
    : 'Editor work was recorded; idle gaps stay idle.'
  const summary =
    files || runs
      ? `Worked across ${files || 1} file${files === 1 ? '' : 's'} with ${runs} run${runs === 1 ? '' : 's'}.`
      : applies && !patches
        ? `Bot edits dominate this stage (${applies} apply${applies === 1 ? '' : 's'}).`
        : `Typed ${patches} edit${patches === 1 ? '' : 's'} on this stage.`
  return { summary, justification }
}

function skipGrain(input: {
  templateId: string
  hostRef: string
  order: number
  why: string
}): AnalysisGrainStub {
  return {
    templateId: input.templateId,
    hostRef: input.hostRef,
    grain: 'after_tool',
    order: input.order,
    status: 'skipped',
    result: null,
    justification: input.why,
    confidence: 'low',
  }
}

export function scoreApproachGrain(input: {
  templateId: 'mark.code.approach.v1' | 'mark.doc.approach.v1'
  hostRef: string
  digest: TapeDigest | null
  atlas?: TimelineIndex['atlas'] | null
  phaseId?: string
  copilotSection?: boolean
}): AnalysisGrainStub {
  const digest = input.digest
  if (!digest) {
    return skipGrain({
      templateId: input.templateId,
      hostRef: input.hostRef,
      order: 20,
      why: 'No editor tape — process mark skipped.',
    })
  }
  if (!digestHasEditorWork(digest)) {
    return skipGrain({
      templateId: input.templateId,
      hostRef: input.hostRef,
      order: 20,
      why: 'No editor work on the tape — process mark skipped.',
    })
  }
  const runs = countActions(digest, 'run')
  const files = digest.filesTouched?.length ?? 0
  const patches = patchCountOf(digest)
  const exploration = bandFromCount(Math.max(files, countActions(digest, 'open_file')), 1, 3)
  const iteration = bandFromCount(patches, 8, 24)
  const debugging = bandFromCount(runs, 1, 3)
  const planfulness = digest.cadence.medianGapMs > 2500 ? 'strong' : digest.cadence.medianGapMs > 800 ? 'mixed' : 'weak'
  const copy = approachCopy(digest)
  const bucketNotes: RecruiterBucketNote[] = digestBucketNotes(input.atlas, digest)
  const mix = mixFor(digest, {
    phaseId: input.phaseId,
    hostRef: input.hostRef,
    essay: input.templateId.startsWith('mark.doc.'),
  })
  return {
    templateId: input.templateId,
    hostRef: input.hostRef,
    grain: 'after_tool',
    order: 20,
    status: 'filled',
    result: {
      cadence: digest.cadence,
      filesTouched: digest.filesTouched ?? [],
      boardSummary: copy.summary,
      boardSummaryDetail: copy.justification,
      ...(bucketNotes.length ? { bucketNotes } : {}),
      ...(mix ? { sessionMix: mix } : {}),
    },
    dimensions: [
      dim('exploration', 'Exploration', exploration),
      dim('iteration', 'Iteration', iteration),
      dim('debugging', 'Debugging', debugging),
      dim('planfulness', 'Planfulness', planfulness),
    ],
    justification: copy.justification,
    evidenceRefs: digest.actions.slice(0, 6).map((a) => ({
      kind: 'tape_action',
      ref: a.action,
      t: a.t,
    })),
    confidence: 'med',
  }
}

export function scoreAuthorshipGrain(input: {
  templateId?: 'mark.doc.authorship.v1' | 'mark.code.authorship.v1'
  hostRef: string
  digest: TapeDigest | null
  atlas?: TimelineIndex['atlas'] | null
  phaseId?: string
  copilotSection?: boolean
}): AnalysisGrainStub {
  const templateId = input.templateId ?? 'mark.doc.authorship.v1'
  const digest = input.digest
  if (!digest) {
    return skipGrain({
      templateId,
      hostRef: input.hostRef,
      order: 21,
      why: 'No editor tape — authorship skipped.',
    })
  }
  if (!digestHasEditorWork(digest)) {
    return skipGrain({
      templateId,
      hostRef: input.hostRef,
      order: 21,
      why: 'No editor work on the tape — authorship skipped.',
    })
  }
  const paste = pasteActionCount(digest)
  const patches = patchCountOf(digest)
  const applies = countActions(digest, 'copilot_apply')
  const botDominates = applies > 0 && applies >= patches && paste === 0
  const dumped = paste > 0 && paste > patches / 3
  const score: 'weak' | 'mixed' | 'strong' = botDominates || dumped
    ? 'weak'
    : patches > 12 && paste < 3 && applies === 0
      ? 'strong'
      : 'mixed'
  const pasteBursts: RecruiterPasteBurst[] = digestPasteBursts(digest, input.atlas)
  const copy = botDominates
    ? {
        summary: 'Bot edits dominate this stage.',
        justification: 'Bot edits dominate typed patches on this stage.',
      }
    : dumped
      ? {
          summary: 'Pastes were large relative to typing cadence.',
          justification: 'Large pastes relative to typing cadence.',
        }
      : {
          summary: 'Iterated typing dominates paste.',
          justification: 'Iterated typing dominates paste.',
        }
  const mix = mixFor(digest, {
    phaseId: input.phaseId,
    hostRef: input.hostRef,
    essay: templateId.startsWith('mark.doc.'),
  })
  return {
    templateId,
    hostRef: input.hostRef,
    grain: 'after_tool',
    order: 21,
    status: 'filled',
    result: {
      paste,
      tickCount: patches,
      boardSummary: copy.summary,
      boardSummaryDetail: copy.justification,
      ...(pasteBursts.length ? { pasteBursts } : {}),
      ...(mix ? { sessionMix: mix } : {}),
    },
    dimensions: [dim('human_agency', 'Human agency', score)],
    justification: copy.justification,
    confidence: 'med',
    evidenceRefs: [{ kind: 'tape_stat', ref: 'paste', quote: String(paste) }],
  }
}

export function scoreAssistUseGrain(input: {
  hostRef: string
  phaseId: string
  messages: readonly InterviewResponseMessage[]
  digest: TapeDigest | null
  chat: boolean
  copilotSection?: boolean
}): AnalysisGrainStub {
  const templateId = 'mark.assist.use.v1'
  if (!input.chat) {
    return skipGrain({
      templateId,
      hostRef: input.hostRef,
      order: 22,
      why: 'Assist chat is off for this stage.',
    })
  }
  const slice = input.messages.filter(
    (m) => m.phaseId === input.phaseId && (m.kind === 'assist' || m.role === 'candidate'),
  )
  const assistMsgs = slice.filter((m) => m.kind === 'assist' || m.role === 'assistant')
  const candidateAssist = slice.filter((m) => m.role === 'candidate')
  const applies = input.digest ? countActions(input.digest, 'copilot_apply') : 0
  if (!assistMsgs.length && !candidateAssist.length && applies === 0) {
    return skipGrain({
      templateId,
      hostRef: input.hostRef,
      order: 22,
      why: 'No assist messages on this stage.',
    })
  }
  const asked = bandFromCount(candidateAssist.length, 1, 3)
  const over = bandFromCount(applies + assistMsgs.length, 4, 8)
  const judgment = applies > 0 && candidateAssist.length > 0 ? 'strong' : applies > 2 ? 'weak' : 'mixed'
  const integrity = input.digest && pasteActionCount(input.digest) > 6 ? 'weak' : 'strong'
  const mix = input.digest
    ? mixFor(input.digest, { phaseId: input.phaseId, hostRef: input.hostRef, essay: false })
    : null
  return {
    templateId,
    hostRef: input.hostRef,
    grain: 'after_tool',
    order: 22,
    status: 'filled',
    result: {
      assistTurns: assistMsgs.length,
      candidateTurns: candidateAssist.length,
      copilotApply: applies,
      boardSummary: `Assist ${assistMsgs.length} turn${assistMsgs.length === 1 ? '' : 's'}, Copilot apply ${applies}. Session mix, not percent of the file.`,
      ...(mix ? { sessionMix: mix } : {}),
    },
    dimensions: [
      dim(
        'asked_well',
        'Asked well',
        asked,
        candidateAssist.length
          ? `They sent ${candidateAssist.length} peel ask${candidateAssist.length === 1 ? '' : 's'} on this stage.`
          : applies
            ? 'They applied Copilot without a peel ask on this stage.'
            : undefined,
      ),
      dim(
        'over_reliance',
        'Over-reliance',
        invertBand(over),
        `Copilot apply ${applies}, assist sends ${assistMsgs.length}.`,
      ),
      dim(
        'applied_judgment',
        'Applied judgment',
        judgment,
        applies > 0
          ? `They applied Copilot ${applies} time${applies === 1 ? '' : 's'}${candidateAssist.length ? ' after asking' : ''}.`
          : 'No Copilot apply on the tape.',
      ),
      dim('integrity', 'Integrity', integrity),
    ],
    justification: 'Assist-use from stage chat plus Copilot apply counts on the tape.',
    confidence: 'med',
    evidenceRefs: candidateAssist.slice(0, 4).map((m) => ({
      kind: 'messageId',
      ref: m.id,
      quote: m.text.slice(0, 80),
    })),
  }
}
