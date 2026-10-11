import type { Creator2BriefDocument } from '../interviewBrief/creator2BriefTypes'
import type { InterviewLandingSection, InterviewLandingView } from '../interviewBrief'
import { TALK_KIND_LABEL } from '../interviewBrief/interviewLandingView'
import {
  gateKindFromLandingLabel,
  pickRandomStartPrompt,
} from '../interviewBrief/gateStartPrompts'
import {
  clearGateProgress,
  closedPhaseIds,
  emptyGateProgress,
  hasInProgressGateAttempt,
  loadGateProgress,
  nextOpenGateId,
  saveGateProgress,
  type InterviewGateProgress,
} from '../interviewBrief/interviewGateProgress'
import { buildTalkContext } from './buildTalkContext'
import { evidenceForPhase } from './referencedTurn'
import {
  abandonTalk,
  applyTalkTurn,
  bumpTalkGeneration,
  finalizeTalkTopic,
  resetTalkPhase,
  setTalkDraft,
  startTalkSession,
  toTalkRuntimeView,
} from './discussionRunner'
import { candidateAssistChromeFromBrief } from '../interviewBrief/candidateAssistChrome'
import { buildGatePreamble } from './gatePreamble'
import { toolKindFromGateLabel } from './resolveGateToolMount'
import {
  assembleAttemptRollup,
  downloadInterviewResponseJson,
  ensureInterviewResponse,
  exportInterviewResponseJson,
  getInterviewResponse,
  restartInterviewResponseKeepingIntake,
  skipPendingToolGrains,
  syncResponseProgress,
} from './interviewResponse'
import { downloadEditorTapesJson } from './editorCapture/store'
import { bumpMarkJobGeneration } from './markJobs'
import { skipPendingAssistTurnGrains } from './assistTurnMarks'
import { enqueueSessionSignals } from './sessionSignals'
import { resetTelemetrySession } from './sessionTelemetry'
import { resolveBriefDocument } from './resolveBriefDocument'
import { clearCandidateCvNoteCache } from './resolveCandidateCvNote'
import { previousGateTitle } from './composeAssistOpenerUtterance'
import { sectionIndexFromLanding } from './dayMemory/broaderContext'
import type {
  InterviewGateView,
  InterviewRunSnapshot,
  LeaveInput,
  OpenAttemptInput,
  PassGateInput,
  StartTalkInput,
  TalkMenuInput,
  TalkTurnInput,
} from './types'
import type { TalkContext, TalkRuntimeState, TalkRuntimeView } from './talkTypes'

function talkSectionMemory(input: {
  landing: InterviewLandingView
  phaseId: string
  completedPhaseIds?: readonly string[]
  skippedPhaseIds?: readonly string[]
}) {
  return {
    sectionIndex: sectionIndexFromLanding(input.landing.sections),
    previousSectionTitle: previousGateTitle({
      sections: input.landing.sections,
      currentPhaseId: input.phaseId,
      completedPhaseIds: input.completedPhaseIds,
      skippedPhaseIds: input.skippedPhaseIds,
    }),
  }
}

import { FIXTURE_INTERVIEW_BRIEF_ID } from './fixtureBriefId'

export {
  FIXTURE_INTERVIEW_BRIEF_ID,
  FIXTURE_INTERVIEW_BRIEF_ID_MOBILE,
  isFixtureInterviewBriefId,
  readInterviewFixtureIsMobile,
} from './fixtureBriefId'

type ActiveTalkSession = {
  briefId: string
  ctx: TalkContext
  state: TalkRuntimeState
}

let activeTalk: ActiveTalkSession | null = null

function clearActiveTalk(): void {
  activeTalk = null
}

/** Read-only peek for complete-section Talk assess (do not mutate). */
export function peekActiveTalk(): ActiveTalkSession | null {
  return activeTalk
}

function safeStageLabel(sections: readonly InterviewLandingSection[], phaseId: string): string {
  const kindTotals = new Map<string, number>()
  for (const section of sections) {
    kindTotals.set(section.kindLabel, (kindTotals.get(section.kindLabel) ?? 0) + 1)
  }
  const kindSeen = new Map<string, number>()
  for (const section of sections) {
    const seen = (kindSeen.get(section.kindLabel) ?? 0) + 1
    kindSeen.set(section.kindLabel, seen)
    if (section.id !== phaseId) continue
    const total = kindTotals.get(section.kindLabel) ?? 1
    const base = section.kindLabel === 'Coding' ? 'Coding challenge' : section.kindLabel
    return total <= 1 ? base : `${base} ${seen}`
  }
  return 'Stage'
}

function resolveTalkContext(
  briefId: string,
  phaseId: string,
  brief?: Creator2BriefDocument | null,
): TalkContext | null {
  const doc = resolveBriefDocument({ briefId, brief })
  if (!doc) return null
  return buildTalkContext({ briefId, brief: doc, phaseId })
}

function pickOpener(
  landing: InterviewLandingView,
  phaseId: string,
  briefId: string,
  brief?: Creator2BriefDocument | null,
): { startPrompt: string; startPromptId: string; isTalk: boolean; talkCtx: TalkContext | null } {
  const section = landing.sections.find((s) => s.id === phaseId)
  const kind = gateKindFromLandingLabel(section?.kindLabel ?? TALK_KIND_LABEL)
  const isTalk = kind === 'talk'
  const talkCtx = isTalk ? resolveTalkContext(briefId, phaseId, brief) : null
  if (talkCtx) {
    return {
      startPrompt: talkCtx.opener.text,
      startPromptId: talkCtx.opener.probeId,
      isTalk: true,
      talkCtx,
    }
  }
  const sample = pickRandomStartPrompt(kind)
  return {
    startPrompt: sample.startPrompt,
    startPromptId: sample.id,
    /** Landing kind wins — missing brief body must not demote Talk to a tool gate. */
    isTalk,
    talkCtx: null,
  }
}

function buildGateView(
  landing: InterviewLandingView,
  phaseId: string,
  _startPrompt: string,
  startPromptId: string,
  isTalk: boolean,
  _completedPhaseIds: readonly string[] = [],
  ordinalPhaseIds?: readonly string[],
  brief?: Creator2BriefDocument | null,
): InterviewGateView | null {
  const sections = landing.sections
  const section = sections.find((s) => s.id === phaseId)
  if (!section) return null
  const orderIds = ordinalPhaseIds ?? runnablePhaseIds(landing)
  const index = orderIds.findIndex((id) => id === phaseId)
  if (index < 0) return null
  const stageLabel = safeStageLabel(sections, phaseId)
  const title = section.title.trim() || stageLabel
  const description = section.description.trim()
  const ordinal = index + 1
  const toolKind = isTalk ? null : toolKindFromGateLabel(section.kindLabel)
  const limitMinutes =
    section.timed && typeof section.minutes === 'number' && section.minutes > 0
      ? section.minutes
      : null
  const assistChrome = isTalk ? undefined : candidateAssistChromeFromBrief(brief, phaseId)
  return {
    phaseId,
    stageLabel,
    title,
    description,
    kindLabel: section.kindLabel,
    timeLabel: section.timeLabel,
    timed: section.timed,
    limitMinutes,
    isTalk,
    toolKind,
    startPromptId,
    /**
     * Conversational intro belongs in Talk peel (`composeTalkOpenerUtterance`),
     * not on the gate scene — title + description + preamble only here.
     */
    introMessage: '',
    preamble: buildGatePreamble({
      kindLabel: section.kindLabel,
      timed: section.timed,
      timeLabel: section.timeLabel,
      index: ordinal,
      assist: assistChrome
        ? { candidateNotice: assistChrome.candidateNotice, label: assistChrome.label }
        : null,
    }),
    assistChrome,
    index: ordinal,
    total: orderIds.length,
  }
}

function withAttemptFlag(
  landing: InterviewLandingView,
  progress: InterviewGateProgress,
): InterviewLandingView {
  return {
    ...landing,
    hasInProgressAttempt: hasInProgressGateAttempt(progress),
  }
}

function talkView(): TalkRuntimeView | null {
  if (!activeTalk) return null
  return toTalkRuntimeView(activeTalk.ctx, activeTalk.state)
}

/**
 * Full candidate spine order (Talk + Form/Coding/Writing).
 * Tool mounts are live; Next still free-passes after assess enqueue.
 */
function runnablePhaseIds(landing: InterviewLandingView): string[] {
  return landing.sections.map((s) => s.id)
}

function snapshot(
  briefId: string,
  landing: InterviewLandingView,
  progress: InterviewGateProgress,
  mode: InterviewRunSnapshot['mode'],
  gate: InterviewGateView | null,
): InterviewRunSnapshot {
  let response = ensureInterviewResponse(briefId)
  response = syncResponseProgress(
    response,
    progress.completedPhaseIds,
    progress.skippedPhaseIds ?? [],
  )
  return {
    briefId,
    mode,
    progress,
    gate,
    landing: withAttemptFlag(landing, progress),
    completedPhaseIds: progress.completedPhaseIds,
    skippedPhaseIds: progress.skippedPhaseIds ?? [],
    talk: talkView(),
    response,
  }
}

function openGate(
  briefId: string,
  landing: InterviewLandingView,
  progress: InterviewGateProgress,
  phaseId: string,
  samplePrompt: string,
  sampleId: string,
  isTalk: boolean,
  brief?: Creator2BriefDocument | null,
): InterviewRunSnapshot {
  clearActiveTalk()
  const next = saveGateProgress({
    ...progress,
    briefId,
    status: 'in_progress',
    activeStartPrompt: samplePrompt,
    activeStartPromptId: sampleId,
  })
  const gate = buildGateView(
    landing,
    phaseId,
    samplePrompt,
    sampleId,
    isTalk,
    next.completedPhaseIds,
    runnablePhaseIds(landing),
    brief,
  )
  return snapshot(briefId, landing, next, 'gate', gate)
}

/** Read progress only (no mutation). */
export function getProgress(briefId: string): InterviewGateProgress {
  return loadGateProgress(briefId.trim() || FIXTURE_INTERVIEW_BRIEF_ID)
}

/**
 * Open or resume the next pending gate. Talk uses authored probe opener when brief resolves.
 */
export function runOpenAttempt(input: OpenAttemptInput): InterviewRunSnapshot {
  const briefId = input.briefId.trim() || FIXTURE_INTERVIEW_BRIEF_ID
  const phaseIds = runnablePhaseIds(input.landing)
  let progress = loadGateProgress(briefId)
  const closed = closedPhaseIds(progress)
  if (progress.status === 'completed' || nextOpenGateId(phaseIds, closed) == null) {
    clearActiveTalk()
    progress = saveGateProgress({
      ...progress,
      briefId,
      status: 'completed',
      activeStartPrompt: null,
      activeStartPromptId: null,
    })
    return snapshot(briefId, input.landing, progress, 'finished', null)
  }

  const openId = nextOpenGateId(phaseIds, closed)!
  const opener = pickOpener(input.landing, openId, briefId, input.brief)
  return openGate(
    briefId,
    input.landing,
    progress,
    openId,
    opener.startPrompt,
    opener.startPromptId,
    opener.isTalk,
    input.brief,
  )
}

/** Pass the current gate. Talk exit budget is not required (harness free-pass). */
export function runPassGate(input: PassGateInput): InterviewRunSnapshot {
  const briefId = input.briefId.trim() || FIXTURE_INTERVIEW_BRIEF_ID
  const phaseIds = runnablePhaseIds(input.landing)
  let progress = loadGateProgress(briefId)
  const closed = closedPhaseIds(progress)
  const openId = nextOpenGateId(phaseIds, closed)

  if (
    activeTalk &&
    activeTalk.briefId === briefId &&
    activeTalk.ctx.phaseId === input.phaseId
  ) {
    let response = getInterviewResponse(briefId)
    const passState =
      activeTalk.state.status === 'ready_to_pass'
        ? activeTalk.state
        : { ...activeTalk.state, status: 'ready_to_pass' as const }
    response = finalizeTalkTopic({
      ctx: activeTalk.ctx,
      state: passState,
      response,
    })
    bumpTalkGeneration()
    clearActiveTalk()
  }

  if (openId == null) {
    clearActiveTalk()
    progress = saveGateProgress({
      ...progress,
      briefId,
      status: 'completed',
      activeStartPrompt: null,
      activeStartPromptId: null,
    })
    return snapshot(briefId, input.landing, progress, 'finished', null)
  }
  if (openId !== input.phaseId) {
    const opener = pickOpener(input.landing, openId, briefId, input.brief)
    progress = saveGateProgress({
      ...progress,
      briefId,
      status: 'in_progress',
      activeStartPrompt: opener.startPrompt,
      activeStartPromptId: opener.startPromptId,
    })
    const gate = buildGateView(
      input.landing,
      openId,
      opener.startPrompt,
      opener.startPromptId,
      opener.isTalk,
      progress.completedPhaseIds,
      undefined,
      input.brief,
    )
    return snapshot(briefId, input.landing, progress, 'gate', gate)
  }

  const completedPhaseIds = [...progress.completedPhaseIds]
  if (!completedPhaseIds.includes(input.phaseId)) completedPhaseIds.push(input.phaseId)

  const nextClosed = [...completedPhaseIds, ...(progress.skippedPhaseIds ?? [])]
  const nextId = nextOpenGateId(phaseIds, nextClosed)
  if (nextId == null) {
    clearActiveTalk()
    progress = saveGateProgress({
      ...progress,
      briefId,
      completedPhaseIds,
      status: 'completed',
      activeStartPrompt: null,
      activeStartPromptId: null,
    })
    return snapshot(briefId, input.landing, progress, 'finished', null)
  }

  const opener = pickOpener(input.landing, nextId, briefId, input.brief)
  return openGate(
    briefId,
    input.landing,
    { ...progress, completedPhaseIds },
    nextId,
    opener.startPrompt,
    opener.startPromptId,
    opener.isTalk,
    input.brief,
  )
}

/**
 * Leave to landing. Untimed or leave-without-forfeit: keep stage open for Continue.
 * Explicit forfeit: skipped — cannot resume it.
 */
export function runLeaveToLanding(input: LeaveInput): InterviewRunSnapshot {
  const briefId = input.briefId.trim() || FIXTURE_INTERVIEW_BRIEF_ID
  let progress = loadGateProgress(briefId)
  const phaseId = input.phaseId?.trim() || null
  const forfeit = Boolean(input.forfeit)

  if (
    activeTalk &&
    activeTalk.briefId === briefId &&
    (!phaseId || activeTalk.ctx.phaseId === phaseId)
  ) {
    const response = getInterviewResponse(briefId)
    abandonTalk({
      ctx: activeTalk.ctx,
      state: activeTalk.state,
      response,
      reason: forfeit ? 'explicit_forfeit' : 'left_to_landing',
    })
    clearActiveTalk()
  } else {
    bumpTalkGeneration()
  }

  if (forfeit && phaseId) {
    const hostRef = input.brief?.phases.find((p) => p.id === phaseId)
    const toolRef =
      hostRef && 'toolRef' in hostRef && typeof hostRef.toolRef === 'string'
        ? hostRef.toolRef
        : null
    const skippedPhaseIds = [...(progress.skippedPhaseIds ?? [])]
    if (!skippedPhaseIds.includes(phaseId) && !progress.completedPhaseIds.includes(phaseId)) {
      skippedPhaseIds.push(phaseId)
    }
    const closed = [...progress.completedPhaseIds, ...skippedPhaseIds]
    const phaseIds = runnablePhaseIds(input.landing)
    const hasMore = nextOpenGateId(phaseIds, closed) != null
    if (toolRef) {
      if (hasMore) bumpMarkJobGeneration()
      skipPendingToolGrains(getInterviewResponse(briefId), toolRef)
      skipPendingAssistTurnGrains(getInterviewResponse(briefId), phaseId)
    }
    if (input.brief) {
      assembleAttemptRollup({
        brief: input.brief,
        response: getInterviewResponse(briefId),
      })
    }
    progress = saveGateProgress({
      ...progress,
      briefId,
      skippedPhaseIds,
      status: hasMore ? 'in_progress' : 'completed',
      activeStartPrompt: null,
      activeStartPromptId: null,
    })
    if (!hasMore && input.brief) {
      enqueueSessionSignals({ briefId, brief: input.brief })
      return snapshot(briefId, input.landing, progress, 'finished', null)
    }
    return snapshot(briefId, input.landing, progress, 'landing', null)
  }

  if (progress.status === 'not_started' && progress.completedPhaseIds.length === 0) {
    progress = emptyGateProgress(briefId)
  } else if (progress.status !== 'completed') {
    progress = saveGateProgress({
      ...progress,
      briefId,
      status: 'in_progress',
    })
  }
  return snapshot(briefId, input.landing, progress, 'landing', null)
}

/**
 * Explicit forfeit then open the next incomplete gate (or finished).
 */
export function runForfeitAndContinue(input: LeaveInput): InterviewRunSnapshot {
  runLeaveToLanding({
    ...input,
    forfeit: true,
  })
  return runOpenAttempt({
    briefId: input.briefId,
    landing: input.landing,
    brief: input.brief,
  })
}

/** Clear local progress and response JSON; return a fresh landing snapshot. */
export function runRestartAttempt(input: OpenAttemptInput): InterviewRunSnapshot {
  const briefId = input.briefId.trim() || FIXTURE_INTERVIEW_BRIEF_ID
  bumpMarkJobGeneration()
  clearActiveTalk()
  clearGateProgress(briefId)
  restartInterviewResponseKeepingIntake(briefId)
  resetTelemetrySession()
  clearCandidateCvNoteCache()
  const progress = emptyGateProgress(briefId)
  return snapshot(briefId, input.landing, progress, 'landing', null)
}

/** Hydrate landing mode with progress (page load). */
export function runHydrateLanding(input: OpenAttemptInput): InterviewRunSnapshot {
  const briefId = input.briefId.trim() || FIXTURE_INTERVIEW_BRIEF_ID
  clearActiveTalk()
  const progress = loadGateProgress(briefId)
  const phaseIds = runnablePhaseIds(input.landing)
  const closed = closedPhaseIds(progress)
  if (progress.status === 'completed' || (phaseIds.length > 0 && nextOpenGateId(phaseIds, closed) == null)) {
    const done =
      progress.status === 'completed'
        ? progress
        : saveGateProgress({
            ...progress,
            briefId,
            status: 'completed',
            activeStartPrompt: null,
            activeStartPromptId: null,
          })
    return snapshot(briefId, input.landing, done, 'landing', null)
  }
  return snapshot(briefId, input.landing, progress, 'landing', null)
}

/** Start Talk chat after in-gate Start — seeds opener into chat + InterviewResponse. */
export async function runStartTalk(input: StartTalkInput): Promise<InterviewRunSnapshot> {
  const briefId = input.briefId.trim() || FIXTURE_INTERVIEW_BRIEF_ID
  const progress = loadGateProgress(briefId)
  const talkCtx = resolveTalkContext(briefId, input.phaseId, input.brief)
  const gateBase = buildGateView(
    input.landing,
    input.phaseId,
    progress.activeStartPrompt ?? talkCtx?.opener.text ?? '',
    progress.activeStartPromptId ?? talkCtx?.opener.probeId ?? '',
    Boolean(talkCtx),
    progress.completedPhaseIds,
    undefined,
    input.brief,
  )

  if (!talkCtx || !gateBase) {
    return snapshot(briefId, input.landing, progress, 'gate', gateBase)
  }

  const response = getInterviewResponse(briefId)
  const sectionMemory = talkSectionMemory({
    landing: input.landing,
    phaseId: input.phaseId,
    completedPhaseIds: progress.completedPhaseIds,
    skippedPhaseIds: progress.skippedPhaseIds,
  })
  const started = await startTalkSession({
    ctx: talkCtx,
    response,
    ...sectionMemory,
    referencedEvidence: evidenceForPhase(input.brief, input.phaseId, response),
    onComposeDelta: input.onComposeDelta,
    onProgress: input.onProgress,
  })
  activeTalk = { briefId, ctx: talkCtx, state: started.state }
  return snapshot(briefId, input.landing, progress, 'gate', gateBase)
}

/** Candidate Talk turn (Edge OpenAI compose + analysis; FE InterviewResponse SSOT). */
export async function runTalkTurn(input: TalkTurnInput): Promise<InterviewRunSnapshot> {
  const briefId = input.briefId.trim() || FIXTURE_INTERVIEW_BRIEF_ID
  const progress = loadGateProgress(briefId)
  if (!activeTalk || activeTalk.briefId !== briefId) {
    return snapshot(briefId, input.landing, progress, 'gate', null)
  }
  const response = getInterviewResponse(briefId)
  const result = await applyTalkTurn({
    ctx: activeTalk.ctx,
    state: activeTalk.state,
    response,
    referencedEvidence: evidenceForPhase(input.brief, activeTalk.ctx.phaseId, response),
    text: input.text,
    ...talkSectionMemory({
      landing: input.landing,
      phaseId: activeTalk.ctx.phaseId,
      completedPhaseIds: progress.completedPhaseIds,
      skippedPhaseIds: progress.skippedPhaseIds,
    }),
    onComposeDelta: input.onComposeDelta,
  })
  activeTalk = { briefId, ctx: activeTalk.ctx, state: result.state }
  const gate = buildGateView(
    input.landing,
    activeTalk.ctx.phaseId,
    progress.activeStartPrompt ?? activeTalk.ctx.opener.text,
    progress.activeStartPromptId ?? activeTalk.ctx.opener.probeId,
    true,
    progress.completedPhaseIds,
    undefined,
    input.brief,
  )
  const snap = snapshot(briefId, input.landing, progress, 'gate', gate)
  return {
    ...snap,
    talk: result.view,
  }
}

export function runTalkDraft(input: { briefId: string; draft: string }): TalkRuntimeView | null {
  if (!activeTalk || activeTalk.briefId !== input.briefId.trim()) return null
  activeTalk = {
    ...activeTalk,
    state: setTalkDraft(activeTalk.state, input.draft),
  }
  return toTalkRuntimeView(activeTalk.ctx, activeTalk.state)
}

/** Chat menu harness actions. */
export async function runTalkMenu(input: TalkMenuInput): Promise<InterviewRunSnapshot> {
  const briefId = input.briefId.trim() || FIXTURE_INTERVIEW_BRIEF_ID
  const progress = loadGateProgress(briefId)

  if (input.action === 'copy_response_json' && typeof navigator !== 'undefined') {
    void navigator.clipboard?.writeText(exportInterviewResponseJson(briefId))
  }
  if (input.action === 'download_response_json') {
    downloadInterviewResponseJson(briefId)
  }
  if (input.action === 'download_editor_tapes') {
    downloadEditorTapesJson(briefId)
  }
  if (input.action === 'reset_talk' && activeTalk && activeTalk.briefId === briefId) {
    const reset = await resetTalkPhase({
      ctx: activeTalk.ctx,
      response: getInterviewResponse(briefId),
    })
    activeTalk = { briefId, ctx: activeTalk.ctx, state: reset.state }
  }

  const phaseId = activeTalk?.ctx.phaseId ?? progress.activeStartPromptId
  const gatePhase =
    activeTalk?.ctx.phaseId ??
    nextOpenGateId(runnablePhaseIds(input.landing), closedPhaseIds(progress))
  const gate = gatePhase
    ? buildGateView(
        input.landing,
        gatePhase,
        progress.activeStartPrompt ?? activeTalk?.ctx.opener.text ?? '',
        progress.activeStartPromptId ?? activeTalk?.ctx.opener.probeId ?? '',
        Boolean(activeTalk),
        progress.completedPhaseIds,
        undefined,
        input.brief,
      )
    : null
  void phaseId
  return snapshot(briefId, input.landing, progress, 'gate', gate)
}

export { exportInterviewResponseJson, getInterviewResponse }
