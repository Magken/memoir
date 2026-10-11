/**
 * Shared FE helper: plan → retrieve → compose.
 * Internal knowledge loop (not keyword triggers):
 *   always-on enough? → compose
 *   plan skip / compose needRetrieval? → broader retrieve (incl. prior section) → compose once more
 *   still missing? → utterance may admit lack
 */
import type { CandidateCvNote } from '../buildCandidateCvNote'
import type { StageAssistContext } from '../buildStageAssistContext'
import { buildStageAssistContext } from '../buildStageAssistContext'
import { resolveInterviewEdgeAccessToken } from '../edgeAccessToken'
import { composeStageAssist } from '../stageAssistEdgeClient'
import type { DayMemoryPlanResult } from './dayMemoryEdgeClient'
import { planDayMemory } from './dayMemoryEdgeClient'
import {
  bindPriorSectionNeeds,
  broaderContextPlan,
  coerceNeedRetrievalNeeds,
  mergeMemoryNeeds,
  mergeRetrievedPacks,
  type PriorSectionOpts,
} from './broaderContext'
import {
  alwaysOnReferencedPatch,
  bindRefs,
  retrieveReferencedArg,
  evidenceForPhase,
} from '../referencedTurn'
import {
  coercePersistNotes,
  formatStandingNotes,
  normalizeBotNotes,
} from './botNotes'
import { retrieveDayMemory } from './retrieveDayMemory'
import { unionDayHistoryTail } from './unionDayHistoryTail'
import type { MemoryRetrievalPlan, RetrievedMemoryPack } from './types'
import { emptyRetrievedMemoryPack } from './types'
import type { InterviewResponse } from '../talkTypes'
import type { Creator2BriefDocument } from '../../interviewBrief/creator2BriefTypes'
import type { GateToolMount } from '../resolveGateToolMount'
import { resolveCandidateCvNote } from '../resolveCandidateCvNote'
import { createInterviewBotProfile } from '../talkTurnDebug'
import { persistBotNotes } from '../interviewResponse'
import { shouldExpandComposePass1 } from '../talkComposePasses'

export type AssistMemoryTurnResult = {
  utterance: string
  composeMeta: {
    situation: string
    model: string
    sampleIdsUsed: string[]
    injectTrace?: { contract?: boolean; peel?: boolean; liveMap?: boolean }
    injectMiss?: string[]
  }
  planResult: DayMemoryPlanResult
  retrieved: RetrievedMemoryPack
  expanded: boolean
}

function priorOpts(input: {
  continuing: boolean
  previousSectionTitle: string | null
  currentPhaseId: string
  sectionIds: Array<{ phaseId: string; title: string }>
}): PriorSectionOpts {
  return {
    continuing: input.continuing,
    previousSectionTitle: input.previousSectionTitle,
    currentPhaseId: input.currentPhaseId,
    sectionIndex: input.sectionIds,
  }
}

function planToUse(
  planResult: DayMemoryPlanResult,
  candidateText: string,
  opts: PriorSectionOpts,
): MemoryRetrievalPlan {
  if (planResult.composeMeta.skipped) {
    return broaderContextPlan(candidateText, opts)
  }
  return {
    ...planResult.plan,
    needs: bindPriorSectionNeeds(planResult.plan.needs, opts),
  }
}

async function loadCvIfNeeded(
  briefId: string,
  plan: MemoryRetrievalPlan,
  already: CandidateCvNote | null,
): Promise<CandidateCvNote | null> {
  if (!plan.needs.some((n) => n.sourceId === 'candidate_cv')) return already
  if (already?.hasCv) return already
  return resolveCandidateCvNote(briefId)
}

function referencedMemoryFromRetrieved(
  retrieved: RetrievedMemoryPack,
  evidence: ReturnType<typeof evidenceForPhase>,
): Record<string, unknown> | null {
  if (!evidence?.index.length) return null
  const artifacts = retrieved.stageArtifacts ?? []
  const runs = retrieved.toolRuns ?? []
  const synths = retrieved.toolSynths ?? []
  if (!artifacts.length && !runs.length && !synths.length) return null
  return { artifacts, runs, synths }
}

function mergeAssistCtx(input: {
  briefId: string
  brief: Creator2BriefDocument
  phaseId: string
  timed: boolean
  limitMinutes: number | null
  mount: GateToolMount | null
  leanDay: {
    continuing: boolean
    previousSectionTitle: string | null
    priorNote: string | null
    standingNotes?: string | null
    dayHistoryTail: Array<{ role: 'assistant' | 'candidate'; text: string; phaseId: string }>
  }
  historyTail: Array<{ role: 'assistant' | 'candidate'; text: string }>
  retrieved: RetrievedMemoryPack
  cv: CandidateCvNote | null
  referencedMemory?: Record<string, unknown> | null
  liveComposition?: import('../sanitizeLiveComposition').AssistLiveComposition | null
  timer?: import('../sanitizeLiveComposition').AssistTimerPack | null
}): StageAssistContext | null {
  const dayContinuity = {
    ...input.leanDay,
    standingNotes:
      input.leanDay.standingNotes ??
      (input.retrieved.botNotes.length
        ? input.retrieved.botNotes.map((n) => `- ${n}`).join('\n')
        : null),
    priorNote:
      input.retrieved.topicSynths.length || input.retrieved.dayHits.length
        ? [
            ...input.retrieved.topicSynths.map((t) => t.text),
            ...input.retrieved.dayHits.map((h) => h.text),
          ]
            .join('\n')
            .slice(0, 900) || null
        : input.leanDay.priorNote,
    dayHistoryTail: unionDayHistoryTail(input.leanDay.dayHistoryTail, input.retrieved),
  }
  return buildStageAssistContext({
    briefId: input.briefId,
    brief: input.brief,
    phaseId: input.phaseId,
    timed: input.timed,
    limitMinutes: input.limitMinutes,
    mount: input.mount,
    candidateCv:
      input.retrieved.candidateCvNote && input.cv?.hasCv
        ? input.cv
        : input.retrieved.candidateCvNote
          ? {
              hasCv: true,
              preferredName: input.cv?.preferredName || '',
              displayName: input.cv?.displayName || '',
              note: input.retrieved.candidateCvNote,
              rapportHook: input.cv?.rapportHook || '',
              source: input.cv?.source || 'sample',
            }
          : null,
    dayContinuity,
    historyTail: input.historyTail,
    liveComposition: input.liveComposition ?? null,
    timer: input.timer ?? null,
    referencedMemory: input.referencedMemory ?? null,
  })
}

/**
 * Assist turn with automatic broader retrieval when plan skips or compose requests packs.
 */
export async function runAssistMemoryCompose(input: {
  briefId: string
  brief: Creator2BriefDocument
  phaseId: string
  timed: boolean
  limitMinutes: number | null
  mount: GateToolMount | null
  candidateText: string
  lastAssistantText: string | null
  situation: string
  leanDay: {
    continuing: boolean
    previousSectionTitle: string | null
    priorNote: string | null
    standingNotes: string | null
    dayHistoryTail: Array<{ role: 'assistant' | 'candidate'; text: string; phaseId: string }>
  }
  historyTail: Array<{ role: 'assistant' | 'candidate'; text: string }>
  response: InterviewResponse
  sectionIds: Array<{ phaseId: string; title: string }>
  gateTitle: string
  liveComposition?: import('../sanitizeLiveComposition').AssistLiveComposition | null
  timer?: import('../sanitizeLiveComposition').AssistTimerPack | null
  onComposeDelta?: (fullText: string) => void
}): Promise<AssistMemoryTurnResult> {
  const profile = createInterviewBotProfile(
    'assist',
    `${input.phaseId}:${input.situation}:${input.mount?.kind ?? 'tool'}`,
  )
  const standingNotes =
    input.leanDay.standingNotes ??
    formatStandingNotes(normalizeBotNotes(input.response.botNotes))

  const accessToken = await resolveInterviewEdgeAccessToken(null, input.briefId)
  profile.mark('auth_token')

  const evidence = evidenceForPhase(input.brief, input.phaseId, input.response)
  const sectionOpts = priorOpts({
    continuing: input.leanDay.continuing,
    previousSectionTitle: input.leanDay.previousSectionTitle,
    currentPhaseId: input.phaseId,
    sectionIds: input.sectionIds,
  })

  // Speculative CV beside plan — retrieve still waits on plan.
  const parallelT0 = nowAssist()
  const [planResult, speculativeCv] = await Promise.all([
    planDayMemory({
      surface: 'assist',
      candidateText: input.candidateText,
      lastAssistantText: input.lastAssistantText,
      alwaysOnMeta: {
        continuing: input.leanDay.continuing,
        previousSectionTitle: input.leanDay.previousSectionTitle,
        currentPhaseId: input.phaseId,
        currentTitle: input.gateTitle,
        situationHint: input.situation,
        sectionIds: input.sectionIds,
        standingNotes,
        ...alwaysOnReferencedPatch(evidence),
      },
      accessToken,
      briefId: input.briefId,
    }).then((value) => ({
      value,
      ms: Math.round(nowAssist() - parallelT0),
    })),
    resolveCandidateCvNote(input.briefId).then((value) => ({
      value,
      ms: Math.round(nowAssist() - parallelT0),
    })),
  ])
  profile.mark('parallel_plan_cv', {
    memoryPlanMs: planResult.ms,
    candidateCvMs: speculativeCv.ms,
    skipped: Boolean(planResult.value.composeMeta?.skipped),
    needs: planResult.value.plan.needs.map((n) => n.sourceId),
  })

  let plan = planToUse(planResult.value, input.candidateText, sectionOpts)
  plan = {
    ...plan,
    needs: bindRefs(plan.needs, evidence, input.phaseId),
  }
  let cv = await loadCvIfNeeded(input.briefId, plan, speculativeCv.value)
  profile.mark('load_cv_if_needed')
  let retrieved = retrieveDayMemory({
    plan,
    response: input.response,
    currentPhaseId: input.phaseId,
    cv,
    sectionIndex: input.sectionIds,
    referenced: retrieveReferencedArg(evidence),
  })
  profile.mark('retrieve_memory', {
    sourceIds: retrieved.sourceIdsUsed ?? [],
  })

  const leanWithNotes = { ...input.leanDay, standingNotes }

  const buildCtx = () =>
    mergeAssistCtx({
      briefId: input.briefId,
      brief: input.brief,
      phaseId: input.phaseId,
      timed: input.timed,
      limitMinutes: input.limitMinutes,
      mount: input.mount,
      leanDay: leanWithNotes,
      historyTail: input.historyTail,
      retrieved,
      cv,
      liveComposition: input.liveComposition ?? null,
      timer: input.timer ?? null,
      referencedMemory: referencedMemoryFromRetrieved(retrieved, evidence),
    })

  let ctx = buildCtx()
  if (!ctx) {
    profile.mark('error', { code: 'assist_context_unavailable' })
    profile.done({ error: 'assist_context_unavailable' })
    throw new Error('assist_context_unavailable')
  }
  profile.mark('build_context')

  let expanded = Boolean(planResult.value.composeMeta.skipped)
  let result = await composeStageAssist({
    stageAssistContext: ctx,
    messages: input.historyTail,
    situation: input.situation,
    retrievalPass: 0,
    retrievedSourceIds: retrieved.sourceIdsUsed,
    accessToken,
    // Do not paint pass-0 deltas — needRetrieval would overwrite the bubble.
  })
  profile.mark('compose_pass0', {
    needRetrieval: Boolean(result.needRetrieval?.needs?.length),
    utteranceChars: (result.utterance || '').length,
  })

  const more = bindRefs(
    bindPriorSectionNeeds(
      coerceNeedRetrievalNeeds(result.needRetrieval, Boolean(evidence?.index.length)),
      sectionOpts,
    ),
    evidence,
    input.phaseId,
  )
  if (
    shouldExpandComposePass1({
      moreNeeds: more,
      utterance: result.utterance || '',
    })
  ) {
    const mergedNeeds = mergeMemoryNeeds(plan.needs, more)
    plan = { needs: mergedNeeds, confidence: 'med' }
    cv = await loadCvIfNeeded(input.briefId, plan, cv ?? speculativeCv.value)
    const morePack = retrieveDayMemory({
      plan: { needs: more, confidence: 'med' },
      response: input.response,
      currentPhaseId: input.phaseId,
      cv,
      sectionIndex: input.sectionIds,
      referenced: retrieveReferencedArg(evidence),
    })
    retrieved = mergeRetrievedPacks(retrieved, morePack)
    ctx = buildCtx()
    if (!ctx) {
      profile.mark('error', { code: 'assist_context_unavailable' })
      profile.done({ error: 'assist_context_unavailable' })
      throw new Error('assist_context_unavailable')
    }
    expanded = true
    result = await composeStageAssist({
      stageAssistContext: ctx,
      messages: input.historyTail,
      situation: input.situation,
      retrievalPass: 1,
      retrievedSourceIds: retrieved.sourceIdsUsed,
      accessToken,
      onUtteranceDelta: input.onComposeDelta
        ? (_delta, full) => input.onComposeDelta?.(full)
        : undefined,
    })
    profile.mark('compose_pass1', {
      utteranceChars: (result.utterance || '').length,
    })
  } else if (result.utterance && input.onComposeDelta) {
    input.onComposeDelta(result.utterance)
  }

  const noteDrafts = coercePersistNotes(result.persistNotes)
  if (noteDrafts.length) {
    persistBotNotes(input.response, noteDrafts, {
      phaseId: input.phaseId,
      source: 'assist',
    })
    profile.mark('persist_bot_notes', { count: noteDrafts.length })
  }

  profile.done({
    situation: input.situation,
    toolKind: input.mount?.kind ?? null,
    expanded,
    utteranceChars: (result.utterance || '').length,
  })

  return {
    utterance: result.utterance,
    composeMeta: result.composeMeta,
    planResult: planResult.value,
    retrieved: retrieved.sourceIdsUsed.length ? retrieved : emptyRetrievedMemoryPack(),
    expanded,
  }
}

function nowAssist(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now()
}
