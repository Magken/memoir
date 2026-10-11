import { afterTurnTemplateIds, talkLeaveTemplateIds } from './buildTalkContext'
import { afterTurnSkipCopy, planAfterTurnForUtterance } from './afterTurnSchedule'
import {
  buildPriorTalkMemory,
  currentPhaseMessages,
  priorPhaseMessages,
} from './buildPriorTalkMemory'
import { composeTalkOpenerUtterance } from './composeTalkOpenerUtterance'
import {
  looksLikeDay1Reintro,
  scrubContinuingDayOpen,
  softenDemandingRegister,
} from './scrubContinuingDayOpen'
import { stripToFinalAsk } from './stripToFinalAsk'
import { decideTalkTurn } from './discussionDecide'
import { isThinUtterance, classifyNameCheckReply, candidateWordCount } from './candidateSignals'
import { createTalkTurnProfile } from './talkTurnDebug'
import {
  appendResponseMessage,
  appendMarkTrace,
  getInterviewResponse,
  markResponsePartial,
  mergeFilledAfterTurnGrains,
  mergeFilledTopicEnd,
  drainPendingAfterTurnGrains,
  drainAllPendingAfterTurnGrains,
  persistBotNotes,
  persistTalkRuntime,
  resetPhaseInResponse,
  setResponsePhasePointer,
  compactAfterTurnPack,
  writePendingAfterTurnGrains,
  writeSkippedAfterTurnGrains,
  writeTopicEndStub,
} from './interviewResponse'
import { logMarkingTurnDebug } from './markingTurnDiag'
import { resolveCandidateCvNote } from './resolveCandidateCvNote'
import { planDayMemory, retrieveDayMemory } from './dayMemory'
import {
  coercePersistNotes,
  formatBotNotesForRetrieve,
  formatStandingNotes,
  normalizeBotNotes,
} from './dayMemory/botNotes'
import {
  bindPriorSectionNeeds,
  broaderContextPlan,
  coerceNeedRetrievalNeeds,
  mergeMemoryNeeds,
  mergeRetrievedPacks,
  resolvePreviousPhaseId,
  type PriorSectionOpts,
  type SectionIndexEntry,
} from './dayMemory/broaderContext'
import type { ReferencedEvidencePack } from './referencedEvidence'
import {
  alwaysOnReferencedPatch,
  bindRefs,
  composeDayMeta,
  retrieveReferencedArg,
} from './referencedTurn'
import { resolveInterviewEdgeAccessToken } from './edgeAccessToken'
import type { DayMemoryPlanResult } from './dayMemory/dayMemoryEdgeClient'
import { edgeAfterTurn, edgeComposeCues, edgeComposeTalk, edgeTopicEnd } from './talkEdgeClient'
import { runTalkComposePasses } from './talkComposePasses'
import type {
  AnalysisGrainStub,
  CandidateSignal,
  InterviewResponse,
  InterviewResponseMessageKind,
  TalkContext,
  TalkMessage,
  TalkOpenBeat,
  TalkRuntimeState,
  TalkRuntimeView,
} from './talkTypes'

type TopicEndStubTargets = import('./talkTypes').TopicEndStub['targets']

/** Bumped on pass / forfeit / abandon so late after_turn cannot rewrite talkRuntime. */
let talkGeneration = 0
/** In-flight topic_end from decide-close — Next reuses instead of double-calling Edge. */
let inFlightTopicEnd: Promise<InterviewResponse> | null = null
/** In-flight after_turn merge work. Leave awaits these before packing topic_end. */
const inFlightAfterTurns = new Set<Promise<void>>()

export function trackAfterTurnWork(work: Promise<unknown>): void {
  const tracked = Promise.resolve(work).then(
    () => undefined,
    () => undefined,
  )
  inFlightAfterTurns.add(tracked)
  void tracked.finally(() => {
    inFlightAfterTurns.delete(tracked)
  })
}

/** Longest a mark job will wait for after_turn work before marking without it. */
export const AFTER_TURN_WAIT_BUDGET_MS = 20_000

export type AfterTurnWaitOutcome = 'settled' | 'timeout' | 'aborted'

/**
 * Wait for in-flight after_turn merges, bounded.
 *
 * The loop is re-entrant by design (new work can land while we wait), so with no
 * budget a single never-settling promise — or a steady trickle of new work — parks
 * every queued mark job forever with no error and no trace. Every mark-path caller
 * sits behind this, which made it a single point of silent hang.
 */
export async function awaitInFlightAfterTurns(options?: {
  timeoutMs?: number
  signal?: AbortSignal
}): Promise<AfterTurnWaitOutcome> {
  const budget = options?.timeoutMs ?? AFTER_TURN_WAIT_BUDGET_MS
  const deadline = Date.now() + budget

  while (inFlightAfterTurns.size > 0) {
    if (options?.signal?.aborted) return 'aborted'
    const remaining = deadline - Date.now()
    if (remaining <= 0) return 'timeout'

    // Not unref'd: this timer is the only thing that will resolve the race when the
    // tracked work never settles, so it must keep the loop alive until it fires.
    let timer: ReturnType<typeof setTimeout> | undefined
    const expiry = new Promise<AfterTurnWaitOutcome>((resolve) => {
      timer = setTimeout(() => resolve('timeout'), remaining)
    })
    try {
      const outcome = await Promise.race([
        Promise.all([...inFlightAfterTurns]).then<AfterTurnWaitOutcome>(() => 'settled'),
        expiry,
      ])
      if (outcome === 'timeout') return 'timeout'
    } finally {
      if (timer) clearTimeout(timer)
    }
  }
  return 'settled'
}

export function bumpTalkGeneration(): void {
  talkGeneration += 1
  inFlightTopicEnd = null
}

export function getTalkGeneration(): number {
  return talkGeneration
}

/**
 * Ensure topic_end is filled for this topic (idempotent).
 * Awaits in-flight after_turn, packs merged grains, then leftover + rollup + synth.
 */
export async function ensureTopicEndFilled(input: {
  ctx: TalkContext
  state: TalkRuntimeState
  response: InterviewResponse
  accessToken?: string | null
  referencedEvidence?: ReferencedEvidencePack | null
  /** Re-mark a filled topic (Remark). Default keeps the first fill. */
  force?: boolean
}): Promise<InterviewResponse> {
  if (inFlightTopicEnd) {
    try {
      return await inFlightTopicEnd
    } catch {
      /* fall through to fresh call / stub */
    }
  }
  await awaitInFlightAfterTurns()
  let response = getInterviewResponse(input.ctx.briefId)
  const existing = response.analysis.topics[input.ctx.topicId]
  if (existing?.status === 'filled' && !input.force) return response
  response = drainAllPendingAfterTurnGrains(response)
  const leave = talkLeaveTemplateIds(input.ctx.topic.analysis.templateIds)
  response = writeTopicEndStub(response, {
    topicId: input.ctx.topicId,
    targets: input.ctx.topic.targets.map((t) => ({ key: t.key })),
    templateIds: leave.stubIds,
    resetFilled: Boolean(input.force),
  })
  const afterTurnGrains = compactAfterTurnPack(response, input.ctx.topicId)
  const run = (async () => {
    try {
      const accessToken =
        input.accessToken ?? (await resolveInterviewEdgeAccessToken())
      const topic = await edgeTopicEnd({
        briefId: input.ctx.briefId,
        talkContext: input.ctx,
        messages: response.messages,
        talkRuntime: input.state,
        templateIds: leave.leftover,
        rollupTemplateIds: leave.rollup,
        afterTurnGrains,
        accessToken,
        referencedEvidence: input.referencedEvidence?.index.length
          ? input.referencedEvidence.assessor
          : undefined,
      })
      response = mergeFilledTopicEnd(getInterviewResponse(input.ctx.briefId), input.ctx.topicId, {
        synthesisText: topic.synthesisText ?? '',
        targets: (topic.targets ?? {}) as TopicEndStubTargets,
        byTemplate: (topic.byTemplate ?? {}) as never,
      })
      logMarkingTurnDebug({
        hostRef: input.ctx.topicId,
        kind: 'topic_end',
        phaseId: input.ctx.phaseId,
        stages: leave.leftover.map((stage) => ({ stage, status: 'ok' as const, ms: 0 })),
      })
      return persistTalkRuntime(response, input.ctx, input.state)
    } catch (e) {
      const failed = e instanceof Error ? e.message : String(e ?? 'topic_end_failed')
      appendMarkTrace(getInterviewResponse(input.ctx.briefId), {
        hostRef: input.ctx.topicId,
        kind: 'topic_end',
        phaseId: input.ctx.phaseId,
        source: 'fe_job',
        stages: [{ stage: 'topic_end', status: 'failed', ms: 0, error: failed }],
        failed,
      })
      logMarkingTurnDebug({
        hostRef: input.ctx.topicId,
        kind: 'topic_end',
        phaseId: input.ctx.phaseId,
        failed,
        error: e,
      })
      return persistTalkRuntime(getInterviewResponse(input.ctx.briefId), input.ctx, input.state)
    }
  })()
  inFlightTopicEnd = run
  try {
    return await run
  } finally {
    if (inFlightTopicEnd === run) inFlightTopicEnd = null
  }
}

/** Compact after_turn cues for compose (never dump full grains). */
export function composeCuesFromGrains(
  grains: Record<string, AnalysisGrainStub | unknown>,
): string[] {
  const cues: string[] = []
  for (const raw of Object.values(grains)) {
    if (!raw || typeof raw !== 'object') continue
    const g = raw as AnalysisGrainStub
    if (g.confidence === 'low') cues.push('no_usable_evidence')
    if (!Array.isArray(g.evidence) || g.evidence.length === 0) {
      cues.push('no_usable_evidence')
    }
    for (const d of g.dimensions ?? []) {
      const score = typeof d.score === 'number' ? d.score : Number(d.score)
      const max = typeof d.max === 'number' ? d.max : 5
      if (!Number.isNaN(score) && score <= Math.ceil(max / 3)) {
        cues.push(`${d.key}:low`)
      }
    }
  }
  return [...new Set(cues)].slice(0, 6)
}

/**
 * Instant decide → craft cues (always available before Edge compose_cues).
 * Same vocabulary as grain-derived cues so compose few-shots stay familiar.
 */
export function alreadyDugOwnershipFromMessages(
  messages: Array<{ role?: string; kind?: string; text?: string; probeId?: string | null }>,
  probeId?: string | null,
): boolean {
  const stems = [
    'personally decide',
    'yours alone',
    'i still hear we',
    'still hear we',
    'personally own',
    'who declared',
    'who proposed',
    'what decision',
    'call did you make',
  ]
  return messages.some((m) => {
    if (m.role !== 'assistant') return false
    if (probeId && m.probeId && m.probeId !== probeId) return false
    const t = String(m.text ?? '').toLowerCase()
    return stems.some((s) => t.includes(s))
  })
}

export function composeCuesFromDecide(input: {
  situation: string
  signals: CandidateSignal[] | string[]
  missingGaps?: string[]
  alreadyDugOwnership?: boolean
  ownershipPushed?: boolean
  elastic?: boolean
  alreadyThin?: boolean
}): string[] {
  const cues: string[] = []
  const signals = new Set(input.signals.map(String))
  if (input.elastic) cues.push('elastic')
  if (signals.has('social_rapport')) {
    cues.push('social_meld')
  } else if (signals.has('gibberish') || signals.has('non_answer')) {
    cues.push('no_usable_evidence')
  }
  if (signals.has('vague')) cues.push('clarity:low')
  if (signals.has('short')) cues.push('specificity:low')
  if (input.alreadyThin) cues.push('vary_ask')
  if (input.alreadyDugOwnership) {
    cues.push('vary_ask')
    cues.push('already_dug_ownership')
  } else if (signals.has('collective_we') && !input.elastic) {
    cues.push('ownership:low')
  }
  if (input.ownershipPushed) cues.push('ownership:pushed')
  if (signals.has('ask_for_example')) cues.push('need_example')
  if (signals.has('meta_clarify')) cues.push('meta_clarify')
  if (input.situation === 'deepen' && !input.alreadyDugOwnership && !input.elastic) {
    cues.push('deepen_ownership')
  }
  if (input.situation === 'probe_gap' || input.situation === 'follow_up') {
    cues.push('gap_evidence')
  }
  for (const gap of input.missingGaps ?? []) {
    const g = String(gap).trim().toLowerCase().replace(/\s+/g, '_')
    if (g) cues.push(`gap:${g}`.slice(0, 40))
  }
  return [...new Set(cues)].slice(0, 6)
}

const COMPOSE_CUES_BUDGET_MS = 1800

function raceWithBudget<T>(
  promise: Promise<T>,
  budgetMs: number,
): Promise<{ ok: true; value: T; ms: number } | { ok: false; value: null; ms: number }> {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const elapsed = () =>
    Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0)
  return new Promise((resolve) => {
    let settled = false
    const finish = (result: { ok: true; value: T; ms: number } | { ok: false; value: null; ms: number }) => {
      if (settled) return
      settled = true
      resolve(result)
    }
    const timer = setTimeout(() => {
      finish({ ok: false, value: null, ms: elapsed() })
    }, budgetMs)
    promise
      .then((value) => {
        clearTimeout(timer)
        finish({ ok: true, value, ms: elapsed() })
      })
      .catch(() => {
        clearTimeout(timer)
        finish({ ok: false, value: null, ms: elapsed() })
      })
  })
}

function newMsgId(): string {
  return `msg_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`
}

function probeCap(ctx: TalkContext): number {
  const n = ctx.topic.probes.length
  const max = ctx.topic.depth.maxProbes
  if (max == null || max <= 0) return n
  return Math.min(n, max)
}

export function buildDepthLabel(ctx: TalkContext, state: TalkRuntimeState): string {
  const total = probeCap(ctx)
  const probeN = Math.min(state.probesAsked, total) || 1
  const fuMax = ctx.topic.depth.maxFollowUps
  const fu = state.followUpsOnActiveProbe
  if (state.status === 'ready_to_pass') return 'Ready for Next'
  if (fuMax <= 0) return `Probe ${probeN} of ${total}`
  return `Probe ${probeN} of ${total} · Follow-up ${fu} of ${fuMax}`
}

export function toTalkRuntimeView(
  ctx: TalkContext,
  state: TalkRuntimeState,
  extras?: { error?: string | null; busy?: boolean },
): TalkRuntimeView {
  return {
    context: ctx,
    state,
    canPass: state.status === 'ready_to_pass',
    depthLabel: buildDepthLabel(ctx, state),
    error: extras?.error ?? null,
    busy: extras?.busy ?? false,
  }
}

export function createTalkRuntimeState(ctx: TalkContext): TalkRuntimeState {
  return {
    phaseId: ctx.phaseId,
    status: 'idle',
    activeProbeIndex: 0,
    followUpsOnActiveProbe: 0,
    probesAsked: 0,
    candidateTurns: 0,
    startedAt: Date.now(),
    softTimeSent: false,
    draft: '',
    messages: [],
    openBeat: 'done',
  }
}

function pushMessage(
  state: TalkRuntimeState,
  msg: Omit<TalkMessage, 'id' | 'at'> & { id?: string; at?: number },
): TalkRuntimeState {
  const row: TalkMessage = {
    id: msg.id ?? newMsgId(),
    role: msg.role,
    text: msg.text,
    at: msg.at ?? Date.now(),
    probeId: msg.probeId,
    kind: msg.kind,
  }
  return { ...state, messages: [...state.messages, row] }
}

function kindForSituation(situation: string): InterviewResponseMessageKind {
  if (situation === 'follow_up' || situation === 'deepen' || situation === 'probe_gap') {
    return 'follow_up'
  }
  if (situation === 'move_probe') return 'next_probe'
  if (situation === 'soft_time') return 'soft_time'
  if (situation === 'off_topic') return 'redirect'
  if (situation === 'clarify') return 'clarify'
  if (situation === 'close') return 'close'
  return 'follow_up'
}

/**
 * Seed opener assistant message + response JSON.
 * Edge compose (situation=open) when prior Talk memory exists, or on day-1 open with CV.
 * Later gates never re-introduce persona; they DO introduce the new section purpose.
 * On failure: deterministic opener (mid = section orient + ask; no forced prior bridge).
 * `ctx.opener.text` stays the probe goal for decide / gap fidelity.
 */
export async function startTalkSession(input: {
  ctx: TalkContext
  response: InterviewResponse
  sectionIndex?: ReadonlyArray<SectionIndexEntry>
  previousSectionTitle?: string | null
  referencedEvidence?: ReferencedEvidencePack | null
  /** Live compose text while Edge streams the opener. */
  onComposeDelta?: (fullText: string) => void
  /** Busy / streaming runtime views before the final opener lands. */
  onProgress?: (view: TalkRuntimeView) => void
}): Promise<{ state: TalkRuntimeState; response: InterviewResponse; view: TalkRuntimeView }> {
  const memory = buildPriorTalkMemory({
    response: input.response,
    currentTopicId: input.ctx.topicId,
    currentPhaseId: input.ctx.phaseId,
  })
  const priorActivity = input.response.messages.some(
    (m) => m.phaseId !== input.ctx.phaseId && (m.role === 'assistant' || m.role === 'candidate'),
  )
  const progressDone =
    (input.response.completedPhaseIds?.length ?? 0) > 0 ||
    (input.response.skippedPhaseIds?.length ?? 0) > 0
  const continuingDay =
    !input.ctx.isOpening || memory.hasMemory || priorActivity || progressDone

  const sectionOpts: PriorSectionOpts = {
    continuing: continuingDay,
    previousSectionTitle: input.previousSectionTitle ?? null,
    currentPhaseId: input.ctx.phaseId,
    sectionIndex: input.sectionIndex,
  }
  const previousPhaseId = resolvePreviousPhaseId(sectionOpts)
  let previousSectionTitle =
    input.previousSectionTitle?.trim() ||
    input.sectionIndex?.find((s) => s.phaseId === previousPhaseId)?.title ||
    null
  let responseAcc = input.response

  // Mid-day opens do not need CV for craft; day-1 may need it for name/probe beat.
  const cv = continuingDay
    ? {
        hasCv: false as const,
        preferredName: '',
        displayName: '',
        note: '',
        rapportHook: '',
        source: 'none' as const,
      }
    : await resolveCandidateCvNote(input.ctx.briefId)

  // Force mid-day craft even if brief wrongly marks a later Talk as isOpening.
  const openCtx = continuingDay ? { ...input.ctx, isOpening: false } : input.ctx

  const preferred = cv.preferredName?.trim() || ''
  const display = cv.displayName?.trim() || ''
  const needsNameCheck =
    !continuingDay &&
    cv.hasCv &&
    Boolean(preferred) &&
    Boolean(display) &&
    preferred !== display
  const openBeat: TalkOpenBeat = continuingDay
    ? 'done'
    : needsNameCheck
      ? 'day1_name'
      : 'day1_first_probe'

  let openerText = composeTalkOpenerUtterance(openCtx, memory, cv, {
    openBeat,
    previousTitle: previousSectionTitle,
  })
  let model = 'authored_probe'
  let sampleIdsUsed: string[] = []

  // Day-1 probe beat with CV, or mid-Talk section open. Name-only beat stays deterministic.
  const shouldEdgeOpen = continuingDay || (!continuingDay && cv.hasCv && !needsNameCheck)
  if (shouldEdgeOpen) {
    try {
      const boot = createTalkRuntimeState(input.ctx)
      let openRetrieved = null as ReturnType<typeof retrieveDayMemory> | null
      if (continuingDay && (previousPhaseId || previousSectionTitle || memory.hasMemory)) {
        const priorNeeds = bindRefs(
          bindPriorSectionNeeds(
            [
              {
                sourceId: 'phase_transcript',
                phaseId: previousPhaseId || undefined,
                query: previousSectionTitle || undefined,
                reason: 'section_open_prior',
              },
              {
                sourceId: 'topic_synthesis',
                query: previousSectionTitle || undefined,
                reason: 'section_open_prior',
              },
              {
                sourceId: 'day_transcript',
                query: previousSectionTitle || undefined,
                reason: 'section_open_prior',
              },
            ],
            sectionOpts,
          ),
          input.referencedEvidence,
          input.ctx.phaseId,
        )
        openRetrieved = retrieveDayMemory({
          plan: { needs: priorNeeds, confidence: 'med' },
          response: input.response,
          currentPhaseId: input.ctx.phaseId,
          sectionIndex: input.sectionIndex,
          referenced: retrieveReferencedArg(input.referencedEvidence),
        })
      } else if (!continuingDay && cv.hasCv) {
        openRetrieved = {
          candidateCvNote: cv.note,
          dayHits: [],
          topicSynths: [],
          phaseHits: [],
          botNotes: formatBotNotesForRetrieve(normalizeBotNotes(responseAcc.botNotes)),
          sourceIdsUsed: ['candidate_cv'],
        }
      }

      const standingNotes = formatStandingNotes(normalizeBotNotes(responseAcc.botNotes))

      const streamMsgId = newMsgId()
      const openProfile = createTalkTurnProfile(`open:${input.ctx.topicId}`)
      input.onProgress?.(
        toTalkRuntimeView(input.ctx, { ...boot, status: 'active', openBeat }, { busy: true }),
      )

      const composed = await edgeComposeTalk({
        briefId: input.ctx.briefId,
        talkContext: openCtx,
        messages: continuingDay
          ? []
          : priorPhaseMessages(responseAcc.messages, input.ctx.phaseId, input.ctx.topicId),
        talkRuntime: { ...boot, status: 'active', openBeat },
        decide: {
          situation: 'open',
          missingGaps: [],
          activeProbeId: input.ctx.opener.probeId,
          nextProbeGoal: input.ctx.opener.text,
          canPass: false,
          signals: [],
          composeCues: continuingDay
            ? ['day_continuing', 'section_intro']
            : ['day1_first_probe'],
        },
        priorTopicNote: continuingDay && memory.hasMemory ? memory.note : null,
        candidateCvNote: null,
        retrievedMemory: openRetrieved,
        dayMeta: composeDayMeta(
          {
            continuing: continuingDay,
            previousSectionTitle,
            standingNotes,
          },
          input.referencedEvidence,
        ),
        onUtteranceDelta: (_delta, full) => {
          openProfile.markFirstDelta()
          input.onComposeDelta?.(full)
          const streamingState: TalkRuntimeState = {
            ...boot,
            status: 'active',
            openBeat,
            messages: [
              {
                id: streamMsgId,
                role: 'assistant',
                text: full,
                at: Date.now(),
                probeId: input.ctx.opener.probeId,
                kind: 'opener',
              },
            ],
          }
          input.onProgress?.(toTalkRuntimeView(input.ctx, streamingState, { busy: true }))
        },
      })
      openProfile.mark('compose_open', {
        utteranceChars: (composed.utterance || '').length,
      })
      openProfile.done({ continuingDay })
      let utter = softenDemandingRegister(stripToFinalAsk(composed.utterance?.trim() || ''))
      if (utter && continuingDay) {
        utter = scrubContinuingDayOpen(utter)
        if (!utter || looksLikeDay1Reintro(utter)) {
          // Edge ignored mid-section craft — keep deterministic section intro.
          utter = composeTalkOpenerUtterance(openCtx, memory, cv, {
            openBeat: 'done',
            previousTitle: previousSectionTitle,
          })
          model = 'authored_probe_mid_fallback'
          sampleIdsUsed = []
        } else {
          model = composed.composeMeta.model || 'edge_open'
          sampleIdsUsed = composed.composeMeta.sampleIdsUsed ?? []
        }
        openerText = utter
      } else if (utter) {
        openerText = utter
        model = composed.composeMeta.model || 'edge_open'
        sampleIdsUsed = composed.composeMeta.sampleIdsUsed ?? []
      }
      const openNotes = coercePersistNotes(composed.persistNotes)
      if (openNotes.length) {
        responseAcc = persistBotNotes(responseAcc, openNotes, {
          phaseId: input.ctx.phaseId,
          source: 'talk',
        })
      }
    } catch {
      // Deterministic opener already prepared.
    }
  }

  let state = createTalkRuntimeState(input.ctx)
  const probeId = input.ctx.opener.probeId
  const persistedBeat: TalkOpenBeat =
    openBeat === 'day1_name' ? 'day1_name' : 'done'
  state = {
    ...pushMessage(state, {
      role: 'assistant',
      text: openerText,
      probeId,
      kind: 'opener',
    }),
    status: 'active',
    probesAsked: input.ctx.topic.probes.length > 0 ? 1 : 0,
    activeProbeIndex: 0,
    startedAt: Date.now(),
    openBeat: persistedBeat,
  }
  const last = state.messages[state.messages.length - 1]!
  let response = setResponsePhasePointer(responseAcc, input.ctx.phaseId)
  const appended = appendResponseMessage(response, {
    id: last.id,
    phaseId: input.ctx.phaseId,
    topicId: input.ctx.topicId,
    role: 'assistant',
    text: openerText,
    probeId,
    kind: 'opener',
    at: new Date(last.at).toISOString(),
    compose: {
      situation: 'open',
      missingGaps: [],
      sampleIdsUsed,
      model,
    },
  })
  response = persistTalkRuntime(appended.doc, input.ctx, state)
  return { state, response, view: toTalkRuntimeView(input.ctx, state) }
}

/**
 * Apply one candidate turn: append → decide → Edge after_turn → Edge compose → persist.
 * On close: Edge topic_end. Missing OpenAI key / auth surface as view.error (no thin sample).
 */
export async function applyTalkTurn(input: {
  ctx: TalkContext
  state: TalkRuntimeState
  response: InterviewResponse
  text: string
  /** Spine sections for prior-phase retrieval (phaseId + title). */
  sectionIndex?: ReadonlyArray<SectionIndexEntry>
  previousSectionTitle?: string | null
  referencedEvidence?: ReferencedEvidencePack | null
  /** Live compose text while Edge streams the reply. */
  onComposeDelta?: (fullText: string) => void
}): Promise<{ state: TalkRuntimeState; response: InterviewResponse; view: TalkRuntimeView }> {
  const text = input.text.trim()
  if (!text || input.state.status === 'ready_to_pass' || input.state.status === 'abandoned') {
    return {
      state: input.state,
      response: input.response,
      view: toTalkRuntimeView(input.ctx, input.state),
    }
  }

  const probe = input.ctx.topic.probes[input.state.activeProbeIndex] ?? null
  let state = pushMessage(input.state, {
    role: 'candidate',
    text,
    probeId: probe?.id ?? null,
    kind: 'answer',
  })
  state = {
    ...state,
    candidateTurns: state.candidateTurns + 1,
    draft: '',
  }
  const candidateMsg = state.messages[state.messages.length - 1]!

  let response = appendResponseMessage(input.response, {
    id: candidateMsg.id,
    phaseId: input.ctx.phaseId,
    topicId: input.ctx.topicId,
    role: 'candidate',
    text,
    probeId: probe?.id ?? null,
    kind: 'answer',
    at: new Date(candidateMsg.at).toISOString(),
  }).doc

  const ivIds = afterTurnTemplateIds(input.ctx.topic.analysis.templateIds)
  const turnGen = talkGeneration

  const decision = decideTalkTurn({ ctx: input.ctx, state, candidateText: text })
  let nextState = decision.nextState
  let composeCues: string[] = []
  const pendingFirstProbe = input.state.openBeat === 'day1_name'
  const nameReply = pendingFirstProbe ? classifyNameCheckReply(text) : null
  const stayOnName =
    pendingFirstProbe && (nameReply?.kind === 'reject' || nameReply?.kind === 'other')
  const proceedFirstProbe =
    pendingFirstProbe && (nameReply?.kind === 'affirm' || nameReply?.kind === 'name')
  // Name-check reply must not inherit decide close/move_probe side-effects.
  if (pendingFirstProbe) {
    nextState = {
      ...nextState,
      status: 'active',
      activeProbeIndex: input.state.activeProbeIndex,
      followUpsOnActiveProbe: input.state.followUpsOnActiveProbe,
      probesAsked: input.state.probesAsked,
    }
  }

  const situationForScore = stayOnName
    ? 'clarify'
    : pendingFirstProbe
      ? 'open'
      : decision.situation
  const afterTurnPlan = planAfterTurnForUtterance({
    pendingFirstProbe,
    text,
    wordCount: candidateWordCount(text),
    situation: situationForScore,
    signals: decision.signals,
    afterTurnIds: ivIds,
  })
  const { scoreIds, skipIds } = afterTurnPlan
  const runAfterTurn = scoreIds.length > 0

  if (scoreIds.length > 0) {
    response = writePendingAfterTurnGrains(response, {
      messageId: candidateMsg.id,
      hostRef: input.ctx.topicId,
      templateIds: scoreIds,
      order: state.candidateTurns,
    })
  }
  if (skipIds.length > 0) {
    response = writeSkippedAfterTurnGrains(response, {
      messageId: candidateMsg.id,
      hostRef: input.ctx.topicId,
      templateIds: skipIds,
      order: state.candidateTurns,
      reason: afterTurnSkipCopy(afterTurnPlan.reason),
      evidence: [text],
    })
  }

  const profile = createTalkTurnProfile(`turn:${input.ctx.topicId}:${decision.situation}`)
  profile.mark('decide', {
    situation: decision.situation,
    pendingFirstProbe,
    stayOnName,
    afterTurn: runAfterTurn,
    afterTurnMode: afterTurnPlan.mode,
    afterTurnScoreIds: scoreIds,
    afterTurnSkipIds: skipIds,
  })

  type AfterPack =
    | { ok: true; value: Awaited<ReturnType<typeof edgeAfterTurn>> | null; ms: number }
    | { ok: false; value: null; ms: number }
  let afterPromise: Promise<AfterPack> | null = null

  try {
    const accessToken = await resolveInterviewEdgeAccessToken()
    profile.mark('auth_token')

    const priorMemory = buildPriorTalkMemory({
      response,
      currentTopicId: input.ctx.topicId,
      currentPhaseId: input.ctx.phaseId,
    })
    const phaseMessages = currentPhaseMessages(response.messages, input.ctx.phaseId)
    const lastAssistant =
      [...phaseMessages].reverse().find((m) => m.role === 'assistant')?.text ??
      [...nextState.messages].reverse().find((m) => m.role === 'assistant')?.text ??
      null

    const situation = stayOnName
      ? 'clarify'
      : pendingFirstProbe
        ? 'open'
        : decision.situation
    const nextProbeGoal = proceedFirstProbe
      ? input.ctx.opener.text
      : stayOnName
        ? null
        : decision.nextProbeGoal

    const continuing = priorMemory.hasMemory || !input.ctx.isOpening
    const sectionOpts: PriorSectionOpts = {
      continuing,
      previousSectionTitle: input.previousSectionTitle ?? null,
      currentPhaseId: input.ctx.phaseId,
      sectionIndex: input.sectionIndex,
    }
    const previousPhaseId = resolvePreviousPhaseId(sectionOpts)
    const previousSectionTitle =
      input.previousSectionTitle?.trim() ||
      input.sectionIndex?.find((s) => s.phaseId === previousPhaseId)?.title ||
      null
    const standingNotes = formatStandingNotes(normalizeBotNotes(response.botNotes))

    // after_turn ∥ memory plan ∥ speculative CV — plan skipped on day-1 first probe.
    const parallelT0 =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now()
    afterPromise = runAfterTurn
      ? edgeAfterTurn({
          briefId: input.ctx.briefId,
          talkContext: input.ctx,
          messages: response.messages,
          talkRuntime: nextState,
          candidateMessageId: candidateMsg.id,
          templateIds: scoreIds,
          hostRef: input.ctx.topicId,
          order: state.candidateTurns,
          accessToken,
          referencedEvidence: input.referencedEvidence?.index.length
            ? input.referencedEvidence.assessor
            : undefined,
        })
          .then((r) => ({
            ok: true as const,
            value: r,
            ms: Math.round(
              (typeof performance !== 'undefined' ? performance.now() : Date.now()) - parallelT0,
            ),
          }))
          .catch(() => ({
            ok: false as const,
            value: null,
            ms: Math.round(
              (typeof performance !== 'undefined' ? performance.now() : Date.now()) - parallelT0,
            ),
          }))
      : null

    const firstProbePlanResult: DayMemoryPlanResult = {
      plan: {
        needs: [
          { sourceId: 'candidate_cv', reason: 'day1_first_probe' },
          { sourceId: 'bot_notes', reason: 'standing_prefs' },
        ],
        confidence: 'high',
      },
      composeMeta: { model: '', sampleIdsUsed: [], skipped: false },
    }
    const planPromise = pendingFirstProbe
      ? Promise.resolve({
          value: firstProbePlanResult,
          ms: 0,
          skipped: true as const,
        })
      : planDayMemory({
          surface: 'talk',
          candidateText: text,
          lastAssistantText: lastAssistant,
          alwaysOnMeta: {
            continuing,
            previousSectionTitle,
            currentPhaseId: input.ctx.phaseId,
            currentTitle: input.ctx.topic.label,
            personaName: input.ctx.persona.name,
            situationHint: situation,
            sectionIds: input.sectionIndex ? [...input.sectionIndex] : undefined,
            standingNotes,
            ...alwaysOnReferencedPatch(input.referencedEvidence),
          },
          accessToken,
          briefId: input.ctx.briefId,
        }).then((value) => ({
          value,
          ms: Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - parallelT0),
          skipped: false as const,
        }))

    const cvPromise = resolveCandidateCvNote(input.ctx.briefId).then((value) => ({
      value,
      ms: Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - parallelT0),
    }))

    // Do NOT await after_turn before compose — bulky grains stay background.
    // Early craft: local decide cues (instant) + lean Edge compose_cues (budgeted).
    const alreadyDug = alreadyDugOwnershipFromMessages(
      nextState.messages,
      probe?.id ?? null,
    )
    const lastPriorCandidate = [...input.state.messages]
      .reverse()
      .find((m) => m.role === 'candidate')
    const alreadyThin = Boolean(
      lastPriorCandidate && isThinUtterance(String(lastPriorCandidate.text ?? ''), []),
    )
    const elastic = isThinUtterance(text, decision.signals)
    const ownershipPushed =
      decision.signals.includes('collective_we') &&
      !decision.missingGaps.some((g) => /outcome|metric/i.test(g)) &&
      alreadyDug &&
      !elastic

    const seedCues = stayOnName
      ? ['day1_name', 'name_retry']
      : pendingFirstProbe
        ? []
        : composeCuesFromDecide({
          situation,
          signals: decision.signals,
          missingGaps: decision.missingGaps,
          alreadyDugOwnership: alreadyDug && !elastic,
          ownershipPushed,
          elastic,
          alreadyThin: alreadyThin && elastic,
        })

    const cuesPromise = pendingFirstProbe
      ? Promise.resolve({
          ok: false as const,
          value: null,
          ms: 0,
          skipped: true as const,
        })
      : raceWithBudget(
          edgeComposeCues({
            briefId: input.ctx.briefId,
            talkContext: input.ctx,
            messages: response.messages,
            talkRuntime: nextState,
            decide: {
              situation,
              missingGaps: decision.missingGaps,
              signals: decision.signals,
              nextProbeGoal,
              composeCues: seedCues,
            },
            candidateText: text,
            accessToken,
          }),
          COMPOSE_CUES_BUDGET_MS,
        ).then((pack) =>
          pack.ok
            ? { ok: true as const, value: pack.value, ms: pack.ms, skipped: false as const }
            : { ok: false as const, value: null, ms: pack.ms, skipped: false as const },
        )

    const [memoryPlanPack, cvPack, cuesPack] = await Promise.all([
      planPromise,
      cvPromise,
      cuesPromise,
    ])
    const memoryPlan = memoryPlanPack.value
    const speculativeCv = cvPack.value
    profile.mark('parallel_plan_cv_cues', {
      memoryPlanMs: memoryPlanPack.ms,
      candidateCvMs: cvPack.ms,
      memoryPlanSkipped: 'skipped' in memoryPlanPack ? memoryPlanPack.skipped : false,
      composeCuesMs: cuesPack.ms,
      composeCuesOk: cuesPack.ok,
      composeCuesSkipped: 'skipped' in cuesPack ? cuesPack.skipped : false,
      afterTurnDeferred: true,
    })

    composeCues = [...seedCues]
    if (cuesPack.ok && cuesPack.value?.composeCues?.length) {
      composeCues = [...new Set([...composeCues, ...cuesPack.value.composeCues])].slice(0, 8)
    }
    if (composeCues.includes('vary_ask') || composeCues.includes('already_dug_ownership')) {
      composeCues = composeCues.filter((c) => c !== 'deepen_ownership')
    }
    if (composeCues.includes('elastic')) {
      composeCues = composeCues.filter(
        (c) => c !== 'deepen_ownership' && c !== 'ownership:low',
      )
    }
    if (stayOnName) {
      composeCues = ['day1_name', 'name_retry']
    } else if (proceedFirstProbe) {
      composeCues = [...composeCues, 'day1_first_probe']
    }

    let plan = pendingFirstProbe
      ? firstProbePlanResult.plan
      : memoryPlan.composeMeta.skipped
        ? (() => {
            const fallback = broaderContextPlan(text, sectionOpts)
            return {
              ...fallback,
              needs: bindRefs(fallback.needs, input.referencedEvidence, input.ctx.phaseId),
            }
          })()
        : {
            ...memoryPlan.plan,
            needs: bindRefs(
              bindPriorSectionNeeds(memoryPlan.plan.needs, sectionOpts),
              input.referencedEvidence,
              input.ctx.phaseId,
            ),
          }
    let cv = plan.needs.some((n) => n.sourceId === 'candidate_cv')
      ? speculativeCv
      : null
    let retrieved = retrieveDayMemory({
      plan,
      response,
      currentPhaseId: input.ctx.phaseId,
      cv,
      sectionIndex: input.sectionIndex,
      referenced: retrieveReferencedArg(input.referencedEvidence),
    })
    profile.mark('retrieve_memory', {
      sourceIds: retrieved.sourceIdsUsed ?? [],
    })

    const composeLoop = await runTalkComposePasses({
      retrieved,
      pendingFirstProbe,
      compose: async ({ retrievalPass, retrieved: pack, onUtteranceDelta }) =>
        edgeComposeTalk({
          briefId: input.ctx.briefId,
          talkContext: input.ctx,
          messages: phaseMessages,
          talkRuntime: {
            ...nextState,
            openBeat:
              retrievalPass === 0
                ? stayOnName
                  ? 'day1_name'
                  : pendingFirstProbe
                    ? 'day1_first_probe'
                    : 'done'
                : 'done',
          },
          decide: {
            situation,
            missingGaps: pendingFirstProbe && retrievalPass === 0 ? [] : decision.missingGaps,
            activeProbeId: decision.activeProbeId,
            nextProbeGoal,
            canPass: decision.canPass,
            signals: decision.signals,
            composeCues,
          },
          priorTopicNote: null,
          candidateCvNote: null,
          retrievedMemory: pack,
          dayMeta: composeDayMeta(
            {
              continuing,
              previousSectionTitle,
              standingNotes,
            },
            input.referencedEvidence,
          ),
          retrievalPass,
          accessToken,
          onUtteranceDelta,
        }),
      bindMoreNeeds: (needRetrieval) =>
        bindRefs(
          bindPriorSectionNeeds(
            coerceNeedRetrievalNeeds(
              needRetrieval,
              Boolean(input.referencedEvidence?.index.length),
            ),
            sectionOpts,
          ),
          input.referencedEvidence,
          input.ctx.phaseId,
        ),
      expandRetrieved: (moreNeeds, pack) => {
        plan = {
          needs: mergeMemoryNeeds(plan.needs, moreNeeds),
          confidence: 'med',
        }
        if (plan.needs.some((n) => n.sourceId === 'candidate_cv') && !cv) {
          cv = speculativeCv
        }
        const morePack = retrieveDayMemory({
          plan: { needs: moreNeeds, confidence: 'med' },
          response,
          currentPhaseId: input.ctx.phaseId,
          cv,
          sectionIndex: input.sectionIndex,
          referenced: retrieveReferencedArg(input.referencedEvidence),
        })
        return mergeRetrievedPacks(pack, morePack)
      },
      onUtteranceDelta: (_delta, full) => {
        profile.markFirstDelta()
        input.onComposeDelta?.(full)
      },
      onPass: (pass, detail) => {
        profile.mark(pass === 0 ? 'compose_pass0' : 'compose_pass1', detail)
      },
    })
    let composed = composeLoop.composed
    retrieved = composeLoop.retrieved

    const noteDrafts = [
      ...(nameReply?.kind === 'name' && nameReply.name
        ? [{ kind: 'preferred_name' as const, text: nameReply.name, op: 'set' as const }]
        : []),
      ...coercePersistNotes(composed.persistNotes),
    ]
    if (noteDrafts.length) {
      response = persistBotNotes(response, noteDrafts, {
        phaseId: input.ctx.phaseId,
        source: 'talk',
      })
    }

    let utterance = softenDemandingRegister(stripToFinalAsk(composed.utterance?.trim() || ''))
    if (!utterance && stayOnName) {
      utterance = 'Got it. What name should I use for you today?'
    } else if (!utterance && pendingFirstProbe) {
      utterance = composeTalkOpenerUtterance(
        { ...input.ctx, isOpening: true },
        null,
        cv,
        { openBeat: 'day1_first_probe' },
      )
    }

    const kind = kindForSituation(situation)
    const talkKind: TalkMessage['kind'] =
      kind === 'redirect' || kind === 'clarify'
        ? kind
        : kind === 'follow_up' ||
            kind === 'next_probe' ||
            kind === 'soft_time' ||
            kind === 'close'
          ? kind
          : pendingFirstProbe
            ? 'opener'
            : 'follow_up'
    nextState = {
      ...pushMessage(nextState, {
        role: 'assistant',
        text: utterance,
        probeId:
          situation === 'move_probe'
            ? (input.ctx.topic.probes[nextState.activeProbeIndex]?.id ?? null)
            : (probe?.id ?? null),
        kind: talkKind,
      }),
      openBeat: stayOnName ? 'day1_name' : 'done',
    }

    if (situation === 'close') {
      nextState = { ...nextState, status: 'ready_to_pass' }
    }

    const assistantMsg = nextState.messages[nextState.messages.length - 1]!
    response = appendResponseMessage(response, {
      id: assistantMsg.id,
      phaseId: input.ctx.phaseId,
      topicId: input.ctx.topicId,
      role: 'assistant',
      text: utterance,
      probeId: assistantMsg.probeId,
      kind: pendingFirstProbe ? 'opener' : kind,
      at: new Date(assistantMsg.at).toISOString(),
      compose: {
        situation: composed.composeMeta.situation ?? situation,
        missingGaps: composed.composeMeta.missingGaps ?? decision.missingGaps,
        sampleIdsUsed: [
          ...(composed.composeMeta.sampleIdsUsed ?? []),
          ...(memoryPlan.composeMeta?.sampleIdsUsed ?? []),
        ],
        model: composed.composeMeta.model,
        memoryPlan: {
          needs: (pendingFirstProbe
            ? ['candidate_cv']
            : memoryPlan.plan.needs.map((n) => n.sourceId)
          ).slice(0, input.referencedEvidence?.index.length ? 5 : 3),
          sampleIdsUsed: memoryPlan.composeMeta?.sampleIdsUsed ?? [],
          model: memoryPlan.composeMeta?.model ?? '',
          skipped: Boolean(memoryPlan.composeMeta?.skipped),
        },
      },
    }).doc

    response = persistTalkRuntime(response, input.ctx, nextState)

    // after_turn is analysis-only for the attempt package. Do not await it before
    // returning the Talk view — that would re-hit setTalk ~5–8s after streaming.
    const pendingAfter = afterPromise
    if (pendingAfter) {
      const work = pendingAfter
        .then((afterPack) => {
          profile.mark('after_turn_bg', {
            ms: afterPack.ms,
            ok: afterPack.ok !== false,
            hadGrains: Boolean(afterPack.ok !== false && afterPack.value?.grains),
          })
          if (afterPack.ok === false || !afterPack.value?.grains) {
            const latest = getInterviewResponse(input.ctx.briefId)
            drainPendingAfterTurnGrains(latest, candidateMsg.id, scoreIds)
            return
          }
          if (turnGen !== talkGeneration) {
            // Still merge turn grains into SSOT; do not rewrite talkRuntime after leave/pass.
            const latest = getInterviewResponse(input.ctx.briefId)
            let merged = mergeFilledAfterTurnGrains(
              latest,
              candidateMsg.id,
              afterPack.value.grains,
              scoreIds,
            )
            drainPendingAfterTurnGrains(merged, candidateMsg.id, scoreIds)
            return
          }
          const latest = getInterviewResponse(input.ctx.briefId)
          let merged = mergeFilledAfterTurnGrains(
            latest,
            candidateMsg.id,
            afterPack.value.grains,
            scoreIds,
          )
          merged = drainPendingAfterTurnGrains(merged, candidateMsg.id, scoreIds)
          persistTalkRuntime(merged, input.ctx, nextState)
        })
        .catch(() => {
          const latest = getInterviewResponse(input.ctx.briefId)
          drainPendingAfterTurnGrains(latest, candidateMsg.id, scoreIds)
        })
      trackAfterTurnWork(work)
    }

    if (nextState.status === 'ready_to_pass') {
      await awaitInFlightAfterTurns()
      response = drainAllPendingAfterTurnGrains(getInterviewResponse(input.ctx.briefId))
      const leave = talkLeaveTemplateIds(input.ctx.topic.analysis.templateIds)
      response = writeTopicEndStub(response, {
        topicId: input.ctx.topicId,
        targets: input.ctx.topic.targets.map((t) => ({ key: t.key })),
        templateIds: leave.stubIds,
      })
      const afterTurnGrains = compactAfterTurnPack(response, input.ctx.topicId)
      const topicPromise = (async () => {
        try {
          const topic = await edgeTopicEnd({
            briefId: input.ctx.briefId,
            talkContext: input.ctx,
            messages: response.messages,
            talkRuntime: nextState,
            templateIds: leave.leftover,
            rollupTemplateIds: leave.rollup,
            afterTurnGrains,
            accessToken,
            referencedEvidence: input.referencedEvidence?.index.length
              ? input.referencedEvidence.assessor
              : undefined,
          })
          let filled = mergeFilledTopicEnd(
            getInterviewResponse(input.ctx.briefId),
            input.ctx.topicId,
            {
              synthesisText: topic.synthesisText ?? '',
              targets: (topic.targets ?? {}) as TopicEndStubTargets,
              byTemplate: (topic.byTemplate ?? {}) as never,
            },
          )
          filled = persistTalkRuntime(filled, input.ctx, nextState)
          return filled
        } catch {
          return persistTalkRuntime(getInterviewResponse(input.ctx.briefId), input.ctx, nextState)
        }
      })()
      inFlightTopicEnd = topicPromise
      try {
        response = await topicPromise
      } finally {
        if (inFlightTopicEnd === topicPromise) inFlightTopicEnd = null
      }
      profile.mark('topic_end')
    }

    profile.done({
      situation,
      canPass: nextState.status === 'ready_to_pass',
      utteranceChars: utterance.length,
      afterTurnBackground: Boolean(pendingAfter),
    })

    return {
      state: nextState,
      response,
      view: toTalkRuntimeView(input.ctx, nextState),
    }
  } catch (e) {
    const message =
      e && typeof e === 'object' && 'code' in e
        ? String((e as { code: string }).code)
        : e instanceof Error
          ? e.message
          : 'talk_turn_failed'
    profile.mark('error', { code: message })
    // Still drain after_turn so pending grains can fill if analysis finished.
    try {
      if (afterPromise) {
        const afterPack = await afterPromise
        if (afterPack.ok !== false && afterPack.value?.grains) {
          response = mergeFilledAfterTurnGrains(
            response,
            candidateMsg.id,
            afterPack.value.grains,
            scoreIds,
          )
        }
        response = drainPendingAfterTurnGrains(response, candidateMsg.id, scoreIds)
      }
    } catch {
      response = drainPendingAfterTurnGrains(response, candidateMsg.id, scoreIds)
    }
    profile.done({ error: message })
    // Candidate message (+ pending grains) already persisted; do not invent assistant text.
    response = persistTalkRuntime(response, input.ctx, state)
    return {
      state,
      response,
      view: toTalkRuntimeView(input.ctx, state, { error: message }),
    }
  }
}

/** Mark topic_end stub when Talk is passed without Edge (tests / abandon path). */
export function finalizeTalkTopic(input: {
  ctx: TalkContext
  state: TalkRuntimeState
  response: InterviewResponse
}): InterviewResponse {
  if (input.state.status !== 'ready_to_pass') return input.response
  let response = drainAllPendingAfterTurnGrains(input.response)
  const existing = response.analysis.topics[input.ctx.topicId]
  if (existing?.status === 'filled') return response
  const leave = talkLeaveTemplateIds(input.ctx.topic.analysis.templateIds)
  return writeTopicEndStub(response, {
    topicId: input.ctx.topicId,
    targets: input.ctx.topic.targets.map((t) => ({ key: t.key })),
    templateIds: leave.stubIds,
  })
}

export function abandonTalk(input: {
  ctx: TalkContext
  state: TalkRuntimeState
  response: InterviewResponse
  reason?: string
}): { state: TalkRuntimeState; response: InterviewResponse } {
  bumpTalkGeneration()
  const state: TalkRuntimeState = { ...input.state, status: 'abandoned' }
  let response = markResponsePartial(input.response, {
    reason: input.reason ?? 'abandoned_mid_talk',
    atPhaseId: input.ctx.phaseId,
  })
  response = drainAllPendingAfterTurnGrains(
    response,
    'Talk abandoned — pending after_turn marked skipped.',
  )
  response = persistTalkRuntime(response, input.ctx, state)
  return { state, response }
}

export async function resetTalkPhase(input: {
  ctx: TalkContext
  response: InterviewResponse
}): Promise<{ state: TalkRuntimeState; response: InterviewResponse; view: TalkRuntimeView }> {
  const cleared = resetPhaseInResponse(input.response, input.ctx.phaseId, input.ctx.topicId)
  return startTalkSession({ ctx: input.ctx, response: cleared })
}

export function setTalkDraft(state: TalkRuntimeState, draft: string): TalkRuntimeState {
  return { ...state, draft }
}
