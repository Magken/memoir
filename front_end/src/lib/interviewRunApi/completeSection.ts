/**
 * Stub pending marks + enqueue background assess. Next (`runCompleteSection`) then
 * `runPassGate`. Leave-after-Start calls this then `runLeaveToLanding` (no pass).
 * Assess errors do not block pass. Jobs are fire-and-forget.
 */
import type { Creator2BriefDocument } from '../interviewBrief/creator2BriefTypes'
import type { InterviewLandingView } from '../interviewBrief'
import {
  assessToolPhase,
  assessAimForPhase,
  type LastVisibleCodeRun,
  type LiveToolArtifact,
} from './buildToolAssessBody'
import { runInterviewToolAssess } from './toolAssessEdgeClient'
import {
  bumpTalkGeneration,
  ensureTopicEndFilled,
  awaitInFlightAfterTurns,
} from './discussionRunner'
import { loadEditorTape } from './editorCapture/store'
import { digestEditorTape } from './editorCapture/tapeDigest'
import { evidenceForPhase } from './referencedTurn'
import {
  appendMarkTrace,
  assembleAttemptRollup,
  getInterviewResponse,
  mergeToolAssessResult,
  skipPendingToolGrains,
  writePendingAfterToolGrains,
  writeTopicEndStub,
  type RollupSettleMode,
} from './interviewResponse'
import { logMarkingTurnDebug } from './markingTurnDiag'
import { ToolAssessError } from './toolAssessEdgeClient'
import type { MarkStageEntry } from './talkTypes'
import { peekActiveTalk, runPassGate } from './localRunner'
import { currentMarkGeneration, enqueueMarkJob, markJobsInflightCount } from './markJobs'
import {
  scheduleToolFinalTemplateIds,
  scheduleToolProcessTemplateIds,
} from './markSchedule'
import { fillProcessGrainsFromTape } from './tapeProcessMarks'
import { enqueueSessionSignals, fillHostClarity } from './sessionSignals'
import { talkLeaveTemplateIds } from './buildTalkContext'
import { fillAssistLeaveDisplay } from './assistTurnMarks'
import type { InterviewRunSnapshot } from './types'
import { resolveToolAssistCaps } from '../interviewBrief/toolAssistBundles'

export type CompleteSectionInput = {
  briefId: string
  landing: InterviewLandingView
  phaseId: string
  brief: Creator2BriefDocument | null | undefined
  /** True when the candidate pressed Start for this stage. */
  stageStarted: boolean
  isTalk: boolean
  artifact?: LiveToolArtifact | null
  lastVisibleCodeRun?: LastVisibleCodeRun | null
  /** Remark: pending overwrites filled leftover so assess re-runs. */
  resetFilled?: boolean
  /** Abort mid-flight (e.g. forfeit) — skip pass. */
  signal?: AbortSignal
  /** Tests: replace Edge + hidden code-run. */
  assessTool?: typeof assessToolPhase
  /** Tests: replace Edge session/tape assess. */
  assess?: typeof runInterviewToolAssess
}

export type CompleteSectionResult = {
  snapshot: InterviewRunSnapshot | null
  assessError: string | null
}

function toolRefForPhase(brief: Creator2BriefDocument, phaseId: string): string | null {
  const phase = brief.phases.find((p) => p.id === phaseId)
  if (!phase || !('toolRef' in phase)) return null
  return typeof phase.toolRef === 'string' ? phase.toolRef : null
}

function toolTypeForRef(brief: Creator2BriefDocument, toolRef: string): string {
  const t = String(brief.tools[toolRef]?.type ?? '')
  if (t === 'form' || t === 'form_quiz') return 'form_quiz'
  if (t === 'coding') return 'coding'
  if (t === 'doc') return 'doc'
  return t
}

function countCopilotApply(briefId: string, phaseId: string): number {
  const tape = loadEditorTape(briefId, phaseId)
  const digest = digestEditorTape(tape)
  if (!digest) return 0
  return digest.actions.filter((a) => a.action === 'copilot_apply').length
}

function rollupNow(
  brief: Creator2BriefDocument,
  briefId: string,
  settleStranded: RollupSettleMode = 'never',
): void {
  assembleAttemptRollup({
    brief,
    response: getInterviewResponse(briefId),
    settleStranded,
  })
}

/** Longest a section's marks may stay in flight before we settle without them. */
const MARK_IDLE_WATCHDOG_MS = 90_000

/** Watchdog must not skip pending grains while a peer job is still running. */
export function watchdogShouldDefer(inflight: number): boolean {
  return inflight > 0
}

/**
 * Guarantee a settled rollup for this section.
 *
 * Two independent guarantees, because either alone can miss:
 *  - a trailing job, which runs last on the serial chain once every peer is done;
 *  - a watchdog timer, for the case where a job never settles at all.
 */
function guaranteeSettledRollup(
  gen: number,
  brief: Creator2BriefDocument,
  briefId: string,
): void {
  let done = false
  let timer: ReturnType<typeof setTimeout>
  const arm = () => {
    timer = setTimeout(() => settle('watchdog'), MARK_IDLE_WATCHDOG_MS)
    ;(timer as unknown as { unref?: () => void }).unref?.()
  }
  const settle = (why: 'chain_drained' | 'watchdog') => {
    if (done) return
    if (why === 'watchdog' && watchdogShouldDefer(markJobsInflightCount())) {
      arm()
      return
    }
    done = true
    clearTimeout(timer)
    if (why === 'watchdog') {
      appendMarkTrace(getInterviewResponse(briefId), {
        hostRef: 'interview_end',
        kind: 'rollup',
        source: 'fe_job',
        stages: [
          {
            stage: 'mark_idle_watchdog',
            status: 'failed',
            ms: MARK_IDLE_WATCHDOG_MS,
            error: 'marks_never_settled',
          },
        ],
        failed: 'marks_never_settled',
      })
      logMarkingTurnDebug({
        hostRef: 'interview_end',
        kind: 'rollup',
        failed: 'marks_never_settled',
      })
    }
    rollupNow(brief, briefId, 'always')
  }

  arm()

  enqueueMarkJob(
    gen,
    async (signal) => {
      if (signal.aborted) {
        clearTimeout(timer)
        return
      }
      settle('chain_drained')
    },
    'settle_rollup',
  )
}

/**
 * Persist + log one marking stage group, then settle anything still pending.
 *
 * A mark job that throws used to be swallowed by the chain with no merge and no
 * skip, leaving pending stubs that outlived the attempt. Every job now settles.
 */
function recordMarkOutcome(input: {
  briefId: string
  hostRef: string
  phaseId: string
  kind: string
  stages: MarkStageEntry[]
  totalMs?: number
  model?: string | null
  failed?: string
  error?: unknown
  /** Reason written onto grains left pending; omit to leave them alone. */
  settleReason?: string
  /**
   * Templates this job owns. The mark chain is serial, so settling host-wide would
   * strand every stage queued behind this one.
   */
  ownedIds: readonly string[]
}): void {
  const before = getInterviewResponse(input.briefId)
  const owned = new Set(input.ownedIds)
  const stillPending = Object.entries(before.analysis.tools?.[input.hostRef] ?? {})
    .filter(([id, g]) => g.status === 'pending' && owned.has(id))
    .map(([id]) => id)

  appendMarkTrace(before, {
    hostRef: input.hostRef,
    kind: input.kind,
    phaseId: input.phaseId,
    source: 'edge',
    stages: input.stages,
    totalMs: input.totalMs,
    model: input.model,
    failed: input.failed,
  })

  if (input.settleReason && stillPending.length) {
    skipPendingToolGrains(
      getInterviewResponse(input.briefId),
      input.hostRef,
      input.settleReason,
      stillPending,
    )
  }

  logMarkingTurnDebug({
    hostRef: input.hostRef,
    kind: input.kind,
    phaseId: input.phaseId,
    stages: input.stages,
    totalMs: input.totalMs,
    model: input.model,
    failed: input.failed,
    error: input.error,
    stillPending,
  })
}

function markErrorText(e: unknown): string {
  return e instanceof Error ? e.message : typeof e === 'string' ? e : 'assess_failed'
}

/** Not worth a second call: the input is wrong, so the retry fails identically. */
function isPermanentMarkError(e: unknown): boolean {
  const message = markErrorText(e)
  return (
    message.includes('candidate_markdown_required') ||
    message.includes('unsupported_kind') ||
    message.includes('missing_openai_key') ||
    message.includes('unauthorized') ||
    message.includes('host_ref_required')
  )
}

/**
 * One retry before a stage is allowed to cost the candidate points.
 *
 * Under the expected-set denominator a failed assessor now scores 0 instead of
 * disappearing, so a single flaky Edge call would silently cost real marks.
 * Transient faults get a second chance; bad input does not.
 */
async function withOneRetry<T>(
  work: () => Promise<T>,
  onRetry: (error: unknown) => void,
  signal?: AbortSignal,
): Promise<T> {
  try {
    return await work()
  } catch (e) {
    if (signal?.aborted || isPermanentMarkError(e)) throw e
    onRetry(e)
    return work()
  }
}

/**
 * Stub pending Talk `topic_end` / tool after_tool + process + host clarity + assist
 * leave display, and enqueue Edge / process jobs. Does not complete the phase.
 * Never Start (`stageStarted` false) → no marks.
 */
export async function enqueueSectionMarks(
  input: CompleteSectionInput,
): Promise<{ assessError: string | null }> {
  let assessError: string | null = null
  const brief = input.brief ?? null
  const aborted = () => Boolean(input.signal?.aborted)
  const gen = currentMarkGeneration()

  if (input.stageStarted && brief) {
    try {
      if (aborted()) return { assessError: 'aborted' }

      if (input.isTalk) {
        const active = peekActiveTalk()
        if (
          active &&
          active.briefId === input.briefId.trim() &&
          active.ctx.phaseId === input.phaseId
        ) {
          const passState =
            active.state.status === 'ready_to_pass'
              ? active.state
              : { ...active.state, status: 'ready_to_pass' as const }
          const leave = talkLeaveTemplateIds(active.ctx.topic.analysis.templateIds)
          writeTopicEndStub(getInterviewResponse(input.briefId), {
            topicId: active.ctx.topicId,
            targets: active.ctx.topic.targets.map((t) => ({ key: t.key })),
            templateIds: leave.stubIds,
            resetFilled: input.resetFilled,
          })
          const topicRow = getInterviewResponse(input.briefId).analysis.topics[active.ctx.topicId]
          if (topicRow?.status !== 'filled' || input.resetFilled) {
            enqueueMarkJob(
              gen,
              async (signal) => {
                if (signal.aborted) return
                try {
                  await ensureTopicEndFilled({
                    ctx: active.ctx,
                    state: passState,
                    response: getInterviewResponse(input.briefId),
                    referencedEvidence: evidenceForPhase(brief, input.phaseId, getInterviewResponse(input.briefId)),
                    force: input.resetFilled,
                  })
                } catch (e) {
                  if (signal.aborted) return
                  appendMarkTrace(getInterviewResponse(input.briefId), {
                    hostRef: active.ctx.topicId,
                    kind: 'topic_end',
                    phaseId: input.phaseId,
                    source: 'fe_job',
                    stages: [
                      { stage: 'topic_end', status: 'failed', ms: 0, error: markErrorText(e) },
                    ],
                    failed: markErrorText(e),
                  })
                  logMarkingTurnDebug({
                    hostRef: active.ctx.topicId,
                    kind: 'topic_end',
                    phaseId: input.phaseId,
                    failed: markErrorText(e),
                    error: e,
                  })
                } finally {
                  rollupNow(brief, input.briefId)
                }
              },
              `topic_end:${active.ctx.topicId}`,
            )
          }
        }
      } else {
        const hostRef = toolRefForPhase(brief, input.phaseId)
        if (hostRef) {
          const tool = brief.tools[hostRef]
          const assistChat = resolveToolAssistCaps(tool?.assist).chat
          const toolType = toolTypeForRef(brief, hostRef)
          const finalIds = scheduleToolFinalTemplateIds({
            toolType,
            stored: tool?.analysis?.templateIds,
            assistChat,
          })
          writePendingAfterToolGrains(getInterviewResponse(input.briefId), {
            hostRef,
            templateIds: finalIds,
            resetFilled: input.resetFilled,
          })
          const artifact = input.artifact ?? null
          const lastVisible = input.lastVisibleCodeRun ?? null
          enqueueMarkJob(
            gen,
            async (signal) => {
              if (signal.aborted) return
              const feStages: MarkStageEntry[] = []
              try {
                const waited = await awaitInFlightAfterTurns({ signal })
                if (waited !== 'settled') {
                  // Mark anyway, but on the record: waiting forever is worse than
                  // marking with the evidence we have.
                  feStages.push({
                    stage: 'await_after_turns',
                    status: 'failed',
                    ms: 0,
                    error: waited,
                  })
                }
                if (signal.aborted) return
                const assessed = await withOneRetry(
                  () =>
                    (input.assessTool ?? assessToolPhase)({
                      brief,
                      phaseId: input.phaseId,
                      artifact,
                      lastVisibleRun: lastVisible,
                      briefId: input.briefId,
                      referencedEvidence: evidenceForPhase(
                        brief,
                        input.phaseId,
                        getInterviewResponse(input.briefId),
                      )?.assessor,
                    }),
                  (e) => {
                    feStages.push({
                      stage: 'assess_retry',
                      status: 'failed',
                      ms: 0,
                      error: markErrorText(e),
                    })
                  },
                  signal,
                )
                if (signal.aborted) return
                if (assessed) {
                  mergeToolAssessResult(
                    getInterviewResponse(input.briefId),
                    assessed.hostRef,
                    assessed.result,
                  )
                  recordMarkOutcome({
                    briefId: input.briefId,
                    hostRef: assessed.hostRef,
                    phaseId: input.phaseId,
                    kind: assessed.kind ?? 'after_tool',
                    stages: [...feStages, ...(assessed.stages ?? [])],
                    totalMs: assessed.totalMs,
                    model: assessed.model,
                    ownedIds: finalIds,
                    settleReason:
                      'Assessor returned without filling this mark — recorded as not marked.',
                  })
                } else {
                  // `null` means no body could be built for this phase. Silent
                  // before, which left the pending stubs stranded.
                  recordMarkOutcome({
                    briefId: input.briefId,
                    hostRef,
                    phaseId: input.phaseId,
                    kind: 'after_tool',
                    stages: feStages,
                    failed: 'assess_returned_null',
                    ownedIds: finalIds,
                    settleReason:
                      'Marking could not run for this stage — recorded as not marked.',
                  })
                }
              } catch (e) {
                if (signal.aborted) return
                const diag = e instanceof ToolAssessError ? e.diag : undefined
                recordMarkOutcome({
                  briefId: input.briefId,
                  hostRef,
                  phaseId: input.phaseId,
                  kind: diag?.kind ?? 'after_tool',
                  stages: [...feStages, ...(diag?.stages ?? [])],
                  totalMs: diag?.totalMs,
                  model: diag?.model,
                  failed: diag?.failed ?? markErrorText(e),
                  error: e,
                  ownedIds: finalIds,
                  settleReason: `Marking failed for this stage (${markErrorText(e)}).`,
                })
              } finally {
                rollupNow(brief, input.briefId)
              }
            },
            `after_tool:${hostRef}`,
          )

          const processIds = scheduleToolProcessTemplateIds({
            toolType,
            stored: tool?.analysis?.templateIds,
            assistChat,
          })
          if (processIds.length) {
            writePendingAfterToolGrains(getInterviewResponse(input.briefId), {
              hostRef,
              templateIds: processIds,
              resetFilled: input.resetFilled,
            })
            enqueueMarkJob(
              gen,
              async (signal) => {
                if (signal.aborted) return
                try {
                  await awaitInFlightAfterTurns({ signal })
                  if (signal.aborted) return
                  const filled = await fillProcessGrainsFromTape({
                    briefId: input.briefId,
                    phaseId: input.phaseId,
                    hostRef,
                    processIds,
                    tapeKind: toolType === 'doc' ? 'doc' : 'coding',
                    copilotSection: assistChat,
                    assess: input.assess,
                    aim: assessAimForPhase(brief, input.phaseId),
                  })
                  if (signal.aborted) return
                  mergeToolAssessResult(getInterviewResponse(input.briefId), hostRef, {
                    grains: filled.grains,
                  })
                  recordMarkOutcome({
                    briefId: input.briefId,
                    hostRef,
                    phaseId: input.phaseId,
                    kind: 'tape_process',
                    stages: [{ stage: 'tape_process', status: 'ok', ms: 0 }],
                    ownedIds: processIds,
                    settleReason:
                      'Process marking returned without filling these marks — recorded as not marked.',
                  })
                } catch (e) {
                  if (signal.aborted) return
                  recordMarkOutcome({
                    briefId: input.briefId,
                    hostRef,
                    phaseId: input.phaseId,
                    kind: 'tape_process',
                    stages: [
                      { stage: 'tape_process', status: 'failed', ms: 0, error: markErrorText(e) },
                    ],
                    failed: markErrorText(e),
                    error: e,
                    ownedIds: processIds,
                    settleReason: `Process marking failed for this stage (${markErrorText(e)}).`,
                  })
                } finally {
                  rollupNow(brief, input.briefId)
                }
              },
              `tape_process:${hostRef}`,
            )
          }

          writePendingAfterToolGrains(getInterviewResponse(input.briefId), {
            hostRef,
            templateIds: ['sig.clarity.v1'],
            resetFilled: input.resetFilled,
          })
          enqueueMarkJob(
            gen,
            async (signal) => {
              if (signal.aborted) return
              try {
                await awaitInFlightAfterTurns({ signal })
                if (signal.aborted) return
                const filled = await fillHostClarity({
                  briefId: input.briefId,
                  brief,
                  phaseId: input.phaseId,
                  hostRef,
                  assess: input.assess,
                })
                if (signal.aborted) return
                mergeToolAssessResult(getInterviewResponse(input.briefId), hostRef, {
                  grains: filled,
                })
                recordMarkOutcome({
                  briefId: input.briefId,
                  hostRef,
                  phaseId: input.phaseId,
                  kind: 'session_clarity',
                  stages: [{ stage: 'sig.clarity.v1', status: 'ok', ms: 0 }],
                  ownedIds: ['sig.clarity.v1'],
                  settleReason:
                    'Clarity marking returned without filling this mark — recorded as not marked.',
                })
              } catch (e) {
                if (signal.aborted) return
                recordMarkOutcome({
                  briefId: input.briefId,
                  hostRef,
                  phaseId: input.phaseId,
                  kind: 'session_clarity',
                  stages: [
                    { stage: 'sig.clarity.v1', status: 'failed', ms: 0, error: markErrorText(e) },
                  ],
                  failed: markErrorText(e),
                  error: e,
                  ownedIds: ['sig.clarity.v1'],
                  settleReason: `Clarity marking failed for this stage (${markErrorText(e)}).`,
                })
              } finally {
                rollupNow(brief, input.briefId)
              }
            },
            `session_clarity:${hostRef}`,
          )

          if (assistChat) {
            enqueueMarkJob(
              gen,
              async (signal) => {
                if (signal.aborted) return
                try {
                  await fillAssistLeaveDisplay({
                    briefId: input.briefId,
                    hostRef,
                    phaseId: input.phaseId,
                    applyCount: countCopilotApply(input.briefId, input.phaseId),
                    signal,
                  })
                  if (signal.aborted) return
                  recordMarkOutcome({
                    briefId: input.briefId,
                    hostRef,
                    phaseId: input.phaseId,
                    kind: 'assist_turn',
                    stages: [{ stage: 'mark.assist.use.v1', status: 'ok', ms: 0 }],
                    ownedIds: ['mark.assist.use.v1'],
                    settleReason:
                      'Assist marking returned without filling this mark — recorded as not marked.',
                  })
                } catch (e) {
                  if (signal.aborted) return
                  recordMarkOutcome({
                    briefId: input.briefId,
                    hostRef,
                    phaseId: input.phaseId,
                    kind: 'assist_turn',
                    stages: [
                      {
                        stage: 'mark.assist.use.v1',
                        status: 'failed',
                        ms: 0,
                        error: markErrorText(e),
                      },
                    ],
                    failed: markErrorText(e),
                    error: e,
                    ownedIds: ['mark.assist.use.v1'],
                    settleReason: `Assist marking failed for this stage (${markErrorText(e)}).`,
                  })
                } finally {
                  rollupNow(brief, input.briefId)
                }
              },
              `assist_turn:${hostRef}`,
            )
          }
        }
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        return { assessError: 'aborted' }
      }
      assessError =
        e instanceof Error ? e.message : typeof e === 'string' ? e : 'assess_failed'
    }
    guaranteeSettledRollup(gen, brief, input.briefId)
  }

  return { assessError }
}

/**
 * Stub pending marks, enqueue Edge / process jobs, then mark completed via runPassGate.
 */
export async function runCompleteSection(
  input: CompleteSectionInput,
): Promise<CompleteSectionResult> {
  const { assessError } = await enqueueSectionMarks(input)
  const aborted = () => Boolean(input.signal?.aborted)
  const brief = input.brief ?? null

  if (aborted() || assessError === 'aborted') {
    return { snapshot: null, assessError: 'aborted' }
  }

  bumpTalkGeneration()
  const snapshot = runPassGate({
    briefId: input.briefId,
    landing: input.landing,
    phaseId: input.phaseId,
    brief,
  })

  if (brief) {
    rollupNow(brief, input.briefId)
    if (snapshot.mode === 'finished') {
      enqueueSessionSignals({
        briefId: input.briefId,
        brief,
        assess: input.assess,
      })
    }
  }

  return { snapshot, assessError }
}

