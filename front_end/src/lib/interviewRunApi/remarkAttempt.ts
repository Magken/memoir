/**
 * Re-mark a saved sitting. Never restarts or opens a new attempt.
 */
import type { Creator2BriefDocument, Creator2Phase } from '../interviewBrief/creator2BriefTypes'
import type { CodeEditorPayload, DocEditorPayload } from '../editorContext/types'
import { DEFAULT_PAGE_SETUP } from '../docEditor/pageSetup'
import type { TestFormDocument } from '../testForm/types'
import type { InterviewLandingView } from '../interviewBrief/interviewLandingView'
import { buildTalkContext, talkLeaveTemplateIds } from './buildTalkContext'
import type { LastVisibleCodeRun, LiveToolArtifact } from './buildToolAssessBody'
import { assessToolPhase } from './buildToolAssessBody'
import { enqueueSectionMarks } from './completeSection'
import { ensureTopicEndFilled } from './discussionRunner'
import { loadEditorTape } from './editorCapture/store'
import {
  appendMarkTrace,
  assembleAttemptRollup,
  getInterviewResponse,
  saveInterviewResponse,
  writeTopicEndStub,
} from './interviewResponse'
import { currentMarkGeneration, enqueueMarkJob } from './markJobs'
import { enqueueSessionSignals } from './sessionSignals'
import { evidenceForPhase } from './referencedTurn'
import type { InterviewResponse, TalkRuntimeState } from './talkTypes'
import { runInterviewToolAssess } from './toolAssessEdgeClient'

function sittingHasWork(response: InterviewResponse): boolean {
  return Boolean(
    response.completedPhaseIds.length ||
      response.skippedPhaseIds.length ||
      response.messages.length ||
      Object.keys(response.analysis.tools ?? {}).length ||
      Object.keys(response.analysis.topics ?? {}).length,
  )
}

function remarkState(phaseId: string, response: InterviewResponse): TalkRuntimeState {
  const started = Date.parse(response.startedAt)
  return {
    phaseId,
    status: 'ready_to_pass',
    activeProbeIndex: 0,
    followUpsOnActiveProbe: 0,
    probesAsked: 0,
    candidateTurns: response.messages.filter((m) => m.role === 'candidate' && m.phaseId === phaseId)
      .length,
    startedAt: Number.isFinite(started) ? started : Date.now(),
    softTimeSent: true,
    draft: '',
    messages: [],
    openBeat: 'done',
  }
}

function rec(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function artifactFromTape(
  briefId: string,
  phase: Creator2Phase,
  brief: Creator2BriefDocument,
): LiveToolArtifact | null {
  if (phase.kind !== 'tool' || !('toolRef' in phase)) return null
  const tape = loadEditorTape(briefId, phase.id)
  const snap = rec(tape?.final) ?? rec(tape?.initial)
  const tool = brief.tools?.[String(phase.toolRef)]
  const kind = String(tool?.type ?? tape?.kind ?? '')
  if (kind === 'coding' && snap) {
    const files = Array.isArray(snap.files) ? snap.files : []
    const payload: CodeEditorPayload = {
      title: String(snap.title ?? ''),
      files: files.map((row) => {
        const file = rec(row) ?? {}
        return {
          path: String(file.path ?? ''),
          language: String(file.language ?? ''),
          content: String(file.content ?? ''),
        }
      }),
      openIds: Array.isArray(snap.openIds) ? snap.openIds.map((id) => String(id)) : [],
      activeId: typeof snap.activeId === 'string' ? snap.activeId : null,
    }
    return { kind: 'coding', payload }
  }
  if ((kind === 'doc' || kind === 'writing') && snap) {
    const payload: DocEditorPayload = {
      title: String(snap.title ?? ''),
      markdown: String(snap.markdown ?? ''),
      pageSetup: DEFAULT_PAGE_SETUP,
    }
    return { kind: 'doc', payload }
  }
  if ((kind === 'form' || kind === 'form_quiz') && snap && tool) {
    const document = {
      ...tool,
      attempt: { responses: rec(snap.responses) ?? {} },
    } as unknown as TestFormDocument
    return { kind: 'form', document }
  }
  return null
}

function markErrorText(e: unknown): string {
  return e instanceof Error ? e.message : typeof e === 'string' ? e : 'assess_failed'
}

export async function remarkAttempt(input: {
  briefId: string
  brief: Creator2BriefDocument | null | undefined
  assessTool?: typeof assessToolPhase
  assess?: typeof runInterviewToolAssess
  lastVisibleCodeRun?: LastVisibleCodeRun | null
}): Promise<{ enqueued: boolean; reason?: string }> {
  const brief = input.brief ?? null
  if (!brief) return { enqueued: false, reason: 'no_brief' }
  const response = getInterviewResponse(input.briefId)
  if (!sittingHasWork(response)) return { enqueued: false, reason: 'no_sitting' }
  const completed = new Set(response.completedPhaseIds)
  const skipped = new Set(response.skippedPhaseIds ?? [])
  const landing: InterviewLandingView = {
    title: '',
    roleTitle: '',
    description: '',
    ownerLabel: '',
    interviewerName: null,
    coverUrl: null,
    coverNodeId: null,
    estimatedMinutes: null,
    sectionCount: 0,
    sections: [],
    hasInProgressAttempt: true,
  }
  const gen = currentMarkGeneration()
  let enqueued = false
  for (const phase of brief.phases) {
    if (!completed.has(phase.id) || skipped.has(phase.id)) continue
    if (phase.kind === 'discussion') {
      const ctx = buildTalkContext({
        briefId: input.briefId,
        brief,
        phaseId: phase.id,
      })
      if (!ctx) continue
      const leave = talkLeaveTemplateIds(ctx.topic.analysis.templateIds)
      const priorRuntime = getInterviewResponse(input.briefId).talkRuntime
      writeTopicEndStub(getInterviewResponse(input.briefId), {
        topicId: ctx.topicId,
        targets: ctx.topic.targets.map((t) => ({ key: t.key })),
        templateIds: leave.stubIds,
        resetFilled: true,
      })
      enqueueMarkJob(
        gen,
        async (signal) => {
          if (signal.aborted) return
          try {
            await ensureTopicEndFilled({
              ctx,
              state: remarkState(phase.id, getInterviewResponse(input.briefId)),
              response: getInterviewResponse(input.briefId),
              referencedEvidence: evidenceForPhase(
                brief,
                phase.id,
                getInterviewResponse(input.briefId),
              ),
              force: true,
            })
          } catch (e) {
            if (signal.aborted) return
            appendMarkTrace(getInterviewResponse(input.briefId), {
              hostRef: ctx.topicId,
              kind: 'topic_end',
              phaseId: phase.id,
              source: 'fe_job',
              stages: [
                { stage: 'topic_end', status: 'failed', ms: 0, error: markErrorText(e) },
              ],
              failed: markErrorText(e),
            })
          } finally {
            const next = getInterviewResponse(input.briefId)
            if (next.talkRuntime !== priorRuntime) {
              saveInterviewResponse({ ...next, talkRuntime: priorRuntime })
            }
            assembleAttemptRollup({
              brief,
              response: getInterviewResponse(input.briefId),
            })
          }
        },
        `topic_end:${ctx.topicId}`,
      )
      enqueued = true
      continue
    }
    await enqueueSectionMarks({
      briefId: input.briefId,
      landing,
      phaseId: phase.id,
      brief,
      stageStarted: true,
      isTalk: false,
      artifact: artifactFromTape(input.briefId, phase, brief),
      lastVisibleCodeRun: input.lastVisibleCodeRun ?? null,
      resetFilled: true,
      assessTool: input.assessTool,
      assess: input.assess,
    })
    enqueued = true
  }
  if (!enqueued) return { enqueued: false, reason: 'no_phases' }
  enqueueSessionSignals({
    briefId: input.briefId,
    brief,
    assess: input.assess,
  })
  return { enqueued: true }
}
